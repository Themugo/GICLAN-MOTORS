-- Auction settlement correction: a hard reserve must prevent a sale.
-- The previous close function always declared the highest paid bid the
-- winner, even when a hard reserve price was configured and not met.

CREATE OR REPLACE FUNCTION kayad_close_auction_atomic(
  p_car_id UUID,
  p_winner_bid_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_car cars%ROWTYPE;
  v_winner bids%ROWTYPE;
  v_final_bid NUMERIC := 0;
  v_winner_json JSONB := NULL;
  v_total INTEGER := 0;
  v_reserve_met BOOLEAN := true;
BEGIN
  SELECT * INTO v_car FROM cars WHERE id = p_car_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Car not found'; END IF;

  IF v_car.auction_status <> 'live' THEN
    SELECT COUNT(*) INTO v_total FROM bids WHERE car_id = p_car_id AND status IN ('paid','won','lost');
    RETURN jsonb_build_object(
      'success', true, 'already_closed', true,
      'winner', v_car.winner, 'final_bid', COALESCE(v_car.current_bid, 0),
      'total_bids', v_total
    );
  END IF;

  IF p_winner_bid_id IS NOT NULL THEN
    SELECT * INTO v_winner FROM bids
     WHERE id = p_winner_bid_id AND car_id = p_car_id AND status = 'paid'
     FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Selected winner bid is not a confirmed bid for this auction'; END IF;
  ELSE
    SELECT * INTO v_winner FROM bids
     WHERE car_id = p_car_id AND status = 'paid'
     ORDER BY amount DESC, created_at ASC
     LIMIT 1
     FOR UPDATE;
  END IF;

  IF v_winner.id IS NOT NULL THEN
    v_final_bid := v_winner.amount;
    v_reserve_met := v_car.reserve_mode IS DISTINCT FROM 'hard'
      OR v_car.reserve_price IS NULL
      OR v_winner.amount >= v_car.reserve_price;
  END IF;

  UPDATE cars
     SET auction_status = 'ended', allow_bid = false, updated_at = now()
   WHERE id = p_car_id;

  IF v_winner.id IS NOT NULL AND v_reserve_met THEN
    v_winner_json := jsonb_build_object('user', v_winner.user_id, 'amount', v_winner.amount, 'bidId', v_winner.id, 'bidderTag', v_winner.bidder_tag);
    UPDATE bids SET status = 'won' WHERE id = v_winner.id;
    UPDATE bids SET status = 'lost' WHERE car_id = p_car_id AND status = 'paid' AND id <> v_winner.id;
    UPDATE cars
       SET current_bid = v_winner.amount,
           highest_bidder_id = v_winner.user_id,
           winner = v_winner_json,
           sold = true,
           status = 'sold',
           updated_at = now()
     WHERE id = p_car_id;
  ELSE
    UPDATE bids SET status = 'lost' WHERE car_id = p_car_id AND status = 'paid';
    UPDATE cars SET winner = NULL, sold = false, updated_at = now() WHERE id = p_car_id;
  END IF;

  SELECT COUNT(*) INTO v_total FROM bids WHERE car_id = p_car_id AND status IN ('paid','won','lost');

  RETURN jsonb_build_object(
    'success', true,
    'already_closed', false,
    'winner', v_winner_json,
    'winner_bid_id', CASE WHEN v_winner_json IS NULL THEN NULL ELSE v_winner.id END,
    'final_bid', v_final_bid,
    'total_bids', v_total,
    'reserve_met', v_reserve_met
  );
END;
$$;

REVOKE ALL ON FUNCTION kayad_close_auction_atomic(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_close_auction_atomic(UUID, UUID) TO service_role;
