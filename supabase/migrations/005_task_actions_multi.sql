-- ============================================================================
-- Multiple Action Links per Task (self-contained)
-- ----------------------------------------------------------------------------
-- Adds an `actions` jsonb array column on task_templates so each task can
-- offer multiple link/email buttons. Seeds the known LRE links directly so
-- this migration works regardless of whether the earlier action_url/label
-- columns were ever applied.
-- ============================================================================

alter table task_templates add column if not exists actions jsonb not null default '[]'::jsonb;

-- Seed actions for known tasks (only when actions is still empty, so re-running won't clobber edits)
update task_templates set actions = '[{"url":"https://www.irs.gov/pub/irs-pdf/fw9.pdf","label":"Get W-9 form"}]'::jsonb
  where title = 'Fill out W9' and actions = '[]'::jsonb;

update task_templates set actions = '[{"url":"mailto:ambassador@lrerealty.com?subject=Dotloop%20Access","label":"Email Ambassador"}]'::jsonb
  where title = 'Added to Dotloop' and actions = '[]'::jsonb;

update task_templates set actions = '[{"url":"mailto:ambassador@lrerealty.com?subject=Lofty%20Access","label":"Email Ambassador"}]'::jsonb
  where title = 'Added to Lofty CRM' and actions = '[]'::jsonb;

update task_templates set actions = '[{"url":"mailto:ambassador@lrerealty.com?subject=Headshot","label":"Email Headshot"}]'::jsonb
  where title like 'Get headshot%' and actions = '[]'::jsonb;

update task_templates set actions = '[{"url":"mailto:leadership@lrerealty.com?subject=Office%20Rental","label":"Email Leadership"}]'::jsonb
  where title = 'Assign office' and actions = '[]'::jsonb;

update task_templates set actions = '[{"url":"/intake","label":"Open intake form"}]'::jsonb
  where title = 'Fill out new agent survey' and actions = '[]'::jsonb;

-- Multi-option task: both boards
update task_templates set actions = '[
  {"url":"https://okcmar.org/membership/","label":"OKCMAR membership"},
  {"url":"https://www.edmondrealtors.com/","label":"Edmond Realtors"}
]'::jsonb
  where title = 'All dues paid to boards' and actions = '[]'::jsonb;
