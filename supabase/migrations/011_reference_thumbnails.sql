-- ============================================================================
-- Reference doc thumbnails (book covers, etc.)
-- ----------------------------------------------------------------------------
-- Adds a thumbnail_url column on reference_docs and a PUBLIC storage bucket
-- so covers can be hot-linked from the library list and detail pages without
-- generating signed URLs on every render.
-- ============================================================================

alter table reference_docs add column if not exists thumbnail_url text;

-- Public bucket — covers are not sensitive
insert into storage.buckets (id, name, public)
values ('reference-thumbnails', 'reference-thumbnails', true)
on conflict (id) do update set public = true;

-- Policies: anyone can read (bucket is public anyway); only admins can write
drop policy if exists "Public read reference thumbnails" on storage.objects;
create policy "Public read reference thumbnails" on storage.objects
  for select using (bucket_id = 'reference-thumbnails');

drop policy if exists "Admins upload reference thumbnails" on storage.objects;
create policy "Admins upload reference thumbnails" on storage.objects
  for insert with check (bucket_id = 'reference-thumbnails' and is_admin());

drop policy if exists "Admins update reference thumbnails" on storage.objects;
create policy "Admins update reference thumbnails" on storage.objects
  for update using (bucket_id = 'reference-thumbnails' and is_admin());

drop policy if exists "Admins delete reference thumbnails" on storage.objects;
create policy "Admins delete reference thumbnails" on storage.objects
  for delete using (bucket_id = 'reference-thumbnails' and is_admin());
