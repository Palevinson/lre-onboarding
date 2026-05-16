'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Loader2, UserPlus, AlertCircle, Share2 } from 'lucide-react'

type Result = {
  email: string
  temp_password: string
  full_name: string
  role: string
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
        // Reset form fields for the next invite
        setEmail(''); setFullName(''); setStartDate(''); setRole('agent')
        router.refresh()  // refresh roster on /admin
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
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</> : <><UserPlus className="w-4 h-4" /> Create Account</>}
      </button>
    </form>
  )
}

function ResultCard({ result, onAnother }: { result: Result; onAnother: () => void }) {
  const loginUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login'
  const message =
    `Hi ${result.full_name.split(' ')[0]}! Welcome to LRE Realty. Your onboarding portal is ready:\n\n` +
    `Login: ${loginUrl}\n` +
    `Email: ${result.email}\n` +
    `Temporary password: ${result.temp_password}\n\n` +
    `Sign in and you can change your password under your profile.`

  return (
    <div className="space-y-4">
      <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
        <Check className="w-4 h-4" />
        Account created for <strong className="text-white">{result.full_name}</strong>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Share2 className="w-4 h-4 text-amber-500" />Share these with the agent
          </h2>
          <span className="text-[10px] uppercase tracking-widest text-amber-500/80 bg-amber-500/10 px-2 py-1 rounded">
            One-time only
          </span>
        </div>

        <CredField label="Login URL" value={loginUrl} />
        <CredField label="Email" value={result.email} />
        <CredField label="Temporary Password" value={result.temp_password} mono />

        <div className="border-t border-gray-800 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-widest">Ready-to-send message</span>
            <CopyButton text={message} label="Copy" />
          </div>
          <pre className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-xs text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">{message}</pre>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed pt-2">
          Save this password somewhere safe before navigating away — it won't be shown again.
          The agent can change it after signing in.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onAnother}
          className="flex-1 bg-amber-500 text-black font-semibold py-2.5 rounded-lg text-sm hover:bg-amber-400"
        >
          Invite Another Agent
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

function CredField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-400 uppercase tracking-widest">{label}</span>
        <CopyButton text={value} label="Copy" />
      </div>
      <div className={`bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white break-all ${mono ? 'font-mono' : ''}`}>
        {value}
      </div>
    </div>
  )
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 text-[11px] text-amber-500 hover:text-amber-400"
    >
      {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> {label}</>}
    </button>
  )
}
