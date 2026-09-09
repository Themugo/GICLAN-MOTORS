-- SECURITY DEFINER helpers are internal trigger/application helpers, not public RPC APIs.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.sync_profile_from_user() from public, anon, authenticated;
revoke execute on function public.update_car_bid_stats(uuid) from public, anon, authenticated;
