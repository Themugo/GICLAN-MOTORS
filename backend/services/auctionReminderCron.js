// backend/services/auctionReminderCron.js
// ─────────────────────────────────────────────────────────────
// Runs every 5 minutes. Finds auctions ending within configurable
// thresholds and sends reminder emails to active bidders.
//
// ENV VARS:
//   AUCTION_REMINDER_ENABLED=true   (default: true)
// ─────────────────────────────────────────────────────────────

import { logInfo, logWarn } from "../utils/logger.js";
import { getIO } from "../utils/io.js";
import { addNotificationJob } from "../queues/notificationQueue.js";
import { addEmailJob } from "../queues/emailQueue.js";
import { findAll, findById, create, update } from "../db/index.js";

let cronEmailService = {};
try {
  cronEmailService = await import("./email.service.js");
} catch (e) {
  console.warn("⚠️ Auction reminder email service unavailable:", e.message);
}

const ENABLED = process.env.AUCTION_REMINDER_ENABLED !== "false";
const QUEUE_MODE = process.env.QUEUE_MODE === "true";

const notify = async (userId, title, message, type = "auction") => {
  try {
    // Use queue if enabled
    if (QUEUE_MODE) {
      await addNotificationJob({
        userId,
        title,
        message,
        type,
        channels: ["push"],
      });
      return;
    }

    // Synchronous fallback
    const notif = await create("notifications", { user: userId, title, message, type });
    getIO()?.to(`user_${userId}`).emit("notification", notif);
  } catch (e) {
    console.error("❌ Notify failed:", e.message);
  }
};

const runReminders = async () => {
  const now = new Date();
  const thresholds = [
    { label: "5", ms: 5 * 60 * 1000, minutes: 5 },
    { label: "15", ms: 15 * 60 * 1000, minutes: 15 },
    { label: "30", ms: 30 * 60 * 1000, minutes: 30 },
    { label: "60", ms: 60 * 60 * 1000, minutes: 60 },
  ];

  for (const threshold of thresholds) {
    const windowStart = new Date(now.getTime() + threshold.ms);
    const windowEnd = new Date(now.getTime() + threshold.ms + 60 * 1000);

    const endingAuctions = await findAll("cars", { filters: {
      auctionStatus: "live",
      allowBid: true,
      auctionEnd: { $gte: windowStart, $lte: windowEnd },
      [`reminderSent_${threshold.label}min`]: { $ne: true },
    }, select: "_id title currentBid price auctionEnd" });

    if (endingAuctions.length === 0) continue;

    for (const car of endingAuctions) {
      try {
        const activeBidders = await findAll("bids", { filters: { carId: car.id, status: { $in: ["active", "paid"] } }, select: "user" });
        const bidderIds = [...new Set(activeBidders.map(b => b.user).filter(Boolean))];

        if (bidderIds.length === 0) continue;

        const { sendAuctionEndingSoonEmail } = cronEmailService;

        for (const userId of bidderIds) {
          const user = await findById("users", userId, "email,name,notifications");
          if (user?.email && user?.notifications?.email !== false && typeof sendAuctionEndingSoonEmail === "function") {
            // Use queue if enabled
            if (QUEUE_MODE) {
              await addEmailJob({
                to: user.email,
                subject: `Auction ending in ${threshold.minutes} minutes`,
                html: `<p>The auction for ${car.title || "a vehicle"} ends in ${threshold.minutes} minutes. Current bid: KES ${Number(car.currentBid || car.price).toLocaleString("en-KE")}.</p>`,
                text: `The auction for ${car.title || "a vehicle"} ends in ${threshold.minutes} minutes. Current bid: KES ${Number(car.currentBid || car.price).toLocaleString("en-KE")}.`,
              });
            } else {
              sendAuctionEndingSoonEmail(user, car, threshold.minutes).catch((e) =>
                console.warn("⚠️ Auction reminder email failed:", e.message),
              );
            }
          }

          await notify(
            userId,
            `⏰ Auction ending in ${threshold.minutes} min`,
            `The auction for ${car.title || "a vehicle"} ends in ${threshold.minutes} minutes. Current bid: KES ${Number(car.currentBid || car.price).toLocaleString("en-KE")}.`,
            "auction",
          );
        }

        await update("cars", car.id, {
          [`reminderSent_${threshold.label}min`]: true,
        });

        logInfo(`Reminder sent (${threshold.minutes}min) for car ${car.id} (${bidderIds.length} bidders)`);
      } catch (err) {
        console.error(`  ❌ Reminder failed for ${car.id}:`, err.message);
      }
    }
  }
};

// ── START ─────────────────────────────────────────────────────
let _cronHandle = null;

export const startAuctionReminderCron = () => {
  if (!ENABLED) {
    logInfo("AuctionReminderCron disabled (AUCTION_REMINDER_ENABLED=false)");
    return;
  }

  if (!isSupabaseConnected()) {
    logWarn("AuctionReminderCron skipped: Supabase not connected");
    return;
  }

  const INTERVAL_MS = 5 * 60 * 1000;

  const run = async () => {
    try {
      await runReminders();
    } catch (err) {
      console.error("❌ AuctionReminderCron failed:", err.message);
    }
  };

  run();
  _cronHandle = setInterval(run, INTERVAL_MS);

  logInfo("AuctionReminderCron started — checking every 5 minutes");
  return _cronHandle;
};

export const stopAuctionReminderCron = () => {
  if (_cronHandle) clearInterval(_cronHandle);
};
