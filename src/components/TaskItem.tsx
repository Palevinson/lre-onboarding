'use client'
import { useState, useTransition } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { TaskTemplate } from '@/lib/types'

type Props = {
  template: TaskTemplate
  profileId: string
  initialDone: boolean
  readOnly?: boolean
}

export default function TaskItem({ template, profileId, initialDone, readOnly }: Props) {
  const [done, setDone] = useState(initialDone)
  const [, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggle = async () => {
    if (readOnly || saving) return
    const next = !done
    setDone(next)        // optimistic
    setSaving(true)
    setError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.from('task_completions').upsert({
        profile_id: profileId,
        template_id: template.id,
        completed: next,
        completed_at: next ? new Date().toISOString() : null,
      }, { onConflict: 'profile_id,template_id' })
      if (error) {
        setDone(!next)   // revert
        setError(error.message)
      }
    } finally {
      setSaving(false)
      startTransition(() => {})
    }
  }

  return (
    <div
      onClick={toggle}
      className={`group flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
        readOnly ? 'cursor-default' : 'cursor-pointer hover:border-amber-500/40'
      } ${
        done ? 'bg-gray-900/40 border-gray-800' : 'bg-gray-900 border-gray-800'
      }`}
    >
      <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
        done ? 'bg-amber-500 border-amber-500' : 'border-2 border-gray-600 group-hover:border-amber-500/60'
      }`}>
        {saving ? <Loader2 className="w-3 h-3 animate-spin text-gray-300" /> :
         done ? <Check className="w-3.5 h-3.5 text-black" strokeWidth={3} /> : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`text-sm font-medium ${done ? 'text-gray-500 line-through' : 'text-white'}`}>
            {template.title}
          </span>
          {template.is_optional && (
            <span className="text-[10px] uppercase tracking-wider text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
              Optional
            </span>
          )}
          {template.cost_note && (
            <span className="text-[11px] text-gray-400">· {template.cost_note}</span>
          )}
          {template.owner_hint && (
            <span className="text-[11px] text-gray-500">· {template.owner_hint}</span>
          )}
        </div>
        {template.description && (
          <p className={`text-xs mt-1 leading-relaxed ${done ? 'text-gray-600' : 'text-gray-400'}`}>
            {template.description}
          </p>
        )}
        {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
      </div>
    </div>
  )
}
