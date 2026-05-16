import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import TaskItem from '@/components/TaskItem'
import ProgressRing from '@/components/ProgressRing'
import type { TaskTemplate, TaskCompletion } from '@/lib/types'

export default async function WelcomeWeekPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  const [{ data: templates }, { data: completions }] = await Promise.all([
    supabase.from('task_templates').select('*').eq('audience', 'agent').order('sort_order'),
    supabase.from('task_completions').select('*').eq('profile_id', profile.id),
  ])

  const tasks = (templates ?? []) as TaskTemplate[]
  const compMap = new Map((completions ?? []).map((c: TaskCompletion) => [c.template_id, c.completed]))
  const doneCount = tasks.filter(t => compMap.get(t.id)).length
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0

  const required = tasks.filter(t => !t.is_optional)
  const optional = tasks.filter(t => t.is_optional)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs text-amber-500 uppercase tracking-widest mb-2">Phase 1 · Week 1</p>
          <h1 className="text-3xl font-serif text-white">Welcome Week To-Dos</h1>
          <p className="text-gray-400 text-sm mt-2 max-w-2xl">
            Get fully set up at LRE. Tap each item to mark it complete — your progress saves
            automatically and your onboarding manager can see it.
          </p>
        </div>
        <div className="shrink-0">
          <ProgressRing pct={pct} size={88} label={`${doneCount}/${tasks.length}`} />
        </div>
      </div>

      <Section title="Required" tasks={required} profileId={profile.id} compMap={compMap} />
      {optional.length > 0 && (
        <Section title="Optional Add-Ons" tasks={optional} profileId={profile.id} compMap={compMap} />
      )}
    </div>
  )
}

function Section({
  title, tasks, profileId, compMap,
}: {
  title: string; tasks: TaskTemplate[]; profileId: string; compMap: Map<string, boolean>
}) {
  return (
    <div>
      <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">{title}</h2>
      <div className="space-y-2">
        {tasks.map(t => (
          <TaskItem
            key={t.id}
            template={t}
            profileId={profileId}
            initialDone={!!compMap.get(t.id)}
          />
        ))}
      </div>
    </div>
  )
}
