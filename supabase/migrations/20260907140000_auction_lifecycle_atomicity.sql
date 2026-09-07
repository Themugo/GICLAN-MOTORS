-- KAYAD Auction Lifecycle: one authoritative DB transition path.
-- Start and extend previously had separate admin/dealer read-modify-write
-- implementations. These RPCs lock the car row and enforce the same rules
-- regardless of which authorized UI initiated the action.

CREATE OR REPLACE FUNCTION kayad_start_auction_atomic(
  p_car_id UUID,
  p_duration_ms BIGINT,
  p_starting_bid NUMERIC,
  p_reserve_price NUMERIC DEFAULT NULL,
  p_reserve_mode TEXT DEFAULT 'none'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_car cars%ROWTYPE;
  v_end TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_car FROM cars WHERE id = p_car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Car not found'; END IF;

  IF v_car.auction_status = 'live' THEN RAISE EXCEPTION 'Auction already live'; END IF;
  IF v_car.auction_status = 'ended' THEN RAISE EXCEPTION 'Ended auctions cannot be restarted'; END IF;
  IF p_duration_ms IS NULL OR p_duration_ms < 86400000 THEN
    RAISE EXCEPTION 'Minimum auction duration is 24 hours';
  END IF;
  IF p_starting_bid IS NULL OR p_starting_bid < 1000 THEN
    RAISE EXCEPTION 'Starting bid must be at least KES 1,000';
  END IF;
  IF p_reserve_price IS NOT NULL AND p_reserve_price < p_starting_bid THEN
    RAISE EXCEPTION 'Reserve price must be >= starting bid';
  END IF;
  IF p_reserve_mode NOT IN ('none','soft','hard') THEN
    RAISE EXCEPTION 'Invalid reserve mode';
  END IF;

  v_end := now() + (p_duration_ms::double precision * interval '1 millisecond');

  UPDATE cars
     SET auction_status = 'live',
         allow_bid = true,
         starting_bid = p_starting_bid,
         current_bid = p_starting_bid,
         highest_bidder_id = NULL,
         auction_start_time = now(),
         auction_end = v_end,
         reserve_price = p_reserve_price,
         reserve_mode = p_reserve_mode,
         extension_count = 0,
         winner = NULL,
         sold = false,
         updated_at = now()
   WHERE id = p_car_id;

  RETURN jsonb_build_object(
    'car_id', p_car_id,
    'starting_bid', p_starting_bid,
    'reserve_price', p_reserve_price,
    'reserve_mode', p_reserve_mode,
    'auction_start_time', (SELECT auction_start_time FROM cars WHERE id = p_car_id),
    'auction_end', v_end,
    'extension_count', 0
  );
END;
$$;

CREATE OR REPLACE FUNCTION kayad_extend_auction_atomic(
  p_car_id UUID,
  p_extra_ms BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_car cars%ROWTYPE;
  v_new_end TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  SELECT * INTO v_car FROM cars WHERE id = p_car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Car not found'; END IF;
  IF v_car.auction_status <> 'live' THEN RAISE EXCEPTION 'Auction is not live'; END IF;
  IF p_extra_ms IS NULL OR p_extra_ms < 3600000 OR p_extra_ms > 259200000 THEN
    RAISE EXCEPTION 'Extension must be between 1 and 72 hours';
  END IF;

  v_count := COALESCE(v_car.extension_count, 0);
  IF v_count >= 3 THEN RAISE EXCEPTION 'Maximum 3 extensions per auction reached'; END IF;

  v_new_end := GREATEST(COALESCE(v_car.auction_end, now()), now())
    + (p_extra_ms::double precision * interval '1 millisecond');

  UPDATE cars
     SET auction_end = v_new_end,
         extension_count = v_count + 1,
         updated_at = now()
   WHERE id = p_car_id;

  RETURN jsonb_build_object(
    'car_id', p_car_id,
    'auction_end', v_new_end,
    'extension_count', v_count + 1
  );
END;
$$;

REVOKE ALL ON FUNCTION kayad_start_auction_atomic(UUID, BIGINT, NUMERIC, NUMERIC, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION kayad_extend_auction_atomic(UUID, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_start_auction_atomic(UUID, BIGINT, NUMERIC, NUMERIC, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION kayad_extend_auction_atomic(UUID, BIGINT) TO service_role;
