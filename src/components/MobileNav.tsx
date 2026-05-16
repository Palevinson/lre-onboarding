'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Settings, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/lib/types'

type NavLink = { href: string; label: string }

export default function MobileNav({ links, profile }: { links: NavLink[]; profile: Profile }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // Close drawer when route changes
  useEffect(() => { setOpen(false) }, [pathname])

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="sm:hidden text-gray-300 hover:text-amber-500 p-2 -mr-2 rounded-md"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 sm:hidden bg-gray-950 flex flex-col">
          {/* Drawer header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
            <div className="flex items-baseline gap-2">
              <span className="text-white font-serif text-2xl tracking-wide">LRE</span>
              <span className="text-amber-500 text-[10px] tracking-widest uppercase">Onboarding</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-amber-500 p-2 -mr-2 rounded-md"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* User chip */}
          <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/40">
            <div className="text-white text-sm font-medium">{profile.full_name ?? profile.email}</div>
            <div className="text-xs text-gray-500 capitalize">{profile.role}</div>
          </div>

          {/* Links */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {links.map(l => {
              const active = pathname === l.href || (l.href !== '/dashboard' && pathname?.startsWith(l.href))
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`block px-4 py-3.5 rounded-lg text-base font-medium transition-colors ${
                    active
                      ? 'bg-amber-500 text-black'
                      : 'text-gray-200 hover:bg-gray-900 hover:text-amber-500'
                  }`}
                >
                  {l.label}
                </Link>
              )
            })}
          </nav>

          {/* Footer actions */}
          <div className="border-t border-gray-800 p-3 space-y-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Link
              href="/settings"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-900 hover:text-amber-500 text-sm"
            >
              <Settings className="w-4 h-4" /> Settings
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-900 hover:text-amber-500 text-sm w-full"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </>
  )
}
