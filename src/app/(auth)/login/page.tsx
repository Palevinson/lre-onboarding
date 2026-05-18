'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="text-white font-serif text-4xl tracking-wide">LRE</div>
        <div className="text-amber-500 text-xs tracking-widest uppercase mt-1">Agent Onboarding</div>
      </div>
      <form onSubmit={handleLogin} className="bg-gray-900 rounded-2xl p-8 space-y-4">
        <h1 className="text-white text-lg font-semibold mb-6">Sign In</h1>
        {error && <div className="bg-red-500/10 text-red-400 text-xs p-3 rounded-lg">{error}</div>}
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
            type="password" value={password} onChange={e => setPassword(e.target.value)} required
            className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:border-amber-500 outline-none"
          />
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full bg-amber-500 text-black font-semibold py-2.5 rounded-lg text-sm hover:bg-amber-400 disabled:opacity-50 mt-2"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
        <div className="text-center pt-2 space-y-1.5">
          <a href="/forgot-password" className="block text-xs text-amber-500 hover:underline">
            Forgot password?
          </a>
          <p className="text-xs text-gray-500">
            New agent? <a href="/signup" className="text-amber-500 hover:underline">Create your account</a>
          </p>
        </div>
      </form>
    </div>
  )
}
