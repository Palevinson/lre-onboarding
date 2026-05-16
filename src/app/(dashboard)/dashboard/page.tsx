import Link from 'next/link'
import { ArrowRight, CheckCircle2, BookOpen, Users, ClipboardList } from 'lucide-react'
import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import ProgressRing from '@/components/ProgressRing'
import type { TaskTemplate, TaskCompletion } from '@/lib/types'

export default async function DashboardPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  const [{ data: agentTemplates }, { data: completions }, { data: intake }] = await Promise.all([
    supabase.from('task_templates').select('*').eq('audience', 'agent').order('sort_order'),
    supabase.from('task_completions').select('*').eq('profile_id', profile.id),
    supabase.from('agent_intake').select('submitted_at').eq('profile_id', profile.id).maybeSingle(),
  ])

  const templates = (agentTemplates ?? []) as TaskTemplate[]
  const completionMap = new Map((completions ?? []).map((c: TaskCompletion) => [c.template_id, c.completed]))
  const doneCount = templates.filter(t => completionMap.get(t.id)).length
  const pct = templates.length ? Math.round((doneCount / templates.length) * 100) : 0

  const firstName = (profile.full_name ?? profile.email).split(' ')[0]

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-900/40 border border-gray-800 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <p className="text-xs text-amber-500 uppercase tracking-widest mb-2">Welcome to LRE Realty</p>
            <h1 className="text-3xl font-serif text-white">Hello, {firstName}.</h1>
            <p className="text-gray-400 mt-2 max-w-lg text-sm leading-relaxed">
              Work through Welcome Week, fill in your intake forms, and use the Reference Library anytime.
              Your onboarding manager has full visibility into your progress.
            </p>
          </div>
          <ProgressRing pct={pct} size={120} label="Complete" />
        </div>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ActionCard
          href="/welcome-week"
          icon={<ClipboardList className="w-5 h-5" />}
          title="Welcome Week"
          subtitle={`${doneCount} of ${templates.length} tasks`}
        />
        <ActionCard
          href="/intake"
          icon={<CheckCircle2 className="w-5 h-5" />}
          title="Intake Forms"
          subtitle={intake?.submitted_at ? 'Submitted' : 'Not yet submitted'}
        />
        <ActionCard
          href="/reference"
          icon={<BookOpen className="w-5 h-5" />}
          title="Reference Library"
          subtitle="Compensation, contracts, and more"
        />
        <ActionCard
          href="/team"
          icon={<Users className="w-5 h-5" />}
          title="Team Directory"
          subtitle="Who to contact for what"
        />
      </div>

      {/* Tuesday cadence reminder */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
        <p className="text-xs text-amber-500 uppercase tracking-widest font-semibold mb-2">Tuesday Cadence</p>
        <p className="text-gray-300 text-sm">
          <strong>11:00 AM</strong> — Trainings: Lofty, Contract, Dotloop, MLS<br />
          <strong>2:00 PM</strong> — Welcome Week onboarding session
        </p>
      </div>
    </div>
  )
}

function ActionCard({ href, icon, title, subtitle }: { href: string; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <Link
      href={href}
      className="group bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-amber-500/40 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-amber-500">{icon}</div>
        <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-amber-500 transition-colors" />
      </div>
      <h3 className="text-white font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-gray-400">{subtitle}</p>
    </Link>
  )
}
