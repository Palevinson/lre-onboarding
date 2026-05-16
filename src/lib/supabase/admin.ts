import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client. SERVER-SIDE ONLY — bypasses RLS.
 * Use only inside API routes after verifying the caller's role via cookie-based session.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
