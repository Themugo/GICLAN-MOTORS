import SmsBidder from "../models/SmsBidder.js";
import { logError } from '../infrastructure/logging/index.js';
import Car from "../models/Car.js";
import Bid from "../models/Bid.js";
import User from "../models/User.js";
import { initiatePayment } from "../services/paymentService.js";
import { emitListingUpdate } from "../socket/socket.js";
import { sendNotification } from "../services/notification.service.js";
import { sendSMS } from "../utils/sms.js";
import { getIO } from "../utils/io.js";
import { applySnipingProtection } from "../utils/snipeGuard.js";
import { getMinNextBid } from "../utils/bidRules.js";

// =============================
// 🔢 SMS BID PARSER
// =============================
const parseSmsBid = (text) => {
  const cleaned = text.trim().toUpperCase().replace(/\s+/g, " ");
  // Match: BID 4.3M, BID 500K, BID 4500000, BID 1.2MN
  const match = cleaned.match(/^BID\s+([\d.]+)\s*(M(?:N)?|K|MILLION|THOUSAND)?$/);
  if (!match) return null;
  let amount = parseFloat(match[1]);
  const suffix = match[2];
  if (suffix === "M" || suffix === "MN" || suffix === "MILLION") amount *= 1000000;
  else if (suffix === "K" || suffix === "THOUSAND") amount *= 1000;
  return Math.round(amount);
};

// =============================
// 📬 INBOUND SMS WEBHOOK
// =============================
export const handleInboundSms = async (req, res) => {
  try {
    const { from, text, date } = req.body;
    if (!from || !text) return res.status(400).json({ success: false, message: "Missing from or text" });

    const cleanedPhone = from.replace(/^\+/, "").replace(/\D/g, "");
    if (cleanedPhone.length < 9) return res.status(400).json({ success: false, message: "Invalid phone" });

    const amount = parseSmsBid(text);
    if (!amount || amount < 1000) {
      await sendSMS(cleanedPhone, "Invalid bid format. Reply: BID <amount> — e.g. 'BID 4.3M' or 'BID 500K'");
      return res.json({ success: true, message: "Invalid format, instructed user" });
    }

    // Look up registered SMS bidder
    const smsBidder = await SmsBidder.findOne({ phone: cleanedPhone, active: true }).populate(
      "subscriptions.car",
      "title brand model year auctionStatus currentBid auctionEnd",
    );
    if (!smsBidder || smsBidder.subscriptions.length === 0) {
      await sendSMS(cleanedPhone, "You are not registered for SMS bidding. Visit KAYAD to link your phone.");
      return res.json({ success: true, message: "Unregistered phone" });
    }

    // Find which subscribed car the bid is for — use the most recently active auction
    const activeSub = smsBidder.subscriptions.find((s) => s.car && s.car.auctionStatus === "live" && s.car.allowBid);
    if (!activeSub) {
      await sendSMS(cleanedPhone, "No active auctions found on your subscribed cars.");
      return res.json({ success: true, message: "No active auctions" });
    }

    const car = await Car.findById(activeSub.car._id);
    if (!car || car.auctionStatus !== "live") {
      await sendSMS(cleanedPhone, "The auction for this car is no longer live.");
      return res.json({ success: true, message: "Auction ended" });
    }

    if (car.dealer && car.dealer.toString() === smsBidder.user.toString()) {
      await sendSMS(cleanedPhone, "You cannot bid on your own listing.");
      return res.json({ success: true, message: "Self-bid blocked" });
    }

    const highest = await Bid.getHighestBid(car._id);
    const currentBid = Math.max(highest?.amount || 0, car.currentBid || 0) || car.price || 0;
    const minNextBid = getMinNextBid(currentBid);
    if (amount < minNextBid) {
      await sendSMS(
        cleanedPhone,
        `Bid too low. Minimum next bid is KES ${minNextBid.toLocaleString("en-KE")} (current: KES ${currentBid.toLocaleString("en-KE")}). Reply with a higher amount.`,
      );
      return res.json({ success: true, message: "Bid too low" });
    }

    // SMS bidding has no payment-integrated bid settlement path yet.
    // Never create a paid bid without a real payment record/callback.
    await sendSMS(cleanedPhone, "SMS bidding is temporarily unavailable. Please place the bid through KAYAD with M-Pesa payment.");
    return res.json({ success: false, message: "SMS bidding payment integration unavailable" });

    // Sniping protection — canonical implementation (env-configured
    // window/extension, extension caps, realtime notify).
    await applySnipingProtection(car);

    // Socket events
    if (getIO()) {
      getIO().to(`car_${car._id}`).emit("auctionUpdate", {
        carId: car._id.toString(),
        currentBid: amount,
      });
    }
    emitListingUpdate(car._id.toString(), { currentBid: amount, bidsCount: car.bidsCount });

    // Notify bidder
    await sendSMS(
      cleanedPhone,
      `✅ Bid of KES ${amount.toLocaleString("en-KE")} placed on ${car.title || "vehicle"}. Track it live on KAYAD.`,
    );

    // Notify outbid user
    if (previousHighestBidder && String(previousHighestBidder) !== String(smsBidder.user)) {
      const prevUser = await User.findById(previousHighestBidder).select("phone name");
      if (prevUser?.phone) {
        await sendSMS(
          prevUser.phone,
          `You've been outbid on ${car.title || "vehicle"} — KES ${amount.toLocaleString("en-KE")}. Bid higher now on KAYAD.`,
        );
      }
    }

    smsBidder.lastBidAt = new Date();
    smsBidder.totalSmsBids = (smsBidder.totalSmsBids || 0) + 1;
    await smsBidder.save();

    res.json({ success: true, message: "Bid placed via SMS" });
  } catch (err) {
    logError("❌ SMS BID WEBHOOK ERROR", err);
    res.status(500).json({ success: false, message: "SMS bid processing failed" });
  }
};

// =============================
// 📱 REGISTER PHONE FOR SMS BIDDING
// =============================
export const registerSmsBidder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: "Phone required" });

    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 9) return res.status(400).json({ success: false, message: "Invalid phone" });

    let smsBidder = await SmsBidder.findOne({ user: userId });
    if (smsBidder) {
      smsBidder.phone = cleaned;
      smsBidder.active = true;
      await smsBidder.save();
    } else {
      smsBidder = await SmsBidder.create({ user: userId, phone: cleaned });
    }

    // Also update user's phone
    await User.findByIdAndUpdate(userId, { phone: cleaned });

    res.json({ success: true, smsBidder });
  } catch (err) {
    logError("❌ REGISTER SMS BIDDER ERROR", err);
    res.status(500).json({ success: false, message: "Registration failed" });
  }
};

// =============================
// 🔄 SUBSCRIBE TO CAR AUCTION
// =============================
export const subscribeToCar = async (req, res) => {
  try {
    const userId = req.user.id;
    const { carId, notifyOnOutbid, autoBid, maxAutoBid } = req.body;
    if (!carId) return res.status(400).json({ success: false, message: "Car ID required" });

    // Verify car exists and is an auction
    const car = await Car.findById(carId);
    if (!car || !car.allowBid)
      return res.status(400).json({ success: false, message: "Car not available for bidding" });

    const smsBidder = await SmsBidder.findOne({ user: userId });
    if (!smsBidder) return res.status(400).json({ success: false, message: "Register your phone first" });

    // Check if already subscribed
    const existing = smsBidder.subscriptions.find((s) => s.car?.toString() === carId);
    if (existing) {
      existing.notifyOnOutbid = notifyOnOutbid ?? existing.notifyOnOutbid;
      existing.autoBid = autoBid ?? existing.autoBid;
      existing.maxAutoBid = maxAutoBid ?? existing.maxAutoBid;
    } else {
      smsBidder.subscriptions.push({ car: carId, notifyOnOutbid, autoBid, maxAutoBid });
    }

    await smsBidder.save();
    res.json({ success: true, subscriptions: smsBidder.subscriptions });
  } catch (err) {
    logError("❌ SUBSCRIBE ERROR", err);
    res.status(500).json({ success: false, message: "Subscription failed" });
  }
};

// =============================
// ❌ UNSUBSCRIBE FROM CAR
// =============================
export const unsubscribeFromCar = async (req, res) => {
  try {
    const userId = req.user.id;
    const { carId } = req.params;

    const smsBidder = await SmsBidder.findOne({ user: userId });
    if (!smsBidder) return res.status(404).json({ success: false, message: "Not registered" });

    smsBidder.subscriptions = smsBidder.subscriptions.filter((s) => s.car?.toString() !== carId);
    await smsBidder.save();
    res.json({ success: true, subscriptions: smsBidder.subscriptions });
  } catch (err) {
    logError("❌ UNSUBSCRIBE ERROR", err);
    res.status(500).json({ success: false, message: "Unsubscribe failed" });
  }
};

// =============================
// 📋 GET MY SMS BIDDER PROFILE
// =============================
export const getMySmsProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const smsBidder = await SmsBidder.findOne({ user: userId }).populate(
      "subscriptions.car",
      "title brand model year auctionStatus currentBid",
    );
    res.json({ success: true, smsBidder: smsBidder || { phone: "", active: false, subscriptions: [] } });
  } catch (err) {
    logError("❌ GET SMS PROFILE ERROR", err);
    res.status(500).json({ success: false, message: "Failed" });
  }
};
