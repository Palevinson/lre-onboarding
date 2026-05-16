import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Mail, Calendar, Check, AlertCircle } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import TaskItem from '@/components/TaskItem'
import type { Profile, TaskTemplate, TaskCompletion, AgentIntake } from '@/lib/types'

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(['manager', 'admin'])
  const { id } = await params
  const supabase = await createClient()

  const [profileRes, templatesRes, completionsRes, intakeRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
    supabase.from('task_templates').select('*').order('sort_order'),
    supabase.from('task_completions').select('*').eq('profile_id', id),
    supabase.from('agent_intake').select('*').eq('profile_id', id).maybeSingle(),
  ])

  if (!profileRes.data) notFound()
  const profile = profileRes.data as Profile
  const templates = (templatesRes.data ?? []) as TaskTemplate[]
  const compMap = new Map((completionsRes.data ?? []).map((c: TaskCompletion) => [c.template_id, c.completed]))
  const intake = intakeRes.data as AgentIntake | null

  const agentTasks = templates.filter(t => t.audience === 'agent')
  const leadershipTasks = templates.filter(t => t.audience === 'leadership')

  const agentDone = agentTasks.filter(t => compMap.get(t.id)).length
  const agentPct = agentTasks.length ? Math.round((agentDone / agentTasks.length) * 100) : 0
  const leadershipDone = leadershipTasks.filter(t => compMap.get(t.id)).length
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
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-black font-semibold flex items-center justify-center text-xl shrink-0">
            {(profile.full_name ?? profile.email).split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-500 uppercase tracking-widest mb-1">Agent</p>
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

      {/* Leadership To-Dos for this agent */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Leadership To-Dos for this agent</h2>
          <span className="text-xs text-gray-500">{leadershipDone} / {leadershipTasks.length} done</span>
        </div>
        <div className="space-y-2">
          {leadershipTasks.map(t => (
            <TaskItem key={t.id} template={t} profileId={profile.id} initialDone={!!compMap.get(t.id)} />
          ))}
        </div>
      </section>

      {/* Agent's Welcome Week — read-only mirror */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Agent's Welcome Week (read-only)</h2>
          <span className="text-xs text-gray-500">{agentDone} / {agentTasks.length} done</span>
        </div>
        <div className="space-y-2">
          {agentTasks.map(t => (
            <TaskItem key={t.id} template={t} profileId={profile.id} initialDone={!!compMap.get(t.id)} readOnly />
          ))}
        </div>
      </section>

      {/* Intake submission */}
      {intake && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">Intake Submission</h2>
          <IntakeView intake={intake} />
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

function IntakeView({ intake }: { intake: AgentIntake }) {
  const sections: { title: string; fields: [string, string | number | boolean | null][] }[] = [
    {
      title: 'About Them',
      fields: [
        ['Birthday', intake.birthday],
        ['Years as Realtor', intake.years_as_realtor],
        ['Phone', intake.phone_number],
        ['Three Words', intake.three_words],
        ['Favorite Sonic Drink', intake.favorite_sonic_drink],
        ['Family', intake.family_description],
        ['Life Highlight', intake.life_highlight],
        ['Favorite Restaurant', intake.favorite_restaurant],
        ['Little-Known Fact', intake.little_known_fact],
        ['Dream Destination', intake.dream_destination],
        ['Favorite Thing About Real Estate', intake.favorite_part_re],
      ],
    },
    {
      title: 'Contact',
      fields: [
        ['Mailing Address', intake.mailing_address],
        ['City', intake.city],
        ['State', intake.state],
        ['County', intake.county],
        ['Zip', intake.zip],
      ],
    },
    {
      title: 'Personal',
      fields: [
        ['Gender', intake.gender],
        ['Marital Status', intake.marital_status],
        ['Business / LLC Name', intake.business_name],
      ],
    },
    {
      title: 'Emergency Contact',
      fields: [
        ['Name', intake.emergency_contact_name],
        ['Relationship', intake.emergency_contact_relationship],
        ['Phone', intake.emergency_contact_phone],
      ],
    },
    {
      title: 'Logistics',
      fields: [
        ['T-Shirt Size', intake.tshirt_size],
        ['Recruited By', intake.recruited_by],
        ['W9 Submitted to Dotloop', intake.w9_submitted ? 'Yes' : 'No'],
      ],
    },
  ]

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
      {sections.map(s => {
        const filled = s.fields.filter(([, v]) => v !== null && v !== undefined && v !== '')
        if (filled.length === 0) return null
        return (
          <div key={s.title} className="p-5">
            <h3 className="text-white text-sm font-semibold mb-3">{s.title}</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {filled.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[10px] uppercase tracking-widest text-gray-500">{label}</dt>
                  <dd className="text-sm text-gray-200 mt-0.5 whitespace-pre-wrap">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )
      })}
    </div>
  )
}
