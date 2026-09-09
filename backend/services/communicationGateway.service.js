import crypto from "crypto";
import { create, update, findById } from "../db/index.js";
import { sendRawEmail } from "./email.service.js";
import { sendSMS } from "../utils/sms.js";
import { logError, logInfo } from "../utils/logger.js";
import { getIO } from "../utils/io.js";

const CHANNELS = new Set(["in_app", "email", "sms", "whatsapp"]);
const TERMINAL = new Set(["sent", "delivered", "failed", "bounced", "read"]);

const normalizePhone = (phone) => {
  if (!phone) return null;
  const raw = String(phone).trim();
  if (/^\+2547\d{8}$/.test(raw)) return raw;
  if (/^2547\d{8}$/.test(raw)) return `+${raw}`;
  if (/^07\d{8}$/.test(raw)) return `+254${raw.slice(1)}`;
  return null;
};

const redactAddress = (value) => {
  if (!value) return null;
  const s = String(value);
  if (s.includes("@")) return s.replace(/^(.{2}).*(@.*)$/, "$1***$2");
  return s.replace(/^(\+?\d{3})\d+(\d{2})$/, "$1******$2");
};

const hashExternalId = (provider, externalId) =>
  crypto.createHash("sha256").update(`${provider}:${externalId}`).digest("hex");

const emitDeliveryUpdate = (delivery) => {
  const io = getIO();
  if (!io || !delivery?.user_id) return;
  io.to(`user_${delivery.user_id}`).emit("communicationDeliveryUpdated", {
    id: delivery.id,
    channel: delivery.channel,
    eventType: delivery.event_type,
    status: delivery.status,
    provider: delivery.provider,
    occurredAt: delivery.updated_at || delivery.created_at,
  });
};

export const recordDelivery = async (payload) => {
  const row = await create("communication_deliveries", {
    userId: payload.userId || null,
    channel: payload.channel,
    eventType: payload.eventType || "transactional",
    templateCode: payload.templateCode || null,
    recipient: payload.recipient,
    recipientHash: crypto.createHash("sha256").update(String(payload.recipient || "")).digest("hex"),
    provider: payload.provider || "unknown",
    status: payload.status || "queued",
    providerMessageId: payload.providerMessageId || null,
    providerEventId: payload.providerEventId ? hashExternalId(payload.provider || "unknown", payload.providerEventId) : null,
    metadata: payload.metadata || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return delivery;
};

export const updateDelivery = async (id, patch) => {
  const delivery = await update("communication_deliveries", id, {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  emitDeliveryUpdate(delivery);
  return delivery;
};

const sendWhatsApp = async (phone, body) => {
  const to = normalizePhone(phone);
  if (!to) throw new Error("Invalid Kenyan WhatsApp number");
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_NUMBER) {
    throw new Error("WhatsApp provider is not configured");
  }
  const { default: twilio } = await import("twilio");
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return client.messages.create({
    from: String(process.env.TWILIO_WHATSAPP_NUMBER).startsWith("whatsapp:") ? process.env.TWILIO_WHATSAPP_NUMBER : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${to}`,
    body,
    statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL || undefined,
  });
};

export const deliver = async ({
  userId = null,
  channel,
  eventType = "transactional",
  templateCode = null,
  recipient,
  subject,
  html,
  text,
  message,
  metadata = {},
}) => {
  if (!CHANNELS.has(channel)) throw new Error(`Unsupported communication channel: ${channel}`);
  if (!recipient && channel !== "in_app") throw new Error(`Missing ${channel} recipient`);

  const provider = channel === "email"
    ? (process.env.SENDGRID_API_KEY ? "sendgrid" : "smtp")
    : channel === "sms"
      ? (process.env.SMS_PROVIDER || "disabled")
      : channel === "whatsapp"
        ? "twilio_whatsapp"
        : "socket";

  let delivery = await recordDelivery({
    userId,
    channel,
    eventType,
    templateCode,
    recipient: recipient || String(userId || ""),
    provider,
    status: channel === "in_app" ? "delivered" : "queued",
    metadata,
  });

  try {
    if (channel === "in_app") {
      const io = getIO();
      if (io && userId) {
        io.to(`user_${userId}`).emit("notification", {
          userId,
          title: subject || metadata.title || "KAYAD notification",
          message: message || text || "",
          type: eventType,
          data: metadata,
        });
      }
      return delivery;
    }

    let result;
    if (channel === "email") {
      result = await sendRawEmail({ to: recipient, subject, html, text });
      if (!result?.success) throw new Error(result?.error || "Email provider rejected delivery");
    } else if (channel === "sms") {
      result = await sendSMS(recipient, message || text || "");
      if (!result) throw new Error("SMS provider rejected delivery");
    } else {
      result = await sendWhatsApp(recipient, message || text || "");
    }

    const updated = await updateDelivery(delivery.id, {
      status: "sent",
      providerMessageId: result?.sid || result?.messageId || result?.id || null,
      sentAt: new Date().toISOString(),
      lastError: null,
    });
    logInfo("Communication delivered", { deliveryId: delivery.id, channel, provider });
    return updated;
  } catch (error) {
    logError("Communication delivery failed", error, { deliveryId: delivery.id, channel, provider });
    return updateDelivery(delivery.id, { status: "failed", lastError: error.message });
  }
};

export const sendUserCommunication = async ({
  userId,
  channels = ["in_app"],
  eventType,
  templateCode,
  title,
  message,
  subject = title,
  html,
  metadata = {},
}) => {
  const user = await findById("users", userId, "id,email,phone");
  if (!user) throw new Error("User not found");
  const results = [];
  for (const channel of channels) {
    if (channel === "in_app") {
      results.push(await deliver({ userId, channel, eventType, templateCode, subject: title, message, metadata }));
    } else if (channel === "email" && user.email) {
      results.push(await deliver({ userId, channel, eventType, templateCode, recipient: user.email, subject, html: html || `<p>${message}</p>`, text: message, metadata }));
    } else if ((channel === "sms" || channel === "whatsapp") && user.phone) {
      results.push(await deliver({ userId, channel, eventType, templateCode, recipient: user.phone, message, text: message, metadata }));
    }
  }
  return results;
};

export const handleProviderStatus = async ({ provider, providerMessageId, status, error = null, providerEventId = null, metadata = {} }) => {
  if (!providerMessageId) return null;
  const delivery = await (await import("../db/index.js")).findOne("communication_deliveries", { providerMessageId });
  if (!delivery) return null;
  const normalized = String(status || "").toLowerCase();
  const nextStatus = TERMINAL.has(normalized) ? normalized : normalized === "accepted" || normalized === "queued" ? "queued" : normalized === "sending" ? "sending" : "failed";
  return updateDelivery(delivery.id, {
    status: nextStatus,
    provider,
    providerEventId: providerEventId ? hashExternalId(provider, providerEventId) : delivery.providerEventId,
    deliveredAt: nextStatus === "delivered" ? new Date().toISOString() : delivery.deliveredAt,
    lastError: error || delivery.lastError,
    metadata: { ...(delivery.metadata || {}), webhook: metadata },
  });
};

export const maskRecipient = redactAddress;
export default { deliver, sendUserCommunication, recordDelivery, updateDelivery, handleProviderStatus };
