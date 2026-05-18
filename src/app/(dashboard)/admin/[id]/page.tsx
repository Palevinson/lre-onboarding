import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Mail, Calendar, Check, AlertCircle } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getHeadshotUrls } from '@/lib/headshots'
import TaskItem from '@/components/TaskItem'
import RoleSelector from '@/components/RoleSelector'
import type { Profile, TaskTemplate, TaskCompletion, AgentIntake, IntakeQuestion } from '@/lib/types'

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const caller = await requireRole(['manager', 'admin'])
  const { id } = await params
  const supabase = await createClient()

  const [profileRes, templatesRes, completionsRes, intakeRes, questionsRes, adminCountRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
    supabase.from('task_templates').select('*').order('sort_order'),
    supabase.from('task_completions').select('*').eq('profile_id', id),
    supabase.from('agent_intake').select('*').eq('profile_id', id).maybeSingle(),
    supabase.from('intake_questions').select('*').order('section').order('sort_order'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
  ])

  if (!profileRes.data) notFound()
  const profile = profileRes.data as Profile
  const templates = (templatesRes.data ?? []) as TaskTemplate[]
  const compArr = (completionsRes.data ?? []) as TaskCompletion[]
  const compMap = new Map(compArr.map(c => [c.template_id, c]))
  const intake = intakeRes.data as AgentIntake | null
  const questions = (questionsRes.data ?? []) as IntakeQuestion[]
  const adminCount = adminCountRes.count ?? 0
  const headshotUrls = await getHeadshotUrls(supabase, [profile.id])
  const headshotUrl = headshotUrls.get(profile.id) ?? null

  const agentTasks = templates.filter(t => t.audience === 'agent')
  const leadershipTasks = templates.filter(t => t.audience === 'leadership')

  const agentDone = agentTasks.filter(t => compMap.get(t.id)?.completed).length
  const agentPct = agentTasks.length ? Math.round((agentDone / agentTasks.length) * 100) : 0
  const leadershipDone = leadershipTasks.filter(t => compMap.get(t.id)?.completed).length
  const leadershipPct = leadershipTasks.length ? Math.round((leadershipDone / leadershipTasks.length) * 100) : 0

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link href="/admin" className="inline-flex items-center text-xs text-gray-400 hover:text-amber-500">
        <ChevronLeft className="w-4 h-4" /> Back to Roster
      </Link>

      {/* Profile header */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-900/40 border border-gray-800 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          {headshotUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={headshotUrl}
              alt={profile.full_name ?? profile.email}
              className="w-16 h-16 rounded-full object-cover border border-gray-800 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-black font-semibold flex items-center justify-center text-xl shrink-0">
              {(profile.full_name ?? profile.email).split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-500 uppercase tracking-widest mb-1 capitalize">{profile.role}</p>
            <h1 className="text-3xl font-serif text-white">{profile.full_name ?? profile.email}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-400">
              <a href={`mailto:${profile.email}`} className="inline-flex items-center hover:text-amber-500">
                <Mail className="w-3 h-3 mr-1.5" />{profile.email}
              </a>
              {profile.license_number && (
                <span>License #{profile.license_number}</span>
              )}
              {profile.start_date && (
                <span className="inline-flex items-center">
                  <Calendar className="w-3 h-3 mr-1.5" />Started {new Date(profile.start_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-800">
          <ProgressTile label="Welcome Week" pct={agentPct} count={`${agentDone}/${agentTasks.length}`} />
          <ProgressTile label="Leadership To-Dos" pct={leadershipPct} count={`${leadershipDone}/${leadershipTasks.length}`} />
          <div>
            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Intake Form</div>
            <div className="text-sm font-medium">
              {intake?.submitted_at ? (
                <span className="text-green-400 inline-flex items-center"><Check className="w-3.5 h-3.5 mr-1" />Submitted {new Date(intake.submitted_at).toLocaleDateString()}</span>
              ) : (
                <span className="text-amber-500/80 inline-flex items-center"><AlertCircle className="w-3.5 h-3.5 mr-1" />Pending</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Role selector — admins only */}
      {caller.role === 'admin' && (
        <RoleSelector
          targetProfileId={profile.id}
          targetEmail={profile.email}
          currentRole={profile.role}
          isSelf={profile.id === caller.id}
          isLastAdmin={profile.role === 'admin' && adminCount <= 1}
        />
      )}

      {/* Leadership To-Dos for this agent */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Leadership To-Dos for this agent</h2>
          <span className="text-xs text-gray-500">{leadershipDone} / {leadershipTasks.length} done</span>
        </div>
        <div className="space-y-2">
          {leadershipTasks.map(t => {
            const c = compMap.get(t.id)
            return (
              <TaskItem
                key={t.id}
                template={t}
                profileId={profile.id}
                initialDone={!!c?.completed}
                initialUploadPath={c?.upload_path ?? null}
                initialUploadFilename={c?.upload_filename ?? null}
              />
            )
          })}
        </div>
      </section>

      {/* Agent's Welcome Week — read-only mirror */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Agent's Welcome Week (read-only)</h2>
          <span className="text-xs text-gray-500">{agentDone} / {agentTasks.length} done</span>
        </div>
        <div className="space-y-2">
          {agentTasks.map(t => {
            const c = compMap.get(t.id)
            return (
              <TaskItem
                key={t.id}
                template={t}
                profileId={profile.id}
                initialDone={!!c?.completed}
                initialUploadPath={c?.upload_path ?? null}
                initialUploadFilename={c?.upload_filename ?? null}
                readOnly
              />
            )
          })}
        </div>
      </section>

      {/* Intake submission */}
      {intake && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">Intake Submission</h2>
          <IntakeView intake={intake} questions={questions} />
        </section>
      )}
    </div>
  )
}

function ProgressTile({ label, pct, count }: { label: string; pct: number; count: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-widest text-gray-500">{label}</span>
        <span className="text-[11px] text-gray-400 font-medium">{count} · {pct}%</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={pct >= 100 ? 'h-full bg-green-500' : 'h-full bg-amber-500'} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function IntakeView({ intake, questions }: { intake: AgentIntake; questions: IntakeQuestion[] }) {
  // Group questions by section, look up the agent's response for each
  const sections = new Map<string, IntakeQuestion[]>()
  questions
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .forEach(q => {
      if (!sections.has(q.section)) sections.set(q.section, [])
      sections.get(q.section)!.push(q)
    })

  const formatValue = (q: IntakeQuestion, value: unknown): string => {
    if (value === null || value === undefined || value === '') return ''
    if (q.field_type === 'checkbox') return value === true ? 'Yes' : 'No'
    return String(value)
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
      {Array.from(sections.entries()).map(([title, items]) => {
        const filled = items
          .map(q => ({ q, display: formatValue(q, intake.responses?.[q.id]) }))
          .filter(({ display }) => display !== '')
        if (filled.length === 0) return null
        return (
          <div key={title} className="p-5">
            <h3 className="text-white text-sm font-semibold mb-3">{title}</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {filled.map(({ q, display }) => (
                <div key={q.id}>
                  <dt className="text-[10px] uppercase tracking-widest text-gray-500">{q.label}</dt>
                  <dd className="text-sm text-gray-200 mt-0.5 whitespace-pre-wrap">{display}</dd>
                </div>
              ))}
            </dl>
          </div>
        )
      })}
    </div>
  )
}
