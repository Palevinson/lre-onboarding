'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, KeyRound, AlertCircle, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [authReady, setAuthReady] = useState(false)

  // Make sure the recovery session actually exists. If not, the link was
  // expired or already used — send the user back to /forgot-password.
  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/forgot-password?error=expired')
        return
      }
      setAuthReady(true)
    }
    check()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (next.length < 8) { setError('Password must be at least 8 characters'); return }
    if (next !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: next })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSuccess(true)
    // Brief celebration, then send them to the dashboard
    setTimeout(() => router.push('/dashboard'), 1500)
  }

  if (!authReady) {
    return (
      <div className="w-full max-w-sm text-center text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="text-white font-serif text-4xl tracking-wide">LRE</div>
        <div className="text-amber-500 text-xs tracking-widest uppercase mt-1">Agent Onboarding</div>
      </div>

      {success ? (
        <div className="bg-gray-900 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mb-4">
            <Check className="w-6 h-6 text-green-400" />
          </div>
          <h1 className="text-white text-lg font-semibold mb-2">Password updated</h1>
          <p className="text-sm text-gray-400">Signing you in…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-8 space-y-4">
          <div className="text-center pb-3">
            <KeyRound className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <h1 className="text-white text-lg font-semibold">Set New Password</h1>
            <p className="text-xs text-gray-400 mt-1">Pick something you'll remember.</p>
          </div>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest block mb-1.5">New Password</label>
            <input
              type="password" value={next} onChange={e => setNext(e.target.value)} required minLength={8} autoFocus
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:border-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest block mb-1.5">Confirm Password</label>
            <input
              type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:border-amber-500 outline-none"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-amber-500 text-black font-semibold py-2.5 rounded-lg text-sm hover:bg-amber-400 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : 'Update Password'}
          </button>
          <p className="text-center text-xs text-gray-500 pt-2">
            <Link href="/login" className="text-amber-500 hover:underline">Back to Sign In</Link>
          </p>
        </form>
      )}
    </div>
  )
}
