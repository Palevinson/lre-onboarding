-- ============================================================================
-- Headshot task → upload + roster display
-- ----------------------------------------------------------------------------
-- Rewrites the headshot task so agents upload their photo in the app (instead
-- of emailing it). Tags it with kind='headshot' so the roster and agent
-- detail pages can find it and use the upload as the agent's avatar.
-- ============================================================================

-- 1. Add a `kind` column so special tasks (headshot, future ones) are
--    identifiable by purpose rather than fragile title matching.
alter table task_templates add column if not exists kind text;

-- 2. Rewrite the headshot task
update task_templates
set
  title = 'Upload your headshot',
  description = 'A clean, professional headshot for the team roster, website, and marketing. Tap upload below to add yours — JPG or PNG works best.',
  allow_upload = true,
  upload_label = 'Upload headshot',
  actions = '[]'::jsonb,
  kind = 'headshot'
where title like 'Get headshot%' or title like 'Upload your headshot%';
