'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types'

type Props = {
  targetProfileId: string
  targetEmail: string
  currentRole: UserRole
  isSelf: boolean
}

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'agent',   label: 'Agent',   description: 'Sees their onboarding only' },
  { value: 'manager', label: 'Manager', description: 'Roster + Leadership to-dos + invites' },
  { value: 'admin',   label: 'Admin',   description: 'Everything + content editor' },
]

export default function RoleSelector({ targetProfileId, targetEmail, currentRole, isSelf }: Props) {
  const router = useRouter()
  const [role, setRole] = useState<UserRole>(currentRole)
  const [, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [justSaved, setJustSaved] = useState(false)

  const change = async (next: UserRole) => {
    if (next === role || saving) return
    if (isSelf && next !== 'admin') {
      const ok = confirm(
        `You're about to change your OWN role from admin to ${next}. ` +
        `You'll lose access to the admin tools. Continue?`
      )
      if (!ok) return
    }
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ role: next })
      .eq('id', targetProfileId)
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setRole(next)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2500)
    startTransition(() => router.refresh())
  }

  return (
    <div className="bg-gray-900 border border-amber-500/20 rounded-2xl p-5 sm:p-6">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className="text-white font-semibold text-sm">Access Role</h2>
          <p className="text-xs text-gray-400 mt-1">
            Controls what {isSelf ? 'you' : targetEmail} can see and do.
          </p>
        </div>
        {justSaved && (
          <span className="inline-flex items-center text-xs text-green-400">
            <Check className="w-3.5 h-3.5 mr-1" /> Updated
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {ROLES.map(r => {
          const active = r.value === role
          return (
            <button
              key={r.value}
              onClick={() => change(r.value)}
              disabled={saving || active}
              className={`text-left p-3 rounded-lg border transition-colors ${
                active
                  ? 'bg-amber-500 text-black border-amber-500 cursor-default'
                  : 'bg-gray-800 text-gray-200 border-gray-700 hover:border-amber-500/60 disabled:opacity-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold">{r.label}</span>
                {active && saving && <Loader2 className="w-3 h-3 animate-spin" />}
              </div>
              <div className={`text-[11px] mt-0.5 ${active ? 'text-black/70' : 'text-gray-400'}`}>
                {r.description}
              </div>
            </button>
          )
        })}
      </div>

      {isSelf && (
        <p className="text-[11px] text-gray-500 mt-3">
          You're editing your own account — be careful. There's no built-in safeguard against demoting the last admin.
        </p>
      )}
    </div>
  )
}
