// backend/services/leadService.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Lead service
// Manages lead creation, updates, and analytics
// ─────────────────────────────────────────────────────────────

import { addTimelineEvent, getLeadTimeline } from "./leadTimelineService.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";
import { findAll, findById, findOne, create, count, aggregate } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";

// =============================
// ➕ CREATE LEAD
// =============================

export const createLead = async (buyerId, dealerId, vehicleId, source, referenceId) => {
  try {
    // Check if lead already exists for this combination
    const existingLead = await findOne("leads", {
      buyer: buyerId,
      dealer: dealerId,
      vehicle: vehicleId,
      source,
      sourceReference: referenceId,
    });

    if (existingLead) {
      logInfo("Lead already exists", { buyerId, dealerId, vehicleId, source });
      return existingLead;
    }

    // Get vehicle details for estimated value
    let estimatedValue = 0;
    if (vehicleId) {
      const vehicle = await findById("cars", vehicleId);
      if (vehicle) {
        estimatedValue = vehicle.price || 0;
      }
    }

    const lead = await create("leads", {
      buyer: buyerId,
      dealer: dealerId,
      vehicle: vehicleId,
      source,
      sourceReference: referenceId,
      estimatedValue,
      lastActivityAt: new Date(),
    });

    // Add creation activity
    await addTimelineEvent(lead.id, "lead_created", buyerId, "buyer", `Lead created from ${source}`, {
      source,
      referenceId,
    });

    logInfo("Lead created", { leadId: lead.id, buyerId, dealerId, source });
    return lead;
  } catch (err) {
    logError("Failed to create lead", err, { buyerId, dealerId, source });
    throw err;
  }
};

// =============================
// 🔄 UPDATE LEAD STAGE
// =============================

export const updateLeadStage = async (leadId, newStage, actorId) => {
  try {
    const lead = await findById("leads", leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }

    await lead.updateStage(newStage, actorId);
    logInfo("Lead stage updated", { leadId, newStage, actorId });
    return lead;
  } catch (err) {
    logError("Failed to update lead stage", err, { leadId, newStage });
    throw err;
  }
};

// =============================
// ➕ ADD LEAD ACTIVITY
// =============================

export const addLeadActivity = async (leadId, type, actorId, details) => {
  try {
    const lead = await findById("leads", leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }

    await lead.addActivity(type, actorId, "dealer", details.description, details.metadata);

    if (details.totalMessages) {
      lead.totalMessages = details.totalMessages;
      await lead.save();
    }

    logInfo("Lead activity added", { leadId, type, actorId });
    return lead;
  } catch (err) {
    logError("Failed to add lead activity", err, { leadId, type });
    throw err;
  }
};

// =============================
// 📋 GET DEALER LEADS
// =============================

export const getDealerLeads = async (dealerId, filters = {}) => {
  try {
    const leads = await Lead.getDealerLeads(dealerId, filters);
    return leads;
  } catch (err) {
    logError("Failed to get dealer leads", err, { dealerId });
    throw err;
  }
};

// =============================
// 🔍 GET LEAD BY ID
// =============================

export const getLeadById = async (leadId) => {
  try {
    const lead = await findById("leads", leadId)
       /* .populate("buyer", "name email phone") - TODO: use separate query */
       /* .populate("dealer", "name email businessName") - TODO: use separate query */
       /* .populate("vehicle", "title brand model year price images") - TODO: use separate query */;

    if (!lead) {
      throw new Error("Lead not found");
    }

    return lead;
  } catch (err) {
    logError("Failed to get lead by id", err, { leadId });
    throw err;
  }
};

// =============================
// 📦 ARCHIVE LEAD
// =============================

export const archiveLead = async (leadId, actorId) => {
  try {
    const lead = await findById("leads", leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }

    await lead.archive(actorId);
    logInfo("Lead archived", { leadId, actorId });
    return lead;
  } catch (err) {
    logError("Failed to archive lead", err, { leadId });
    throw err;
  }
};

// =============================
// 🔥 MARK LEAD AS HOT
// =============================

export const markLeadAsHot = async (leadId, actorId) => {
  try {
    const lead = await findById("leads", leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }

    await lead.markAsHot(actorId);
    logInfo("Lead hot status updated", { leadId, actorId });
    return lead;
  } catch (err) {
    logError("Failed to mark lead as hot", err, { leadId });
    throw err;
  }
};

// =============================
// 📊 CALCULATE CONVERSION RATE
// =============================

export const calculateConversionRate = async (dealerId, startDate, endDate) => {
  try {
    const matchQuery = {
      dealer: dealerId,
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    const totalLeads = await count("leads", matchQuery);
    const soldLeads = await count("leads", {
      ...matchQuery,
      stage: "sold",
    });

    const conversionRate = totalLeads > 0 ? (soldLeads / totalLeads) * 100 : 0;

    return {
      totalLeads,
      soldLeads,
      conversionRate,
    };
  } catch (err) {
    logError("Failed to calculate conversion rate", err, { dealerId });
    throw err;
  }
};

// =============================
// ⏱️ CALCULATE RESPONSE TIME
// =============================

export const calculateResponseTime = async (dealerId, startDate, endDate) => {
  try {
    const leads = await findAll("leads", { 
      filters: {
        dealer: dealerId,
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
        firstResponseTime: { $gt: 0 },
      }
    });

    if (leads.length === 0) {
      return {
        averageResponseTime: 0,
        totalLeads: 0,
      };
    }

    const totalResponseTime = leads.reduce((sum, lead) => sum + lead.firstResponseTime, 0);
    const averageResponseTime = totalResponseTime / leads.length;

    return {
      averageResponseTime,
      totalLeads: leads.length,
    };
  } catch (err) {
    logError("Failed to calculate response time", err, { dealerId });
    throw err;
  }
};

// =============================
// 📊 GET LEAD PIPELINE
// =============================

export const getLeadPipeline = async (dealerId) => {
  try {
    const pipeline = await Lead.getLeadPipeline(dealerId);
    return pipeline;
  } catch (err) {
    logError("Failed to get lead pipeline", err, { dealerId });
    throw err;
  }
};

// =============================
// 📈 GET LEAD ANALYTICS
// =============================

export const getLeadAnalytics = async (dealerId, startDate, endDate) => {
  try {
    const matchQuery = {
      dealer: dealerId,
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    // Total leads by source
    const leadsBySource = await aggregate("leads", [{ $match: matchQuery },
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 },
          totalValue: { $sum: "$estimatedValue" },
        },
      },]);

    // Total leads by stage
    const leadsByStage = await aggregate("leads", [{ $match: matchQuery },
      {
        $group: {
          _id: "$stage",
          count: { $sum: 1 },
          totalValue: { $sum: "$estimatedValue" },
        },
      },]);

    // Conversion metrics
    const conversionMetrics = await calculateConversionRate(dealerId, startDate, endDate);

    // Response time metrics
    const responseTimeMetrics = await calculateResponseTime(dealerId, startDate, endDate);

    // Hot leads
    const hotLeadsCount = await count("leads", {
      ...matchQuery,
      isHot: true,
    });

    return {
      leadsBySource,
      leadsByStage,
      conversionMetrics,
      responseTimeMetrics,
      hotLeadsCount,
    };
  } catch (err) {
    logError("Failed to get lead analytics", err, { dealerId });
    throw err;
  }
};

// =============================
// 🔄 FIND OR CREATE LEAD FROM CHAT
// =============================

export const findOrCreateLeadFromChat = async (chatId) => {
  try {
    const chat = await findById("chats", chatId) /* .populate("car") - TODO: use separate query */;
    if (!chat) {
      throw new Error("Chat not found");
    }

    const buyerId = chat.participants.find((p) => p.toString() !== chat.car?.dealer?.toString());
    const dealerId = chat.car?.dealer;
    const vehicleId = chat.car?._id;

    if (!buyerId || !dealerId) {
      throw new Error("Invalid chat participants");
    }

    return await createLead(buyerId, dealerId, vehicleId, "chat", chatId);
  } catch (err) {
    logError("Failed to find or create lead from chat", err, { chatId });
    throw err;
  }
};

// =============================
// 🔄 FIND OR CREATE LEAD FROM AUCTION
// =============================

export const findOrCreateLeadFromAuction = async (auctionId, buyerId) => {
  try {
    const vehicle = await findById("cars", auctionId);
    if (!vehicle || !["live", "ended"].includes(vehicle.auctionStatus)) {
      throw new Error("Auction not found");
    }
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    const dealerId = vehicle.dealer;

    return await createLead(buyerId, dealerId, vehicle.id, "auction", auctionId);
  } catch (err) {
    logError("Failed to find or create lead from auction", err, { auctionId });
    throw err;
  }
};

// =============================
// 🔄 FIND OR CREATE LEAD FROM ESCROW
// =============================

export const findOrCreateLeadFromEscrow = async (escrowId) => {
  try {
    const escrow = await findById("escrows", escrowId) /* .populate("car") - TODO: use separate query */;
    if (!escrow) {
      throw new Error("Escrow not found");
    }

    const buyerId = escrow.buyer;
    const dealerId = escrow.seller;
    const vehicleId = escrow.car?._id;

    const lead = await createLead(buyerId, dealerId, vehicleId, "chat", null);

    // Update lead stage to escrow_started
    await updateLeadStage(lead.id, "escrow_started", dealerId);

    return lead;
  } catch (err) {
    logError("Failed to find or create lead from escrow", err, { escrowId });
    throw err;
  }
};

export default {
  createLead,
  updateLeadStage,
  addLeadActivity,
  getDealerLeads,
  getLeadById,
  archiveLead,
  markLeadAsHot,
  calculateConversionRate,
  calculateResponseTime,
  getLeadPipeline,
  getLeadAnalytics,
  findOrCreateLeadFromChat,
  findOrCreateLeadFromAuction,
  findOrCreateLeadFromEscrow,
};
