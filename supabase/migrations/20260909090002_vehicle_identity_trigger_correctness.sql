-- Correct update semantics: unchanged listings do not inflate identity popularity;
-- changing a listing's make/model moves one count from the old identity to the new one.
CREATE OR REPLACE FUNCTION public.register_vehicle_identity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE brand_value text := btrim(coalesce(NEW.brand, '')); model_value text := btrim(coalesce(NEW.model, '')); normalized_brand_value text := public.normalize_vehicle_identity(brand_value); normalized_model_value text := public.normalize_vehicle_identity(model_value); old_brand text := public.normalize_vehicle_identity(coalesce(OLD.brand, '')); old_model text := public.normalize_vehicle_identity(coalesce(OLD.model, ''));
BEGIN
  IF normalized_brand_value = '' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND normalized_brand_value = old_brand AND normalized_model_value = old_model THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND old_brand <> '' THEN UPDATE public.vehicle_identities SET listing_count=GREATEST(listing_count-1,0), updated_at=now() WHERE normalized_brand=old_brand AND normalized_model=old_model; END IF;
  INSERT INTO public.vehicle_identities (brand,model,normalized_brand,normalized_model,first_submitted_by,last_submitted_by,listing_count,first_seen_at,last_seen_at,created_at,updated_at)
  VALUES (brand_value,NULLIF(model_value,''),normalized_brand_value,normalized_model_value,NEW.dealer_id,NEW.dealer_id,1,now(),now(),now(),now())
  ON CONFLICT (normalized_brand,normalized_model) DO UPDATE SET brand=EXCLUDED.brand,model=EXCLUDED.model,last_submitted_by=EXCLUDED.last_submitted_by,listing_count=public.vehicle_identities.listing_count+1,last_seen_at=now(),updated_at=now();
  RETURN NEW;
END; $$;
