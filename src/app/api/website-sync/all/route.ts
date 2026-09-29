import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncProfileById, websiteSyncConfigured } from '@/lib/website-sync'

export const runtime = 'nodejs'

/**
 * Bulk-publish all active agents/staff to the public LRE Realty website.
 *
 * Two ways to trigger — no user login needed for the automated paths:
 *   - GET  : cron/server-to-server only. Requires `Authorization: Bearer <CRON_SECRET>`
 *            (Vercel Cron sends this automatically when CRON_SECRET is set). Used by
 *            the nightly cron in vercel.json.
 *   - POST : the admin "Publish agents to website" button (logged-in manager/admin),
 *            OR the same Bearer CRON_SECRET for scripted/manual server-to-server runs.
 *
 * Per-agent auto-sync (headshot upload / profile save) already runs without any of
 * this; this endpoint is the backstop that keeps the whole roster in sync hands-off.
 */

function hasCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

async function isAdminSession(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return !!me && (me.role === 'manager' || me.role === 'admin')
}

async function runBulk() {
  const admin = createAdminClient()
  const { data: profiles } = await admin.from('profiles').select('id').eq('is_active', true)
  const ids = (profiles ?? []).map((p) => p.id as string)
  const results = []
  for (const id of ids) {
    results.push(await syncProfileById(admin, id, 'published')) // sequential — rosters are small
  }
  const synced = results.filter((r) => r.ok).length
  return { ok: true, total: ids.length, synced, results }
}

export async function GET(request: NextRequest) {
  if (!websiteSyncConfigured()) {
    return NextResponse.json({ error: 'website_sync_not_configured' }, { status: 503 })
  }
  if (!hasCronSecret(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return NextResponse.json(await runBulk())
}

export async function POST(request: NextRequest) {
  if (!websiteSyncConfigured()) {
    return NextResponse.json({ error: 'website_sync_not_configured' }, { status: 503 })
  }
  if (!hasCronSecret(request) && !(await isAdminSession())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  return NextResponse.json(await runBulk())
}
