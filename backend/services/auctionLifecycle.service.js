// Canonical auction lifecycle service.
// All auction state transitions (start, extend, close) converge here so
// admin and dealer controls cannot drift into separate implementations.

import { atomicStartAuction, atomicExtendAuction } from "../utils/atomicTransactions.js";
import { logActionFromReq } from "../utils/securityLogger.js";
import { closeAuction } from "./auctionClose.service.js";
import { emitCommunication, COMMUNICATION_EVENTS } from "./communicationEvents.service.js";
import Car from "../models/Car.js";

export const startAuction = async ({ carId, durationMs, startingBid, reservePrice = null, reserveMode = "none", req }) => {
  const result = await atomicStartAuction({
    carId,
    durationMs,
    startingBid,
    reservePrice,
    reserveMode,
  });

  await logActionFromReq(req, "auction_start", {
    target: carId,
    targetModel: "Car",
    details: { startingBid: result.starting_bid, reservePrice: result.reserve_price, durationMs },
  });

  const car = await Car.findById(carId).select("title dealer").lean();
  if (car?.dealer) await emitCommunication({ userId: car.dealer, eventType: COMMUNICATION_EVENTS.AUCTION_STARTED, title: "Auction started", message: `${car.title || "Your vehicle"} is now live for auction.`, channels: ["in_app", "email", "sms", "whatsapp"], metadata: { carId, auctionEnd: result.auction_end } }).catch(() => {});
  return result;
};

export const extendAuction = async ({ carId, extraMs, req, reason = "auction_extend" }) => {
  const result = await atomicExtendAuction({ carId, extraMs });
  await logActionFromReq(req, reason, {
    target: carId,
    targetModel: "Car",
    details: { extraMs, extensionCount: result.extension_count, newEndTime: result.auction_end },
  });
  const car = await Car.findById(carId).select("title dealer").lean();
  if (car?.dealer) await emitCommunication({ userId: car.dealer, eventType: COMMUNICATION_EVENTS.AUCTION_EXTENDED, title: "Auction extended", message: `${car.title || "Your vehicle"} auction has been extended.`, channels: ["in_app", "email", "sms", "whatsapp"], metadata: { carId, extraMs, auctionEnd: result.auction_end } }).catch(() => {});
  return result;
};

export { closeAuction };
