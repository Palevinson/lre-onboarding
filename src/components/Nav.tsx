import Link from 'next/link'
import { Settings } from 'lucide-react'
import SignOutButton from './SignOutButton'
import type { Profile } from '@/lib/types'

const AGENT_LINKS = [
  { href: '/dashboard',     label: 'Dashboard' },
  { href: '/welcome-week',  label: 'Welcome Week' },
  { href: '/intake',        label: 'Intake' },
  { href: '/reference',     label: 'Reference' },
  { href: '/team',          label: 'Team' },
]

const ADMIN_LINK = { href: '/admin', label: 'Admin' }

export default function Nav({ profile }: { profile: Profile }) {
  const links = profile.role === 'agent' ? AGENT_LINKS : [...AGENT_LINKS, ADMIN_LINK]
  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="flex items-baseline gap-2 shrink-0">
          <span className="text-white font-serif text-2xl tracking-wide">LRE</span>
          <span className="text-amber-500 text-[10px] tracking-widest uppercase">Onboarding</span>
        </Link>
        <div className="flex items-center gap-1 overflow-x-auto">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="text-gray-300 hover:text-amber-500 text-sm font-medium px-3 py-1.5 rounded-md whitespace-nowrap hover:bg-gray-800/50 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link
            href="/settings"
            className="text-gray-400 hover:text-amber-500 p-1.5 rounded-md hover:bg-gray-800/50 transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <SignOutButton />
        </div>
      </div>
    </nav>
  )
}
