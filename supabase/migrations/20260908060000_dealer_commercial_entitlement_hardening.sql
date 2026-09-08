-- KAYAD Dealer Commercial & Entitlement Hardening
-- Closes remaining commercial drift between legacy user package fields,
-- subscription history and dealer inventory enforcement.

-- Keep dealer subscription history auditable while ensuring only one active
-- entitlement exists. The existing partial unique index is retained.
CREATE UNIQUE INDEX IF NOT EXISTS dealer_subscriptions_one_active_uq
  ON public.dealer_subscriptions(dealer)
  WHERE status = 'active';

-- Admin grants are authoritative plan changes. Supersede an existing active
-- entitlement before inserting the new one so the unique invariant cannot turn
-- a legitimate admin plan change into a database error.
CREATE OR REPLACE FUNCTION public.kayad_grant_dealer_subscription_atomic(
  p_dealer uuid,
  p_plan_id text,
  p_duration_days integer DEFAULT 30,
  p_reason text DEFAULT 'admin_grant'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan jsonb;
  v_sub dealer_subscriptions%ROWTYPE;
  v_expires timestamptz;
  v_price numeric;
  v_listing_max integer;
  v_name text;
  v_features jsonb;
BEGIN
  IF p_dealer IS NULL OR p_plan_id IS NULL THEN RAISE EXCEPTION 'Dealer and plan are required'; END IF;
  IF p_duration_days < 1 OR p_duration_days > 3660 THEN RAISE EXCEPTION 'Invalid subscription duration'; END IF;

  PERFORM pg_advisory_xact_lock(hashtext('dealer_subscription:' || p_dealer::text));

  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_dealer AND role = 'dealer') THEN
    RAISE EXCEPTION 'Dealer not found';
  END IF;

  SELECT value INTO v_plan
  FROM platform_config pc, jsonb_array_elements(COALESCE(pc.packages, '[]'::jsonb)) value
  WHERE value->>'id' = p_plan_id
  LIMIT 1;
  IF v_plan IS NULL THEN RAISE EXCEPTION 'Plan not found'; END IF;

  v_name := COALESCE(v_plan->>'name', p_plan_id);
  v_price := COALESCE((v_plan->>'price')::numeric, (v_plan->>'priceMonthly')::numeric, 0);
  v_listing_max := COALESCE((v_plan->>'listingMax')::integer, 0);
  v_features := COALESCE(v_plan->'features', '[]'::jsonb);
  v_expires := now() + make_interval(days => p_duration_days);

  UPDATE dealer_subscriptions
  SET status = 'cancelled', updated_at = now(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'supersededAt', now(), 'supersededReason', p_reason
      )
  WHERE dealer = p_dealer AND status = 'active';

  INSERT INTO dealer_subscriptions(
    dealer, plan_id, plan_name, amount, currency, listing_max, features,
    starts_at, expires_at, status, metadata
  ) VALUES (
    p_dealer, p_plan_id, v_name, v_price, 'KES', v_listing_max, v_features,
    now(), v_expires, 'active', jsonb_build_object('source', p_reason)
  ) RETURNING * INTO v_sub;

  UPDATE users SET
    dealer_package = p_plan_id, package_listing_max = v_listing_max,
    package_expires_at = v_expires, package_auto_renew = false,
    subscription_status = 'active', package_features = v_features,
    listings_locked = false, updated_at = now()
  WHERE id = p_dealer;

  RETURN jsonb_build_object(
    'id', v_sub.id, 'dealer', v_sub.dealer, 'planId', v_sub.plan_id,
    'status', v_sub.status, 'expiresAt', v_sub.expires_at
  );
END; $$;

REVOKE ALL ON FUNCTION public.kayad_grant_dealer_subscription_atomic(uuid,text,integer,text) FROM PUBLIC;

-- Revocation must be explicit: silently reporting success when no active
-- entitlement existed made admin controls misleading and difficult to audit.
CREATE OR REPLACE FUNCTION public.kayad_revoke_dealer_subscription_atomic(
  p_dealer uuid, p_reason text DEFAULT 'admin_revoke'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sub dealer_subscriptions%ROWTYPE;
BEGIN
  IF p_dealer IS NULL THEN RAISE EXCEPTION 'Dealer identity is required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('dealer_subscription:' || p_dealer::text));

  UPDATE dealer_subscriptions
  SET status = 'cancelled', updated_at = now(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'revokedAt', now(), 'reason', p_reason
      )
  WHERE dealer = p_dealer AND status = 'active'
  RETURNING * INTO v_sub;

  IF NOT FOUND THEN RAISE EXCEPTION 'No active dealer subscription to revoke'; END IF;

  UPDATE users SET
    dealer_package = NULL, package_listing_max = 0, package_expires_at = NULL,
    package_auto_renew = false, subscription_status = 'none',
    package_features = '[]'::jsonb, updated_at = now()
  WHERE id = p_dealer AND role = 'dealer';

  RETURN jsonb_build_object(
    'id', v_sub.id, 'dealer', p_dealer, 'planId', v_sub.plan_id, 'status', 'none'
  );
END; $$;

REVOKE ALL ON FUNCTION public.kayad_revoke_dealer_subscription_atomic(uuid,text) FROM PUBLIC;

COMMENT ON TABLE public.dealer_subscriptions IS
  'Authoritative dealer commercial entitlement history. Legacy user package fields are compatibility projections only; dealer listing access is enforced from this table.';
