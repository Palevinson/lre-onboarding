import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Auth callback for Supabase email links (password recovery, magic link, etc.).
 * The email link points here with a `code` param; we exchange it for a session
 * cookie and then redirect to the page in `next`.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  // Safe-list: only allow internal next paths so query manipulation can't redirect off-site
  const safeNext = next.startsWith('/') ? next : '/dashboard'
  return NextResponse.redirect(`${origin}${safeNext}`)
}
