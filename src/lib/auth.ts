import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile, UserRole } from '@/lib/types'

/**
 * Get the current authed user's profile. Redirects to /login if not signed in.
 * Throws if the user is authed but has no profile row (shouldn't happen — the
 * handle_new_user trigger creates one).
 */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    // The auth.users row exists but the profile trigger didn't fire — sign out
    await supabase.auth.signOut()
    redirect('/login')
  }
  return profile as Profile
}

export async function requireRole(allowed: UserRole[]): Promise<Profile> {
  const profile = await requireProfile()
  if (!allowed.includes(profile.role)) redirect('/dashboard')
  return profile
}

export function isManagerOrAdmin(profile: Profile): boolean {
  return profile.role === 'manager' || profile.role === 'admin'
}
