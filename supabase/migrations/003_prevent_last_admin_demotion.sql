-- ============================================================================
-- Safeguard: prevent demoting the last admin
-- ----------------------------------------------------------------------------
-- Enforced at the database level so even direct API calls or rogue updates
-- can't accidentally lock everyone out of admin features.
-- ============================================================================

create or replace function prevent_last_admin_demotion()
returns trigger language plpgsql as $$
declare
  admin_count int;
begin
  -- Only fire when an admin's role is being changed to something else
  if old.role = 'admin' and new.role <> 'admin' then
    select count(*) into admin_count from profiles where role = 'admin';
    if admin_count <= 1 then
      raise exception 'Cannot demote the last admin. Promote another user to admin first.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists enforce_last_admin on profiles;
create trigger enforce_last_admin
  before update of role on profiles
  for each row execute function prevent_last_admin_demotion();
