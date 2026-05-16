-- ============================================================================
-- LRE Onboarding — Supabase schema
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query)
-- against a fresh Supabase project. Idempotent: safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ROLE TYPE
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('agent', 'manager', 'admin');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- PROFILES — one row per auth user, mirrors auth.users
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  role          user_role not null default 'agent',
  license_number text,
  start_date    date,
  mentor_id     uuid references profiles(id),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists profiles_role_idx on profiles(role);

-- Auto-create a profile row when a new auth user is created
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- TASK_TEMPLATES — the master Welcome Week / Leadership checklists
-- One template row per task; agent completions live in task_completions.
-- ---------------------------------------------------------------------------
do $$ begin
  create type task_audience as enum ('agent', 'leadership');
exception when duplicate_object then null; end $$;

create table if not exists task_templates (
  id          uuid primary key default gen_random_uuid(),
  audience    task_audience not null,
  sort_order  integer not null default 0,
  title       text not null,
  description text,
  is_optional boolean not null default false,
  cost_note   text,           -- e.g. "$8/mo", "$300/mo" for optional items
  owner_hint  text,           -- e.g. "Kaylee", "Ambassador"
  created_at  timestamptz not null default now()
);

create index if not exists task_templates_audience_idx on task_templates(audience, sort_order);

-- ---------------------------------------------------------------------------
-- TASK_COMPLETIONS — per-agent task progress
--   For 'agent' tasks, profile_id = the agent
--   For 'leadership' tasks, profile_id = the agent the leadership task is FOR;
--     completed_by = the manager who checked it off
-- ---------------------------------------------------------------------------
create table if not exists task_completions (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  template_id   uuid not null references task_templates(id) on delete cascade,
  completed     boolean not null default false,
  completed_at  timestamptz,
  completed_by  uuid references profiles(id),
  note          text,
  updated_at    timestamptz not null default now(),
  unique (profile_id, template_id)
);

create index if not exists task_completions_profile_idx on task_completions(profile_id);

-- ---------------------------------------------------------------------------
-- AGENT_INTAKE — the agent survey + non-sensitive personal info
-- (SSN intentionally NOT stored — W9 is uploaded to Dotloop per packet)
-- ---------------------------------------------------------------------------
create table if not exists agent_intake (
  id                   uuid primary key default gen_random_uuid(),
  profile_id           uuid not null unique references profiles(id) on delete cascade,
  -- survey fields
  birthday             date,
  three_words          text,
  favorite_sonic_drink text,
  family_description   text,
  life_highlight       text,
  favorite_restaurant  text,
  little_known_fact    text,
  dream_destination    text,
  years_as_realtor     numeric(4,1),
  favorite_part_re     text,
  phone_number         text,
  -- personal info (non-sensitive)
  mailing_address      text,
  city                 text,
  state                text,
  county               text,
  zip                  text,
  gender               text,
  marital_status       text,
  business_name        text,  -- LLC name only — NOT EIN
  emergency_contact_name  text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  tshirt_size          text,
  recruited_by         text,
  -- compliance gates (just checkboxes, no SSN/EIN stored)
  w9_submitted         boolean not null default false,
  submitted_at         timestamptz,
  updated_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- TEAM_CONTACTS — the LRE leadership directory shown to agents
-- ---------------------------------------------------------------------------
create table if not exists team_contacts (
  id          uuid primary key default gen_random_uuid(),
  sort_order  integer not null default 0,
  name        text not null,
  role        text not null,
  email       text,
  office      text,           -- e.g. "Office 36"
  description text not null,  -- what to contact them about
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- REFERENCE_DOCS — markdown content shown in the Reference Library
-- ---------------------------------------------------------------------------
create table if not exists reference_docs (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  category    text not null,           -- e.g. "compensation", "process", "checklist"
  sort_order  integer not null default 0,
  content     text not null,           -- markdown
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table profiles            enable row level security;
alter table task_templates      enable row level security;
alter table task_completions    enable row level security;
alter table agent_intake        enable row level security;
alter table team_contacts       enable row level security;
alter table reference_docs      enable row level security;

-- Helper: is the current user a manager or admin?
create or replace function is_manager_or_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
    and role in ('manager', 'admin')
  );
$$;

create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- PROFILES
drop policy if exists "Users can read own profile" on profiles;
create policy "Users can read own profile" on profiles
  for select using (auth.uid() = id);

drop policy if exists "Managers can read all profiles" on profiles;
create policy "Managers can read all profiles" on profiles
  for select using (is_manager_or_admin());

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

drop policy if exists "Admins can update any profile" on profiles;
create policy "Admins can update any profile" on profiles
  for update using (is_admin());

-- TASK_TEMPLATES — everyone signed-in can read; only admins write
drop policy if exists "Authenticated can read task templates" on task_templates;
create policy "Authenticated can read task templates" on task_templates
  for select using (auth.uid() is not null);

drop policy if exists "Admins can manage task templates" on task_templates;
create policy "Admins can manage task templates" on task_templates
  for all using (is_admin()) with check (is_admin());

-- TASK_COMPLETIONS
drop policy if exists "Users can read own completions" on task_completions;
create policy "Users can read own completions" on task_completions
  for select using (auth.uid() = profile_id);

drop policy if exists "Managers can read all completions" on task_completions;
create policy "Managers can read all completions" on task_completions
  for select using (is_manager_or_admin());

drop policy if exists "Users can upsert own agent-task completions" on task_completions;
create policy "Users can upsert own agent-task completions" on task_completions
  for insert with check (
    auth.uid() = profile_id
    and exists (select 1 from task_templates t where t.id = template_id and t.audience = 'agent')
  );

drop policy if exists "Users can update own agent-task completions" on task_completions;
create policy "Users can update own agent-task completions" on task_completions
  for update using (
    auth.uid() = profile_id
    and exists (select 1 from task_templates t where t.id = template_id and t.audience = 'agent')
  );

drop policy if exists "Managers manage all completions" on task_completions;
create policy "Managers manage all completions" on task_completions
  for all using (is_manager_or_admin()) with check (is_manager_or_admin());

-- AGENT_INTAKE — agent owns their row; managers can read
drop policy if exists "Agent owns intake" on agent_intake;
create policy "Agent owns intake" on agent_intake
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists "Managers can read intake" on agent_intake;
create policy "Managers can read intake" on agent_intake
  for select using (is_manager_or_admin());

-- TEAM_CONTACTS / REFERENCE_DOCS — public read for authed users, admin writes
drop policy if exists "Authed can read team" on team_contacts;
create policy "Authed can read team" on team_contacts
  for select using (auth.uid() is not null);
drop policy if exists "Admins manage team" on team_contacts;
create policy "Admins manage team" on team_contacts
  for all using (is_admin()) with check (is_admin());

drop policy if exists "Authed can read docs" on reference_docs;
create policy "Authed can read docs" on reference_docs
  for select using (auth.uid() is not null);
drop policy if exists "Admins manage docs" on reference_docs;
create policy "Admins manage docs" on reference_docs
  for all using (is_admin()) with check (is_admin());

-- ============================================================================
-- SEED DATA — Welcome Week + Leadership checklists from LRE onboarding packet
-- ============================================================================

-- Agent Welcome Week (page 1 of the packet)
insert into task_templates (audience, sort_order, title, description, is_optional, cost_note, owner_hint) values
  ('agent',  10, 'Attend Welcome Week onboarding', 'Tuesday @ 2p', false, null, 'Leadership'),
  ('agent',  20, 'All dues paid to boards', 'OKCMAR or Edmond Board of Realtors. Contact Member Care for current dues totals.', false, null, null),
  ('agent',  30, 'Fill out W9', 'Submit your signed W9 to Dotloop. (SSN stays on the form — not stored in this app.)', false, null, null),
  ('agent',  40, 'Fill out new agent survey', 'Complete the in-app intake form so the brokerage gets to know you.', false, null, 'Alexa McNeil'),
  ('agent',  50, 'Office tour and introductions to leadership', null, false, null, 'Leadership'),
  ('agent',  60, 'Add Google Calendar for LRE Education / Training', null, false, null, null),
  ('agent',  70, 'Added to Dotloop', 'Email ambassador@lrerealty.com with subject "Dotloop Access". Include your full name (as it should appear on contracts) and the email you use for writing offers.', false, null, 'Ambassador'),
  ('agent',  80, 'Assign mailbox', null, false, null, 'Kaylee'),
  ('agent',  90, 'Add agent to WhatsApp group text', null, false, null, 'Leadership'),
  ('agent', 100, 'Assign LRE email address', 'Google-based name@lrerealty.com', true, '$8/mo', 'Kaylee'),
  ('agent', 110, 'Meet 1-on-1 about Mentorship Program', 'Highly encouraged for brand new agents (first 3 transactions, 10% referral fee per closing).', false, null, 'Leadership'),
  ('agent', 120, 'Get headshot taken and send to ambassador@lrerealty.com', 'ASAP', false, null, 'Ambassador'),
  ('agent', 130, 'Attend Tuesday trainings', 'Lofty, Contract, Dotloop, and MLS @ 11a', false, null, null),
  ('agent', 140, 'Assign office', 'Standard office: 24hr access, conference room (2hr/mo), gym, lockers, copy/break/kitchen.', true, '$300/mo', 'Leadership'),
  ('agent', 150, 'Added to Lofty CRM', 'Email ambassador@lrerealty.com with subject "Lofty Access".', true, '$42/mo', 'Ambassador')
on conflict do nothing;

-- Leadership To-Dos (page 2 of the packet) — completed BY leadership FOR each new agent
insert into task_templates (audience, sort_order, title, description, is_optional, cost_note, owner_hint) values
  ('leadership', 10, 'Add agent to office roster', null, false, null, 'Leadership'),
  ('leadership', 20, 'Welcome image shared to WhatsApp', null, false, null, 'Leadership'),
  ('leadership', 30, 'Welcome image shared to social media', null, false, null, 'Marketing'),
  ('leadership', 40, 'Upload onboarding docs to Dotloop', null, false, null, 'Leadership'),
  ('leadership', 50, 'Introduce new agent via email to vendors & have them make appts', null, false, null, 'Leadership')
on conflict do nothing;

-- Team contacts pulled from the packet
insert into team_contacts (sort_order, name, role, email, office, description) values
  (10, 'Ambassador',  'New Agent Setup',       'ambassador@lrerealty.com', null,        'Dotloop access, Lofty access, headshot submissions.'),
  (20, 'Leadership',  'Brokerage Leadership',  'leadership@lrerealty.com', null,        'Office rental, DA changes, general leadership questions.'),
  (30, 'Marketing',   'Marketing & Runner',    'marketing@lrerealty.com',  'Office 19', 'Marketing material requests and runner service opt-in / requests.'),
  (40, 'Kaylee',      'Office Coordinator',     null,                       null,        'Mailbox assignment, LRE email address setup.'),
  (50, 'Alexa McNeil','New Agent Survey Lead',  null,                       'Office 36', 'Return the New Agent Survey here.'),
  (60, 'Tasha',       'Transaction Coordinator','tasha@lrerealty.com',      null,        'Transaction coordination — LRE.'),
  (70, 'Renata',      'Transaction Coordinator','renata@levinsonteam.com',  null,        'Transaction coordination — Levinson Team.'),
  (80, 'Tara Levinson','Pre-License School',    'tara@levinsonteam.com',    '3020 E Britton Rd, OKC 73131', 'Basic Pre-License Salesperson Course at Levinson.Edu — $30/mo self-paced. Phone: 405-414-8750.')
on conflict do nothing;

-- Reference Library seed (full content lives in the app code so we can keep it in version control)
-- We just declare the slugs here; the (dashboard)/reference page renders from a static map.
insert into reference_docs (slug, title, category, sort_order, content) values
  ('compensation',          'Compensation & Caps',           'compensation', 10,
   E'## What You Pay\n\n- **$14,000 cap** paid to LRE Realty at an **80/20 split** (80% Agent / 20% LRE Realty)\n- **$25 fee per transaction** covers Errors & Omissions Insurance + Broker Review\n- **Team Member Cap: $5,000** per team member\n\n## What You Don''t Pay\n\n- Monthly brokerage fees\n- Cap on personal transactions\n- Cap on referrals or income earned for "Real Estate Services"\n\n## Better Together\n\n- Free ongoing Training and Education classes\n- Open access to in-office Broker\n- Checks cut at the table (LRE fixes any title mistakes in a timely manner)\n- All office Real Estate yard signs are free to borrow\n- Agent Attraction Bonus — ask for details\n- Optional À La Carte services to enhance your business\n\n> "Our Agents Are Our Clients"'),

  ('a-la-carte',            'À La Carte Services',           'services',     20,
   E'Optional add-on services for your business:\n\n- **Transaction Management** — $250/transaction. Contract-to-close including TRR negotiations. Paid at closing.\n- **Monthly Runner Service** — $200/month. Earnest money to title, closing-packet pickup, individual client delivery (no pop-bys), lockbox and/or sign pickup.\n- **Standard Office Rental** — $300/month. 24hr access, conference room (2hr/mo), full gym, 2 reserved lockers, copy machines, break room, kitchen, coffee shop. Video & podcast rooms coming soon.\n- **Marketing Material Creation** — $50/month. Consultation + 3 revisions. Single-page or social-media ad created in Canva, shared with your Canva account.\n- **LRE Email Address** — $8/month. Google-based `name@lrerealty.com`.\n- **Photography & Editing** — Full home photos $150 · Drone photo+video $75 · VR tour (Matterport) $100.'),

  ('mentorship',            'Mentorship Program',            'process',      30,
   E'As an LRE Mentee, you''ll work closely with a seasoned agent and mentor who shares their expertise and shows you how to apply it.\n\n### What to expect\n\n- A mentor available for guidance, questions, and support as you navigate real estate.\n- They walk you through a complete real estate transaction: script practice with active buyers/sellers, overcoming objections, writing contracts, buyer consultations, taking listings, negotiating effectively, under-contract-to-close, and professional client communication.\n- A mentor to address any other questions or concerns so you have a comprehensive understanding of the transaction.\n\n### Cost / Structure\n\n- **Highly encouraged** for all brand new agents during their **first three transactions** — **10% referral fee** per successful closing.\n- For agents previously licensed elsewhere: at least **one transaction with a mentor** to get the feel of LRE before flying on your own.\n- You can extend past the recommended assistance if you want — and we encourage you to.'),

  ('becoming-agent',        'Steps to Becoming an Agent',    'process',      40,
   E'For unlicensed candidates. If you''re already licensed, skip ahead.\n\n### 1. Basic Pre-License Salesperson Course\n- Sign up at **Levinson.Edu**\n- $30/month until course is completed — self-paced\n- Contact: tara@levinsonteam.com · 405-414-8750 · 3020 E Britton Road, OKC 73131\n\n### 2. State & National Exam\n- $35.00 application fee — payable to Oklahoma Real Estate Commission\n- $60.00 background check via IdentoGO\n- Exam fees (Pearson VUE): $75.00 per attempt (with booking discount)\n- License issuance after passing: $100.00 (Provisional Sales Associate)\n\n### 3. Join a Local Board of Realtors\n- OKCMAR — okcmar.org/membership/\n- Edmond Board of Realtors — edmondrealtors.com\n- State and National dues prorate monthly; local dues prorate quarterly. Contact Member Care for the most current totals. OAR New Member Fee applies to newly OK-licensed REALTORS®.\n\n### 4. MLS Set-Up\n- Membership@okcmar.org · 405.840.1493 · okcmar.org · 3131 NW Expressway, OKC 73112'),

  ('platform-access',       'Platform Access (Dotloop, Lofty, Office)', 'process', 50,
   E'### 1. Dotloop Access\nEmail **ambassador@LRErealty.com** with subject **"Dotloop Access"**. Include:\n- Your full name spelling (as you want it on contracts)\n- The email address you use for writing offers\n\nDotloop is the platform LRE provides at no charge to write, send, and manage contracts.\n\n### 2. Lofty Access\nLofty is LRE''s CRM. Our admin is well-versed in its tools for managing contacts and transactions. If you work with one of our TCs we highly recommend using Lofty.\n\n- A Lofty seat is **$42/month**.\n- Email **ambassador@LRErealty.com** with subject **"Lofty Access"** to request.\n\n### 3. Office Rental\nOffice space is available at **$300/month**. Email **leadership@LRErealty.com** with subject **"Office Rental"**.'),

  ('buyer-contract-checklist','Buyer Contract Checklist (Under Contract)', 'checklist', 60,
   E'Use this list for every buyer transaction.\n\n### Required\n- Pending MLS Print Out\n- Disclosure of Brokerage Duties & Services (SA checked)\n- Estimated Net to Seller / Cost to Buyer\n- Acknowledgement of Confirmation of Disclosures\n- Sales Contract (all pages initialed by both sides — even with counter offer; no checkmark for cash on pg 1)\n- Finance Addendum (Conv, FHA, VA)\n- Pre-Approval Letter / Proof of Funds\n- Property Disclosures, Disclaimer, or Exemption\n- Earnest Money Receipt\n- Buyer Brokerage Service Agreement\n- Final TRR\n- Affiliated Business Disclosure\n- Home Inspection or Waiver\n- After closing: copy of commission checks and closeouts\n\n### If Applicable\n- Counter Offer\n- Agent/Owner Disclosure of Personal Interest\n- Price changes / Net Sheets\n- Referral Agreements + W9\n- Contract extensions\n- Notice of cancelation\n- Release of Earnest Money (if canceled)\n- Closing docs copies of checks\n- Disbursement Authorization\n- Lead-Based Paint Disclosure (built before 1978)\n- Cooperative Agreement (if seller is paying)'),

  ('seller-contract-checklist','Seller Contract Checklist (Active Listing)','checklist', 70,
   E'Use this list for every active listing.\n\n### Required\n- Disclosure of Brokerage Duties & Services\n- Listing Agreement: Exclusive Right to Sell\n- Estimated Net to Seller (list price) — redo for each price change\n- Residential Property Condition Disclosure / Exemption\n- Tax Records — County Assessor / Realist\n\n### If Applicable\n- Lead-Based Paint Disclosure (built before 1978)\n- Single Family Homeowners Assoc Disclosure\n- Comparative Market Analysis\n- Referral Agreement + W9\n- Covenants, Conditions, & Restrictions\n- Misc items, plat, addendums\n- Listing extension\n- Release / Withdrawal of listing'),

  ('getting-your-da',       'Getting Your DA (Disbursement Authorization)', 'process', 80,
   E'1. **Fill out the Commission Info Sheet** in Dotloop.\n2. **Send for LRE admin signature.**\n3. **Update and resend** anytime the commission changes (sales price change, commission amount change, etc.).\n4. LRE will send your DA directly to the title company — you''ll be CC''d on the email.\n\n> Under normal circumstances, allow **at least 3 business days** for the DA to be made. For last-minute DA changes, email **leadership@LRErealty.com**.'),

  ('additional-services',   'Using Additional Services (TC, Photo, Runner)', 'services', 90,
   E'### Listing Photography\nUse the QR code in the packet to schedule with our photographer. Put your email when prompted. You''ll receive an invoice in email for payment before edited photos are released.\n\n### Transaction Coordinator Services\n**Non-Brivity users:** Fill out the "Contract Details" form in Dotloop and send to your TC of choice through Dotloop.\n- tasha@lrerealty.com — or — renata@levinsonteam.com\n\n**Brivity users:** Create transaction in Brivity, add clients and collaborators (lender, title, co-operating agent).\n\nFollow up via email to your TC to confirm they received your contract.\n\n### Runner Services\nEmail **marketing@lrerealty.com** to opt-in. To request a runner task, fill out a Runner Form (found outside Marketing Office #19) and return to Marketing, OR fill out the Runner Form in Dotloop and email Marketing.')
on conflict (slug) do update set
  title = excluded.title,
  category = excluded.category,
  sort_order = excluded.sort_order,
  content = excluded.content,
  updated_at = now();
