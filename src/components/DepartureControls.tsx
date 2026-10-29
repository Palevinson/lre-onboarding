'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, UserX, UserCheck, AlertCircle, Archive } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  targetProfileId: string
  targetName: string
  isActive: boolean
  departedAt: string | null
  isSelf: boolean
}

export default function DepartureControls({
  targetProfileId,
  targetName,
  isActive,
  departedAt,
  isSelf,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  const depart = async () => {
    if (isSelf) {
      alert(
        'You cannot mark yourself as departed. Have another admin do it, ' +
        'or demote yourself to agent first (then an admin can archive you).'
      )
      return
    }
    const ok = confirm(
      `Mark ${targetName} as no longer with LRE Realty?\n\n` +
      `• They will immediately lose access to the onboarding portal.\n` +
      `• Their public profile will be hidden on lrerealty.com.\n` +
      `• All records (completions, intake, uploads) are kept.\n` +
      `• You can reinstate them any time if they come back.`
    )
    if (!ok) return

    setWorking(true)
    setError('')
    const supabase = createClient()

    // 1. Flip is_active off — the DB trigger stamps departed_at
    const { error: dbErr } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', targetProfileId)
    if (dbErr) {
      setError(dbErr.message)
      setWorking(false)
      return
    }

    // 2. Hide them from the public website (fire-and-forget, best effort)
    try {
      await fetch('/api/website-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: targetProfileId, status: 'draft' }),
      })
    } catch {
      // Website sync failures are logged on the website side; non-fatal here
    }

    setWorking(false)
    startTransition(() => router.refresh())
  }

  const reinstate = async () => {
    const ok = confirm(
      `Reinstate ${targetName}?\n\n` +
      `• They will immediately regain access to the onboarding portal.\n` +
      `• Their public profile will be re-published on lrerealty.com.`
    )
    if (!ok) return

    setWorking(true)
    setError('')
    const supabase = createClient()

    const { error: dbErr } = await supabase
      .from('profiles')
      .update({ is_active: true })  // trigger clears departed_at
      .eq('id', targetProfileId)
    if (dbErr) {
      setError(dbErr.message)
      setWorking(false)
      return
    }

    try {
      await fetch('/api/website-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: targetProfileId, status: 'published' }),
      })
    } catch {}

    setWorking(false)
    startTransition(() => router.refresh())
  }

  if (!isActive) {
    const departedOn = departedAt
      ? new Date(departedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : null
    return (
      <div className="bg-gray-900 border border-amber-500/30 rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <Archive className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-white font-semibold text-sm mb-1">Archived — no longer with LRE Realty</h2>
            <p className="text-xs text-gray-400">
              {departedOn
                ? <>Marked as departed on <strong className="text-white">{departedOn}</strong>.</>
                : <>Marked as departed.</>}
              {' '}Portal access is blocked and their public profile is hidden from lrerealty.com.
            </p>
          </div>
        </div>
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        <button
          onClick={reinstate}
          disabled={working}
          className="inline-flex items-center gap-2 bg-amber-500 text-black font-semibold px-4 py-2 rounded-lg text-sm hover:bg-amber-400 disabled:opacity-50"
        >
          {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
          Reinstate
        </button>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className="text-white font-semibold text-sm">Departure</h2>
          <p className="text-xs text-gray-400 mt-1">
            Mark {isSelf ? 'yourself' : targetName.split(' ')[0]} as no longer with LRE Realty.
          </p>
        </div>
      </div>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      <button
        onClick={depart}
        disabled={working}
        className="inline-flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/30 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-red-500 hover:text-white disabled:opacity-50"
      >
        {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
        Mark as Departed
      </button>
      <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
        Access to the portal is blocked immediately. Their public profile on lrerealty.com is hidden.
        All records (completions, intake, uploads) are kept — you can reinstate them any time.
      </p>
    </div>
  )
}
