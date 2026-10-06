-- LRE Onboarding — agent title/designation for the public website profile.
-- Paste into the onboarding Supabase SQL editor (no markdown fences on purpose).
-- When set, this overrides the role-derived title on lrerealty.com/agents/<slug>.

alter table profiles add column if not exists title text;
