'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, AlertCircle, KeyRound, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  profileId: string
  initialFullName: string
  initialLicense: string
}

export default function SettingsForms({ profileId, initialFullName, initialLicense }: Props) {
  return (
    <div className="space-y-6">
      <ProfileForm profileId={profileId} initialFullName={initialFullName} initialLicense={initialLicense} />
      <PasswordForm />
    </div>
  )
}

function ProfileForm({ profileId, initialFullName, initialLicense }: Props) {
  const router = useRouter()
  const [fullName, setFullName] = useState(initialFullName)
  const [license, setLicense] = useState(initialLicense)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedJust, setSavedJust] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() || null, license_number: license.trim() || null })
      .eq('id', profileId)
    setSaving(false)
    if (error) { setError(error.message); return }
    setSavedJust(true)
    setTimeout(() => setSavedJust(false), 2500)
    router.refresh()
  }

  return (
    <form onSubmit={save} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2 border-b border-gray-800 pb-3 mb-1">
        <User className="w-4 h-4 text-amber-500" />
        <h2 className="text-white font-semibold">Profile</h2>
      </div>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      {savedJust && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4" /> Saved
        </div>
      )}
      <Field label="Full Name">
        <Input value={fullName} onChange={setFullName} placeholder="Jane Doe" />
      </Field>
      <Field label="License Number">
        <Input value={license} onChange={setLicense} placeholder="Optional" />
      </Field>
      <button
        type="submit"
        disabled={saving}
        className="bg-amber-500 text-black font-semibold py-2.5 px-5 rounded-lg text-sm hover:bg-amber-400 disabled:opacity-50 inline-flex items-center gap-2"
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Profile'}
      </button>
    </form>
  )
}

function PasswordForm() {
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (next.length < 8) { setError('Password must be at least 8 characters'); return }
    if (next !== confirm) { setError('Passwords do not match'); return }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: next })
    setSaving(false)
    if (error) { setError(error.message); return }
    setNext(''); setConfirm('')
    setDone(true)
    setTimeout(() => setDone(false), 4000)
  }

  return (
    <form onSubmit={save} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2 border-b border-gray-800 pb-3 mb-1">
        <KeyRound className="w-4 h-4 text-amber-500" />
        <h2 className="text-white font-semibold">Change Password</h2>
      </div>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      {done && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4" /> Password updated successfully
        </div>
      )}
      <Field label="New Password">
        <Input type="password" value={next} onChange={setNext} placeholder="At least 8 characters" />
      </Field>
      <Field label="Confirm New Password">
        <Input type="password" value={confirm} onChange={setConfirm} />
      </Field>
      <button
        type="submit"
        disabled={saving || !next || !confirm}
        className="bg-amber-500 text-black font-semibold py-2.5 px-5 rounded-lg text-sm hover:bg-amber-400 disabled:opacity-50 inline-flex items-center gap-2"
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : 'Update Password'}
      </button>
      <p className="text-[11px] text-gray-500 leading-relaxed">
        Tip: if you were invited with a temporary password, change it here as soon as you sign in.
      </p>
    </form>
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
