import express from "express";
import crypto from "crypto";
import asyncHandler from "../middleware/asyncHandler.js";
import { handleProviderStatus } from "../services/communicationGateway.service.js";

const router = express.Router();
const timingSafeEqual = (a, b) => {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
};
const requireWebhookSecret = (req, res, next) => {
  const configured = process.env.COMMUNICATION_WEBHOOK_SECRET;
  if (!configured) return res.status(503).json({ success: false, message: "Communication webhook not configured" });
  const supplied = req.get("x-kayad-webhook-secret") || req.get("x-webhook-secret");
  if (!timingSafeEqual(supplied, configured)) return res.status(401).json({ success: false, message: "Unauthorized webhook" });
  next();
};

router.post("/status", requireWebhookSecret, asyncHandler(async (req, res) => {
  const { provider = "unknown", providerMessageId, status, error, providerEventId, metadata = {} } = req.body || {};
  const result = await handleProviderStatus({ provider, providerMessageId, status, error, providerEventId, metadata });
  return res.json({ success: true, matched: Boolean(result) });
}));

router.post("/twilio/status", requireWebhookSecret, asyncHandler(async (req, res) => {
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
