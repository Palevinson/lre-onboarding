'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, AlertCircle, GripVertical, Eye, EyeOff, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { IntakeQuestion, IntakeFieldType } from '@/lib/types'

const FIELD_TYPES: { value: IntakeFieldType; label: string }[] = [
  { value: 'text',     label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'date',     label: 'Date' },
  { value: 'number',   label: 'Number' },
  { value: 'email',    label: 'Email' },
  { value: 'phone',    label: 'Phone' },
  { value: 'select',   label: 'Multiple choice' },
  { value: 'checkbox', label: 'Yes / No checkbox' },
]

type Draft = Partial<IntakeQuestion>

export default function IntakeQuestionsEditor({ initial }: { initial: IntakeQuestion[] }) {
  const router = useRouter()
  const [questions, setQuestions] = useState<IntakeQuestion[]>(initial)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Draft>({ section: 'About You', sort_order: 100, field_type: 'text', is_required: false, is_active: true })

  const sections = useMemo(() => {
    const set = new Set(questions.map(q => q.section))
    set.add('About You'); set.add('Contact Information'); set.add('Personal Details')
    set.add('Emergency Contact'); set.add('Brokerage Logistics')
    return Array.from(set).sort()
  }, [questions])

  const grouped = useMemo(() => {
    const map = new Map<string, IntakeQuestion[]>()
    questions
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach(q => {
        if (!map.has(q.section)) map.set(q.section, [])
        map.get(q.section)!.push(q)
      })
    return Array.from(map.entries())
  }, [questions])

  const refresh = () => router.refresh()

  const updateField = async (id: string, field: keyof IntakeQuestion, value: unknown) => {
    setSavingId(id)
    setError('')
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } as IntakeQuestion : q))
    const supabase = createClient()
    const { error } = await supabase.from('intake_questions').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id)
    setSavingId(null)
    if (error) { setError(error.message); refresh() }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this question? Existing submissions will keep the answer in their data, but it will no longer be visible.')) return
    const supabase = createClient()
    const { error } = await supabase.from('intake_questions').delete().eq('id', id)
    if (error) { setError(error.message); return }
    setQuestions(prev => prev.filter(q => q.id !== id))
    refresh()
  }

  const add = async () => {
    setError('')
    if (!draft.label?.trim()) { setError('Label is required'); return }
    if (!draft.section?.trim()) { setError('Section is required'); return }
    if (draft.field_type === 'select' && (!draft.options || draft.options.length === 0)) {
      setError('Multiple choice needs at least one option')
      return
    }
    const supabase = createClient()
    const { data, error } = await supabase.from('intake_questions').insert({
      section: draft.section!.trim(),
      sort_order: draft.sort_order ?? 100,
      label: draft.label!.trim(),
      help_text: draft.help_text?.trim() || null,
      field_type: draft.field_type ?? 'text',
      is_required: draft.is_required ?? false,
      options: draft.field_type === 'select' ? draft.options ?? null : null,
      placeholder: draft.placeholder?.trim() || null,
      is_active: true,
    }).select().single()
    if (error) { setError(error.message); return }
    setQuestions(prev => [...prev, data as IntakeQuestion])
    setDraft({ section: draft.section, sort_order: (draft.sort_order ?? 100) + 10, field_type: 'text', is_required: false, is_active: true })
    setAdding(false)
    refresh()
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Group by section */}
      {grouped.map(([section, items]) => (
        <div key={section}>
          <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">
            {section} <span className="text-gray-600">· {items.length}</span>
          </h2>
          <div className="space-y-2">
            {items.map(q => (
              <Row
                key={q.id}
                question={q}
                saving={savingId === q.id}
                sections={sections}
                onChange={(f, v) => updateField(q.id, f, v)}
                onDelete={() => remove(q.id)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Add new */}
      {adding ? (
        <div className="bg-gray-900 border-2 border-amber-500/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white text-sm font-semibold">New Question</h3>
            <button onClick={() => setAdding(false)} className="text-xs text-gray-400 hover:text-white">Cancel</button>
          </div>
          <Field label="Question text (required)">
            <Input value={draft.label ?? ''} onChange={v => setDraft(d => ({ ...d, label: v }))} placeholder="e.g. What's your favorite TV show?" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Section">
              <SectionSelect value={draft.section ?? ''} sections={sections} onChange={v => setDraft(d => ({ ...d, section: v }))} />
            </Field>
            <Field label="Sort order">
              <Input type="number" value={draft.sort_order?.toString() ?? ''} onChange={v => setDraft(d => ({ ...d, sort_order: v ? Number(v) : 100 }))} />
            </Field>
          </div>
          <Field label="Field type">
            <FieldTypeSelect value={draft.field_type ?? 'text'} onChange={v => setDraft(d => ({ ...d, field_type: v }))} />
          </Field>
          {draft.field_type === 'select' && (
            <Field label="Options (Multiple Choice)">
              <OptionsEditor
                options={draft.options ?? []}
                onChange={opts => setDraft(d => ({ ...d, options: opts }))}
              />
            </Field>
          )}
          <Field label="Placeholder (optional)">
            <Input value={draft.placeholder ?? ''} onChange={v => setDraft(d => ({ ...d, placeholder: v }))} />
          </Field>
          <Field label="Help text (optional)">
            <Input value={draft.help_text ?? ''} onChange={v => setDraft(d => ({ ...d, help_text: v }))} placeholder="Shown below the field as small grey text" />
          </Field>
          <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={draft.is_required ?? false} onChange={e => setDraft(d => ({ ...d, is_required: e.target.checked }))} className="accent-amber-500" />
            Required (agent must answer)
          </label>
          <button onClick={add} className="w-full bg-amber-500 text-black font-semibold py-2 rounded-lg text-sm hover:bg-amber-400">
            Add Question
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full bg-gray-900 border-2 border-dashed border-gray-700 hover:border-amber-500/50 hover:text-amber-500 text-gray-400 rounded-xl p-4 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Question
        </button>
      )}
    </div>
  )
}

function Row({
  question, saving, sections, onChange, onDelete,
}: {
  question: IntakeQuestion
  saving: boolean
  sections: string[]
  onChange: (field: keyof IntakeQuestion, value: unknown) => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl ${!question.is_active ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-2 p-3">
        <GripVertical className="w-4 h-4 text-gray-700 mt-2 shrink-0" />
        <input
          type="number"
          value={question.sort_order}
          onChange={e => onChange('sort_order', Number(e.target.value))}
          className="w-14 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-300 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <input
            value={question.label}
            onChange={e => onChange('label', e.target.value)}
            className="w-full bg-transparent text-sm text-white font-medium border-0 px-0 py-0.5 focus:outline-none"
          />
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
            <span className="bg-gray-800 px-1.5 py-0.5 rounded text-amber-500/80 uppercase tracking-wider font-semibold">
              {question.field_type}
            </span>
            {question.is_required && (
              <span className="text-amber-500">Required</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {saving && <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />}
          <button
            onClick={() => onChange('is_active', !question.is_active)}
            className="text-gray-500 hover:text-amber-500 p-1 rounded"
            title={question.is_active ? 'Hide from form' : 'Show on form'}
          >
            {question.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setExpanded(e => !e)} className="text-[11px] text-gray-400 hover:text-amber-500 px-2 py-1 rounded">
            {expanded ? 'Hide' : 'Edit'}
          </button>
          <button onClick={onDelete} className="text-gray-500 hover:text-red-400 p-1 rounded">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-800 p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Section">
              <SectionSelect value={question.section} sections={sections} onChange={v => onChange('section', v)} />
            </Field>
            <Field label="Field type">
              <FieldTypeSelect value={question.field_type} onChange={v => onChange('field_type', v)} />
            </Field>
          </div>
          {question.field_type === 'select' && (
            <Field label="Options">
              <OptionsEditor
                options={question.options ?? []}
                onChange={opts => onChange('options', opts)}
              />
            </Field>
          )}
          <Field label="Placeholder">
            <Input value={question.placeholder ?? ''} onChange={v => onChange('placeholder', v || null)} />
          </Field>
          <Field label="Help text">
            <Input value={question.help_text ?? ''} onChange={v => onChange('help_text', v || null)} placeholder="Small grey text below the field" />
          </Field>
          <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={question.is_required}
              onChange={e => onChange('is_required', e.target.checked)}
              className="accent-amber-500"
            />
            Required (agent must answer)
          </label>
        </div>
      )}
    </div>
  )
}

function SectionSelect({ value, sections, onChange }: { value: string; sections: string[]; onChange: (v: string) => void }) {
  const [custom, setCustom] = useState(value && !sections.includes(value))
  if (custom) {
    return (
      <div className="flex gap-2">
        <Input value={value} onChange={onChange} placeholder="New section name" />
        <button type="button" onClick={() => { setCustom(false); onChange(sections[0] ?? '') }} className="text-xs text-gray-400 hover:text-amber-500 px-2">
          Pick existing
        </button>
      </div>
    )
  }
  return (
    <div className="flex gap-2">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
      >
        {sections.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <button type="button" onClick={() => setCustom(true)} className="text-xs text-amber-500 hover:underline px-2">
        New section…
      </button>
    </div>
  )
}

function FieldTypeSelect({ value, onChange }: { value: IntakeFieldType; onChange: (v: IntakeFieldType) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as IntakeFieldType)}
      className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
    >
      {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
    </select>
  )
}

function OptionsEditor({ options, onChange }: { options: string[]; onChange: (opts: string[]) => void }) {
  const [draft, setDraft] = useState('')
  const addOption = () => {
    const v = draft.trim()
    if (!v) return
    onChange([...options, v])
    setDraft('')
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((opt, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-1 rounded text-xs">
            {opt}
            <button type="button" onClick={() => onChange(options.filter((_, j) => j !== i))} className="hover:text-red-400">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={draft} onChange={setDraft} placeholder="Add option then Enter" />
        <button
          type="button"
          onClick={addOption}
          onKeyDown={e => e.key === 'Enter' && addOption()}
          className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold px-3 rounded-lg"
        >
          Add
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-400 uppercase tracking-widest block mb-1.5">{label}</label>
      {children}
    </div>
  )
}
function Input({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
    />
  )
}
