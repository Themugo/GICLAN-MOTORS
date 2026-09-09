-- Runtime integration hardening: backend-only atomic car-view increment RPC.
create or replace function public.increment_car_views(car_id uuid, increment_by integer)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare new_views integer;
begin
  if car_id is null or increment_by is null or increment_by <= 0 then
    raise exception 'car_id and a positive increment_by are required';
  end if;
  update public.cars
     set views = coalesce(views, 0) + increment_by
   where id = car_id
   returning views into new_views;
  if new_views is null then
    raise exception 'car % not found', car_id using errcode = 'P0002';
  end if;
  return new_views;
end;
$$;
revoke all on function public.increment_car_views(uuid, integer) from public, anon, authenticated;
grant execute on function public.increment_car_views(uuid, integer) to service_role;
alter function public.sync_profile_from_user() set search_path = public, pg_temp;
alter function public.update_car_bid_stats(uuid) set search_path = public, pg_temp;
revoke execute on function public.rls_auto_enable() from anon, authenticated;
revoke execute on function public.sync_profile_from_user() from anon, authenticated;
revoke execute on function public.update_car_bid_stats(uuid) from anon, authenticated;
