'use client'
import { useState, useMemo } from 'react'
import { Loader2, Check, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { IntakeQuestion, IntakeResponses, IntakeResponseValue, AgentIntake } from '@/lib/types'

type Props = {
  profileId: string
  profileEmail: string
  profileFullName: string | null
  questions: IntakeQuestion[]
  initial: AgentIntake | null
}

export default function IntakeForm({ profileId, profileEmail, profileFullName, questions, initial }: Props) {
  const [responses, setResponses] = useState<IntakeResponses>(initial?.responses ?? {})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(initial?.submitted_at ?? null)
  const [justSaved, setJustSaved] = useState(false)

  const grouped = useMemo(() => groupBySection(questions.filter(q => q.is_active)), [questions])

  const update = (questionId: string, value: IntakeResponseValue) => {
    setResponses(prev => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Required-field validation
    const missing = questions.filter(q => q.is_active && q.is_required && isEmpty(responses[q.id]))
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.map(m => m.label).join(', ')}`)
      return
    }
    setSaving(true)
    setError('')
    const supabase = createClient()
    const payload = {
      profile_id: profileId,
      responses,
      submitted_at: new Date().toISOString(),
    }
    const { error } = await supabase
      .from('agent_intake')
      .upsert(payload, { onConflict: 'profile_id' })
    setSaving(false)
    if (error) { setError(error.message); return }
    setSavedAt(payload.submitted_at)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 3000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {savedAt && !justSaved && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4" />
          Submitted {new Date(savedAt).toLocaleDateString()} · You can update and re-save anytime.
        </div>
      )}
      {justSaved && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4" /> Saved successfully.
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Account info — read-only, always shown */}
      <Section title="Your Account">
        <Field label="Name">
          <Input value={profileFullName ?? ''} disabled />
        </Field>
        <Field label="Email">
          <Input value={profileEmail} disabled />
        </Field>
      </Section>

      {/* Render each section of dynamic questions */}
      {grouped.map(({ section, items }) => (
        <Section key={section} title={section}>
          {items.map(q => (
            <QuestionField key={q.id} question={q} value={responses[q.id] ?? null} onChange={v => update(q.id, v)} />
          ))}
        </Section>
      ))}

      {questions.filter(q => q.is_active).length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-sm text-gray-400">
          No intake questions are configured. An admin can add some at <code className="text-amber-500">/admin/content/intake</code>.
        </div>
      )}

      {/* Submit footer */}
      <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 bg-gray-950/95 backdrop-blur border-t border-gray-800 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {savedAt ? `Last saved ${new Date(savedAt).toLocaleString()}` : 'Not yet submitted'}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-amber-500 text-black font-semibold py-2.5 px-6 rounded-lg text-sm hover:bg-amber-400 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : savedAt ? 'Save Changes' : 'Submit'}
        </button>
      </div>
    </form>
  )
}

function QuestionField({
  question, value, onChange,
}: {
  question: IntakeQuestion
  value: IntakeResponseValue
  onChange: (v: IntakeResponseValue) => void
}) {
  const { field_type, label, help_text, placeholder, options, is_required } = question
  const labelEl = (
    <span>
      {label}
      {is_required && <span className="text-amber-500 ml-1">*</span>}
    </span>
  )

  if (field_type === 'checkbox') {
    return (
      <div className="flex items-start gap-3 bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <input
          id={question.id}
          type="checkbox"
          checked={value === true}
          onChange={e => onChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-amber-500 shrink-0"
        />
        <label htmlFor={question.id} className="text-sm text-gray-300 cursor-pointer leading-relaxed">
          {labelEl}
          {help_text && <span className="block text-xs text-gray-500 mt-1">{help_text}</span>}
        </label>
      </div>
    )
  }

  if (field_type === 'select' && options && options.length > 0) {
    return (
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-widest block mb-1.5">{labelEl}</label>
        <div className="flex flex-wrap gap-2">
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`px-3.5 py-1.5 rounded-lg text-sm border transition-colors ${
                value === opt
                  ? 'bg-amber-500 text-black border-amber-500 font-semibold'
                  : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-600'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        {help_text && <p className="text-[11px] text-gray-500 mt-1">{help_text}</p>}
      </div>
    )
  }

  if (field_type === 'textarea') {
    return (
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-widest block mb-1.5">{labelEl}</label>
        <textarea
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? undefined}
          rows={3}
          className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none resize-y"
        />
        {help_text && <p className="text-[11px] text-gray-500 mt-1">{help_text}</p>}
      </div>
    )
  }

  const htmlType =
    field_type === 'email' ? 'email' :
    field_type === 'phone' ? 'tel' :
    field_type === 'date'  ? 'date' :
    field_type === 'number'? 'number' :
    'text'

  return (
    <div>
      <label className="text-xs text-gray-400 uppercase tracking-widest block mb-1.5">{labelEl}</label>
      <input
        type={htmlType}
        value={value === null || value === undefined ? '' : String(value)}
        onChange={e => {
          const raw = e.target.value
          onChange(field_type === 'number' ? (raw === '' ? null : Number(raw)) : raw)
        }}
        placeholder={placeholder ?? undefined}
        className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
      />
      {help_text && <p className="text-[11px] text-gray-500 mt-1">{help_text}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="border-b border-gray-800 pb-3 mb-4">
        <h2 className="text-white font-semibold">{title}</h2>
      </div>
      {children}
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
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none disabled:opacity-60 ${props.className ?? ''}`}
    />
  )
}

function groupBySection(questions: IntakeQuestion[]) {
  const map = new Map<string, IntakeQuestion[]>()
  questions
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .forEach(q => {
      if (!map.has(q.section)) map.set(q.section, [])
      map.get(q.section)!.push(q)
    })
  return Array.from(map.entries()).map(([section, items]) => ({ section, items }))
}

function isEmpty(v: IntakeResponseValue): boolean {
  return v === null || v === undefined || v === '' || v === false
}
