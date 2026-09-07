// backend/services/leadTimelineService.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Lead Timeline service
// Manages lead activity timeline and history
// ─────────────────────────────────────────────────────────────

import { logInfo, logError } from "../utils/logger.js";
import { findAll, findById, update } from "../db/index.js";

// =============================
// 📊 GET LEAD TIMELINE
// =============================

export const getLeadTimeline = async (leadId) => {
  try {
    const timeline = await LeadActivity.getLeadTimeline(leadId);
    return timeline;
  } catch (err) {
    logError("Failed to get lead timeline", err, { leadId });
    throw err;
  }
};

// =============================
// ➕ ADD TIMELINE EVENT
// =============================

export const addTimelineEvent = async (leadId, type, actorId, actorType, description, metadata = {}) => {
  try {
    const activity = await LeadActivity.createActivity(leadId, type, actorId, actorType, description, metadata);

    // Update lead's last activity timestamp
    await update("leads", leadId, { lastActivityAt: new Date() });

    logInfo("Timeline event added", { leadId, type, actorId });
    return activity;
  } catch (err) {
    logError("Failed to add timeline event", err, { leadId, type });
    throw err;
  }
};

// =============================
// 📋 GET LEAD HISTORY
// =============================

export const getLeadHistory = async (leadId) => {
  try {
    const lead = await findById("leads", leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }

    const timeline = await LeadActivity.getLeadTimeline(leadId);

    // Extract stage changes for history
    const stageHistory = timeline
      .filter((activity) => activity.type === "stage_changed")
      .map((activity) => ({
        stage: activity.metadata.newStage,
        previousStage: activity.metadata.oldStage,
        changedAt: activity.createdAt,
        changedBy: activity.actor,
      }));

    return {
      currentStage: lead.stage,
      stageHistory,
      createdAt: lead.createdAt,
      convertedAt: lead.convertedAt,
      lostAt: lead.lostAt,
    };
  } catch (err) {
    logError("Failed to get lead history", err, { leadId });
    throw err;
  }
};

// =============================
// 📊 GET ACTIVITY SUMMARY
// =============================

export const getActivitySummary = async (leadId) => {
  try {
    const activities = await findAll("lead_activities", { filters: { lead: leadId } });

    const summary = {
      totalActivities: activities.length,
      byType: {},
      byActor: {},
    };

    activities.forEach((activity) => {
      summary.byType[activity.type] = (summary.byType[activity.type] || 0) + 1;
      summary.byActor[activity.actor.toString()] = (summary.byActor[activity.actor.toString()] || 0) + 1;
    });

    return summary;
  } catch (err) {
    logError("Failed to get activity summary", err, { leadId });
    throw err;
  }
};

export default {
  getLeadTimeline,
  addTimelineEvent,
  getLeadHistory,
  getActivitySummary,
};
