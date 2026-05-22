-- ============================================================================
-- Decision-style tasks (Yes / Maybe Later)
-- ----------------------------------------------------------------------------
-- Some optional tasks (office rental, paid CRM seat, etc.) deserve a richer
-- response than a single checkbox — agents make an active choice between
-- "Yes" or "Maybe Later" and the brokerage sees which it was.
-- ============================================================================

alter table task_templates
  add column if not exists response_type text not null default 'checkbox';
-- Allowed values: 'checkbox' (current default) | 'decision' (Yes / Maybe Later)

alter table task_completions
  add column if not exists response_value text;
-- For decision-type tasks: 'yes' | 'maybe_later'.  NULL for checkbox tasks.

-- Flip the optional 'Assign office' task to decision mode
update task_templates
  set response_type = 'decision'
  where title = 'Assign office';
