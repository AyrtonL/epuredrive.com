-- get_tenant_owners() declared owner_email as text, but auth.users.email is
-- varchar(255): every call failed with "structure of query does not match
-- function result type". That left Admin → Tenants showing "No owner" for
-- every tenant and made the daily tenant-feedback cron return 500 before
-- sending anything. Cast the columns; the superuser/service-role guard and
-- grants are unchanged.

create or replace function public.get_tenant_owners()
returns table(tenant_id uuid, owner_name text, owner_email text)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not (public.is_superuser() or auth.role() = 'service_role') then
    raise exception 'Forbidden: superuser only';
  end if;

  return query
  select distinct on (p.tenant_id) p.tenant_id, p.full_name::text, u.email::text
  from profiles p
  join auth.users u on u.id = p.id
  where p.tenant_id is not null
  order by p.tenant_id, p.created_at asc;
end;
$function$;
