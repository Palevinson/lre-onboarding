-- ============================================================================
-- Task File Uploads
-- ----------------------------------------------------------------------------
-- Admins can flag specific tasks as 'allow_upload'. Agents on those tasks
-- get an upload button; the file is stored in a private Supabase bucket and
-- the path is recorded on task_completions.
--
-- Also adds the new 'Register LLC with OREC' agent task.
-- ============================================================================

-- 1. Template flags
alter table task_templates add column if not exists allow_upload boolean not null default false;
alter table task_templates add column if not exists upload_label text;

-- 2. Per-agent upload record on completions
alter table task_completions add column if not exists upload_path text;
alter table task_completions add column if not exists upload_filename text;
alter table task_completions add column if not exists upload_uploaded_at timestamptz;

-- 3. Private storage bucket for task uploads
insert into storage.buckets (id, name, public)
values ('task-uploads', 'task-uploads', false)
on conflict (id) do update set public = false;

-- 4. Storage policies — agents own their folder; managers/admins read all
drop policy if exists "Agent uploads own task files" on storage.objects;
create policy "Agent uploads own task files" on storage.objects
  for insert with check (
    bucket_id = 'task-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Agent reads own task files" on storage.objects;
create policy "Agent reads own task files" on storage.objects
  for select using (
    bucket_id = 'task-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Managers read task files" on storage.objects;
create policy "Managers read task files" on storage.objects
  for select using (
    bucket_id = 'task-uploads'
    and is_manager_or_admin()
  );

drop policy if exists "Agent updates own task files" on storage.objects;
create policy "Agent updates own task files" on storage.objects
  for update using (
    bucket_id = 'task-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Agent deletes own task files" on storage.objects;
create policy "Agent deletes own task files" on storage.objects
  for delete using (
    bucket_id = 'task-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Insert the new Register LLC with OREC task
insert into task_templates (
  audience, sort_order, title, description, is_optional,
  allow_upload, upload_label, actions
)
select
  'agent', 35,
  'Register LLC with OREC',
  'Submit your LLC registration paperwork to the Oklahoma Real Estate Commission. Upload a screenshot, photo, or PDF of your submission confirmation as proof.',
  false,
  true,
  'Upload proof of OREC submission',
  '[{"url":"https://oklahoma.gov/orec.html","label":"OREC website"}]'::jsonb
where not exists (
  select 1 from task_templates where title = 'Register LLC with OREC'
);
