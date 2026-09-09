import { logError } from "../utils/logger.js";

export const sendWhatsApp = async (phone, message) => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_NUMBER) {
    throw new Error("WhatsApp provider is not configured");
  }
  const raw = String(phone || "").trim();
  const normalized = raw.startsWith("+") ? raw : raw.startsWith("254") ? `+${raw}` : raw.startsWith("0") ? `+254${raw.slice(1)}` : null;
  if (!normalized) throw new Error("Invalid WhatsApp phone number");
  try {
    const { default: twilio } = await import("twilio");
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    return await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER.startsWith("whatsapp:") ? process.env.TWILIO_WHATSAPP_NUMBER : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${normalized}`,
      body: message,
      statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL || undefined,
    });
  } catch (error) {
    logError("WhatsApp delivery failed", error, { phone: normalized.replace(/\d{4}$/, "****") });
    throw error;
  }
};
