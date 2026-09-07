import { create, findOne } from "../db/index.js";
import { sendRawEmail } from "./email.service.js";
import { sendSMS } from "../utils/sms.js";
import { withRetry } from "../utils/retry.js";
import { getIO } from "../utils/io.js";

const VALID_TYPES = new Set(["bid", "auction", "payment", "escrow", "chat", "system", "info", "referral", "price_alert", "dispute", "inspection"]);

export const sendNotification = async ({ userId, title, message, type = "info", email, phone, link, data = {} }) => {
  if (!userId) return null;
  try {
    const normalizedType = VALID_TYPES.has(type) ? type : "info";
    const notification = await withRetry(() => create("notifications", { user: userId, title, message, type: normalizedType, read: false, link, data }), { retries: 1, baseDelayMs: 200 });
    const payload = { ...notification, _id: notification.id, createdAt: notification.createdAt || notification.created_at, read: false };
    if (getIO()) {
      getIO().to(String(userId)).emit("notification", payload);
      getIO().to(`user_${String(userId)}`).emit("notification", payload);
    }

    // Delivery channels are opt-in and read from the same authoritative user record.
    // Callers may still provide explicit contact details for transactional sends.
    let preferences = null;
    try { preferences = await findOne("user_preferences", { user: userId }); } catch { /* in-app notification remains authoritative */ }
    const emailEnabled = preferences?.notifications?.email?.enabled !== false;
    const smsEnabled = preferences?.notifications?.sms?.enabled !== false;
    if (emailEnabled && email) {
      const safeTitle = String(title).replace(/[<>]/g, "");
      const safeMessage = String(message).replace(/[<>]/g, "");
      sendRawEmail({ to: email, subject: safeTitle, html: `<p>${safeMessage}</p>` }).catch((e) => console.warn("Notification email failed:", e.message));
    }
    if (smsEnabled && phone) {
      sendSMS(phone, `${title}: ${message}`).catch((e) => console.warn("Notification SMS failed:", e.message));
    }
    return notification;
  } catch (err) {
    console.error("NOTIFICATION ERROR:", err);
    return null;
  }
};
