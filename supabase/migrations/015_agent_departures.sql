-- ============================================================================
-- Agent departures
-- ----------------------------------------------------------------------------
-- is_active already exists on profiles (default true). This migration adds
-- departed_at to record WHEN someone left the brokerage so admins can see it
-- in the roster and reinstate them later if they come back.
--
-- There is intentionally no "deleted" state — the profile row (and all their
-- history: completions, intake, uploads) is kept so transactions and 1099
-- paperwork remain intact.
-- ============================================================================

alter table profiles add column if not exists departed_at timestamptz;

-- Reinstating sets departed_at back to null; departing stamps it to now.
-- Enforce the invariant with a trigger so UI code can't accidentally desync them.
create or replace function sync_departed_at()
returns trigger language plpgsql as $$
begin
  if NEW.is_active and OLD.is_active is distinct from NEW.is_active then
    NEW.departed_at := null;
  elsif NEW.is_active = false and OLD.is_active = true then
    NEW.departed_at := coalesce(NEW.departed_at, now());
  end if;
  return NEW;
end $$;

drop trigger if exists trg_profiles_sync_departed_at on profiles;
create trigger trg_profiles_sync_departed_at
  before update on profiles
  for each row execute function sync_departed_at();
