import type { SupabaseClient } from '@supabase/supabase-js'
import { createHmac } from 'node:crypto'
import { getHeadshotUrls } from '@/lib/headshots'
import type { Profile } from '@/lib/types'

/**
 * Push agent profiles to the public LRE Realty website (lrerealty.com/agents/<slug>).
 * Shared by /api/website-sync (single/self) and /api/website-sync/all (bulk, admin).
 * See lre-website/docs/agent-profile-pipeline.md.
 *
 * Env: WEBSITE_AGENT_WEBHOOK_URL, WEBSITE_AGENT_WEBHOOK_SECRET.
 */

type PublicProfile = Profile & {
  phone?: string | null
  team_name?: string | null
  website_url?: string | null
}

export type SyncResult = {
  ok: boolean
  profileId: string
  name?: string
  httpStatus?: number
  slug?: string
  error?: string
}

export function websiteSyncConfigured(): boolean {
  return !!(process.env.WEBSITE_AGENT_WEBHOOK_URL && process.env.WEBSITE_AGENT_WEBHOOK_SECRET)
}

/** Build + sign + POST one profile to the website. `admin` must be a service-role client. */
export async function syncProfileById(
  admin: SupabaseClient,
  profileId: string,
  status: 'draft' | 'published' = 'published',
): Promise<SyncResult> {
  const url = process.env.WEBSITE_AGENT_WEBHOOK_URL
  const secret = process.env.WEBSITE_AGENT_WEBHOOK_SECRET
  if (!url || !secret) return { ok: false, profileId, error: 'website_sync_not_configured' }

  const { data: target } = await admin.from('profiles').select('*').eq('id', profileId).single()
  if (!target) return { ok: false, profileId, error: 'profile_not_found' }
  const profile = target as PublicProfile

  const headshots = await getHeadshotUrls(admin, [profile.id])
  const photoUrl = headshots.get(profile.id)

  const payload = {
    agent_id: profile.id,
    name: profile.full_name ?? profile.email,
    title: profile.role === 'manager' ? 'Team Lead' : 'Real Estate Agent',
    phone: profile.phone ?? undefined,
    email: profile.email,
    team: profile.team_name ?? undefined,
    website: profile.website_url ?? undefined,
    photo: photoUrl ? { url: photoUrl } : undefined,
    status,
  }

  const raw = JSON.stringify(payload)
  const signature = 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex')

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-LRE-Signature': signature },
      body: raw,
    })
    const result = (await res.json().catch(() => ({}))) as { slug?: string; error?: string }
    return {
      ok: res.ok,
      profileId,
      name: profile.full_name ?? profile.email,
      httpStatus: res.status,
      slug: result.slug,
      error: res.ok ? undefined : result.error ?? `http_${res.status}`,
    }
  } catch (e) {
    return { ok: false, profileId, name: profile.full_name ?? profile.email, error: String(e) }
  }
}
