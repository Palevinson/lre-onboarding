import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncProfileById, websiteSyncConfigured } from '@/lib/website-sync'

export const runtime = 'nodejs'

/**
 * Bulk-publish all active agents/staff to the public LRE Realty website.
 * Admin/manager only. Use this to populate the website's agent page in one click
 * with everyone already onboarded (auto-sync otherwise only fires on future edits).
 */
export async function POST() {
  if (!websiteSyncConfigured()) {
    return NextResponse.json({ error: 'website_sync_not_configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!me || (me.role !== 'manager' && me.role !== 'admin')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: profiles } = await admin
    .from('profiles')
    .select('id')
    .eq('is_active', true)

  const ids = (profiles ?? []).map((p) => p.id as string)
  const results = []
  for (const id of ids) {
    // Sequential to be gentle on the website endpoint (rosters are small).
    results.push(await syncProfileById(admin, id, 'published'))
  }

  const synced = results.filter((r) => r.ok).length
  return NextResponse.json({ ok: true, total: ids.length, synced, results })
}
