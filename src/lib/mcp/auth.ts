import { createAdminClient } from "@/lib/supabase/admin";

export type McpAuthResult =
  | { ok: true; userId: string; tokenId: string }
  | { ok: false; reason: "missing" | "invalid" | "revoked" | "not_admin" };

/**
 * Resolve a token from the URL path and verify the user is an admin or
 * manager. Onboarding's office-wide reports require manager+ access.
 */
export async function resolveMcpPathToken(
  token: string | undefined,
): Promise<McpAuthResult> {
  if (!token) return { ok: false, reason: "missing" };
  const t = token.trim();
  if (!t) return { ok: false, reason: "missing" };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("mcp_tokens")
    .select("id, user_id, revoked_at")
    .eq("token", t)
    .maybeSingle();

  if (error || !data) return { ok: false, reason: "invalid" };
  if (data.revoked_at) return { ok: false, reason: "revoked" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user_id)
    .maybeSingle();

  const isAdminOrManager =
    profile?.role === "admin" || profile?.role === "manager";
  if (!isAdminOrManager) return { ok: false, reason: "not_admin" };

  void supabase
    .from("mcp_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => undefined);

  return { ok: true, userId: data.user_id, tokenId: data.id };
}
