import axios from "axios";
import { withRetry, createServiceConfig } from "../utils/retry.js";
import { logWarn } from "../utils/logger.js";

const config = createServiceConfig("africastalking", { circuitBreaker: true });

const formatPhone = (phone) => {
  if (!phone) return null;
  const p = String(phone).trim();
  if (/^\+2547\d{8}$/.test(p)) return p.slice(1);
  if (/^2547\d{8}$/.test(p)) return p;
  if (/^07\d{8}$/.test(p)) return `254${p.slice(1)}`;
  return null;
};

export const getAfricaTalkingConfig = () => ({
  provider: "africastalking",
  configured: Boolean(process.env.AT_API_KEY && process.env.AT_USERNAME),
  username: process.env.AT_USERNAME || null,
  senderConfigured: Boolean(process.env.AT_SENDER_ID),
});

export const sendAfricaTalkingSms = async ({ phone, message }) => {
  const to = formatPhone(phone);
  if (!to) throw new Error("Invalid Kenyan SMS number");
  if (!process.env.AT_API_KEY || !process.env.AT_USERNAME) throw new Error("Africa's Talking provider is not configured");

  return withRetry(async () => {
    const params = new URLSearchParams({ username: process.env.AT_USERNAME, to, message: String(message || "") });
    if (process.env.AT_SENDER_ID) params.set("from", process.env.AT_SENDER_ID);
    const response = await axios.post("https://api.africastalking.com/version1/messaging", params, {
      headers: { apiKey: process.env.AT_API_KEY, "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 30000,
    });
    const recipient = response.data?.SMSMessageData?.Recipients?.[0];
    if (!recipient || recipient.status !== "Success") {
      throw new Error(recipient?.status || recipient?.failureReason || "Africa's Talking rejected SMS");
    }
    return {
      id: recipient.messageId || null,
      provider: "africastalking",
      status: recipient.status,
      cost: recipient.cost || null,
      number: recipient.number || to,
      raw: recipient,
    };
  }, {
    ...config,
    timeoutMs: 30000,
    onRetry: (err, attempt) => logWarn(`Africa's Talking SMS retry ${attempt}`, { phone, error: err.message }),
  });
};
