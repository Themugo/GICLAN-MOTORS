-- Subscription commercial entitlements: complete lifecycle and atomic cancellation/reactivation.
-- This migration extends the existing dealer subscription contract created by
-- 20260907230000_dealer_subscription_commercial_controls.sql.

CREATE OR REPLACE FUNCTION public.kayad_cancel_dealer_subscription_atomic(
  p_dealer uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sub dealer_subscriptions%ROWTYPE;
BEGIN
  IF p_dealer IS NULL THEN RAISE EXCEPTION 'Dealer identity is required'; END IF;

  PERFORM pg_advisory_xact_lock(hashtext('dealer_subscription:' || p_dealer::text));

  SELECT * INTO v_sub
  FROM dealer_subscriptions
  WHERE dealer = p_dealer
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active subscription to cancel';
  END IF;

  UPDATE dealer_subscriptions
  SET status = 'cancelled', updated_at = now()
  WHERE id = v_sub.id
  RETURNING * INTO v_sub;

  UPDATE users
  SET package_auto_renew = false,
      subscription_status = 'cancelled',
      updated_at = now()
  WHERE id = p_dealer;

  RETURN jsonb_build_object(
    'id', v_sub.id,
    'dealer', v_sub.dealer,
    'planId', v_sub.plan_id,
    'status', v_sub.status,
    'expiresAt', v_sub.expires_at
  );
END; $$;

CREATE OR REPLACE FUNCTION public.kayad_reactivate_dealer_subscription_atomic(
  p_dealer uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sub dealer_subscriptions%ROWTYPE;
BEGIN
  IF p_dealer IS NULL THEN RAISE EXCEPTION 'Dealer identity is required'; END IF;

  PERFORM pg_advisory_xact_lock(hashtext('dealer_subscription:' || p_dealer::text));

  SELECT * INTO v_sub
  FROM dealer_subscriptions
  WHERE dealer = p_dealer
    AND status = 'cancelled'
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No cancellable subscription is available for reactivation';
  END IF;

  UPDATE dealer_subscriptions
  SET status = 'active', updated_at = now()
  WHERE id = v_sub.id
  RETURNING * INTO v_sub;

  UPDATE users
  SET dealer_package = v_sub.plan_id,
      package_listing_max = v_sub.listing_max,
      package_expires_at = v_sub.expires_at,
      package_auto_renew = false,
      subscription_status = 'active',
      package_features = COALESCE(v_sub.features, '[]'::jsonb),
      listings_locked = false,
      updated_at = now()
  WHERE id = p_dealer;

  RETURN jsonb_build_object(
    'id', v_sub.id,
    'dealer', v_sub.dealer,
    'planId', v_sub.plan_id,
    'status', v_sub.status,
    'expiresAt', v_sub.expires_at
  );
END; $$;

REVOKE ALL ON FUNCTION public.kayad_cancel_dealer_subscription_atomic(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kayad_reactivate_dealer_subscription_atomic(uuid) FROM PUBLIC;


-- Backfill legacy dealer entitlements into the authoritative history table once.
INSERT INTO public.dealer_subscriptions (
  dealer, plan_id, plan_name, amount, currency, listing_max, features,
  starts_at, expires_at, status, metadata
)
SELECT
  u.id,
  u.dealer_package,
  COALESCE(cfg.p->>'name', u.dealer_package),
  COALESCE((cfg.p->>'price')::numeric, 0),
  'KES',
  COALESCE(u.package_listing_max, (cfg.p->>'listingMax')::integer, 0),
  COALESCE(cfg.p->'features', COALESCE(u.package_features, '[]'::jsonb)),
  COALESCE(u.created_at, now()),
  u.package_expires_at,
  CASE
    WHEN u.package_expires_at IS NOT NULL AND u.package_expires_at <= now() THEN 'expired'
    ELSE 'active'
  END,
  jsonb_build_object('source', 'legacy_user_package_backfill')
FROM public.users u
LEFT JOIN LATERAL (
  SELECT value AS p
  FROM public.platform_config pc, jsonb_array_elements(COALESCE(pc.packages, '[]'::jsonb)) value
  WHERE value->>'id' = u.dealer_package
  LIMIT 1
) cfg ON true
WHERE u.role = 'dealer'
  AND u.dealer_package IS NOT NULL
  AND u.dealer_package <> 'none'
  AND NOT EXISTS (
    SELECT 1 FROM public.dealer_subscriptions ds
    WHERE ds.dealer = u.id
  );

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

  PERFORM pg_advisory_xact_lock(hashtext('dealer_subscription:' || p_dealer::text));

  INSERT INTO dealer_subscriptions(
    dealer, plan_id, plan_name, amount, currency, listing_max, features,
    starts_at, expires_at, status, metadata
  ) VALUES (
    p_dealer, p_plan_id, v_name, v_price, 'KES', v_listing_max, v_features,
    now(), v_expires, 'active',
    jsonb_build_object('source', p_reason)
  ) RETURNING * INTO v_sub;

  UPDATE users SET
    dealer_package = p_plan_id,
    package_listing_max = v_listing_max,
    package_expires_at = v_expires,
    package_auto_renew = false,
    subscription_status = 'active',
    package_features = v_features,
    listings_locked = false,
    updated_at = now()
  WHERE id = p_dealer AND role = 'dealer';

  IF NOT FOUND THEN RAISE EXCEPTION 'Dealer not found'; END IF;

  RETURN jsonb_build_object('id',v_sub.id,'dealer',v_sub.dealer,'planId',v_sub.plan_id,'status',v_sub.status,'expiresAt',v_sub.expires_at);
END; $$;

REVOKE ALL ON FUNCTION public.kayad_grant_dealer_subscription_atomic(uuid,text,integer,text) FROM PUBLIC;

-- Database invariant: at most one active entitlement can exist for a dealer.
-- RPCs also serialize lifecycle mutations, while this constraint protects the
-- invariant against accidental future service-role writes.
CREATE UNIQUE INDEX IF NOT EXISTS dealer_subscriptions_one_active_uq
  ON public.dealer_subscriptions(dealer)
  WHERE status = 'active';

-- Commercial entitlements are server-authoritative. Dealers may read their
-- subscription through the API, but must never mutate plan/expiry/amount
-- directly from the browser.
DROP POLICY IF EXISTS dealer_subscriptions_owner_insert ON public.dealer_subscriptions;
DROP POLICY IF EXISTS dealer_subscriptions_owner_update ON public.dealer_subscriptions;

CREATE OR REPLACE FUNCTION public.kayad_revoke_dealer_subscription_atomic(
  p_dealer uuid,
  p_reason text DEFAULT 'admin_revoke'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sub dealer_subscriptions%ROWTYPE;
BEGIN
  IF p_dealer IS NULL THEN RAISE EXCEPTION 'Dealer identity is required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('dealer_subscription:' || p_dealer::text));

  UPDATE dealer_subscriptions
  SET status = 'cancelled', updated_at = now(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('revokedAt', now(), 'reason', p_reason)
  WHERE dealer = p_dealer
    AND status = 'active'
  RETURNING * INTO v_sub;

  UPDATE users SET
    dealer_package = NULL,
    package_listing_max = 0,
    package_expires_at = NULL,
    package_auto_renew = false,
    subscription_status = 'none',
    package_features = '[]'::jsonb,
    listings_locked = false,
    updated_at = now()
  WHERE id = p_dealer;

  RETURN jsonb_build_object(
    'id', v_sub.id,
    'dealer', p_dealer,
    'planId', COALESCE(v_sub.plan_id, ''),
    'status', 'none'
  );
END; $$;

REVOKE ALL ON FUNCTION public.kayad_revoke_dealer_subscription_atomic(uuid,text) FROM PUBLIC;
