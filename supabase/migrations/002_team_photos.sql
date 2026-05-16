-- ============================================================================
-- Team Contact Photos
-- ----------------------------------------------------------------------------
-- Adds a photo_url column to team_contacts and creates a public Supabase
-- Storage bucket so admins can upload team member photos directly from the
-- admin panel.
-- ============================================================================

-- Photo URL column on team_contacts
alter table team_contacts add column if not exists photo_url text;

-- Create the public bucket for team photos (idempotent)
insert into storage.buckets (id, name, public)
values ('team-photos', 'team-photos', true)
on conflict (id) do update set public = true;

-- Storage policies: anyone authed can read, only admins write
drop policy if exists "Authed can read team photos" on storage.objects;
create policy "Authed can read team photos" on storage.objects
  for select using (bucket_id = 'team-photos' and auth.uid() is not null);

drop policy if exists "Admins upload team photos" on storage.objects;
create policy "Admins upload team photos" on storage.objects
  for insert with check (bucket_id = 'team-photos' and is_admin());

drop policy if exists "Admins update team photos" on storage.objects;
create policy "Admins update team photos" on storage.objects
  for update using (bucket_id = 'team-photos' and is_admin());

drop policy if exists "Admins delete team photos" on storage.objects;
create policy "Admins delete team photos" on storage.objects
  for delete using (bucket_id = 'team-photos' and is_admin());
