import { findById, findAll } from "../db/index.js";
import { sendUserCommunication } from "./communicationGateway.service.js";

export const COMMUNICATION_EVENTS = Object.freeze({
  REGISTRATION: "registration.completed",
  EMAIL_VERIFICATION: "account.email_verification",
  PASSWORD_RESET: "account.password_reset",
  PHONE_VERIFICATION: "account.phone_verification",
  BID_PLACED: "auction.bid_placed",
  BID_CONFIRMED: "auction.bid_confirmed",
  OUTBID: "auction.outbid",
  AUCTION_STARTED: "auction.started",
  AUCTION_EXTENDED: "auction.extended",
  AUCTION_ENDING_SOON: "auction.ending_soon",
  AUCTION_WON: "auction.won",
  AUCTION_LOST: "auction.lost",
  PAYMENT_SUCCESS: "payment.succeeded",
  PAYMENT_FAILED: "payment.failed",
  RECEIPT_ISSUED: "payment.receipt_issued",
  ESCROW_CREATED: "escrow.created",
  ESCROW_FUNDED: "escrow.funded",
  ESCROW_RELEASED: "escrow.released",
  ESCROW_REFUNDED: "escrow.refunded",
  INSPECTION_BOOKED: "inspection.booked",
  INSPECTION_ASSIGNED: "inspection.assigned",
  INSPECTION_STARTED: "inspection.started",
  INSPECTION_COMPLETED: "inspection.completed",
  DISPUTE_OPENED: "dispute.opened",
  DISPUTE_UPDATED: "dispute.updated",
  DISPUTE_RESOLVED: "dispute.resolved",
  DEALER_SUBMITTED: "dealer.submitted",
  DEALER_VERIFIED: "dealer.verified",
  SUBSCRIPTION_ACTIVATED: "dealer.subscription_activated",
  SUBSCRIPTION_EXPIRING: "dealer.subscription_expiring",
  SUBSCRIPTION_EXPIRED: "dealer.subscription_expired",
  SUPPORT_CASE_CREATED: "support.case_created",
  SUPPORT_CASE_UPDATED: "support.case_updated",
  ADMIN_ACTION: "admin.action",
  SAVED_SEARCH_MATCH: "marketplace.saved_search_match",
  REMINDER: "system.reminder",
  CONTACT_FORM: "support.contact_form",
  ESCROW_DELIVERY_CONFIRMED: "escrow.delivery_confirmed",
  SECURITY_ALERT: "security.alert",
});

const defaults = {
  channels: ["in_app", "email"],
  category: "transactional",
};

export async function emitCommunication({ userId, eventType, title, message, channels = defaults.channels, category = defaults.category, templateCode = null, metadata = {} }) {
  if (!userId) return [];
  return sendUserCommunication({ userId, channels, eventType, category, templateCode, title, message, metadata });
}

export async function emitToUsers(userIds, payload) {
  const ids = [...new Set((userIds || []).filter(Boolean).map(String))];
  return Promise.all(ids.map((userId) => emitCommunication({ ...payload, userId })));
}

export async function emitToUserFromRecord(userId, payload) {
  return emitCommunication({ userId, ...payload });
}

export async function emitAuctionOutcome({ carId, winnerUserId, winnerAmount, carTitle }) {
  const bids = await findAll("bids", { filters: { car: carId, status: "lost" }, limit: 500 });
  const loserIds = bids.map((b) => b.user || b.userId).filter((id) => String(id) !== String(winnerUserId));
  const jobs = [];
  if (winnerUserId) jobs.push(emitCommunication({
    userId: winnerUserId,
    eventType: COMMUNICATION_EVENTS.AUCTION_WON,
    title: "Auction won",
    message: `Congratulations. You won ${carTitle || "the vehicle"} with a bid of KES ${Number(winnerAmount || 0).toLocaleString("en-KE")}.`,
    channels: ["in_app", "email", "sms", "whatsapp"],
    metadata: { carId, winnerAmount },
  }));
  for (const userId of loserIds) jobs.push(emitCommunication({
    userId,
    eventType: COMMUNICATION_EVENTS.AUCTION_LOST,
    title: "Auction ended",
    message: `${carTitle || "The vehicle"} auction has ended. Your bid was not the winning bid.`,
    channels: ["in_app", "email", "sms"],
    metadata: { carId },
  }));
  return Promise.all(jobs);
}
