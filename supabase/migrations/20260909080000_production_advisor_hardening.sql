-- Production advisor hardening: remove exposed admin helper execution,
-- optimize the admin policy, and remove duplicate indexes already represented
-- by canonical indexes from earlier domain migrations.

DROP POLICY IF EXISTS ad_slots_admin_all ON public.ad_slots;
CREATE POLICY ad_slots_admin_all ON public.ad_slots
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'superadmin')
  )))
  WITH CHECK ((SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'superadmin')
  )));

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public, anon, authenticated;
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;

DROP INDEX IF EXISTS public.idx_cars_search_brand_model;
DROP INDEX IF EXISTS public.uq_payments_checkout_request_id;
