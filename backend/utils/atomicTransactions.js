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

export async function atomicOpenDispute(args){ const {data,error}=await getSupabase().rpc("kayad_open_dispute_atomic",{p_escrow_id:args.escrowId,p_actor_id:args.actorId,p_role:args.role,p_title:args.title,p_description:args.description,p_category:args.category,p_priority:args.priority,p_idempotency_key:args.idempotencyKey||null}); if(error) throw error; return data; }
export async function atomicTransitionDispute(args){ const {data,error}=await getSupabase().rpc("kayad_transition_dispute_atomic",{p_escrow_id:args.escrowId,p_actor_id:args.actorId,p_role:args.role,p_next_status:args.nextStatus,p_reason:args.reason||null}); if(error) throw error; return data; }
export async function atomicAppendDisputeEvidence(args){ const {data,error}=await getSupabase().rpc("kayad_append_dispute_evidence_atomic",{p_escrow_id:args.escrowId,p_actor_id:args.actorId,p_role:args.role,p_item:args.item}); if(error) throw error; return data; }
export async function atomicResolveDispute(args){ const {data,error}=await getSupabase().rpc("kayad_resolve_dispute_atomic",{p_escrow_id:args.escrowId,p_actor_id:args.actorId,p_decision:args.decision,p_amount:args.amount??null,p_seller_amount:args.sellerAmount??null,p_buyer_amount:args.buyerAmount??null,p_reason:args.reason||null,p_idempotency_key:args.idempotencyKey||null}); if(error) throw error; return data; }
