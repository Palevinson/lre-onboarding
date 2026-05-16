-- ============================================================================
-- Dynamic Intake Questions
-- ----------------------------------------------------------------------------
-- Adds an admin-editable question system for the intake form. Each agent's
-- answers are stored in agent_intake.responses (jsonb) keyed by question UUID,
-- so renaming a question doesn't lose existing data.
--
-- Run this in the Supabase SQL Editor on your existing project.
-- Idempotent: safe to re-run.
-- ============================================================================

do $$ begin
  create type intake_field_type as enum ('text', 'textarea', 'date', 'number', 'email', 'phone', 'select', 'checkbox');
exception when duplicate_object then null; end $$;

create table if not exists intake_questions (
  id           uuid primary key default gen_random_uuid(),
  section      text not null default 'General',
  sort_order   int not null default 0,
  label        text not null,
  help_text    text,
  field_type   intake_field_type not null default 'text',
  is_required  boolean not null default false,
  options      text[],
  placeholder  text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists intake_questions_section_idx on intake_questions(section, sort_order);

-- Add jsonb responses column to agent_intake (keyed by question UUID)
alter table agent_intake add column if not exists responses jsonb not null default '{}'::jsonb;

-- RLS
alter table intake_questions enable row level security;
drop policy if exists "Authed can read questions" on intake_questions;
create policy "Authed can read questions" on intake_questions
  for select using (auth.uid() is not null);
drop policy if exists "Admins manage questions" on intake_questions;
create policy "Admins manage questions" on intake_questions
  for all using (is_admin()) with check (is_admin());

-- Seed default questions matching the original hardcoded form (only on first run)
do $$
begin
  if not exists (select 1 from intake_questions limit 1) then
    insert into intake_questions (section, sort_order, label, field_type, is_required, placeholder, help_text, options) values
      ('About You', 10,  'Birthday',                                'date',     false, null,                       null, null),
      ('About You', 20,  'Phone Number',                            'phone',    false, '(405) 555-1234',           null, null),
      ('About You', 30,  'Years as a Realtor',                      'number',   false, '0 if just licensed',       null, null),
      ('About You', 40,  'Three words that describe you',           'text',     false, 'e.g. driven, curious, loyal', null, null),
      ('About You', 50,  'Favorite Sonic drink',                    'text',     false, null,                       null, null),
      ('About You', 60,  'What your family is like',                'textarea', false, null,                       null, null),
      ('About You', 70,  'The highlight of your life so far',       'textarea', false, null,                       null, null),
      ('About You', 80,  'Favorite restaurant',                     'text',     false, null,                       null, null),
      ('About You', 90,  'Most people don''t know that you...',     'textarea', false, null,                       null, null),
      ('About You', 100, 'If you could visit any place',            'text',     false, null,                       null, null),
      ('About You', 110, 'Your favorite thing about real estate',   'textarea', false, null,                       null, null),

      ('Contact Information', 10, 'Primary Mailing Address',         'text', false, null,  null, null),
      ('Contact Information', 20, 'City',                            'text', false, null,  null, null),
      ('Contact Information', 30, 'State',                           'text', false, 'OK',  null, null),
      ('Contact Information', 40, 'County',                          'text', false, null,  null, null),
      ('Contact Information', 50, 'Zip',                             'text', false, null,  null, null),

      ('Personal Details', 10, 'Gender',                'select', false, null, null,                                                   ARRAY['Male','Female']),
      ('Personal Details', 20, 'Marital Status',        'select', false, null, null,                                                   ARRAY['Single','Married']),
      ('Personal Details', 30, 'Business / LLC Name',   'text',   false, null, 'EIN is intentionally not collected — submit your W9 to Dotloop.', null),

      ('Emergency Contact', 10, 'Name',          'text',  false, null,                          null, null),
      ('Emergency Contact', 20, 'Relationship',  'text',  false, 'Spouse, parent, etc.',        null, null),
      ('Emergency Contact', 30, 'Cell Phone',    'phone', false, null,                          null, null),

      ('Brokerage Logistics', 10, 'T-Shirt Size',                          'select',   false, null, null,                                                          ARRAY['S','M','L','XL','XXL']),
      ('Brokerage Logistics', 20, 'Recruited By',                          'text',     false, null, null,                                                          null),
      ('Brokerage Logistics', 30, 'I have submitted my W9 to Dotloop',     'checkbox', false, null, 'W9 contains your SSN — submit it directly to Dotloop, not here.', null);
  end if;
end $$;
