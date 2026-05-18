import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Find the headshot task template id (kind='headshot'), then fetch all
 * profile_id → signed URL pairs for agents who have uploaded a headshot.
 *
 * Returns an empty Map if no headshot task is configured or no uploads exist.
 * Each signed URL is valid for 1 hour.
 */
export async function getHeadshotUrls(
  supabase: SupabaseClient,
  profileIds: string[]
): Promise<Map<string, string>> {
  const empty = new Map<string, string>()
  if (profileIds.length === 0) return empty

  const { data: tpl } = await supabase
    .from('task_templates')
    .select('id')
    .eq('kind', 'headshot')
    .maybeSingle()
  if (!tpl) return empty

  const { data: completions } = await supabase
    .from('task_completions')
    .select('profile_id, upload_path')
    .eq('template_id', tpl.id)
    .in('profile_id', profileIds)
    .not('upload_path', 'is', null)

  const rows = (completions ?? []).filter((c): c is { profile_id: string; upload_path: string } => !!c.upload_path)
  if (rows.length === 0) return empty

  const paths = rows.map(r => r.upload_path)
  const { data: signed } = await supabase.storage
    .from('task-uploads')
    .createSignedUrls(paths, 60 * 60)

  const urls = empty
  if (signed) {
    const pathToProfile = new Map(rows.map(r => [r.upload_path, r.profile_id]))
    for (const s of signed) {
      if (s.signedUrl && s.path) {
        const pid = pathToProfile.get(s.path)
        if (pid) urls.set(pid, s.signedUrl)
      }
    }
  }
  return urls
}
