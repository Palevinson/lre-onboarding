'use client'
import { useState } from 'react'
import { Globe, Loader2, Check, AlertCircle, EyeOff } from 'lucide-react'

/** Publish (or hide) a single agent's profile on the public website. */
export default function PublishAgentButton({ profileId }: { profileId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const run = async (status: 'published' | 'draft') => {
    if (state === 'loading') return
    setState('loading'); setMsg('')
    try {
      const res = await fetch('/api/website-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, status }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setState('error')
        setMsg(
          data.error === 'website_sync_not_configured'
            ? 'Website sync isn’t configured yet.'
            : data.error || 'Failed.',
        )
        return
      }
      setState('done')
      setMsg(status === 'published' ? 'Published to website.' : 'Hidden from website.')
    } catch {
      setState('error'); setMsg('Network error.')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => run('published')}
        disabled={state === 'loading'}
        className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
      >
        {state === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
        Publish to website
      </button>
      <button
        onClick={() => run('draft')}
        disabled={state === 'loading'}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:border-gray-500 disabled:opacity-50"
      >
        <EyeOff className="w-3.5 h-3.5" /> Hide
      </button>
      {msg && (
        <span
          className={`inline-flex items-center gap-1 text-xs ${
            state === 'error' ? 'text-red-400' : 'text-green-400'
          }`}
        >
          {state === 'error' ? <AlertCircle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
          {msg}
        </span>
      )}
    </div>
  )
}
