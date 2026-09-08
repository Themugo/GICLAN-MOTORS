CREATE TABLE IF NOT EXISTS public.vehicle_valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES public.cars(id) ON DELETE SET NULL,
  vin varchar(17),
  registration_number varchar(20),
  make varchar(50) NOT NULL,
  model varchar(100) NOT NULL,
  year integer NOT NULL,
  current_value numeric(14,2),
  wholesale_value numeric(14,2),
  dealer_value numeric(14,2),
  private_sale_value numeric(14,2),
  auction_estimate numeric(14,2),
  confidence_level varchar(20) NOT NULL DEFAULT 'low' CHECK (confidence_level IN ('low','medium','high')),
  confidence_score numeric(5,2) NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  confidence_factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  comparable_count integer NOT NULL DEFAULT 0 CHECK (comparable_count >= 0),
  mileage_adjustment numeric(7,3) NOT NULL DEFAULT 0,
  condition_adjustment numeric(7,3) NOT NULL DEFAULT 0,
  depreciation_rate numeric(7,3) NOT NULL DEFAULT 0,
  monthly_depreciation numeric(14,2) NOT NULL DEFAULT 0,
  future_value_12m numeric(14,2),
  future_value_24m numeric(14,2),
  calculation_method varchar(50) NOT NULL,
  model_version varchar(20) NOT NULL,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_vehicle_valuations_vehicle ON public.vehicle_valuations(vehicle_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_valuations_lookup ON public.vehicle_valuations(make, model, year, calculated_at DESC);

ALTER TABLE public.vehicle_valuations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.vehicle_valuations FROM anon, authenticated;
GRANT SELECT ON TABLE public.vehicle_valuations TO authenticated;

DROP POLICY IF EXISTS vehicle_valuations_select_own ON public.vehicle_valuations;
CREATE POLICY vehicle_valuations_select_own ON public.vehicle_valuations
  FOR SELECT TO authenticated
  USING (
    vehicle_id IN (
      SELECT id FROM public.cars WHERE dealer_id = auth.uid()
    )
    OR vehicle_id IN (
      SELECT id FROM public.owner_vehicles WHERE owner_id = auth.uid() AND vin = (SELECT vin FROM public.cars WHERE id = vehicle_valuations.vehicle_id)
    )
  );
