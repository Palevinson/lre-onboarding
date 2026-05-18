-- ============================================================================
-- Add 'Download Legacy Title App' task
-- ----------------------------------------------------------------------------
-- Real-estate net sheets / buyer estimates tool. Two action buttons: iOS App
-- Store and Google Play.
-- ============================================================================

insert into task_templates (
  audience, sort_order, title, description, is_optional, actions
)
select
  'agent', 125,
  'Download Legacy Title App',
  'Mobile tool for generating Net Sheets and Buyer''s Estimates on the go. Tap the link for your device.',
  false,
  '[
    {"url":"https://apps.apple.com/us/app/legacytitleok/id6760124346","label":"iOS · App Store"},
    {"url":"https://play.google.com/store/apps/details?id=com.legacytitle.ok","label":"Android · Google Play"}
  ]'::jsonb
where not exists (
  select 1 from task_templates where title = 'Download Legacy Title App'
);
