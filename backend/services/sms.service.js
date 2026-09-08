import { sendSMS as _sendSMS } from "../utils/sms.js";
import { logInfo, logError } from "../utils/logger.js";
import { addSMSJob } from "../queues/smsQueue.js";

const QUEUE_MODE = process.env.QUEUE_MODE === "true";

export { sendSMS } from "../utils/sms.js";

const formatKES = (n) => "KES " + Number(n || 0).toLocaleString("en-KE");

const sms = async (phone, message, context = {}, useQueue = QUEUE_MODE) => {
  // Use queue if enabled
  if (useQueue) {
    await addSMSJob({ phone, message, context });
    return true;
  }

  // Synchronous fallback
  const ok = await _sendSMS(phone, message);
  if (ok) logInfo("SMS sent", { phone, context });
  else logError("SMS failed", { phone, context });
  return ok;
};

const sendWelcomeSMS = (phone, name) =>
  sms(
    phone,
    `Welcome to Kayad, ${name}! Your gateway to premium cars. Browse showrooms, join live auctions, and drive your dream today. kayad.space`,
  );

const sendBidPlacedSMS = (phone, carTitle, amount) =>
  sms(phone, `Bid confirmed! ${formatKES(amount)} on ${carTitle || "vehicle"}. You're in the running — watch the auction live at kayad.space`, {
    carTitle,
    amount,
  });

const sendOutbidSMS = (phone, carTitle, amount) =>
  sms(phone, `You've been outbid! Current bid: ${formatKES(amount)} on ${carTitle || "vehicle"}. Raise your bid now to win! kayad.space`, {
    carTitle,
    amount,
  });

const sendEscrowReleasedSMS = (phone, amount, carTitle) =>
  sms(
    phone,
    `Payment received! ${formatKES(amount)} for ${carTitle || "vehicle"} is now in your account. Thank you for selling on Kayad!`,
    { amount, carTitle },
  );

const sendEscrowRefundedSMS = (phone, amount, carTitle) =>
  sms(
    phone,
    `Refund processed: ${formatKES(amount)} for ${carTitle || "vehicle"} returned to your M-Pesa. Browse more cars at kayad.space`,
    { amount, carTitle },
  );

const sendChatMessageSMS = (phone, fromName, carTitle) =>
  sms(phone, `New message from ${fromName || "a user"} on Kayad${carTitle ? ` about ${carTitle}` : ""}.`, {
    fromName,
    carTitle,
  });

const sendOTPSMS = (phone, otp) => sms(phone, `Your Kayad verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`, { otp });

const sendSMSBidInvalidFormat = (phone) =>
  sms(phone, "Invalid bid format. Reply: BID <amount> — e.g. 'BID 4.3M' or 'BID 500K'");

const sendSMSBidNotRegistered = (phone) =>
  sms(phone, "You are not registered for SMS bidding. Visit KAYAD to link your phone.");

const sendSMSBidNoAuctions = (phone) => sms(phone, "No active auctions found on your subscribed cars.");

const sendSMSBidNotLive = (phone) => sms(phone, "The auction for this car is no longer live.");

const sendSMSBidOwnListing = (phone) => sms(phone, "You cannot bid on your own listing.");

const sendSMSBidTooLow = (phone, currentBid) =>
  sms(phone, `Bid too low. Current bid is ${formatKES(currentBid)}. Reply with a higher amount.`, { currentBid });

const sendSavedSearchAlert = (phone, msg) => sms(phone, msg, { type: "saved_search" });

const sendAdminAlert = (phone, message) => sms(phone, message, { type: "admin_alert" });
