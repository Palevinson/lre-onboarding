-- ============================================================================
-- Agent public-profile fields: bio + social links
-- ----------------------------------------------------------------------------
-- Adds a bio and a keyed jsonb for social media URLs on profiles. These flow
-- through the /api/website-sync webhook to lrerealty.com/agents/<slug> the
-- same way the phone/team/website fields do.
--
-- social_links shape:
--   { instagram?: string, facebook?: string, linkedin?: string,
--     youtube?: string, tiktok?: string, x?: string }
-- ============================================================================

alter table profiles add column if not exists bio text;
alter table profiles add column if not exists social_links jsonb not null default '{}'::jsonb;

-- RLS already allows self-update via "Users can update own profile", no policy change needed.
