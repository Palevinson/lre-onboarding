-- ============================================================================
-- Task Action Links
-- ----------------------------------------------------------------------------
-- Each task can optionally have an action_url (external link or mailto:) and
-- an action_label for the button text. Backfills the most obvious links from
-- the LRE onboarding PDF.
-- ============================================================================

alter table task_templates add column if not exists action_url text;
alter table task_templates add column if not exists action_label text;

-- Backfill known links from the onboarding packet
update task_templates set
  action_url = 'https://www.irs.gov/pub/irs-pdf/fw9.pdf',
  action_label = 'Get W-9 form'
  where title = 'Fill out W9' and action_url is null;

update task_templates set
  action_url = 'mailto:ambassador@lrerealty.com?subject=Dotloop%20Access',
  action_label = 'Email Ambassador'
  where title = 'Added to Dotloop' and action_url is null;

update task_templates set
  action_url = 'mailto:ambassador@lrerealty.com?subject=Lofty%20Access',
  action_label = 'Email Ambassador'
  where title = 'Added to Lofty CRM' and action_url is null;

update task_templates set
  action_url = 'mailto:ambassador@lrerealty.com?subject=Headshot',
  action_label = 'Email Headshot'
  where title like 'Get headshot%' and action_url is null;

update task_templates set
  action_url = 'mailto:leadership@lrerealty.com?subject=Office%20Rental',
  action_label = 'Email Leadership'
  where title = 'Assign office' and action_url is null;

update task_templates set
  action_url = '/intake',
  action_label = 'Open intake form'
  where title = 'Fill out new agent survey' and action_url is null;

update task_templates set
  action_url = 'https://okcmar.org/membership/',
  action_label = 'OKCMAR membership'
  where title = 'All dues paid to boards' and action_url is null;
