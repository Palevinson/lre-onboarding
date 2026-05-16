'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const router = useRouter()
  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }
  return (
    <button
      onClick={handleSignOut}
      className="text-xs text-gray-400 hover:text-amber-500 px-3 py-1.5 rounded-md hover:bg-gray-800/50 transition-colors shrink-0"
    >
      Sign out
    </button>
  )
}
