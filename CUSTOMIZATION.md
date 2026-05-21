# Customizing this app for your own brokerage

You've been handed (or templated) the LRE Realty onboarding portal. This guide explains what's branded "LRE", what to swap for your own brokerage, and how to deploy your own copy.

**Recommended:** paste this whole file into Cowork (or Claude Code in your terminal) and ask it to walk you through. It can do most of the edits for you.

---

## What this app does

A new-agent onboarding portal for a real estate brokerage:

- **Agents** — Welcome Week interactive checklist, intake forms, reference library, team directory, password reset, headshot upload, file uploads on individual tasks
- **Managers** — agent roster, per-agent progress drill-down, Leadership to-do checklist, send-invite-email flow
- **Admins** — everything above + edit tasks/team contacts/reference docs/intake questions without writing code; change user roles

Stack: Next.js 15 (App Router) + Supabase + Tailwind + TypeScript, deployed on Vercel.

---

## One-time setup

### 1. Create your own Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Name it whatever you want (e.g. `acme-realty-onboarding`)
3. Pick a region close to you, set a strong DB password, save it somewhere
4. Wait ~2 minutes for it to provision

### 2. Run the schema

In your Supabase project: **SQL Editor → New query**.

Copy the entire contents of `supabase/schema.sql` into the editor and click **Run**. Then do the same for every file in `supabase/migrations/` **in numerical order** (001, 002, 003, …, 008).

This creates all the tables, roles, RLS policies, storage buckets, and **seeds the original LRE-branded content** (which you'll replace next).

### 3. Wire up env vars

In Supabase: **Project Settings → API**. Copy the three values:

- Project URL
- anon public key
- service_role key

In your local copy of the repo, create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Run locally to confirm everything works

```bash
npm install
npm run dev
```

Open http://localhost:3001. You should see a login screen. Click **Create your account** and sign up. Then in Supabase SQL editor:

```sql
update profiles set role = 'admin' where email = 'your-email@example.com';
```

Refresh the app — you should now see an **Admin** tab in the nav.

---

## Replace LRE branding with yours

### Find-and-replace pass

Open the repo in your editor (or Cowork). Do these find/replace operations across the whole codebase:

| Find | Replace with |
|---|---|
| `LRE Realty` | `Your Brokerage Name` |
| `LRE` (as a brand mark — be careful) | Your initials/shortname |
| `onboarding.lrerealty.com` | `onboarding.yourbrokerage.com` |
| `lrerealty.com` | `yourbrokerage.com` |
| `ambassador@lrerealty.com`, `leadership@lrerealty.com`, `marketing@lrerealty.com` | Your team emails |
| `Our Agents Are Our Clients` | Your tagline |
| `Palevinson/lre-onboarding` | Your GitHub repo path |

The brand mark "LRE" appears as a serif logo in several places — `src/components/Nav.tsx`, `src/components/MobileNav.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`, `src/app/(auth)/forgot-password/page.tsx`, `src/app/(auth)/reset-password/page.tsx`, `src/app/(dashboard)/dashboard/page.tsx`, and `src/app/icon.tsx` (the app icon generator).

### Brand colors

The accent color is set in two places:

- **Tailwind classes** — search the repo for `amber-500` and `amber-400` and replace with your color (e.g. `blue-500` / `blue-400`)
- **Generated icon** — `src/app/icon.tsx` and `src/app/apple-icon.tsx` have hex colors `#1e3d6b` (navy gradient) and `#f59e0b` (amber text). Replace with yours.
- **Manifest** — `src/app/manifest.ts` has `theme_color` and `background_color`

### App metadata

- `package.json` — change the `name` field
- `src/app/layout.tsx` — change `title`, `description`, `applicationName` in the `metadata` object
- `src/app/manifest.ts` — change `name`, `short_name`, `description`
- `RECOVERY.md` and this `CUSTOMIZATION.md` — update as needed

---

## Replace LRE content with yours

The seed data includes LRE's specific tasks, team members, reference docs, etc. There are two ways to replace it.

### Option A — Use the admin UI (recommended, no code)

After signing up locally and promoting yourself to admin:

1. **`/admin/content/tasks`** — Delete every LRE task, add your own
2. **`/admin/content/team`** — Delete LRE contacts, add yours
3. **`/admin/content/docs`** — Delete LRE reference docs, write your own
4. **`/admin/content/intake`** — Edit intake form questions

Use the trash icons. Then click "Add Task" / "Add Contact" / "+ New Document" to build your own content. Everything saves to your Supabase, not LRE's.

### Option B — Clear and re-seed via SQL

If you'd rather start clean:

```sql
truncate task_templates, team_contacts, reference_docs, intake_questions cascade;
```

(Run in the Supabase SQL Editor.) Then add your content either via the admin UI or by writing your own INSERT statements.

---

## Deploy to your own domain

### 1. Push to your own GitHub repo

If you used GitHub's "Use this template" button, you already have your own repo. If you cloned manually:

```bash
git remote remove origin
git remote add origin https://github.com/yourname/your-repo.git
git push -u origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Framework: Next.js (auto-detected)
4. **Environment Variables:** paste the same three from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Click **Deploy** — wait ~1 min

### 3. Add your custom domain

In your Vercel project: **Settings → Domains → Add domain**. Vercel shows you a DNS record to add at your registrar (CNAME or A record). Add it, wait 5–15 min for DNS to propagate, and SSL is auto-issued.

### 4. Update Supabase auth settings

In your Supabase project: **Auth → URL Configuration**:

- **Site URL:** `https://onboarding.yourbrokerage.com`
- **Redirect URLs:** add `https://onboarding.yourbrokerage.com/**` and `http://localhost:3001/**`

This is required for password reset and invite emails to work.

### 5. (Optional) Disable email confirmation for testing

In Supabase: **Auth → Providers → Email → Confirm email = OFF** while you're testing. Turn it back on when you're ready for real signups.

---

## What's where in the code

A quick map so you (or Claude) know where to look:

```
src/
├── middleware.ts                            # auth gate, allowlist
├── lib/
│   ├── supabase/{client,server,admin}.ts    # supabase setup
│   ├── auth.ts                              # role helpers
│   ├── types.ts                             # all TypeScript types
│   └── headshots.ts                         # signed URLs for headshots
├── components/
│   ├── Nav.tsx, MobileNav.tsx               # top navigation
│   ├── TaskItem.tsx                         # the interactive checklist row
│   ├── IntakeForm.tsx                       # dynamic intake form
│   ├── RoleSelector.tsx                     # admin: change a user's role
│   └── ...
└── app/
    ├── (auth)/                              # login, signup, forgot/reset password
    ├── auth/callback/route.ts               # exchanges email-link codes for session
    └── (dashboard)/
        ├── dashboard/page.tsx               # agent home
        ├── welcome-week/page.tsx            # interactive checklist
        ├── intake/page.tsx                  # intake form
        ├── reference/[slug]/page.tsx        # reference library
        ├── team/page.tsx                    # team directory
        ├── settings/page.tsx                # user profile + password change
        └── admin/
            ├── page.tsx                     # roster (agents + staff)
            ├── [id]/page.tsx                # per-user drill-down
            ├── invite/page.tsx              # invite new agent via email
            └── content/                     # admin-only content editor
                ├── tasks/                   # welcome week + leadership task editor
                ├── team/                    # team contact editor (with photo upload)
                ├── docs/                    # reference library markdown editor
                └── intake/                  # dynamic intake question editor
```

---

## Common customizations

### "I want different sections in the intake form"

Go to `/admin/content/intake`. Add/edit/reorder questions, group them into your own sections. No code change needed.

### "I want to add a new task type"

Go to `/admin/content/tasks` → click **+ Add Task** → fill in title, sort order, owner, action URL, etc. If you want it to accept file uploads, check the "Allow file upload" box.

### "I want to add a new page (e.g. compliance training)"

This needs code. Add a new folder under `src/app/(dashboard)/your-page/page.tsx`, write the page component, and add a link to `src/components/Nav.tsx`. Ask Claude to do this — it's a 5-minute change.

### "I want to add brokerage-specific calculations (e.g. commission cap)"

That's a bigger build — that's a separate app. See the `lre-commission` repo if you ever want to fork that pattern.

### "I want SSO with Google/Microsoft"

Supabase Auth supports this — enable the provider in your Supabase project's Auth settings, then update the login page to call `supabase.auth.signInWithOAuth(...)`. Ask Claude to wire it up.

---

## License / attribution

This app was originally built for LRE Realty. You're welcome to use, modify, and deploy it for your own brokerage. If you significantly improve it (new features, bug fixes), consider opening a PR back to the original repo so other brokerages can benefit.

No warranty — verify all real-estate compliance language against your local board and OREC-equivalent regulator before using in production.

---

## Questions

Ask Claude. Paste this whole file into Cowork and tell it what you want to change. It'll handle the file edits, type-check, and deploy.

If you get stuck, the original was built by Tara Levinson (tara@levinsonteam.com).
