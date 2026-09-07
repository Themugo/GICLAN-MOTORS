// backend/services/disputeCron.js - Dispute escalation monitoring
// ─────────────────────────────────────────────────────────────
// Runs hourly. Monitors disputes stuck in states that need
// admin attention. Escalates OPEN disputes after 48h with no
// admin assignment. Flags MEDIATION disputes stuck >7 days.
// Sends admin notifications for aging disputes.
// ─────────────────────────────────────────────────────────────

import { STATES } from "./disputeStateMachine.js";
import { getIO } from "../utils/io.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";
import { findAll, create } from "../db/index.js";
import { isSupabaseConnected } from "../utils/supabase.js";

const ENABLED = process.env.DISPUTE_CRON_ENABLED !== "false";

const ESCALATION_HOURS_OPEN = parseInt(process.env.DISPUTE_ESCALATION_HOURS || "48");
const MEDIATION_MAX_DAYS = parseInt(process.env.DISPUTE_MEDIATION_MAX_DAYS || "7");

const notifyAdmins = async (title, message) => {
  try {
    const admins = await findAll("users", { filters: { role: { $in: ["admin", "superadmin"] } }, select: "id" });
    for (const admin of admins) {
      const notif = await create("notifications", { user: admin.id, title, message, type: "dispute" });
      getIO()?.to(`user_${admin.id}`).emit("notification", notif);
    }
    getIO()?.to("admins").emit("notification", { title, message, type: "dispute" });
  } catch (e) {
    logWarn("Dispute cron notify failed", { error: e.message });
  }
};

// ── ESCALATE UNASSIGNED OPEN DISPUTES ─────────────────────
const escalateOpenDisputes = async () => {
  const cutoff = new Date(Date.now() - ESCALATION_HOURS_OPEN * 3600000);

  const staleOpen = await findAll("disputes", { filters: {
    status: STATES.OPEN,
    assignedTo: null,
    createdAt: { $lte: cutoff },
  } }) /* .populate("openedBy", "name") - TODO: use separate query */;

  if (staleOpen.length === 0) return;

  logInfo("DisputeCron: unassigned open disputes", { count: staleOpen.length });

  for (const dispute of staleOpen) {
    if (!dispute.timeline) dispute.timeline = [];
    dispute.timeline.push({
      action: "Auto-escalated — no admin assigned",
      note: `Unassigned for ${ESCALATION_HOURS_OPEN}h`,
      at: new Date(),
    });
    await dispute.save();
  }

  await notifyAdmins(
    "⚠️ Disputes Requiring Assignment",
    `${staleOpen.length} dispute(s) have been open over ${ESCALATION_HOURS_OPEN}h without an admin assigned.`,
  );
};

// ── FLAG STUCK MEDIATION DISPUTES ──────────────────────────
const flagStuckMediation = async () => {
  const cutoff = new Date(Date.now() - MEDIATION_MAX_DAYS * 86400000);

  const stuckMediation = await findAll("disputes", { filters: {
    status: STATES.MEDIATION,
    "mediation.startedAt": { $lte: cutoff },
    "mediation.completedAt": null,
  } });

  if (stuckMediation.length === 0) return;

  logInfo("DisputeCron: stuck in mediation", { count: stuckMediation.length });

  await notifyAdmins(
    "⏳ Mediation Sessions Requiring Follow-up",
    `${stuckMediation.length} dispute(s) have been in mediation for over ${MEDIATION_MAX_DAYS} days without resolution.`,
  );
};

// ── START ──────────────────────────────────────────────────
let _cronHandle = null;

export const startDisputeCron = () => {
  if (!ENABLED) {
    logWarn("DisputeCron disabled (DISPUTE_CRON_ENABLED=false)");
    return;
  }

  if (!isSupabaseConnected()) {
    logWarn("DisputeCron skipped: Supabase not connected");
    return;
  }

  const INTERVAL_MS = 60 * 60 * 1000;

  const run = async () => {
    try {
      await escalateOpenDisputes();
      await flagStuckMediation();
    } catch (err) {
      logError("DisputeCron failed", err);
    }
  };

  run();
  _cronHandle = setInterval(run, INTERVAL_MS);
  logInfo("DisputeCron started", { escalationHours: ESCALATION_HOURS_OPEN });
  return _cronHandle;
};

export const stopDisputeCron = () => {
  if (_cronHandle) clearInterval(_cronHandle);
};
