import Link from 'next/link'
import { ArrowRight, Users, ClipboardCheck, FileText, UserPlus, Settings, ShieldCheck } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Profile, TaskTemplate, TaskCompletion, UserRole } from '@/lib/types'

export default async function AdminRosterPage() {
  const caller = await requireRole(['manager', 'admin'])
  const supabase = await createClient()

  // Everyone in the system — we'll group by role on render
  const [profilesRes, templatesRes, completionsRes, intakeRes] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('task_templates').select('*'),
    supabase.from('task_completions').select('*').eq('completed', true),
    supabase.from('agent_intake').select('profile_id, submitted_at').not('submitted_at', 'is', null),
  ])

  const profiles = (profilesRes.data ?? []) as Profile[]
  const templates = (templatesRes.data ?? []) as TaskTemplate[]
  const completions = (completionsRes.data ?? []) as TaskCompletion[]
  const intakeSubmitted = new Set((intakeRes.data ?? []).map(r => r.profile_id))

  const agentTemplateCount = templates.filter(t => t.audience === 'agent').length
  const leadershipTemplateCount = templates.filter(t => t.audience === 'leadership').length
  const agentTemplateIds = new Set(templates.filter(t => t.audience === 'agent').map(t => t.id))
  const leadershipTemplateIds = new Set(templates.filter(t => t.audience === 'leadership').map(t => t.id))

  const buildStats = (p: Profile) => {
    const ac = completions.filter(c => c.profile_id === p.id && agentTemplateIds.has(c.template_id)).length
    const lc = completions.filter(c => c.profile_id === p.id && leadershipTemplateIds.has(c.template_id)).length
    return {
      profile: p,
      agentPct: agentTemplateCount ? Math.round((ac / agentTemplateCount) * 100) : 0,
      leadershipPct: leadershipTemplateCount ? Math.round((lc / leadershipTemplateCount) * 100) : 0,
      agentDone: ac,
      leadershipDone: lc,
      intakeSubmitted: intakeSubmitted.has(p.id),
    }
  }

  const agents = profiles.filter(p => p.role === 'agent').map(buildStats)
  const staff  = profiles.filter(p => p.role !== 'agent').map(buildStats)

  const totalAgents = agents.length
  const totalSubmittedIntake = agents.filter(s => s.intakeSubmitted).length
  const totalLeadershipPending = agents.reduce((sum, s) => sum + (leadershipTemplateCount - s.leadershipDone), 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-amber-500 uppercase tracking-widest mb-2">Leadership</p>
          <h1 className="text-3xl font-serif text-white">Roster</h1>
          <p className="text-gray-400 text-sm mt-2 max-w-2xl">
            Click any person to drill in. Admins can change roles from the detail page.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {caller.role === 'admin' && (
            <Link
              href="/admin/content"
              className="inline-flex items-center gap-2 bg-gray-800 text-gray-200 font-semibold py-2.5 px-4 rounded-lg text-sm hover:bg-gray-700"
            >
              <Settings className="w-4 h-4" /> Manage Content
            </Link>
          )}
          <Link
            href="/admin/invite"
            className="inline-flex items-center gap-2 bg-amber-500 text-black font-semibold py-2.5 px-4 rounded-lg text-sm hover:bg-amber-400"
          >
            <UserPlus className="w-4 h-4" /> Invite
          </Link>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile icon={<Users className="w-5 h-5" />} label="Active Agents" value={totalAgents} />
        <StatTile icon={<FileText className="w-5 h-5" />} label="Intakes Submitted" value={`${totalSubmittedIntake} of ${totalAgents}`} />
        <StatTile icon={<ClipboardCheck className="w-5 h-5" />} label="Leadership To-Dos Pending" value={totalLeadershipPending} />
      </div>

      {/* Agents */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">
          Agents <span className="text-gray-600">· {agents.length}</span>
        </h2>
        {agents.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
            <Users className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <h3 className="text-white text-sm font-semibold mb-1">No agents yet</h3>
            <p className="text-gray-500 text-xs">Click <strong className="text-amber-500">Invite</strong> to create one, or have them sign up at <code className="text-amber-500">/signup</code>.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map(s => <AgentRow key={s.profile.id} {...s} />)}
          </div>
        )}
      </section>

      {/* Staff (managers + admins) */}
      {staff.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Staff <span className="text-gray-600">· {staff.length}</span>
          </h2>
          <div className="space-y-3">
            {staff.map(s => <StaffRow key={s.profile.id} profile={s.profile} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="text-amber-500 mb-3">{icon}</div>
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">{label}</div>
    </div>
  )
}

function AgentRow({
  profile, agentPct, leadershipPct, agentDone, leadershipDone, intakeSubmitted,
}: {
  profile: Profile; agentPct: number; leadershipPct: number;
  agentDone: number; leadershipDone: number; intakeSubmitted: boolean
}) {
  return (
    <Link
      href={`/admin/${profile.id}`}
      className="group flex items-center gap-4 bg-gray-900 border border-gray-800 hover:border-amber-500/40 rounded-xl p-4 transition-colors"
    >
      <Avatar profile={profile} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-white font-medium truncate">{profile.full_name ?? profile.email}</span>
          {profile.full_name && <span className="text-xs text-gray-500 truncate hidden sm:inline">{profile.email}</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
          <ProgressMini label="Welcome Week" pct={agentPct} count={`${agentDone} done`} />
          <ProgressMini label="Leadership To-Dos" pct={leadershipPct} count={`${leadershipDone} done`} />
          <div className="flex items-center text-xs">
            <span className="text-gray-400 uppercase tracking-widest mr-2">Intake</span>
            {intakeSubmitted ? (
              <span className="text-green-400 font-medium">Submitted</span>
            ) : (
              <span className="text-amber-500/80">Pending</span>
            )}
          </div>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-amber-500 shrink-0 transition-colors" />
    </Link>
  )
}

function StaffRow({ profile }: { profile: Profile }) {
  return (
    <Link
      href={`/admin/${profile.id}`}
      className="group flex items-center gap-4 bg-gray-900 border border-gray-800 hover:border-amber-500/40 rounded-xl p-4 transition-colors"
    >
      <Avatar profile={profile} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-white font-medium truncate">{profile.full_name ?? profile.email}</span>
          <RoleBadge role={profile.role} />
        </div>
        {profile.full_name && (
          <div className="text-xs text-gray-500 truncate mt-0.5">{profile.email}</div>
        )}
      </div>
      <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-amber-500 shrink-0 transition-colors" />
    </Link>
  )
}

function Avatar({ profile }: { profile: Profile }) {
  const initials = (profile.full_name ?? profile.email)
    .split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-black font-semibold flex items-center justify-center text-sm shrink-0">
      {initials}
    </div>
  )
}

function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<UserRole, string> = {
    agent:   'bg-gray-800 text-gray-300',
    manager: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    admin:   'bg-green-500/15 text-green-400 border border-green-500/30',
  }
  return (
    <span className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded ${styles[role]}`}>
      {role}
    </span>
  )
}

function ProgressMini({ label, pct, count }: { label: string; pct: number; count: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] uppercase tracking-widest text-gray-500">{label}</span>
        <span className="text-[10px] text-gray-500">{count}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={pct >= 100 ? 'h-full bg-green-500' : 'h-full bg-amber-500'}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
