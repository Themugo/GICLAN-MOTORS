import express from "express";
import crypto from "crypto";
import twilio from "twilio";
import asyncHandler from "../middleware/asyncHandler.js";
import { handleProviderStatus } from "../services/communicationGateway.service.js";

const router = express.Router();
const timingSafeEqual = (a, b) => {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
};

const verifyResendWebhook = (req) => {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const id = req.get("svix-id");
  const timestamp = req.get("svix-timestamp");
  const signatureHeader = req.get("svix-signature");
  if (!secret || !id || !timestamp || !signatureHeader || !Buffer.isBuffer(req.body)) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  const encodedSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let key;
  try { key = Buffer.from(encodedSecret, "base64"); } catch { return false; }
  const signed = `${id}.${timestamp}.${req.body.toString("utf8")}`;
  const expected = crypto.createHmac("sha256", key).update(signed).digest("base64");
  return signatureHeader.split(" ").some((entry) => {
    const value = entry.includes(",") ? entry.split(",").pop() : entry;
    return timingSafeEqual(value, expected);
  });
};

const requireWebhookSecret = (req, res, next) => {
  const configured = process.env.COMMUNICATION_WEBHOOK_SECRET;
  if (!configured) return res.status(503).json({ success: false, message: "Communication webhook not configured" });
  const supplied = req.get("x-kayad-webhook-secret") || req.get("x-webhook-secret");
  if (!timingSafeEqual(supplied, configured)) return res.status(401).json({ success: false, message: "Unauthorized webhook" });
  next();
};


router.post("/resend/events", asyncHandler(async (req, res) => {
  if (!verifyResendWebhook(req)) return res.status(401).json({ success: false, message: "Invalid Resend webhook signature" });
  let event;
  try { event = JSON.parse(req.body.toString("utf8")); } catch { return res.status(400).json({ success: false, message: "Invalid JSON" }); }
  const type = event?.type || "";
  const status = type === "email.delivered" ? "delivered" : type === "email.bounced" ? "bounced" : type === "email.failed" ? "failed" : type === "email.sent" ? "sent" : type === "email.delivery_delayed" ? "queued" : type === "email.opened" || type === "email.clicked" ? "read" : null;
  if (!status) return res.json({ success: true, matched: false, ignored: true });
  const data = event?.data || {};
  const result = await handleProviderStatus({
    provider: "resend",
    providerMessageId: data.email_id,
    status,
    error: data?.bounce?.message || data?.error?.message || null,
    providerEventId: event?.id || data.email_id,
    metadata: { type, created_at: event?.created_at, to: data.to, subject: data.subject },
  });
  return res.json({ success: true, matched: Boolean(result) });
}));

router.post("/status", requireWebhookSecret, asyncHandler(async (req, res) => {
  const { provider = "unknown", providerMessageId, status, error, providerEventId, metadata = {} } = req.body || {};
  const result = await handleProviderStatus({ provider, providerMessageId, status, error, providerEventId, metadata });
  return res.json({ success: true, matched: Boolean(result) });
}));

router.post("/twilio/status", asyncHandler(async (req, res) => {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.get("x-twilio-signature");
  const proto = req.get("x-forwarded-proto") || req.protocol;
  const host = req.get("x-forwarded-host") || req.get("host");
  const callbackUrl = `${proto}://${host}${req.originalUrl}`;
  const providerVerified = Boolean(authToken && signature && twilio.validateRequest(authToken, signature, callbackUrl, req.body || {}));
  const sharedSecretVerified = Boolean(process.env.COMMUNICATION_WEBHOOK_SECRET && timingSafeEqual(req.get("x-kayad-webhook-secret") || req.get("x-webhook-secret"), process.env.COMMUNICATION_WEBHOOK_SECRET));
  if (!providerVerified && !sharedSecretVerified) return res.status(401).json({ success: false, message: "Unauthorized Twilio webhook" });
  const { MessageSid, MessageStatus, ErrorCode, ErrorMessage, To, From } = req.body || {};
  const result = await handleProviderStatus({ provider: "twilio", providerMessageId: MessageSid, status: MessageStatus, error: ErrorMessage || ErrorCode, providerEventId: MessageSid, metadata: { to: To, from: From } });
  res.type("text/plain").send(result ? "OK" : "IGNORED");
}));

router.post("/sendgrid/events", requireWebhookSecret, asyncHandler(async (req, res) => {
  const events = Array.isArray(req.body) ? req.body : [];
  let matched = 0;
  for (const event of events) {
    const result = await handleProviderStatus({
      provider: "sendgrid",
      providerMessageId: event.sg_message_id || event.sg_event_id,
      status: event.event === "delivered" ? "delivered" : event.event === "bounce" ? "bounced" : event.event === "open" || event.event === "click" ? "read" : event.event === "dropped" ? "failed" : event.event,
      error: event.reason || event.response,
      providerEventId: event.sg_event_id,
      metadata: { email: event.email, timestamp: event.timestamp, category: event.category },
    });
    if (result) matched += 1;
  }
  res.json({ success: true, matched });
}));

router.post("/africastalking/status", requireWebhookSecret, asyncHandler(async (req, res) => {
  const result = await handleProviderStatus({
    provider: "africastalking",
    providerMessageId: req.body?.id || req.body?.messageId,
    status: req.body?.status || req.body?.statusCode,
    error: req.body?.failureReason,
    providerEventId: req.body?.id || req.body?.messageId,
    metadata: req.body || {},
  });
  res.json({ success: true, matched: Boolean(result) });
}));

export default router;
