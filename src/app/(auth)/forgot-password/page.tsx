'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Mail, Check, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="text-white font-serif text-4xl tracking-wide">LRE</div>
        <div className="text-amber-500 text-xs tracking-widest uppercase mt-1">Agent Onboarding</div>
      </div>

      {sent ? (
        <div className="bg-gray-900 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mb-4">
            <Check className="w-6 h-6 text-green-400" />
          </div>
          <h1 className="text-white text-lg font-semibold mb-2">Check your email</h1>
          <p className="text-sm text-gray-400 leading-relaxed mb-6">
            If an account exists for <strong className="text-white">{email}</strong>, you'll get a password
            reset link shortly. The link expires in 1 hour.
          </p>
          <p className="text-xs text-gray-500 mb-6">
            Didn't receive it? Check your spam folder, or try again in a few minutes.
          </p>
          <Link
            href="/login"
            className="block w-full bg-amber-500 text-black font-semibold py-2.5 rounded-lg text-sm hover:bg-amber-400"
          >
            Back to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-8 space-y-4">
          <div className="text-center pb-3">
            <Mail className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <h1 className="text-white text-lg font-semibold">Reset Password</h1>
            <p className="text-xs text-gray-400 mt-1">We'll email you a reset link.</p>
          </div>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest block mb-1.5">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:border-amber-500 outline-none"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-amber-500 text-black font-semibold py-2.5 rounded-lg text-sm hover:bg-amber-400 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send Reset Link'}
          </button>
          <p className="text-center text-xs text-gray-500 pt-2">
            Remembered it? <Link href="/login" className="text-amber-500 hover:underline">Sign in</Link>
          </p>
        </form>
      )}
    </div>
  )
}
