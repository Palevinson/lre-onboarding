-- Migration 009: MCP (Model Context Protocol) tokens for Onboarding.
--
-- Same pattern as Compass/Commission: token in URL path, possession is auth.
-- For Onboarding, the MCP serves office admin reports about new-agent
-- progress (who's in onboarding, completion rates, who's stuck).
--
-- Apply via Supabase SQL Editor against the Onboarding project.

create table if not exists mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  name text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists mcp_tokens_user_id_idx
  on mcp_tokens (user_id, created_at desc);

create index if not exists mcp_tokens_token_lookup_idx
  on mcp_tokens (token)
  where revoked_at is null;

alter table mcp_tokens enable row level security;

drop policy if exists "users read their own mcp tokens" on mcp_tokens;
drop policy if exists "users insert their own mcp tokens" on mcp_tokens;
drop policy if exists "users update their own mcp tokens" on mcp_tokens;
drop policy if exists "users delete their own mcp tokens" on mcp_tokens;

create policy "users read their own mcp tokens"
  on mcp_tokens for select using (auth.uid() = user_id);

create policy "users insert their own mcp tokens"
  on mcp_tokens for insert with check (auth.uid() = user_id);

create policy "users update their own mcp tokens"
  on mcp_tokens for update using (auth.uid() = user_id);

create policy "users delete their own mcp tokens"
  on mcp_tokens for delete using (auth.uid() = user_id);
