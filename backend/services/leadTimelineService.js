// Canonical lead timeline service.
// Timeline persistence lives in lead_activities; no model-specific methods are assumed.

import { create, findAll, findById, update } from "../db/index.js";
import { logInfo, logError } from "../utils/logger.js";

export const getLeadTimeline = async (leadId) => {
  try {
    return await findAll("lead_activities", {
      filters: { lead: leadId },
      orderBy: "createdAt",
      ascending: false,
    });
  } catch (err) {
    logError("Failed to get lead timeline", err, { leadId });
    throw err;
  }
};

export const addTimelineEvent = async (
  leadId,
  type,
  actorId,
  actorType,
  description,
  metadata = {},
) => {
  try {
    const activity = await create("lead_activities", {
      lead: leadId,
      type,
      actor: actorId,
      actorType,
      description: description || null,
      metadata: metadata || {},
    });

    await update("leads", leadId, { lastActivityAt: new Date().toISOString() });
    logInfo("Lead timeline event added", { leadId, type, actorId });
    return activity;
  } catch (err) {
    logError("Failed to add timeline event", err, { leadId, type });
    throw err;
  }
};

export const getLeadHistory = async (leadId) => {
  try {
    const lead = await findById("leads", leadId);
    if (!lead) throw new Error("Lead not found");

    const timeline = await getLeadTimeline(leadId);
    const stageHistory = timeline
      .filter((activity) => activity.type === "stage_changed")
      .map((activity) => ({
        stage: activity.metadata?.newStage,
        previousStage: activity.metadata?.oldStage,
        changedAt: activity.createdAt,
        changedBy: activity.actor,
      }));

    return {
      currentStage: lead.stage,
      stageHistory,
      createdAt: lead.createdAt,
      convertedAt: lead.convertedAt || null,
      lostAt: lead.lostAt || null,
    };
  } catch (err) {
    logError("Failed to get lead history", err, { leadId });
    throw err;
  }
};

export const getActivitySummary = async (leadId) => {
  try {
    const activities = await findAll("lead_activities", { filters: { lead: leadId } });
    const summary = { totalActivities: activities.length, byType: {}, byActor: {} };
    for (const activity of activities) {
      summary.byType[activity.type] = (summary.byType[activity.type] || 0) + 1;
      const actor = String(activity.actor || "unknown");
      summary.byActor[actor] = (summary.byActor[actor] || 0) + 1;
    }
    return summary;
  } catch (err) {
    logError("Failed to get activity summary", err, { leadId });
    throw err;
  }
};

export default { getLeadTimeline, addTimelineEvent, getLeadHistory, getActivitySummary };
