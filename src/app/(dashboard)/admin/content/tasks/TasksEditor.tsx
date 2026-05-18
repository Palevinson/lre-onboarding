'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, AlertCircle, GripVertical, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { TaskTemplate, TaskAudience, TaskAction } from '@/lib/types'

type Draft = Partial<TaskTemplate>

export default function TasksEditor({ initial }: { initial: TaskTemplate[] }) {
  const router = useRouter()
  const [audience, setAudience] = useState<TaskAudience>('agent')
  const [tasks, setTasks] = useState<TaskTemplate[]>(initial)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Draft>({ audience: 'agent', sort_order: 100, is_optional: false })

  const filtered = tasks.filter(t => t.audience === audience).sort((a, b) => a.sort_order - b.sort_order)

  const refresh = () => router.refresh()

  const updateField = async (id: string, field: keyof TaskTemplate, value: unknown) => {
    setSavingId(id)
    setError('')
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } as TaskTemplate : t))
    const supabase = createClient()
    const { error } = await supabase.from('task_templates').update({ [field]: value }).eq('id', id)
    setSavingId(null)
    if (error) { setError(error.message); refresh() }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this task? Completion records will also be removed.')) return
    const supabase = createClient()
    const { error } = await supabase.from('task_templates').delete().eq('id', id)
    if (error) { setError(error.message); return }
    setTasks(prev => prev.filter(t => t.id !== id))
    refresh()
  }

  const add = async () => {
    setError('')
    if (!draft.title?.trim()) { setError('Title is required'); return }
    const supabase = createClient()
    const { data, error } = await supabase.from('task_templates').insert({
      audience,
      title: draft.title!.trim(),
      description: draft.description?.trim() || null,
      is_optional: draft.is_optional ?? false,
      cost_note: draft.cost_note?.trim() || null,
      owner_hint: draft.owner_hint?.trim() || null,
      sort_order: draft.sort_order ?? 100,
      actions: (draft.actions ?? []).filter(a => a.url.trim()),
    }).select().single()
    if (error) { setError(error.message); return }
    setTasks(prev => [...prev, data as TaskTemplate])
    setDraft({ audience, sort_order: ((draft.sort_order ?? 100) + 10), is_optional: false })
    setAdding(false)
    refresh()
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Audience tabs */}
      <div className="inline-flex bg-gray-900 border border-gray-800 rounded-lg p-1">
        {(['agent', 'leadership'] as const).map(a => (
          <button
            key={a}
            onClick={() => setAudience(a)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors capitalize ${
              audience === a ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            {a === 'agent' ? 'Welcome Week (Agent)' : 'Leadership To-Dos'}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {filtered.map(t => (
          <Row
            key={t.id}
            task={t}
            saving={savingId === t.id}
            onChange={(f, v) => updateField(t.id, f, v)}
            onDelete={() => remove(t.id)}
          />
        ))}
      </div>

      {/* Add new */}
      {adding ? (
        <div className="bg-gray-900 border-2 border-amber-500/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white text-sm font-semibold">New Task</h3>
            <button onClick={() => setAdding(false)} className="text-xs text-gray-400 hover:text-white">Cancel</button>
          </div>
          <Input placeholder="Title (required)" value={draft.title ?? ''} onChange={v => setDraft(d => ({ ...d, title: v }))} />
          <Textarea placeholder="Description (optional)" value={draft.description ?? ''} onChange={v => setDraft(d => ({ ...d, description: v }))} />
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Sort order" type="number" value={draft.sort_order?.toString() ?? ''} onChange={v => setDraft(d => ({ ...d, sort_order: v ? Number(v) : 100 }))} />
            <Input placeholder="Owner (e.g. Kaylee)" value={draft.owner_hint ?? ''} onChange={v => setDraft(d => ({ ...d, owner_hint: v }))} />
            <Input placeholder="Cost note (e.g. $300/mo)" value={draft.cost_note ?? ''} onChange={v => setDraft(d => ({ ...d, cost_note: v }))} />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest block mb-1.5">Action Buttons</label>
            <ActionsEditor
              actions={draft.actions ?? []}
              onChange={a => setDraft(d => ({ ...d, actions: a }))}
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={draft.is_optional ?? false} onChange={e => setDraft(d => ({ ...d, is_optional: e.target.checked }))} className="accent-amber-500" />
            Optional add-on
          </label>
          <button onClick={add} className="w-full bg-amber-500 text-black font-semibold py-2 rounded-lg text-sm hover:bg-amber-400">
            Add Task
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setAdding(true); setDraft({ audience, sort_order: (filtered.at(-1)?.sort_order ?? 0) + 10, is_optional: false }) }}
          className="w-full bg-gray-900 border-2 border-dashed border-gray-700 hover:border-amber-500/50 hover:text-amber-500 text-gray-400 rounded-xl p-4 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      )}
    </div>
  )
}

function Row({
  task, saving, onChange, onDelete,
}: {
  task: TaskTemplate; saving: boolean;
  onChange: (field: keyof TaskTemplate, value: unknown) => void;
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl">
      <div className="flex items-start gap-2 p-3">
        <GripVertical className="w-4 h-4 text-gray-700 mt-2 shrink-0" />
        <input
          type="number"
          value={task.sort_order}
          onChange={e => onChange('sort_order', Number(e.target.value))}
          className="w-14 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-300 shrink-0"
          title="Sort order"
        />
        <input
          value={task.title}
          onChange={e => onChange('title', e.target.value)}
          className="flex-1 bg-transparent text-sm text-white border-0 px-0 py-1.5 focus:outline-none"
        />
        <div className="flex items-center gap-1 shrink-0">
          {saving && <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />}
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-[11px] text-gray-400 hover:text-amber-500 px-2 py-1 rounded"
          >
            {expanded ? 'Hide' : 'Details'}
          </button>
          <button onClick={onDelete} className="text-gray-500 hover:text-red-400 p-1 rounded">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-800 p-3 space-y-3">
          <Textarea
            placeholder="Description"
            value={task.description ?? ''}
            onChange={v => onChange('description', v || null)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Owner hint" value={task.owner_hint ?? ''} onChange={v => onChange('owner_hint', v || null)} />
            <Input placeholder="Cost note" value={task.cost_note ?? ''} onChange={v => onChange('cost_note', v || null)} />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest block mb-1.5">Action Buttons</label>
            <ActionsEditor
              actions={task.actions ?? []}
              onChange={a => onChange('actions', a)}
            />
          </div>
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={task.allow_upload}
                onChange={e => onChange('allow_upload', e.target.checked)}
                className="accent-amber-500"
              />
              Allow file upload (photo or PDF)
            </label>
            {task.allow_upload && (
              <Input
                placeholder="Upload button label (e.g. Upload proof of submission)"
                value={task.upload_label ?? ''}
                onChange={v => onChange('upload_label', v || null)}
              />
            )}
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={task.is_optional}
              onChange={e => onChange('is_optional', e.target.checked)}
              className="accent-amber-500"
            />
            Optional add-on
          </label>
        </div>
      )}
    </div>
  )
}

function ActionsEditor({ actions, onChange }: { actions: TaskAction[]; onChange: (a: TaskAction[]) => void }) {
  const update = (i: number, patch: Partial<TaskAction>) => {
    onChange(actions.map((a, idx) => idx === i ? { ...a, ...patch } : a))
  }
  const remove = (i: number) => onChange(actions.filter((_, idx) => idx !== i))
  const add = () => onChange([...actions, { url: '', label: '' }])

  return (
    <div className="space-y-2">
      {actions.length === 0 && (
        <p className="text-[11px] text-gray-500 italic">No action buttons. Agents will just see the checkbox.</p>
      )}
      {actions.map((a, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="grid grid-cols-[2fr,1fr] gap-2 flex-1">
            <Input
              placeholder="URL (https://..., mailto:..., or /path)"
              value={a.url}
              onChange={v => update(i, { url: v })}
            />
            <Input
              placeholder="Button label"
              value={a.label}
              onChange={v => update(i, { label: v })}
            />
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-gray-500 hover:text-red-400 p-1 rounded"
            title="Remove action"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-xs text-amber-500 hover:underline inline-flex items-center gap-1"
      >
        <Plus className="w-3 h-3" /> Add another button
      </button>
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
    />
  )
}
function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={2}
      className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none resize-y"
    />
  )
}
