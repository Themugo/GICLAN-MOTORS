import { getSupabase } from "./supabase.js";

/**
 * Database-level atomic operations for financial and auction-critical paths.
 * These are PostgreSQL functions invoked through Supabase RPC. They must not
 * be replaced with application-side read/validate/write sequences.
 */
export async function atomicPlaceBid({
  carId,
  userId,
  amount,
  bidderTag,
  phone,
  maxBid = null,
  status,
  checkoutRequestId = null,
}) {
  const { data, error } = await getSupabase().rpc("kayad_place_bid_atomic", {
    p_car_id: carId,
    p_user_id: userId,
    p_amount: amount,
    p_bidder_tag: bidderTag,
    p_phone: phone || null,
    p_max_bid: maxBid,
    p_status: status,
    p_checkout_request_id: checkoutRequestId,
  });
  if (error) throw error;
  return data;
}

export async function atomicConfirmBidPayment(checkoutRequestId, receipt = null) {
  const { data, error } = await getSupabase().rpc("kayad_confirm_bid_payment_atomic", {
    p_checkout_request_id: checkoutRequestId,
    p_receipt: receipt,
  });
  if (error) throw error;
  return data;
}


export async function atomicAutoBid(carId) {
  const { data, error } = await getSupabase().rpc("kayad_auto_bid_atomic", {
    p_car_id: carId,
  });
  if (error) throw error;
  return data;
}

export async function atomicCloseAuction(carId, winnerBidId = null) {
  const { data, error } = await getSupabase().rpc("kayad_close_auction_atomic", {
    p_car_id: carId,
    p_winner_bid_id: winnerBidId,
  });
  if (error) throw error;
  return data;
}

export async function atomicSettleBidPayment(paymentId, receipt = null) {
  const { data, error } = await getSupabase().rpc("kayad_settle_bid_payment_atomic", {
    p_payment_id: paymentId,
    p_receipt: receipt,
  });
  if (error) throw error;
  return data;
}

export async function atomicSettlePurchasePayment(paymentId, receipt = null) {
  const { data, error } = await getSupabase().rpc("kayad_settle_purchase_payment_atomic", {
    p_payment_id: paymentId,
    p_receipt: receipt,
  });
  if (error) throw error;
  return data;
}

export async function atomicTransitionEscrow({
  escrowId,
  nextStatus,
  actorId = null,
  role,
  idempotencyKey = null,
  reason = null,
}) {
  const { data, error } = await getSupabase().rpc("kayad_transition_escrow_atomic", {
    p_escrow_id: escrowId,
    p_next_status: nextStatus,
    p_actor_id: actorId,
    p_role: role,
    p_idempotency_key: idempotencyKey,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}


export async function atomicStartAuction({ carId, durationMs, startingBid, reservePrice = null, reserveMode = "none" }) {
  const { data, error } = await getSupabase().rpc("kayad_start_auction_atomic", { p_car_id: carId, p_duration_ms: durationMs, p_starting_bid: startingBid, p_reserve_price: reservePrice, p_reserve_mode: reserveMode });
  if (error) throw error;
  return data;
}

export async function atomicExtendAuction({ carId, extraMs }) {
  const { data, error } = await getSupabase().rpc("kayad_extend_auction_atomic", { p_car_id: carId, p_extra_ms: extraMs });
  if (error) throw error;
  return data;
}


export async function atomicVerifyEscrowFunding(escrowId, actorId, fundingReference) {
  const { data, error } = await getSupabase().rpc("kayad_verify_escrow_funding_atomic", {
    p_escrow_id: escrowId,
    p_actor_id: actorId,
    p_reference: fundingReference,
  });
  if (error) throw error;
  return data;
}
