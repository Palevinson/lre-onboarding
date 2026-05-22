-- ============================================================================
-- Free downloadable files on reference docs
-- ----------------------------------------------------------------------------
-- Adds an optional file attachment (PDF/EPUB) to any reference document.
-- Stored in a private bucket; only signed-in users can read.
-- Used for things like books, training PDFs, brokerage handbooks.
-- ============================================================================

alter table reference_docs add column if not exists file_path text;
alter table reference_docs add column if not exists file_filename text;

-- Private bucket for reference attachments
insert into storage.buckets (id, name, public)
values ('reference-files', 'reference-files', false)
on conflict (id) do update set public = false;

-- Storage policies: any signed-in user can read; only admins can write
drop policy if exists "Authed read reference files" on storage.objects;
create policy "Authed read reference files" on storage.objects
  for select using (bucket_id = 'reference-files' and auth.uid() is not null);

drop policy if exists "Admins upload reference files" on storage.objects;
create policy "Admins upload reference files" on storage.objects
  for insert with check (bucket_id = 'reference-files' and is_admin());

drop policy if exists "Admins update reference files" on storage.objects;
create policy "Admins update reference files" on storage.objects
  for update using (bucket_id = 'reference-files' and is_admin());

drop policy if exists "Admins delete reference files" on storage.objects;
create policy "Admins delete reference files" on storage.objects
  for delete using (bucket_id = 'reference-files' and is_admin());
