-- Dealer commercial controls: one authoritative plan catalog + subscription history.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS package_auto_renew boolean NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'none';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS package_features jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS commission_balance numeric NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS listings_locked boolean NOT NULL DEFAULT false;

UPDATE public.platform_config
SET packages = '[
  {"id":"starter","name":"Starter","price":2500,"listingMax":10,"durationDays":30,"features":[]},
  {"id":"growth","name":"Growth","price":6500,"listingMax":30,"durationDays":30,"features":["priority_search"]},
  {"id":"elite","name":"Elite","price":14000,"listingMax":100,"durationDays":30,"features":["priority_search","featured_homepage"]},
  {"id":"enterprise","name":"Enterprise","price":0,"listingMax":0,"durationDays":30,"features":["priority_search","featured_homepage","dedicated_support"],"contactSales":true}
]'::jsonb
WHERE packages IS NULL OR jsonb_array_length(packages) = 0;

CREATE TABLE IF NOT EXISTS public.dealer_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  plan_id text NOT NULL,
  plan_name text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'KES',
  listing_max integer NOT NULL DEFAULT 0 CHECK (listing_max >= 0),
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','cancelled')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS dealer_subscriptions_payment_uq ON public.dealer_subscriptions(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS dealer_subscriptions_dealer_status_idx ON public.dealer_subscriptions(dealer,status,expires_at DESC);
CREATE INDEX IF NOT EXISTS dealer_subscriptions_plan_idx ON public.dealer_subscriptions(plan_id);

ALTER TABLE public.dealer_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dealer_subscriptions_owner_select ON public.dealer_subscriptions;
CREATE POLICY dealer_subscriptions_owner_select ON public.dealer_subscriptions FOR SELECT USING (auth.uid() = dealer);
DROP POLICY IF EXISTS dealer_subscriptions_owner_insert ON public.dealer_subscriptions;
CREATE POLICY dealer_subscriptions_owner_insert ON public.dealer_subscriptions FOR INSERT WITH CHECK (auth.uid() = dealer);
DROP POLICY IF EXISTS dealer_subscriptions_owner_update ON public.dealer_subscriptions;
CREATE POLICY dealer_subscriptions_owner_update ON public.dealer_subscriptions FOR UPDATE USING (auth.uid() = dealer) WITH CHECK (auth.uid() = dealer);

CREATE OR REPLACE FUNCTION public.kayad_activate_dealer_subscription_atomic(
  p_payment_id uuid,
  p_dealer uuid,
  p_plan_id text,
  p_plan_name text,
  p_amount numeric,
  p_currency text,
  p_listing_max integer,
  p_features jsonb,
  p_duration_days integer,
  p_snapshot_hash text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_expires timestamptz;
  v_sub dealer_subscriptions%ROWTYPE;
BEGIN
  IF p_payment_id IS NULL OR p_dealer IS NULL OR p_plan_id IS NULL THEN RAISE EXCEPTION 'Missing subscription activation identity'; END IF;
  IF p_amount < 0 OR p_listing_max < 0 OR p_duration_days < 1 THEN RAISE EXCEPTION 'Invalid subscription activation values'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('dealer_subscription:' || p_dealer::text));
  v_expires := now() + make_interval(days => p_duration_days);

  INSERT INTO dealer_subscriptions(dealer,payment_id,plan_id,plan_name,amount,currency,listing_max,features,starts_at,expires_at,status,metadata)
  VALUES(p_dealer,p_payment_id,p_plan_id,p_plan_name,p_amount,COALESCE(NULLIF(p_currency,''),'KES'),p_listing_max,COALESCE(p_features,'[]'::jsonb),now(),v_expires,'active',jsonb_build_object('planSnapshotHash',p_snapshot_hash))
  ON CONFLICT (payment_id) DO UPDATE SET updated_at=now()
  RETURNING * INTO v_sub;

  UPDATE users SET dealer_package=p_plan_id, package_listing_max=p_listing_max, package_expires_at=v_expires,
    package_auto_renew=false, subscription_status='active', package_features=COALESCE(p_features,'[]'::jsonb), updated_at=now()
  WHERE id=p_dealer;
  IF NOT FOUND THEN RAISE EXCEPTION 'Dealer not found'; END IF;

  RETURN jsonb_build_object('id',v_sub.id,'dealer',v_sub.dealer,'planId',v_sub.plan_id,'expiresAt',v_sub.expires_at,'status',v_sub.status);
END; $$;

REVOKE ALL ON FUNCTION public.kayad_activate_dealer_subscription_atomic(uuid,uuid,text,text,numeric,text,integer,jsonb,integer,text) FROM PUBLIC;
