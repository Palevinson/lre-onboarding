'use client'
import { useState } from 'react'
import { Globe, Loader2, Check, AlertCircle } from 'lucide-react'

export default function PublishAllButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const run = async () => {
    if (state === 'loading') return
    if (!confirm('Publish all active agents to the public LRE Realty website?')) return
    setState('loading'); setMsg('')
    try {
      const res = await fetch('/api/website-sync/all', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setState('error')
        setMsg(
          data.error === 'website_sync_not_configured'
            ? 'Website sync isn’t configured yet (missing env vars).'
            : data.error || 'Something went wrong.',
        )
        return
      }
      setState('done')
      setMsg(`Published ${data.synced} of ${data.total} to the website.`)
    } catch {
      setState('error'); setMsg('Network error.')
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={run}
        disabled={state === 'loading'}
        className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
      >
        {state === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
        {state === 'loading' ? 'Publishing…' : 'Publish agents to website'}
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
