'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) { setError(error.message); setLoading(false); return }
    // If email confirmation is OFF in Supabase, user is signed in immediately.
    // If it's ON, they'll need to click the confirmation link.
    router.push('/dashboard')
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="text-white font-serif text-4xl tracking-wide">LRE</div>
        <div className="text-amber-500 text-xs tracking-widest uppercase mt-1">Agent Onboarding</div>
      </div>
      <form onSubmit={handleSignup} className="bg-gray-900 rounded-2xl p-8 space-y-4">
        <h1 className="text-white text-lg font-semibold mb-6">Create Your Account</h1>
        {error && <div className="bg-red-500/10 text-red-400 text-xs p-3 rounded-lg">{error}</div>}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-widest block mb-1.5">Full Name</label>
          <input
            type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
            className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:border-amber-500 outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-widest block mb-1.5">Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:border-amber-500 outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-widest block mb-1.5">Password</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
            className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:border-amber-500 outline-none"
          />
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full bg-amber-500 text-black font-semibold py-2.5 rounded-lg text-sm hover:bg-amber-400 disabled:opacity-50 mt-2"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
        <p className="text-center text-xs text-gray-500 pt-2">
          Already have an account? <a href="/login" className="text-amber-500 hover:underline">Sign In</a>
        </p>
      </form>
    </div>
  )
}
