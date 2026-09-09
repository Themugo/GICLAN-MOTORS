// backend/services/reminderAutomationService.js - Production v1.0
// ─────────────────────────────────────────────────────────────
// Reminder Automation Service
// Automatic reminders for important follow-ups and pending actions
// Reduces dropped leads and missed opportunities
// ─────────────────────────────────────────────────────────────

import { logInfo, logError, logWarn } from "../utils/logger.js";
import { findAll, findById, update, create } from "../db/index.js";
import { emitCommunication, COMMUNICATION_EVENTS } from "./communicationEvents.service.js";

/**
 * Reminder types and their configurations
 */
const REMINDER_TYPES = {
  UNRESPONDED_INQUIRY: {
    name: 'Unresponded Inquiry',
    model: 'leads',
    condition: (lead) => !lead.totalMessages || lead.totalMessages === 0,
    urgency: 'high',
    thresholds: [2, 24, 48], // hours
  },
  PENDING_INSPECTION: {
    name: 'Pending Inspection',
    model: 'inspections',
    condition: (i) => i.status === 'pending',
    urgency: 'high',
    thresholds: [24, 48],
  },
  AUCTION_ENDING: {
    name: 'Auction Ending',
    model: 'auctions',
    condition: (a) => a.status === 'live',
    urgency: 'medium',
    thresholds: [1, 6],
  },
  ESCROW_PENDING: {
    name: 'Escrow Action Required',
    model: 'escrows',
    condition: (e) => e.status === 'pending',
    urgency: 'high',
    thresholds: [24, 72],
  },
  VERIFICATION_INCOMPLETE: {
    name: 'Incomplete Verification',
    model: 'users',
    condition: (u) => u.role === 'dealer' && !u.verified,
    urgency: 'medium',
    thresholds: [72, 168],
  },
  LOW_INVENTORY: {
    name: 'Low Inventory Alert',
    model: 'dealers',
    condition: (d) => d.inventoryCount < 3,
    urgency: 'low',
    thresholds: [168],
  },
};

/**
 * @typedef {Object} Reminder
 * @property {string} id - Reminder ID
 * @property {string} type - Reminder type
 * @property {string} userId - User to notify
 * @property {string} relatedId - Related entity ID
 * @property {string} message - Reminder message
 * @property {string} urgency - 'low' | 'medium' | 'high'
 * @property {boolean} sent - Whether reminder was sent
 */

/**
 * Check and create reminders for all types
 * @returns {Promise<Reminder[]>} Created reminders
 */
export const checkAndCreateReminders = async () => {
  try {
    const reminders = [];

    // Check each reminder type
    const [
      inquiryReminders,
      inspectionReminders,
      auctionReminders,
      escrowReminders,
    ] = await Promise.all([
      checkUnrespondedInquiries(),
      checkPendingInspections(),
      checkEndingAuctions(),
      checkPendingEscrows(),
    ]);

    reminders.push(...inquiryReminders, ...inspectionReminders, ...auctionReminders, ...escrowReminders);

    logInfo("Reminders check completed", {
      created: reminders.length,
      byType: {
        inquiries: inquiryReminders.length,
        inspections: inspectionReminders.length,
        auctions: auctionReminders.length,
        escrows: escrowReminders.length,
      },
    });

    return reminders;
  } catch (err) {
    logError("Reminder check error", err);
    throw err;
  }
};

/**
 * Check for unresponded inquiries (dealer side)
 */
const checkUnrespondedInquiries = async () => {
  const reminders = [];

  try {
    // Find leads with no messages, created more than 2 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const leads = await findAll("leads", {
      filters: {
        createdAt: { $lt: twoHoursAgo },
        archived: { $ne: true },
      },
    });

    for (const lead of leads) {
      // Check if lead has any engagement
      if (lead.totalMessages && lead.totalMessages > 0) continue;

      // Check if we already sent a reminder
      const existing = await findAll("reminders", {
        filters: {
          relatedId: lead.id,
          type: 'UNRESPONDED_INQUIRY',
          createdAt: { $gte: twoHoursAgo },
        },
      });

      if (existing.length > 0) continue;

      // Create reminder
      const reminder = await createReminder({
        type: 'UNRESPONDED_INQUIRY',
        userId: lead.dealer,
        relatedId: lead.id,
        message: `New inquiry has not received a response - buyer is waiting!`,
        urgency: 'high',
        data: { buyerId: lead.buyer },
      });

      if (reminder) {
        reminders.push(reminder);

        // Send immediate notification
        await sendReminderNotification(reminder, lead.dealer);
      }
    }
  } catch (err) {
    logWarn("Unresponded inquiries check error", err);
  }

  return reminders;
};

/**
 * Check for pending inspections
 */
const checkPendingInspections = async () => {
  const reminders = [];

  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const inspections = await findAll("inspections", {
      filters: {
        status: 'pending',
        createdAt: { $lt: dayAgo },
      },
    });

    for (const inspection of inspections) {
      const existing = await findAll("reminders", {
        filters: {
          relatedId: inspection.id,
          type: 'PENDING_INSPECTION',
          createdAt: { $gte: dayAgo },
        },
      });

      if (existing.length > 0) continue;

      const reminder = await createReminder({
        type: 'PENDING_INSPECTION',
        userId: inspection.dealer || inspection.inspector,
        relatedId: inspection.id,
        message: `Inspection request pending since ${new Date(inspection.createdAt).toLocaleDateString()}`,
        urgency: 'high',
        data: { buyerId: inspection.buyer },
      });

      if (reminder) {
        reminders.push(reminder);
        await sendReminderNotification(reminder, reminder.userId);
      }
    }
  } catch (err) {
    logWarn("Pending inspections check error", err);
  }

  return reminders;
};

/**
 * Check for auctions ending soon
 */
const checkEndingAuctions = async () => {
  const reminders = [];

  try {
    const oneHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const sixHours = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

    const auctions = await findAll("cars", {
      filters: {
        deletedAt: null,
        auctionStatus: "live",
        auctionEnd: { $lte: sixHours, $gte: oneHour },
      },
    });

    for (const auction of auctions) {
      const existing = await findAll("reminders", {
        filters: {
          relatedId: auction.id,
          type: 'AUCTION_ENDING',
          createdAt: { $gte: oneHour },
        },
      });

      if (existing.length > 0) continue;

      const timeLeft = Math.round((new Date(auction.auctionEnd) - Date.now()) / (60 * 60 * 1000));
      const reminder = await createReminder({
        type: 'AUCTION_ENDING',
        userId: auction.dealer,
        relatedId: auction.id,
        message: `Auction ending in ${timeLeft} hour(s) - ${auction.currentBids || 0} bids placed`,
        urgency: 'medium',
        data: { currentBids: auction.currentBids },
      });

      if (reminder) {
        reminders.push(reminder);
        await sendReminderNotification(reminder, reminder.userId);
      }
    }
  } catch (err) {
    logWarn("Ending auctions check error", err);
  }

  return reminders;
};

/**
 * Check for pending escrow actions
 */
const checkPendingEscrows = async () => {
  const reminders = [];

  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const escrows = await findAll("escrows", {
      filters: {
        status: 'pending',
        updatedAt: { $lt: dayAgo },
      },
    });

    for (const escrow of escrows) {
      const existing = await findAll("reminders", {
        filters: {
          relatedId: escrow.id,
          type: 'ESCROW_PENDING',
          createdAt: { $gte: dayAgo },
        },
      });

      if (existing.length > 0) continue;

      const reminder = await createReminder({
        type: 'ESCROW_PENDING',
        userId: escrow.buyer,
        relatedId: escrow.id,
        message: `Escrow payment requires action to proceed with vehicle purchase`,
        urgency: 'high',
        data: { amount: escrow.amount },
      });

      if (reminder) {
        reminders.push(reminder);
        await sendReminderNotification(reminder, escrow.buyer);
      }
    }
  } catch (err) {
    logWarn("Pending escrows check error", err);
  }

  return reminders;
};

/**
 * Create a reminder record
 */
const createReminder = async ({ type, userId, relatedId, message, urgency, data }) => {
  try {
    // Check if user wants reminders
    const user = await findById("users", userId);
    if (!user || user.emailReminders === false) {
      return null;
    }

    const reminder = await create("reminders", {
      type,
      user: userId,
      relatedId,
      message,
      urgency,
      data,
      sent: false,
      createdAt: new Date().toISOString(),
    });

    return reminder;
  } catch (err) {
    logError("Create reminder error", err);
    return null;
  }
};

/**
 * Send reminder notification via email and/or SMS
 */
const sendReminderNotification = async (reminder, userId) => {
  try {
    const user = await findById("users", userId);
    if (!user) return;
    const highUrgency = reminder.urgency === "high";
    await emitCommunication({
      userId,
      eventType: COMMUNICATION_EVENTS.REMINDER,
      category: "transactional",
      title: `Reminder: ${REMINDER_TYPES[reminder.type]?.name || reminder.type}`,
      subject: `[Reminder] ${reminder.message}`,
      message: highUrgency ? `${reminder.message} - Action required.` : reminder.message,
      channels: ["in_app", "email", ...(highUrgency ? ["sms", "whatsapp"] : [])],
      metadata: { reminderId: reminder.id, reminderType: reminder.type, urgency: reminder.urgency, relatedId: reminder.relatedId, data: reminder.data },
    });
    await update("reminders", reminder.id, { sent: true });
    logInfo("Reminder communication emitted", { reminderId: reminder.id, userId });
  } catch (err) {
    logError("Send reminder notification error", err);
  }
};

/**
 * Generate reminder email HTML
 */
const generateReminderEmailHtml = (reminder) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
      <div style="background: ${reminder.urgency === 'high' ? '#fef2f2' : '#fef9c3'};
                  border: 1px solid ${reminder.urgency === 'high' ? '#ef4444' : '#f59e0b'};
                  border-radius: 8px; padding: 20px;">
        <h2 style="color: ${reminder.urgency === 'high' ? '#dc2626' : '#d97706'}; margin-top: 0;">
          ${REMINDER_TYPES[reminder.type]?.name || reminder.type}
        </h2>
        <p style="font-size: 16px; color: #374151;">${reminder.message}</p>
        <a href="https://www.kayad.space/dashboard"
           style="display: inline-block; background: #0A1628; color: #fff; padding: 12px 24px;
                  border-radius: 6px; text-decoration: none; margin-top: 16px;">
          Take Action
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
        You're receiving this because you have reminders enabled on Kayad.
        <a href="https://www.kayad.space/settings">Manage preferences</a>
      </p>
    </div>
  `;
};

/**
 * Get reminders for a user
 * @param {string} userId - User ID
 * @param {Object} [options] - Query options
 * @returns {Promise<Reminder[]>} User's reminders
 */
export const getUserReminders = async (userId, options = {}) => {
  try {
    const { unreadOnly = false, limit = 20 } = options;

    const filters = { user: userId };
    if (unreadOnly) {
      filters.read = false;
    }

    const reminders = await findAll("reminders", {
      filters,
      sort: { createdAt: -1 },
      limit,
    });

    return reminders;
  } catch (err) {
    logError("Get reminders error", err, { userId });
    return [];
  }
};

/**
 * Mark reminder as read
 * @param {string} reminderId - Reminder ID
 */
export const markReminderRead = async (reminderId) => {
  try {
    await update("reminders", reminderId, { read: true });
    return { success: true };
  } catch (err) {
    logError("Mark reminder read error", err, { reminderId });
    throw err;
  }
};

/**
 * Dismiss/snooze a reminder
 * @param {string} reminderId - Reminder ID
 * @param {string} snoozeUntil - When to show again (ISO date)
 */
export const snoozeReminder = async (reminderId, snoozeUntil) => {
  try {
    await update("reminders", reminderId, {
      read: true,
      snoozedUntil: snoozeUntil,
    });
    return { success: true };
  } catch (err) {
    logError("Snooze reminder error", err, { reminderId });
    throw err;
  }
};

/**
 * Get reminder summary stats
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Summary statistics
 */
export const getReminderStats = async (userId) => {
  try {
    const all = await findAll("reminders", {
      filters: { user: userId },
      select: "_id type urgency read createdAt",
    });

    return {
      total: all.length,
      unread: all.filter(r => !r.read).length,
      byType: all.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, {}),
      highUrgency: all.filter(r => r.urgency === 'high' && !r.read).length,
    };
  } catch (err) {
    logError("Reminder stats error", err, { userId });
    return { total: 0, unread: 0, byType: {}, highUrgency: 0 };
  }
};

/**
 * Start the reminder cron job
 * @param {number} intervalMs - Check interval in milliseconds
 */
export const startReminderCron = (intervalMs = 30 * 60 * 1000) => {
  const tick = async () => {
    try {
      await checkAndCreateReminders();
    } catch (err) {
      logError("Reminder cron error", err);
    }
  };

  // Run immediately
  tick();

  // Schedule periodic checks
  setInterval(tick, intervalMs);

  logInfo(`Reminder cron started - running every ${intervalMs / 60000} minutes`);
};

export default {
  checkAndCreateReminders,
  getUserReminders,
  markReminderRead,
  snoozeReminder,
  getReminderStats,
  startReminderCron,
};
