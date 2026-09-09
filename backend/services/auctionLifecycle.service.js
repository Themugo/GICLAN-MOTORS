// Canonical auction lifecycle service.
// All auction state transitions (start, extend, close) converge here so
// admin and dealer controls cannot drift into separate implementations.

import { atomicStartAuction, atomicExtendAuction } from "../utils/atomicTransactions.js";
import { logActionFromReq } from "../utils/securityLogger.js";
import { closeAuction } from "./auctionClose.service.js";

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

  return result;
};

export const extendAuction = async ({ carId, extraMs, req, reason = "auction_extend" }) => {
  const result = await atomicExtendAuction({ carId, extraMs });
  await logActionFromReq(req, reason, {
    target: carId,
    targetModel: "Car",
    details: { extraMs, extensionCount: result.extension_count, newEndTime: result.auction_end },
  });
  return result;
};

export { closeAuction };
