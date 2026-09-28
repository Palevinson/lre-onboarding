-- LRE Onboarding — public-profile fields for the website sync.
-- Paste into the Supabase SQL editor (no markdown fences on purpose).
-- These feed lrerealty.com/agents/<slug> via /api/website-sync.

alter table profiles add column if not exists phone       text;
alter table profiles add column if not exists team_name   text;
alter table profiles add column if not exists website_url text;
