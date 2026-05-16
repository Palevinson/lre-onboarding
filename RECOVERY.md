# LRE Onboarding — Setup & Recovery Guide

A new-agent onboarding portal for LRE Realty. Same stack as `lre-commission`:
Next.js 15 (App Router) + Supabase + Tailwind + Radix + TypeScript, deployed via Vercel.

**Target domain:** `onboarding.lrerealty.com`

---

## What's built so far (Turn 1)

**Foundation, runnable end-to-end:**
- Full project scaffold (Next.js, TS, Tailwind, ESLint configs)
- Supabase schema with all tables + Row Level Security policies (`supabase/schema.sql`)
- Seed data: 15 Welcome Week tasks, 5 Leadership to-dos, 8 team contacts, 9 reference docs
- Auth: middleware, login, signup
- Agent flow: Dashboard home, Welcome Week (interactive checklist), Team Directory, Reference Library (browse + read individual docs)
- Stub pages with "coming next" messages: Intake forms, Admin dashboard

**Coming in Turn 2 / Turn 3:**
- Intake forms (agent survey + non-sensitive personal info)
- Admin/Leadership: roster, per-agent progress drill-down, Leadership to-do checklist per agent
- Admin content editor for task templates, team contacts, reference docs

---

## Setup — get it running locally

### 1. Install dependencies

```bash
cd ~/Projects/lre-onboarding
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Name it `lre-onboarding`, pick a region, set a database password
3. Wait ~2 min for provisioning

### 3. Run the schema

1. Open the new project → **SQL Editor** → **New query**
2. Open `supabase/schema.sql` in your editor, copy the entire file, paste, click **Run**
3. Verify: **Table Editor** should now show `profiles`, `task_templates`, `task_completions`, `agent_intake`, `team_contacts`, `reference_docs`

### 4. Wire up env vars

1. In Supabase: **Project Settings → API**. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY` (used later for admin invite flow)
2. In the project root, create `.env.local`:

```bash
cp .env.example .env.local
# then edit .env.local and paste in the values
```

### 5. (Recommended) Disable email confirmation for now

Supabase → **Authentication → Providers → Email** → toggle off **Confirm email**.
This lets new agents start using the app immediately after signup. You can re-enable later.

### 6. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). It will redirect to `/login`. Click **Create your account**, sign up with any email/password, and you'll land on the dashboard.

### 7. Make yourself an admin

By default, new users get `role = 'agent'`. To give yourself admin powers (so the Admin tab shows up), run this in the Supabase SQL Editor:

```sql
update profiles set role = 'admin' where email = 'your-email@example.com';
```

Refresh the app — you'll now see an **Admin** tab in the nav.

---

## Roles

- **agent** — sees Dashboard, Welcome Week, Intake, Reference, Team
- **manager** — adds Admin tab (read all agents, complete Leadership to-dos per agent)
- **admin** — same as manager + can edit content (task templates, team contacts, reference docs)

Promote a user with:
```sql
update profiles set role = 'manager' where email = 'leadership@lrerealty.com';
```

---

## Deploying to Vercel + `onboarding.lrerealty.com`

When you're ready to go live:

1. **Push to GitHub** — `gh repo create lre-onboarding --private --source=. --push` (or use the web UI)
2. **Vercel** — vercel.com/new → import the repo
3. **Env vars in Vercel** — paste the same three `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` values
4. **Deploy** — Vercel auto-builds; you'll get a `*.vercel.app` URL
5. **Custom domain** — in Vercel project → Settings → Domains → add `onboarding.lrerealty.com`. Vercel shows you the DNS CNAME to add at your registrar. Once DNS propagates (5 min – a few hours), the site is live at the LRE subdomain.

---

## File map

```
lre-onboarding/
├── supabase/
│   └── schema.sql                     # Run this in Supabase SQL editor
├── src/
│   ├── middleware.ts                  # Auth gate
│   ├── lib/
│   │   ├── auth.ts                    # requireProfile, requireRole helpers
│   │   ├── types.ts                   # All TypeScript types
│   │   └── supabase/{client,server}.ts
│   ├── components/
│   │   ├── Nav.tsx                    # Top bar
│   │   ├── SignOutButton.tsx
│   │   ├── TaskItem.tsx               # Interactive checkbox row (optimistic)
│   │   └── ProgressRing.tsx
│   └── app/
│       ├── layout.tsx                 # Root layout + globals.css
│       ├── page.tsx                   # / → redirects to /dashboard
│       ├── (auth)/
│       │   ├── layout.tsx
│       │   ├── login/page.tsx
│       │   └── signup/page.tsx
│       └── (dashboard)/
│           ├── layout.tsx             # Requires login, renders Nav
│           ├── dashboard/page.tsx     # Agent home (progress + quick links)
│           ├── welcome-week/page.tsx  # Interactive checklist (Required + Optional)
│           ├── intake/page.tsx        # STUB — built next turn
│           ├── reference/
│           │   ├── page.tsx           # Library index
│           │   └── [slug]/page.tsx    # Single doc renderer (inline markdown)
│           ├── team/page.tsx          # Team contacts
│           └── admin/page.tsx         # STUB — manager+admin only
└── RECOVERY.md (this file)
```

---

## Conventions (mirrored from lre-commission)

- Dark theme: `bg-gray-950` page, `bg-gray-900` cards, `bg-gray-800` inputs
- Accent: `amber-500` (matches LRE brand)
- Brand mark: `font-serif text-white` "LRE" + `text-amber-500 uppercase tracking-widest` tagline
- All forms use the gray-800 input + amber-500 focus border pattern
- Server Components for data fetching, Client Components only where interactive
- Dev server runs on port **3001** (lre-commission uses 3000)
