'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, UserPlus, AlertCircle, Mail } from 'lucide-react'

type Result = {
  email: string
  full_name: string
  role: string
  sent_at: string
}

export default function InviteForm({ canCreateStaff }: { canCreateStaff: boolean }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [role, setRole] = useState<'agent' | 'manager' | 'admin'>('agent')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          full_name: fullName.trim(),
          start_date: startDate || null,
          role,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong')
      } else {
        setResult(json)
        setEmail(''); setFullName(''); setStartDate(''); setRole('agent')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  if (result) return <ResultCard result={result} onAnother={() => setResult(null)} />

  return (
    <form onSubmit={submit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      <Field label="Full Name">
        <input
          type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
          placeholder="Jane Doe"
          className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
        />
      </Field>
      <Field label="Email">
        <input
          type="email" required value={email} onChange={e => setEmail(e.target.value)}
          placeholder="jane@example.com"
          className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
        />
      </Field>
      <Field label="Start Date (optional)">
        <input
          type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
          className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
        />
      </Field>
      {canCreateStaff && (
        <Field label="Role">
          <div className="flex flex-wrap gap-2">
            {(['agent', 'manager', 'admin'] as const).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`px-3.5 py-1.5 rounded-lg text-sm border transition-colors capitalize ${
                  role === r
                    ? 'bg-amber-500 text-black border-amber-500 font-semibold'
                    : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-600'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </Field>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-amber-500 text-black font-semibold py-2.5 rounded-lg text-sm hover:bg-amber-400 disabled:opacity-50 inline-flex items-center justify-center gap-2 mt-2"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending invite…</> : <><UserPlus className="w-4 h-4" /> Send Invite</>}
      </button>

      <p className="text-[11px] text-gray-500 leading-relaxed">
        We'll email them a welcome link to set their password and sign in.
        Supabase free tier allows ~4 invite emails per hour.
      </p>
    </form>
  )
}

function ResultCard({ result, onAnother }: { result: Result; onAnother: () => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
        <Check className="w-4 h-4" />
        Invite sent to <strong className="text-white">{result.email}</strong>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-3">
            <Mail className="w-6 h-6 text-amber-500" />
          </div>
          <h2 className="text-white text-lg font-semibold mb-1">Welcome email is on the way</h2>
          <p className="text-sm text-gray-400">
            <strong className="text-white">{result.full_name}</strong> will get an email at{' '}
            <strong className="text-white">{result.email}</strong> with a link to set their password and sign in.
          </p>
        </div>
        <div className="bg-gray-800/40 border border-gray-800 rounded-lg p-4 text-xs text-gray-400 space-y-2 leading-relaxed">
          <p><strong className="text-white">Didn't arrive?</strong></p>
          <ul className="space-y-1 list-disc list-outside ml-5">
            <li>Check their spam / promotions folder — sender is <code className="text-amber-400">noreply@mail.app.supabase.io</code></li>
            <li>Tell them to go to <a href="/login" className="text-amber-500 hover:underline">login</a> → <strong>Forgot password?</strong> for a fresh link</li>
          </ul>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onAnother}
          className="flex-1 bg-amber-500 text-black font-semibold py-2.5 rounded-lg text-sm hover:bg-amber-400"
        >
          Invite Another
        </button>
        <a
          href="/admin"
          className="flex-1 bg-gray-800 text-gray-300 font-semibold py-2.5 rounded-lg text-sm hover:bg-gray-700 text-center"
        >
          Back to Roster
        </a>
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
