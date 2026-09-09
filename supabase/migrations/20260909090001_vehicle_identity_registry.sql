-- Seller-defined vehicle identities. New makes/models are learned from real listings;
-- the platform does not require a closed catalog before a seller can list a vehicle.
CREATE TABLE IF NOT EXISTS public.vehicle_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  model text,
  normalized_brand text NOT NULL,
  normalized_model text NOT NULL DEFAULT '',
  first_submitted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  last_submitted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  listing_count integer NOT NULL DEFAULT 0 CHECK (listing_count >= 0),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_identities_brand_model ON public.vehicle_identities (normalized_brand, normalized_model);
CREATE INDEX IF NOT EXISTS idx_vehicle_identities_brand ON public.vehicle_identities (normalized_brand);
CREATE INDEX IF NOT EXISTS idx_vehicle_identities_model ON public.vehicle_identities (normalized_model) WHERE normalized_model <> '';
CREATE INDEX IF NOT EXISTS idx_vehicle_identities_last_seen ON public.vehicle_identities (last_seen_at DESC);
ALTER TABLE public.vehicle_identities ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.normalize_vehicle_identity(value text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$ SELECT lower(regexp_replace(btrim(coalesce(value, '')), '\s+', ' ', 'g')); $$;
CREATE OR REPLACE FUNCTION public.register_vehicle_identity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE brand_value text := btrim(coalesce(NEW.brand, '')); model_value text := btrim(coalesce(NEW.model, '')); normalized_brand_value text := public.normalize_vehicle_identity(brand_value); normalized_model_value text := public.normalize_vehicle_identity(model_value); old_brand text := public.normalize_vehicle_identity(coalesce(OLD.brand, '')); old_model text := public.normalize_vehicle_identity(coalesce(OLD.model, ''));
BEGIN
  IF normalized_brand_value = '' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND normalized_brand_value = old_brand AND normalized_model_value = old_model THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND old_brand <> '' THEN
    UPDATE public.vehicle_identities SET listing_count=GREATEST(listing_count-1,0), updated_at=now() WHERE normalized_brand=old_brand AND normalized_model=old_model;
  END IF;
  INSERT INTO public.vehicle_identities (brand,model,normalized_brand,normalized_model,first_submitted_by,last_submitted_by,listing_count,first_seen_at,last_seen_at,created_at,updated_at)
  VALUES (brand_value,NULLIF(model_value,''),normalized_brand_value,normalized_model_value,NEW.dealer_id,NEW.dealer_id,1,now(),now(),now(),now())
  ON CONFLICT (normalized_brand,normalized_model) DO UPDATE SET brand=EXCLUDED.brand,model=EXCLUDED.model,last_submitted_by=EXCLUDED.last_submitted_by,listing_count=public.vehicle_identities.listing_count+1,last_seen_at=now(),updated_at=now();
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_register_vehicle_identity ON public.cars;
CREATE TRIGGER trg_register_vehicle_identity AFTER INSERT OR UPDATE OF brand, model, dealer_id ON public.cars FOR EACH ROW EXECUTE FUNCTION public.register_vehicle_identity();
REVOKE ALL ON TABLE public.vehicle_identities FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_vehicle_identity(text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.register_vehicle_identity() FROM public, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.vehicle_identities TO service_role;
GRANT EXECUTE ON FUNCTION public.normalize_vehicle_identity(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.register_vehicle_identity() TO service_role;
INSERT INTO public.vehicle_identities (brand,model,normalized_brand,normalized_model,first_submitted_by,last_submitted_by,listing_count,first_seen_at,last_seen_at,created_at,updated_at)
SELECT min(brand), min(model), public.normalize_vehicle_identity(brand), public.normalize_vehicle_identity(model), (array_agg(dealer_id ORDER BY created_at ASC))[1], (array_agg(dealer_id ORDER BY created_at DESC))[1], count(*)::integer, min(created_at), max(created_at), min(created_at), now()
FROM public.cars WHERE brand IS NOT NULL AND btrim(brand) <> '' GROUP BY public.normalize_vehicle_identity(brand), public.normalize_vehicle_identity(model)
ON CONFLICT (normalized_brand,normalized_model) DO UPDATE SET brand=EXCLUDED.brand,model=EXCLUDED.model,listing_count=EXCLUDED.listing_count,first_seen_at=LEAST(public.vehicle_identities.first_seen_at,EXCLUDED.first_seen_at),last_seen_at=GREATEST(public.vehicle_identities.last_seen_at,EXCLUDED.last_seen_at),updated_at=now();
