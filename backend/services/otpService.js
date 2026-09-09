import crypto from "crypto";
import { create, findAll, update } from "../db/index.js";
import { deliver } from "./communicationGateway.service.js";
import { getTemplate, renderTemplate } from "./communicationControl.service.js";
import { getSupabase } from "../utils/supabase.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const hash = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const generate = () => String(crypto.randomInt(0, 10000)).padStart(4, "0");

export const createOtpChallenge = async ({ userId, purpose, channel, recipient, eventType = "otp", ip = null, userAgent = null }) => {
  if (!userId || !purpose || !channel || !recipient) throw new Error("OTP challenge is incomplete");
  const now = new Date();
  const recipientKey = String(recipient).trim().toLowerCase();
  const window15 = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const window24 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const sb = getSupabase();
  const [{ count: recent15 }, { count: recent24 }] = await Promise.all([
    sb.from("otp_challenges").select("id", { count: "exact", head: true }).eq("recipient", recipientKey).gte("created_at", window15),
    sb.from("otp_challenges").select("id", { count: "exact", head: true }).eq("recipient", recipientKey).gte("created_at", window24),
  ]);
  if (Number(recent15 || 0) >= 3) throw new Error("Too many verification codes requested. Please wait before trying again.");
  if (Number(recent24 || 0) >= 10) throw new Error("Verification request limit reached. Please try again later.");
  const code = generate();
  const challenge = await create("otp_challenges", {
    userId,
    purpose,
    channel,
    recipient,
    codeHash: hash(code),
    expiresAt: new Date(now.getTime() + OTP_TTL_MS).toISOString(),
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    status: "pending",
    resendCount: Number(recent15 || 0) + 1,
    lastSentAt: now.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });

  const templateCode = channel === "whatsapp" ? "phone_verification_whatsapp" : channel === "email" ? "account_verification_email" : "phone_verification_sms";
  let rendered = null;
  try { rendered = renderTemplate(await getTemplate(templateCode, channel), { code, minutes: 10 }); } catch { /* compatibility fallback */ }
  const message = rendered?.body || `Your KAYAD verification code is: ${code}. It expires in 10 minutes. Do not share this code.`;
  const delivery = await deliver({
    userId,
    channel,
    eventType,
    templateCode: `otp_${purpose}`,
    recipient,
    subject: "Your KAYAD verification code",
    message,
    text: message,
    html: `<p>Your KAYAD verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes. Do not share this code.</p>`,
    category: "otp",
    metadata: { otpChallengeId: challenge.id, purpose, message, text: message, subject: "Your KAYAD verification code", ipHash: ip ? hash(ip) : null, userAgentHash: userAgent ? hash(userAgent) : null },
  });

  if (delivery?.status === "failed") {
    await update("otp_challenges", challenge.id, { status: "delivery_failed", lastSentAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    throw new Error("Verification code could not be delivered");
  }
  return { challengeId: challenge.id, expiresAt: challenge.expiresAt };
};

export const verifyOtpChallenge = async ({ userId, purpose, code }) => {
  const [challenge] = await findAll("otp_challenges", { filters: { userId, purpose, status: "pending" }, orderBy: "createdAt", ascending: false, limit: 1 });
  if (!challenge) return { valid: false, reason: "not_found" };
  if (new Date(challenge.expiresAt).getTime() < Date.now()) {
    await update("otp_challenges", challenge.id, { status: "expired", updatedAt: new Date().toISOString() });
    return { valid: false, reason: "expired" };
  }
  if (Number(challenge.attempts || 0) >= Number(challenge.maxAttempts || MAX_ATTEMPTS)) {
    await update("otp_challenges", challenge.id, { status: "locked", updatedAt: new Date().toISOString() });
    return { valid: false, reason: "locked" };
  }
  if (hash(code) !== challenge.codeHash) {
    const attempts = Number(challenge.attempts || 0) + 1;
    await update("otp_challenges", challenge.id, {
      attempts,
      status: attempts >= Number(challenge.maxAttempts || MAX_ATTEMPTS) ? "locked" : "pending",
      updatedAt: new Date().toISOString(),
    });
    return { valid: false, reason: "invalid", remainingAttempts: Math.max(0, Number(challenge.maxAttempts || MAX_ATTEMPTS) - attempts) };
  }
  await update("otp_challenges", challenge.id, { status: "verified", verifiedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  return { valid: true, challengeId: challenge.id };
};

// Compatibility facade for older callers. New flows must use createOtpChallenge/verifyOtpChallenge.
export const sendOTP = async (user, channel = "sms") => {
  const recipient = channel === "email" ? user.email : user.phone;
  const result = await createOtpChallenge({ userId: user.id || user._id, purpose: "phone_verification", channel, recipient });
  return { delivered: true, challengeId: result.challengeId, expiresAt: result.expiresAt };
};

export const verifyOTP = async (user, otp) => {
  const result = await verifyOtpChallenge({ userId: user.id || user._id, purpose: "phone_verification", code: otp });
  return result.valid;
};
