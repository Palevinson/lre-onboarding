import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SignOutButton from '@/components/SignOutButton'
import { LogOut } from 'lucide-react'

/**
 * Shown to signed-in users whose profile has is_active = false (departed
 * from the brokerage). Keeps the account intact for history/1099 purposes
 * but blocks access to every other page.
 *
 * Deliberately standalone (not inside the (dashboard) group) so it doesn't
 * run requireProfile — which would redirect right back here.
 */
export default async function AccessRevokedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // If somehow an active user lands here, send them to the dashboard
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active, full_name, email, departed_at')
    .eq('id', user.id)
    .single()
  if (profile?.is_active) redirect('/dashboard')

  const departedOn = profile?.departed_at
    ? new Date(profile.departed_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <div className="text-white font-serif text-4xl tracking-wide">LRE</div>
          <div className="text-amber-500 text-xs tracking-widest uppercase mt-1">Agent Onboarding</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-5">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <LogOut className="w-6 h-6 text-amber-500" />
          </div>
          <h1 className="text-white text-xl font-semibold">You&apos;re no longer with LRE Realty</h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            {profile?.full_name ? <>Hi <span className="text-white">{profile.full_name}</span>,</> : ''}
            {' '}your access to the LRE Onboarding portal has been archived.
            {departedOn && (
              <> Marked as departed on <span className="text-white">{departedOn}</span>.</>
            )}
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Your records remain intact for 1099 and compliance purposes. If this
            was done by mistake, contact{' '}
            <a href="mailto:leadership@lrerealty.com" className="text-amber-500 hover:underline">
              leadership@lrerealty.com
            </a>
            {' '}and ask to be reinstated.
          </p>
          <div className="pt-2">
            <SignOutButton />
          </div>
        </div>
      </div>
    </div>
  )
}
