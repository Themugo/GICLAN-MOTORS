-- KAYAD canonical authorization helpers.
-- Keep security predicates centralized so domain migrations do not invent
-- incompatible admin checks or depend on application-only authorization.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'superadmin')
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
