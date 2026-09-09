// Canonical auction close — the single code path that ends an auction.
// Used by the auto-close sweep (utils/auctionTimer.js), the admin
// endpoint (controllers/bidController.js endAuction), and dealer/admin
// control routes. Winner determination, loser handling, audit trail,
// and realtime notification live here and nowhere else.

import Car from "../models/Car.js";
import { atomicCloseAuction } from "../utils/atomicTransactions.js";
import { emitAuctionEnd, emitListingUpdate } from "../socket/socket.js";
import { logAuctionEnded } from "./auditService.js";
import { logInfo, logError } from "../utils/logger.js";
import { emitAuctionOutcome, emitCommunication, COMMUNICATION_EVENTS } from "./communicationEvents.service.js";

const SYSTEM_ACTOR = { id: null, role: "system", name: "auction-engine", email: null };

export const closeAuction = async (carId, { req = null, actor = null, reason = "auto_close", winnerBidId = null } = {}) => {
  try {
    // The database function locks the car, determines/validates the winner,
    // marks winner + losers, and transitions the car to ended/sold atomically.
    // Concurrent callers therefore cannot leave a half-settled auction.
    const result = await atomicCloseAuction(carId, winnerBidId);

    if (result?.already_closed) {
      return {
        success: true,
        alreadyClosed: true,
        winner: result.winner || null,
        finalBid: Number(result.final_bid || 0),
      };
    }

    const winner = result?.winner || null;
    const car = await Car.findById(carId);

    logInfo("Auction closed atomically", {
      carId,
      reason,
      winner: winner?.user || null,
      finalBid: Number(result?.final_bid || 0),
    });

    await logAuctionEnded(
      {
        id: carId,
        auctionId: carId,
        car,
        status: "live",
        currentBid: result?.final_bid || car?.currentBid || 0,
      },
      winner ? { ...winner, id: result?.winner_bid_id } : null,
      actor || SYSTEM_ACTOR,
      req,
    );

    emitAuctionEnd(String(carId), {
      carId: String(carId),
      winner,
      highestBid: Number(result?.final_bid || 0),
      reason,
    });
    emitListingUpdate(String(carId), {
      auctionStatus: "ended",
      sold: Boolean(winner),
      currentBid: Number(result?.final_bid || 0),
    });
    try {
      await emitAuctionOutcome({ carId, winnerUserId: winner?.user, winnerAmount: result?.final_bid, carTitle: car?.title });
    } catch (e) { logError("Auction outcome communications failed", e, { carId }); }

    return {
      success: true,
      winner,
      finalBid: Number(result?.final_bid || 0),
      totalBids: Number(result?.total_bids || car?.bidsCount || 0),
      winnerBidId: result?.winner_bid_id || null,
    };
  } catch (err) {
    logError("CLOSE AUCTION ERROR", err, { carId, reason });
    return { success: false, message: err.message || "Failed to close auction" };
  }
};
