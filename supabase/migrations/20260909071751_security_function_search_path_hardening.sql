-- Security hardening: pin search_path for mutable trigger/helper functions.
alter function public.update_updated_at() set search_path = public, pg_temp;
alter function public.update_updated_at_snake() set search_path = public, pg_temp;
alter function public.update_updated_at_camel() set search_path = public, pg_temp;
alter function public.sync_provider_status_from_lifecycle() set search_path = public, pg_temp;
alter function public.kayad_ledger_entries_immutable() set search_path = public, pg_temp;
alter function public.refresh_inspection_provider_starting_price(uuid) set search_path = public, pg_temp;
alter function public.trg_refresh_inspection_provider_starting_price() set search_path = public, pg_temp;
alter function public.kayad_sync_cms_page_name() set search_path = public, pg_temp;
alter function public.kayad_touch_dealer_team_updated_at() set search_path = public, pg_temp;
alter function public.kayad_touch_reconciliation_report() set search_path = public, pg_temp;
