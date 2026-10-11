-- SECURITY: stop users from granting themselves privileges via their own profile.
--
-- The `profiles_own` RLS policy (FOR ALL, no column restriction) plus the default
-- table UPDATE grant let any signed-in user run, with their own JWT:
--   update profiles set role = 'superuser'       where id = auth.uid()  → is_superuser() = true
--   update profiles set is_super_admin = true    where id = auth.uid()  → /api/superadmin/*
--   update profiles set tenant_id = '<victim>'   where id = auth.uid()  → current_tenant_id() = victim
-- and any member of a tenant could change any teammate's role (team/actions.ts).
--
-- This trigger only lets those three columns change when the caller is:
--   * a server-side client (service_role / postgres — every API route that
--     provisions tenants, sends invites or changes roles uses createAdminClient), or
--   * a superuser, or
--   * a tenant admin changing another member of their own tenant: a new role
--     (never 'superuser') or removing them (tenant_id → NULL).
--
-- SECURITY INVOKER on purpose: current_user must be the API role
-- ('authenticated' / 'service_role'), not the function owner.

create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_caller_role   text;
  v_caller_tenant uuid;
begin
  -- Server-side clients and migrations are trusted.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  -- Superusers may manage any profile. (Reads the pre-statement state, so a
  -- user cannot pass this check by promoting themselves in the same update.)
  if public.is_superuser() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.tenant_id is not null
       or new.role = 'superuser'
       or coalesce(new.is_super_admin, false) then
      raise exception 'Not allowed to set role, tenant or super-admin on a profile'
        using errcode = '42501';
    end if;
    return new;
  end if;

  -- UPDATE: nothing privileged changed → allow (name edits etc.).
  if new.role is not distinct from old.role
     and new.tenant_id is not distinct from old.tenant_id
     and new.is_super_admin is not distinct from old.is_super_admin then
    return new;
  end if;

  if new.role = 'superuser'
     or new.is_super_admin is distinct from old.is_super_admin then
    raise exception 'Not allowed to grant super-admin privileges'
      using errcode = '42501';
  end if;

  select p.role, p.tenant_id
    into v_caller_role, v_caller_tenant
    from public.profiles p
   where p.id = auth.uid();

  if v_caller_role = 'admin'
     and v_caller_tenant is not null
     and old.tenant_id = v_caller_tenant
     and old.id <> auth.uid()
     and (new.tenant_id is not distinct from old.tenant_id or new.tenant_id is null) then
    return new;
  end if;

  raise exception 'Only a tenant admin can change another member''s role or remove them'
    using errcode = '42501';
end;
$$;

drop trigger if exists guard_profile_privileged_columns on public.profiles;
create trigger guard_profile_privileged_columns
  before insert or update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();

-- cron_health_check() reads Vault secrets and emails the admin; it is only meant
-- to run from pg_cron. It was callable by anyone via /rest/v1/rpc/cron_health_check.
revoke execute on function public.cron_health_check() from public, anon, authenticated;
