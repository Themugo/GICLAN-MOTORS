import crypto from "crypto";
import User from "../models/User.js";
import Car from "../models/Car.js";
import Bid from "../models/Bid.js";
import Escrow from "../models/Escrow.js";
import { initiatePayment } from "../services/paymentService.js";
import { emitListingUpdate } from "../socket/socket.js";
import { sendSMS } from "../utils/sms.js";
import { logActionFromReq } from "../utils/securityLogger.js";
import { applySnipingProtection } from "../utils/snipeGuard.js";
import { getMinIncrement } from "../utils/bidRules.js";
import { acquireLock, releaseLock } from "../middleware/distributedLock.js";
import { closeAuction } from "../services/auctionClose.service.js";
import { getIO } from "../utils/io.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";
import { atomicPlaceBid, atomicConfirmBidPayment, atomicAutoBid } from "../utils/atomicTransactions.js";
import { findOrCreateLeadFromAuction, addLeadActivity, updateLeadStage } from "../services/leadService.js";
import { logAuctionBidPlaced } from "../services/auditService.js";

// Email service — top-level import, no-ops if unavailable
let bidEmailService = {};
try {
  bidEmailService = await import("../services/email.service.js");
} catch (e) {
  logWarn("Bid email service unavailable", { error: e.message });
}

// =============================
// 🆔 PSEUDONYM GENERATOR
// =============================
const generatePseudonym = (userId, carId) => {
  const hash = crypto.createHash("sha256").update(`${userId}-${carId}-kayad`).digest("hex");
  const shortId = parseInt(hash.substring(0, 4), 16).toString(36).toUpperCase();
  return `Bidder #${shortId}`;
};

// =============================
// 🎯 CREATE LEAD FROM BID
// =============================
const createLeadFromBid = async (userId, carId) => {
  try {
    const lead = await findOrCreateLeadFromAuction(carId, userId);
    await addLeadActivity(lead._id, "bid_placed", userId, {
      description: "Bid placed on auction",
      metadata: { carId },
    });
    return lead;
  } catch (err) {
    logWarn("Failed to create lead from bid", { error: err.message });
  }
};

// =============================
// 🧠 AUTO-BIDDING ENGINE (PRO) - Bid Loop Prevention
// =============================
const runAutoBidding = async (carId) => {
  try {
    // Auto-bidding is a market mutation and therefore must use the same
    // database-level locking discipline as manual bids. The RPC locks the
    // car row, derives the two highest max-bid participants, inserts at most
    // one auto-bid, and advances the market in one PostgreSQL transaction.
    const result = await atomicAutoBid(carId);
    if (!result?.created) return result;

    const car = await Car.findById(carId);
    if (!car) return result;

    await applySnipingProtection(car);

    const carIdStr = String(carId);
    if (getIO()) {
      getIO().to(`car_${carIdStr}`).emit("auctionUpdate", {
        carId: carIdStr,
        currentBid: result.amount,
      });
    }
    emitListingUpdate(carIdStr, {
      currentBid: result.amount,
      bidsCount: Number(car.bidsCount || 0),
    });

    logInfo("Auto-bid placed atomically", {
      carId,
      userId: result.user_id,
      amount: result.amount,
      maxBid: result.max_bid,
    });
    return result;
  } catch (err) {
    // Auto-bidding is secondary to the confirmed bid. A failed auto-bid must
    // never roll back the provider-confirmed manual bid.
    logWarn("Atomic auto-bid failed", { carId, error: err.message });
    return { created: false, error: err.message };
  }
};

// =============================
// 📜 GET AUCTION BIDS
// =============================
export const getAuctionBids = async (req, res) => {
  try {
    const { id: carId } = req.params;

    const bids = await Bid.find({
      carId,
      status: { $in: ["paid", "pending"] },
    })
      .populate("user", "name verifiedBuyer")
      .sort({ amount: -1 })
      .limit(50);

    res.json({
      success: true,
      bids: bids.map((b, i) => ({
        rank: i + 1,
        amount: b.amount,
        bidderTag: b.bidderTag,
        isVerifiedBuyer: b.user?.verifiedBuyer || false,
        confirmed: b.status === "paid",
        time: b.createdAt,
      })),
    });
  } catch (err) {
    logError("GET BIDS ERROR", err);
    res.status(500).json({ success: false, message: "Failed to fetch bids" });
  }
};

// =============================
// 💰 PLACE BID (AUTO-BID READY - Phase 2 Transaction Support)
// =============================
export const placeBid = async (req, res) => {

  // Per-car bid lock: serializes concurrent bids on the same auction so
  // the read-validate-write sequence below cannot interleave. Without it
  // two simultaneous bids can both pass the minimum-bid check.
  let bidLock = null;
  let bidLockResource = null;

  try {
    const { id: carId } = req.params;
    const { amount, phone, maxBid } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bid amount",
      });
    }

    bidLockResource = `auction:bid:${carId}`;
    bidLock = await acquireLock(bidLockResource, 15000);
    if (!bidLock?.acquired) {
      return res.status(409).json({
        success: false,
        message: "Another bid is being processed for this auction. Retry.",
      });
    }

    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({ success: false, message: "Car not found" });
    }

    if (car.dealer?.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot bid on your own car",
      });
    }

    if (car.highestBidder?.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "You are already the highest bidder",
      });
    }

    // =============================
    // 🔐 WALLET-LOCK: Bids > KES 5M require KES 50K pre-authorized escrow
    // =============================
    if (car.auctionStatus !== "live") {
      return res.status(400).json({
        success: false,
        message: "Auction not live",
      });
    }

    // Server-authoritative auction time: the status flag alone can lag
    // the close sweep by up to one interval, so the end time itself is
    // the final word on whether bidding is still open.
    if (car.auctionEnd && new Date(car.auctionEnd).getTime() <= Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Auction has ended",
      });
    }

    // 📱 Require verified phone for bids
    const bidder = await User.findById(userId).select("phone emailVerified phone");
    if (!bidder?.phone || bidder.phone.length < 8) {
      return res.status(400).json({
        success: false,
        message: "A verified phone number is required to place bids. Update your profile.",
      });
    }

    // 🛡 High-value bid verification
    if (amount > 5000000) {
      const escrowDeposit = await Escrow.findOne({
        buyer: userId,
        amount: { $gte: 50000 },
        status: "held",
      });
      if (!escrowDeposit) {
        return res.status(403).json({
          success: false,
            message:
            "Bids over KES 5,000,000 require a KES 50,000 pre-authorized deposit held in escrow. Please deposit via your profile.",
          code: "WALLET_LOCK_REQUIRED",
          minDeposit: 50000,
        });
      }
    }

    const highest = await Bid.getHighestBid(carId);
    const currentBid = Math.max(highest?.amount || 0, car.currentBid || 0) || car.price || 0;

    // 📏 Enforce minimum bid increment (canonical tiers — utils/bidRules.js)
    const minIncrement = getMinIncrement(currentBid);
    if (amount < currentBid + minIncrement) {
      return res.status(400).json({
        success: false,
        message: `Minimum bid increment is KES ${minIncrement.toLocaleString("en-KE")}. Current bid: KES ${currentBid.toLocaleString("en-KE")}`,
        minBid: currentBid + minIncrement,
      });
    }

    // =============================
    // 💳 INITIATE PAYMENT
    // =============================
    const payment = await initiatePayment({
      userId,
      carId,
      type: "bid",
      amount: 1,
      phone: bidder.phone,
      metadata: { bidAmount: amount },
    });

    // =============================
    // 🧾 ATOMIC BID + AUCTION UPDATE
    // =============================
    // The database function locks the car row and performs the bid insert
    // plus any paid-market update in one PostgreSQL transaction. The old
    // compatibility session was not a real DB transaction.
    const checkoutRequestId = payment.checkoutRequestID || payment.checkoutID;
    const bidStatus = "pending";
    const atomicResult = await atomicPlaceBid({
      carId,
      userId,
      amount,
      maxBid: maxBid || null,
      phone,
      bidderTag: generatePseudonym(userId, carId),
      status: bidStatus,
      checkoutRequestId,
    });
    const bid = await Bid.findById(atomicResult.bid_id);
    if (!bid) throw new Error("Atomic bid creation succeeded but bid could not be reloaded");

    // Create lead from bid
    try {
      await createLeadFromBid(userId, carId);
    } catch (leadErr) {
      logWarn("Failed to create lead from bid", { error: leadErr.message });
    }

    // The canonical atomic database operation has succeeded. No local/mock
    // payment branch may mark a bid as paid or advance the auction without
    // M-Pesa confirmation.

    res.json({
      success: true,
      message: "STK push sent; bid remains pending until M-Pesa confirmation",
      checkoutRequestID: payment.checkoutRequestID || payment.checkoutID,
      bid: bid,
    });
  } catch (err) {
    logError("PLACE BID ERROR", err);
    res.status(500).json({ success: false, message: "Bid failed" });
  } finally {
    if (bidLock?.acquired && bidLockResource) {
      releaseLock(bidLockResource, bidLock.id).catch(() => {});
    }
  }
};

// =============================
// 📲 MPESA CALLBACK
// =============================
export const confirmBidPayment = async (req, res) => {
  try {
    const callback = req.body?.Body?.stkCallback || req.body?.stkCallback;

    if (!callback) throw new Error("Invalid callback");

    const checkoutRequestID = callback.CheckoutRequestID;
    const resultCode = callback.ResultCode;

    const metadata = callback.CallbackMetadata?.Item || [];

    const receipt = metadata.find((i) => i.Name === "MpesaReceiptNumber")?.Value;

    if (resultCode !== 0) {
      await Bid.updateOne({ checkoutRequestID }, { status: "failed" });
      return res.json({ success: false, message: "Payment failed" });
    }

    const atomicConfirmation = await atomicConfirmBidPayment(checkoutRequestID, receipt);
    const bid = await Bid.findById(atomicConfirmation.bid_id);
    if (!bid) throw new Error("Atomic bid confirmation succeeded but bid could not be reloaded");

    // ── PDF RECEIPT (fire-and-forget) ───────────────────────
    try {
      const { generateReceipt } = await import("../services/pdfService.js");
      generateReceipt({
        title: "Bid Payment Confirmed",
        amount: bid.amount,
        transactionId: receipt || bid._id.toString(),
        carDetails: bid.carId?.toString() || "—",
        date: new Date(),
      }).catch((e) => logWarn("SMS send failed", { error: e.message }));
    } catch (_) {
      /* PDF generation non-critical */
    }

    const car = await Car.findById(bid.carId);
    const previousHighestBidder = atomicConfirmation.previous_highest_bidder;
    const raisesMarket = atomicConfirmation.applied_to_market === true;

    logActionFromReq(req, "bid.payment_confirmed", {
      target: bid.carId,
      targetModel: "Car",
      resourceId: String(bid.carId),
      details: { bidId: bid.id || bid._id, amount: bid.amount, receipt, appliedToMarket: raisesMarket },
      severity: "info",
    });

    // 🔥 AUTO-BID + REALTIME — only when the confirmed bid moved the market
    if (raisesMarket) {
      await runAutoBidding(bid.carId);

      if (getIO()) {
        const carIdStr = bid.carId.toString();
        getIO().to(`car_${carIdStr}`).emit("auctionUpdate", {
          carId: carIdStr,
          currentBid: car.currentBid,
        });
      }
      emitListingUpdate(bid.carId.toString(), { currentBid: car.currentBid, bidsCount: car?.bidsCount || 1 });
    }

    // 📧 Email notifications + 📱 SMS (fire-and-forget)
    try {
      const { sendBidConfirmationEmail, sendOutbidEmail } = bidEmailService;
      const User = (await import("../models/User.js")).default;

      const bidder = await User.findById(bid.user).select("email name phone");
      if (bidder?.email && typeof sendBidConfirmationEmail === "function") {
        sendBidConfirmationEmail(bidder, bid, car).catch((e) =>
          logWarn("Bid confirm email failed", { error: e.message }),
        );
      }
      if (bidder?.phone && bidder?.notifications?.sms !== false) {
        sendSMS(
          bidder.phone,
          `Bid confirmed on ${car?.title || "vehicle"} — KES ${Number(bid.amount).toLocaleString("en-KE")}. Track it live on Kayad.`,
        ).catch((e) => logWarn("SMS send failed", { error: e.message }));
      }

      if (previousHighestBidder && String(previousHighestBidder) !== String(bid.user)) {
        const prevBidder = await User.findById(previousHighestBidder).select("email name phone");
        if (prevBidder?.email && typeof sendOutbidEmail === "function") {
          sendOutbidEmail(prevBidder, bid.amount, car).catch((e) =>
            logWarn("Outbid email failed", { error: e.message }),
          );
        }
        if (prevBidder?.phone && prevBidder?.notifications?.sms !== false) {
          sendSMS(
            prevBidder.phone,
            `You've been outbid on ${car?.title || "vehicle"} — KES ${Number(bid.amount).toLocaleString("en-KE")}. Bid higher now on Kayad.`,
          ).catch((e) => logWarn("SMS send failed", { error: e.message }));
        }
      }
    } catch (e) { logWarn("Bid confirmation SMS notification failed", { error: e.message }); }

    res.json({ success: true });
  } catch (err) {
    logError("CALLBACK ERROR", err);
    res.status(500).json({ success: false, message: "Bid callback failed" });
  }
};

// =============================
// 👤 GET MY BIDS
// =============================
export const getMyBids = async (req, res) => {
  try {
    const bids = await Bid.find({ user: req.user.id })
      .populate("car", "title images price brand model year")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, bids });
  } catch (err) {
    logError("Failed to fetch user bids", err);
    res.status(500).json({ success: false, message: "Failed to fetch your bids" });
  }
};

// =============================
// 🏁 END AUCTION (ADMIN)
// =============================
// Delegates to the canonical close path — the same code the auto-close
// sweep and dealer/admin control routes use. Route middleware already
// provides adminOnly + idempotency.
export const endAuction = async (req, res) => {
  try {
    const { id: carId } = req.params;

    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({ success: false, message: "Car not found" });
    }

    const result = await closeAuction(carId, { req, actor: req.user, reason: "admin_end" });

    if (result.alreadyClosed) {
      return res.json({ success: true, alreadyClosed: true });
    }
    if (!result.success) {
      return res.status(500).json({ success: false, message: "Failed to end auction" });
    }

    res.json({
      success: true,
      winner: result.winner,
    });
  } catch (err) {
    logError("Failed to end auction", err);
    res.status(500).json({ success: false, message: "Failed to end auction" });
  }
};
