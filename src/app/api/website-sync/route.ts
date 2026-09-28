import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncProfileById, websiteSyncConfigured } from '@/lib/website-sync'

export const runtime = 'nodejs'

/**
 * Push one agent's profile to the public LRE Realty website.
 * Create AND update — onboarding fires this after a headshot upload / profile save,
 * and admins can trigger it manually. The website upserts on agent_id, so the
 * profile URL stays stable and edits sync automatically.
 *
 * Auth: the signed-in agent may sync themselves; managers/admins may sync anyone
 * via { profileId }. Body also accepts { status: 'draft' | 'published' } (default
 * 'published' — pass 'draft' to hide a profile from the website).
 */
export async function POST(request: NextRequest) {
  if (!websiteSyncConfigured()) {
    return NextResponse.json({ error: 'website_sync_not_configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!me) return NextResponse.json({ error: 'no_profile' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as {
    profileId?: string
    status?: 'draft' | 'published'
  }

  const targetId = body.profileId ?? me.id
  const isPrivileged = me.role === 'manager' || me.role === 'admin'
  if (targetId !== me.id && !isPrivileged) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const result = await syncProfileById(admin, targetId, body.status ?? 'published')
  return NextResponse.json(result, { status: result.ok ? 200 : 502 })
}
