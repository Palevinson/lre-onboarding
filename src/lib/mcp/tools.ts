import { createAdminClient } from "@/lib/supabase/admin";
import {
  type ToolDefinition,
  type ToolResult,
  ok,
  err,
  pickString,
  pickNumber,
  daysBetween,
} from "./tool-helpers";

/**
 * Onboarding MCP tools — read-only office reports about new-agent
 * onboarding progress. Intended for the office admin (Tara) querying
 * through her droid: "who's in onboarding?", "who's stuck?", "who
 * finished this week?".
 */

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "list_agents_in_onboarding",
    description:
      "List active agents and how far they are through onboarding. Returns each agent's name, days since their start_date, and what fraction of their required (non-optional) agent tasks are done. Use when Tara asks 'who's in onboarding?' or 'how are new agents progressing?'.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "list_recently_completed_tasks",
    description:
      "List onboarding tasks completed in the last N days (default 7). Shows agent name, task title, who marked it complete, when. Use when Tara asks 'what got done this week?' or 'who finished onboarding tasks today?'.",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Days back to look (default 7, max 90).",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_onboarding_metrics",
    description:
      "Office-wide onboarding snapshot: how many agents are active, how many are still in onboarding (not yet 100% on required agent tasks), how many completed this month, average days-to-complete for those who finished. Use when Tara asks 'how's onboarding going overall?' or wants a KPI summary.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "get_agent_onboarding_detail",
    description:
      "Detailed onboarding status for one agent — pass their name (partial match ok). Returns: profile basics, days since start, intake survey submitted yes/no, full task checklist with completion status. Use for 'how's [name] doing?' or 'where is [name] stuck?'.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Agent name to look up (partial match against full_name).",
        },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
];

export async function runTool(
  userId: string,
  toolName: string,
  args: unknown,
): Promise<ToolResult> {
  switch (toolName) {
    case "list_agents_in_onboarding":
      return runListAgentsInOnboarding();
    case "list_recently_completed_tasks":
      return runListRecentlyCompleted(args);
    case "get_onboarding_metrics":
      return runOnboardingMetrics();
    case "get_agent_onboarding_detail":
      return runAgentDetail(args);
    default:
      return err(`Unknown tool: ${toolName}`);
  }
}

// --- Implementations ----------------------------------------------------

async function runListAgentsInOnboarding(): Promise<ToolResult> {
  const supabase = createAdminClient();

  // Get all required agent-audience templates (for the denominator)
  const { data: templates, error: tErr } = await supabase
    .from("task_templates")
    .select("id")
    .eq("audience", "agent")
    .eq("is_optional", false);
  if (tErr) return err(`Templates lookup failed: ${tErr.message}`);
  const requiredCount = templates?.length ?? 0;
  const requiredIds = new Set((templates ?? []).map((t) => t.id));

  // Get active agents
  const { data: agents, error: pErr } = await supabase
    .from("profiles")
    .select("id, full_name, email, start_date, role")
    .eq("role", "agent")
    .eq("is_active", true)
    .order("start_date", { ascending: false });
  if (pErr) return err(`Profiles lookup failed: ${pErr.message}`);
  if (!agents || agents.length === 0) {
    return ok("No active agents found.");
  }

  // Get all completed agent-audience tasks for these profiles
  const profileIds = agents.map((a) => a.id);
  const { data: completions, error: cErr } = await supabase
    .from("task_completions")
    .select("profile_id, template_id, completed")
    .in("profile_id", profileIds)
    .eq("completed", true);
  if (cErr) return err(`Completions lookup failed: ${cErr.message}`);

  // Per-agent: count completions that match required templates
  const doneByAgent: Record<string, number> = {};
  for (const c of completions ?? []) {
    if (!requiredIds.has(c.template_id)) continue;
    doneByAgent[c.profile_id] = (doneByAgent[c.profile_id] ?? 0) + 1;
  }

  const lines = [
    `${agents.length} active agent${agents.length === 1 ? "" : "s"}:`,
  ];
  for (const a of agents) {
    const done = doneByAgent[a.id] ?? 0;
    const pct = requiredCount > 0 ? Math.round((done / requiredCount) * 100) : 0;
    const days = a.start_date ? daysBetween(a.start_date) : null;
    const daysBit = days !== null ? `${days}d in` : "no start date";
    const status =
      requiredCount === 0
        ? "(no required tasks defined)"
        : done === requiredCount
        ? "✓ all required tasks done"
        : `${done}/${requiredCount} required tasks (${pct}%)`;
    lines.push(`  • ${a.full_name ?? a.email} · ${daysBit} · ${status}`);
  }
  return ok(lines.join("\n"));
}

async function runListRecentlyCompleted(args: unknown): Promise<ToolResult> {
  const supabase = createAdminClient();
  const days = Math.min(90, Math.max(1, pickNumber(args, "days") ?? 7));
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data, error } = await supabase
    .from("task_completions")
    .select(`
      completed_at,
      profile:profiles!task_completions_profile_id_fkey(full_name, email),
      template:task_templates!task_completions_template_id_fkey(title, audience)
    `)
    .eq("completed", true)
    .gte("completed_at", cutoff)
    .order("completed_at", { ascending: false })
    .limit(50);
  if (error) return err(`Lookup failed: ${error.message}`);
  if (!data || data.length === 0) {
    return ok(`No tasks completed in the last ${days} day${days === 1 ? "" : "s"}.`);
  }

  const lines = [
    `${data.length} task${data.length === 1 ? "" : "s"} completed in the last ${days} day${days === 1 ? "" : "s"}:`,
  ];
  for (const r of data) {
    const profile = Array.isArray(r.profile)
      ? (r.profile[0] as { full_name?: string; email?: string } | undefined)
      : (r.profile as { full_name?: string; email?: string } | null);
    const template = Array.isArray(r.template)
      ? (r.template[0] as { title?: string; audience?: string } | undefined)
      : (r.template as { title?: string; audience?: string } | null);
    const name = profile?.full_name ?? profile?.email ?? "(unknown)";
    const title = template?.title ?? "(unknown task)";
    const aud = template?.audience === "leadership" ? " [leadership]" : "";
    const when = r.completed_at
      ? new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Chicago",
          month: "short",
          day: "numeric",
        }).format(new Date(r.completed_at))
      : "?";
    lines.push(`  • ${when} · ${name} · ${title}${aud}`);
  }
  return ok(lines.join("\n"));
}

async function runOnboardingMetrics(): Promise<ToolResult> {
  const supabase = createAdminClient();

  // Required agent templates (denominator)
  const { data: templates } = await supabase
    .from("task_templates")
    .select("id")
    .eq("audience", "agent")
    .eq("is_optional", false);
  const requiredCount = templates?.length ?? 0;
  const requiredIds = new Set((templates ?? []).map((t) => t.id));

  // Active agents
  const { data: agents } = await supabase
    .from("profiles")
    .select("id, start_date")
    .eq("role", "agent")
    .eq("is_active", true);
  if (!agents) return ok("No data.");

  // All their completions
  const profileIds = agents.map((a) => a.id);
  const { data: completions } = await supabase
    .from("task_completions")
    .select("profile_id, template_id, completed, completed_at")
    .in("profile_id", profileIds)
    .eq("completed", true);

  const doneByAgent: Record<string, { count: number; latestAt?: string }> = {};
  for (const c of completions ?? []) {
    if (!requiredIds.has(c.template_id)) continue;
    if (!doneByAgent[c.profile_id]) doneByAgent[c.profile_id] = { count: 0 };
    doneByAgent[c.profile_id].count += 1;
    if (c.completed_at) {
      const prev = doneByAgent[c.profile_id].latestAt;
      if (!prev || c.completed_at > prev) {
        doneByAgent[c.profile_id].latestAt = c.completed_at;
      }
    }
  }

  let inProgress = 0;
  let complete = 0;
  let completedThisMonth = 0;
  const completionDays: number[] = [];
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartIso = monthStart.toISOString();

  for (const a of agents) {
    const summary = doneByAgent[a.id];
    const done = summary?.count ?? 0;
    if (requiredCount > 0 && done >= requiredCount) {
      complete += 1;
      if (summary?.latestAt && summary.latestAt >= monthStartIso) {
        completedThisMonth += 1;
      }
      if (a.start_date && summary?.latestAt) {
        completionDays.push(daysBetween(a.start_date, summary.latestAt));
      }
    } else {
      inProgress += 1;
    }
  }

  const avgDays =
    completionDays.length > 0
      ? Math.round(
          completionDays.reduce((a, b) => a + b, 0) / completionDays.length,
        )
      : null;

  const lines = [
    "Onboarding snapshot:",
    `  • ${agents.length} active agent${agents.length === 1 ? "" : "s"} total`,
    `  • ${inProgress} still in onboarding (not yet 100% on required tasks)`,
    `  • ${complete} have completed all required tasks`,
    `  • ${completedThisMonth} completed this calendar month`,
    avgDays !== null
      ? `  • Average days to complete (those who finished): ${avgDays}`
      : `  • Average completion time: not enough data yet`,
    `  • ${requiredCount} required agent task${requiredCount === 1 ? "" : "s"} in the current template`,
  ];
  return ok(lines.join("\n"));
}

async function runAgentDetail(args: unknown): Promise<ToolResult> {
  const supabase = createAdminClient();
  const name = pickString(args, "name");
  if (!name) return err("Missing required field: name");

  // Find by name (case-insensitive partial)
  const { data: matches, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, start_date, role, is_active")
    .ilike("full_name", `%${name}%`)
    .limit(5);
  if (error) return err(`Lookup failed: ${error.message}`);
  if (!matches || matches.length === 0) {
    return ok(`No agent found matching "${name}".`);
  }
  if (matches.length > 1) {
    const names = matches.map((m) => m.full_name ?? m.email).join(", ");
    return ok(`Multiple agents matched "${name}": ${names}. Please be more specific.`);
  }
  const agent = matches[0];

  // Get task template + completion status for this agent (agent audience only)
  const { data: templates } = await supabase
    .from("task_templates")
    .select("id, title, sort_order, is_optional")
    .eq("audience", "agent")
    .order("sort_order");

  const { data: completions } = await supabase
    .from("task_completions")
    .select("template_id, completed, completed_at")
    .eq("profile_id", agent.id);

  const completedMap = new Map(
    (completions ?? []).map((c) => [c.template_id, c]),
  );

  // Intake submitted?
  const { data: intake } = await supabase
    .from("agent_intake")
    .select("submitted_at")
    .eq("profile_id", agent.id)
    .maybeSingle();

  const days = agent.start_date ? daysBetween(agent.start_date) : null;
  const lines = [
    `${agent.full_name ?? agent.email} (${agent.role})`,
    `  Email: ${agent.email}`,
    `  Start date: ${agent.start_date ?? "(not set)"}${days !== null ? ` · ${days} days in` : ""}`,
    `  Active: ${agent.is_active ? "yes" : "no"}`,
    `  Intake survey: ${intake?.submitted_at ? `submitted ${intake.submitted_at.slice(0, 10)}` : "not submitted"}`,
    "",
    "Tasks:",
  ];

  const reqDone = (templates ?? []).filter(
    (t) => !t.is_optional && completedMap.get(t.id)?.completed,
  ).length;
  const reqTotal = (templates ?? []).filter((t) => !t.is_optional).length;
  lines.push(`  ${reqDone}/${reqTotal} required tasks complete`);
  lines.push("");

  for (const t of templates ?? []) {
    const c = completedMap.get(t.id);
    const mark = c?.completed ? "✓" : "·";
    const opt = t.is_optional ? " (optional)" : "";
    lines.push(`  ${mark} ${t.title}${opt}`);
  }

  return ok(lines.join("\n"));
}
