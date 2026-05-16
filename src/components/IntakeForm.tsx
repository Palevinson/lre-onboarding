'use client'
import { useState } from 'react'
import { Loader2, Check, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AgentIntake } from '@/lib/types'

type FormState = Partial<Omit<AgentIntake, 'id' | 'profile_id' | 'updated_at'>>

type Props = {
  profileId: string
  profileEmail: string
  profileFullName: string | null
  initial: AgentIntake | null
}

export default function IntakeForm({ profileId, profileEmail, profileFullName, initial }: Props) {
  const [form, setForm] = useState<FormState>(initial ?? {})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(initial?.submitted_at ?? null)
  const [justSaved, setJustSaved] = useState(false)

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const supabase = createClient()
    const payload = {
      profile_id: profileId,
      ...form,
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
      {/* Status banner */}
      {savedAt && !justSaved && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4" />
          Submitted {new Date(savedAt).toLocaleDateString()} · You can update and re-save anytime.
        </div>
      )}
      {justSaved && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4" />
          Saved successfully.
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Section 1: Agent Survey (the "get to know you" page) */}
      <Section title="Tell Us About You" subtitle="So your brokerage can get to know you better">
        <Field label="Your Name">
          <Input value={profileFullName ?? ''} disabled />
          <Hint>Update in profile settings (coming soon)</Hint>
        </Field>
        <Row>
          <Field label="Birthday">
            <Input type="date" value={form.birthday ?? ''} onChange={e => update('birthday', e.target.value || null)} />
          </Field>
          <Field label="Phone Number">
            <Input value={form.phone_number ?? ''} onChange={e => update('phone_number', e.target.value)} placeholder="(405) 555-1234" />
          </Field>
        </Row>
        <Field label="Years as a Realtor">
          <Input
            type="number" step="0.5" min="0" max="60"
            value={form.years_as_realtor ?? ''}
            onChange={e => update('years_as_realtor', e.target.value === '' ? null : Number(e.target.value))}
            placeholder="0 if just licensed"
          />
        </Field>
        <Field label="Three words that describe you">
          <Input value={form.three_words ?? ''} onChange={e => update('three_words', e.target.value)} placeholder="e.g. driven, curious, loyal" />
        </Field>
        <Field label="Favorite Sonic drink">
          <Input value={form.favorite_sonic_drink ?? ''} onChange={e => update('favorite_sonic_drink', e.target.value)} />
        </Field>
        <Field label="What your family is like">
          <Textarea value={form.family_description ?? ''} onChange={e => update('family_description', e.target.value)} rows={2} />
        </Field>
        <Field label="The highlight of your life so far">
          <Textarea value={form.life_highlight ?? ''} onChange={e => update('life_highlight', e.target.value)} rows={2} />
        </Field>
        <Field label="Favorite restaurant">
          <Input value={form.favorite_restaurant ?? ''} onChange={e => update('favorite_restaurant', e.target.value)} />
        </Field>
        <Field label="Most people don't know that you...">
          <Textarea value={form.little_known_fact ?? ''} onChange={e => update('little_known_fact', e.target.value)} rows={2} />
        </Field>
        <Field label="If you could visit any place">
          <Input value={form.dream_destination ?? ''} onChange={e => update('dream_destination', e.target.value)} />
        </Field>
        <Field label="Your favorite thing about real estate">
          <Textarea value={form.favorite_part_re ?? ''} onChange={e => update('favorite_part_re', e.target.value)} rows={3} />
        </Field>
      </Section>

      {/* Section 2: Contact Information */}
      <Section title="Contact Information">
        <Field label="Email">
          <Input value={profileEmail} disabled />
        </Field>
        <Field label="Primary Mailing Address">
          <Input value={form.mailing_address ?? ''} onChange={e => update('mailing_address', e.target.value)} />
        </Field>
        <Row>
          <Field label="City">
            <Input value={form.city ?? ''} onChange={e => update('city', e.target.value)} />
          </Field>
          <Field label="State">
            <Input value={form.state ?? ''} onChange={e => update('state', e.target.value)} placeholder="OK" maxLength={2} />
          </Field>
        </Row>
        <Row>
          <Field label="County">
            <Input value={form.county ?? ''} onChange={e => update('county', e.target.value)} />
          </Field>
          <Field label="Zip">
            <Input value={form.zip ?? ''} onChange={e => update('zip', e.target.value)} maxLength={10} />
          </Field>
        </Row>
      </Section>

      {/* Section 3: Personal Details */}
      <Section title="Personal Details">
        <Row>
          <RadioGroup
            label="Gender"
            value={form.gender ?? ''}
            options={['Male', 'Female']}
            onChange={v => update('gender', v)}
          />
          <RadioGroup
            label="Marital Status"
            value={form.marital_status ?? ''}
            options={['Single', 'Married']}
            onChange={v => update('marital_status', v)}
          />
        </Row>
        <Field label="Business / LLC Name (if applicable)">
          <Input value={form.business_name ?? ''} onChange={e => update('business_name', e.target.value)} />
          <Hint>EIN is intentionally not collected here — submit your W9 directly to Dotloop.</Hint>
        </Field>
      </Section>

      {/* Section 4: Emergency Contact */}
      <Section title="Emergency Contact">
        <Field label="Name">
          <Input value={form.emergency_contact_name ?? ''} onChange={e => update('emergency_contact_name', e.target.value)} />
        </Field>
        <Row>
          <Field label="Relationship">
            <Input value={form.emergency_contact_relationship ?? ''} onChange={e => update('emergency_contact_relationship', e.target.value)} placeholder="Spouse, parent, etc." />
          </Field>
          <Field label="Cell Phone">
            <Input value={form.emergency_contact_phone ?? ''} onChange={e => update('emergency_contact_phone', e.target.value)} />
          </Field>
        </Row>
      </Section>

      {/* Section 5: Brokerage Logistics */}
      <Section title="Brokerage Logistics">
        <RadioGroup
          label="T-Shirt Size"
          value={form.tshirt_size ?? ''}
          options={['S', 'M', 'L', 'XL', 'XXL']}
          onChange={v => update('tshirt_size', v)}
        />
        <Field label="Recruited By">
          <Input value={form.recruited_by ?? ''} onChange={e => update('recruited_by', e.target.value)} />
        </Field>
        <div className="flex items-start gap-3 bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <input
            id="w9"
            type="checkbox"
            checked={form.w9_submitted ?? false}
            onChange={e => update('w9_submitted', e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-amber-500 shrink-0"
          />
          <label htmlFor="w9" className="text-sm text-gray-300 cursor-pointer leading-relaxed">
            I have submitted my signed W9 to Dotloop.
            <span className="block text-xs text-gray-500 mt-1">
              W9 contains your SSN — submit it directly to Dotloop, not here.
            </span>
          </label>
        </div>
      </Section>

      {/* Submit */}
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

// === UI primitives ===
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="border-b border-gray-800 pb-3 mb-4">
        <h2 className="text-white font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-400 uppercase tracking-widest block mb-1.5">{label}</label>
      {children}
    </div>
  )
}
function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-gray-500 mt-1">{children}</p>
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed ${props.className ?? ''}`}
    />
  )
}
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none resize-y ${props.className ?? ''}`}
    />
  )
}
function RadioGroup({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-gray-400 uppercase tracking-widest block mb-1.5">{label}</label>
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
    </div>
  )
}
