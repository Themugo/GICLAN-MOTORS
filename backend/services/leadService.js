// Canonical lead/CRM service.
// All persistence uses the shared DB adapter and explicit lead workflow rules.

import { addTimelineEvent } from "./leadTimelineService.js";
import { logInfo, logError } from "../utils/logger.js";
import { findAll, findById, findOne, create, count, aggregate, update } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";

export const LEAD_STAGES = Object.freeze([
  "new",
  "contacted",
  "negotiating",
  "test_drive",
  "inspectionBooked",
  "reserved",
  "escrow_started",
  "sold",
  "lost",
]);

const TRANSITIONS = Object.freeze({
  new: ["contacted", "negotiating", "lost"],
  contacted: ["negotiating", "test_drive", "inspectionBooked", "lost"],
  negotiating: ["test_drive", "inspectionBooked", "reserved", "lost"],
  test_drive: ["negotiating", "inspectionBooked", "reserved", "lost"],
  inspectionBooked: ["negotiating", "reserved", "escrow_started", "lost"],
  reserved: ["negotiating", "escrow_started", "sold", "lost"],
  escrow_started: ["sold", "lost"],
  sold: [],
  lost: ["new", "contacted", "negotiating"],
});

const toId = (value) => value?.id || value?._id || value || null;

const normalizeLead = (lead) => {
  if (!lead) return null;
  const normalized = { ...lead };
  normalized._id = normalized.id;
  return normalized;
};

async function enrichLeads(leads) {
  const rows = Array.isArray(leads) ? leads : [leads];
  const buyerIds = [...new Set(rows.map((l) => toId(l.buyer)).filter(Boolean).map(String))];
  const dealerIds = [...new Set(rows.map((l) => toId(l.dealer)).filter(Boolean).map(String))];
  const vehicleIds = [...new Set(rows.map((l) => toId(l.vehicle)).filter(Boolean).map(String))];

  const [buyers, dealers, vehicles] = await Promise.all([
    buyerIds.length ? findAll("users", { filters: { id: { $in: buyerIds } }, select: "id name email phone" }) : [],
    dealerIds.length ? findAll("users", { filters: { id: { $in: dealerIds } }, select: "id name email phone businessName" }) : [],
    vehicleIds.length ? findAll("cars", { filters: { id: { $in: vehicleIds } }, select: "id title brand model year price images dealer" }) : [],
  ]);

  const byId = (items) => new Map(items.map((item) => [String(item.id), normalizeLead(item)]));
  const buyerMap = byId(buyers);
  const dealerMap = byId(dealers);
  const vehicleMap = byId(vehicles);

  return rows.map((raw) => {
    const lead = normalizeLead(raw);
    lead.buyer = buyerMap.get(String(toId(raw.buyer))) || raw.buyer || null;
    lead.dealer = dealerMap.get(String(toId(raw.dealer))) || raw.dealer || null;
    lead.vehicle = vehicleMap.get(String(toId(raw.vehicle))) || raw.vehicle || null;
    return lead;
  });
}

async function createLeadRecord(payload) {
  const { data, error } = await getSupabase().rpc("kayad_create_lead_atomic", {
    p_buyer: payload.buyer,
    p_dealer: payload.dealer,
    p_vehicle: payload.vehicle || null,
    p_source: payload.source,
    p_source_reference: payload.sourceReference || null,
    p_estimated_value: Number(payload.estimatedValue || 0),
  });
  if (error) throw error;
  return normalizeLead(data);
}

export const createLead = async (buyerId, dealerId, vehicleId, source, referenceId) => {
  try {
    if (!buyerId || !dealerId || !source) throw new Error("buyerId, dealerId and source are required");
    const existing = await findOne("leads", {
      buyer: buyerId,
      dealer: dealerId,
      vehicle: vehicleId || null,
      source,
      sourceReference: referenceId || null,
    });
    if (existing) return existing;

    let estimatedValue = 0;
    if (vehicleId) {
      const vehicle = await findById("cars", vehicleId);
      estimatedValue = Number(vehicle?.price || 0);
    }

    let lead;
    let created = false;
    try {
      const result = await createLeadRecord({
        buyer: buyerId,
        dealer: dealerId,
        vehicle: vehicleId,
        source,
        sourceReference: referenceId,
        estimatedValue,
      });
      lead = result.lead || result;
      created = Boolean(result.created);
    } catch (err) {
      // The unique business key makes concurrent create attempts safe.
      const concurrent = await findOne("leads", {
        buyer: buyerId,
        dealer: dealerId,
        vehicle: vehicleId || null,
        source,
        sourceReference: referenceId || null,
      });
      if (!concurrent) throw err;
      lead = concurrent;
    }

    if (lead && created) {
      await addTimelineEvent(lead.id, "lead_created", buyerId, "buyer", `Lead created from ${source}`, {
        source,
        referenceId: referenceId || null,
      });
    }
    logInfo("Lead created", { leadId: lead?.id, buyerId, dealerId, source });
    return lead;
  } catch (err) {
    logError("Failed to create lead", err, { buyerId, dealerId, source });
    throw err;
  }
};

export const updateLeadStage = async (leadId, newStage, actorId) => {
  if (!LEAD_STAGES.includes(newStage)) throw new Error(`Invalid lead stage: ${newStage}`);
  const { data, error } = await getSupabase().rpc("kayad_transition_lead_atomic", {
    p_lead_id: leadId,
    p_new_stage: newStage,
    p_actor_id: actorId,
  });
  if (error) throw error;
  logInfo("Lead stage updated", { leadId, newStage, actorId });
  return normalizeLead(data);
};

export const addLeadActivity = async (leadId, type, actorId, details = {}) => {
  const lead = await findById("leads", leadId);
  if (!lead) throw new Error("Lead not found");
  const activity = await addTimelineEvent(
    leadId,
    type,
    actorId,
    details.actorType || "dealer",
    details.description || type,
    details.metadata || {},
  );
  if (details.totalMessages !== undefined) {
    await update("leads", leadId, { totalMessages: Math.max(0, Number(details.totalMessages) || 0) });
  }
  return { ...(normalizeLead(lead)), activity };
};

export const getDealerLeads = async (dealerId, filters = {}) => {
  const clean = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined));
  const page = Math.max(1, Number(clean.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(clean.limit) || 50));
  delete clean.page; delete clean.limit;
  const search = clean.search;
  delete clean.search;
  const dbFilters = { dealer: dealerId, ...clean };
  if (dbFilters.archived === undefined) dbFilters.archived = false;

  if (search) {
    const all = await findAll("leads", { filters: dbFilters, orderBy: "lastActivityAt", ascending: false });
    const enrichedAll = await enrichLeads(all);
    const q = String(search).trim().toLowerCase();
    const matched = enrichedAll.filter((lead) => {
      const buyer = lead.buyer || {};
      const vehicle = lead.vehicle || {};
      return [buyer.name, buyer.email, buyer.phone, vehicle.title, vehicle.brand, vehicle.model]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
    const items = matched.slice((page - 1) * limit, page * limit);
    return { items, count: matched.length, page, limit, pages: Math.ceil(matched.length / limit) };
  }

  const result = await findAll("leads", {
    filters: dbFilters,
    orderBy: "lastActivityAt",
    limit,
    offset: (page - 1) * limit,
    count: true,
  });
  const enriched = await enrichLeads(result.data);
  return { items: enriched, count: result.count || 0, page, limit, pages: Math.ceil((result.count || 0) / limit) };
};

export const getLeadById = async (leadId) => {
  const lead = await findById("leads", leadId);
  if (!lead) throw new Error("Lead not found");
  return (await enrichLeads(lead))[0];
};

export const archiveLead = async (leadId, actorId) => {
  const lead = await findById("leads", leadId);
  if (!lead) throw new Error("Lead not found");
  const updated = await update("leads", leadId, { archived: true, lastActivityAt: new Date().toISOString() });
  await addTimelineEvent(leadId, "lead_archived", actorId, "dealer", "Lead archived");
  return (await enrichLeads(updated))[0];
};

export const markLeadAsHot = async (leadId, actorId) => {
  const lead = await findById("leads", leadId);
  if (!lead) throw new Error("Lead not found");
  const next = !Boolean(lead.isHot);
  const updated = await update("leads", leadId, { isHot: next, lastActivityAt: new Date().toISOString() });
  await addTimelineEvent(leadId, next ? "lead_marked_hot" : "lead_unmarked_hot", actorId, "dealer", next ? "Lead marked hot" : "Lead removed from hot leads");
  return (await enrichLeads(updated))[0];
};

export const addLeadNote = async (leadId, actorId, note) => {
  const clean = String(note || "").trim();
  if (!clean) throw new Error("Note is required");
  const updated = await update("leads", leadId, { notes: clean, lastActivityAt: new Date().toISOString() });
  await addTimelineEvent(leadId, "note_added", actorId, "dealer", "Note added", { note: clean });
  return (await enrichLeads(updated))[0];
};


export const getDealerLeadRecords = async (dealerId, { archived } = {}) => {
  const filters = { dealer: dealerId };
  if (archived !== undefined) filters.archived = archived;
  return findAll("leads", { filters, orderBy: "lastActivityAt", ascending: false });
};

export const updateLeadFields = async (leadId, actorId, fields = {}) => {
  const lead = await findById("leads", leadId);
  if (!lead) throw new Error("Lead not found");
  const updates = {};
  if (fields.estimatedValue !== undefined) {
    const value = Number(fields.estimatedValue);
    if (!Number.isFinite(value) || value < 0) throw new Error("estimatedValue must be a non-negative number");
    updates.estimatedValue = value;
  }
  if (fields.archived !== undefined) updates.archived = Boolean(fields.archived);
  if (Object.keys(updates).length) {
    updates.lastActivityAt = new Date().toISOString();
    await update("leads", leadId, updates);
  }
  if (fields.archived !== undefined) await addTimelineEvent(leadId, fields.archived ? "lead_archived" : "lead_unarchived", actorId, "dealer", fields.archived ? "Lead archived" : "Lead restored");
  return getLeadById(leadId);
};

export const calculateConversionRate = async (dealerId, startDate, endDate) => {
  const matchQuery = { dealer: dealerId, createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } };
  const totalLeads = await count("leads", matchQuery);
  const soldLeads = await count("leads", { ...matchQuery, stage: "sold" });
  return { totalLeads, soldLeads, conversionRate: totalLeads ? (soldLeads / totalLeads) * 100 : 0 };
};

export const calculateResponseTime = async (dealerId, startDate, endDate) => {
  const leads = await findAll("leads", { filters: {
    dealer: dealerId,
    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
    firstResponseTime: { $gt: 0 },
  }});
  const totalResponseTime = leads.reduce((sum, lead) => sum + Number(lead.firstResponseTime || 0), 0);
  return { averageResponseTime: leads.length ? totalResponseTime / leads.length : 0, totalLeads: leads.length };
};

export const getLeadPipeline = async (dealerId) => {
  const leads = await findAll("leads", { filters: { dealer: dealerId, archived: false } });
  return LEAD_STAGES.map((stage) => {
    const stageLeads = leads.filter((lead) => lead.stage === stage);
    return {
      stage,
      count: stageLeads.length,
      value: stageLeads.reduce((sum, lead) => sum + Number(lead.estimatedValue || 0), 0),
    };
  });
};

export const getLeadAnalytics = async (dealerId, startDate, endDate) => {
  const matchQuery = { dealer: dealerId, createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } };
  const [leadsBySource, leadsByStage, conversionMetrics, responseTimeMetrics, hotLeadsCount] = await Promise.all([
    aggregate("leads", [{ $match: matchQuery }, { $group: { _id: "$source", count: { $sum: 1 }, totalValue: { $sum: "$estimatedValue" } } }]),
    aggregate("leads", [{ $match: matchQuery }, { $group: { _id: "$stage", count: { $sum: 1 }, totalValue: { $sum: "$estimatedValue" } } }]),
    calculateConversionRate(dealerId, startDate, endDate),
    calculateResponseTime(dealerId, startDate, endDate),
    count("leads", { ...matchQuery, isHot: true }),
  ]);
  return { leadsBySource, leadsByStage, conversionMetrics, responseTimeMetrics, hotLeadsCount };
};

export const findOrCreateLeadFromChat = async (chatId) => {
  const chat = await findById("chats", chatId);
  if (!chat) throw new Error("Chat not found");
  const participants = Array.isArray(chat.participants) ? chat.participants.map(String) : [];
  const vehicleId = toId(chat.car);
  const vehicle = vehicleId ? await findById("cars", vehicleId) : null;
  const dealerId = toId(vehicle?.dealer);
  const buyerId = participants.find((id) => id !== String(dealerId));
  if (!buyerId || !dealerId) throw new Error("Invalid chat participants");
  return createLead(buyerId, dealerId, vehicleId, "chat", chatId);
};

export const findOrCreateLeadFromAuction = async (auctionId, buyerId) => {
  const vehicle = await findById("cars", auctionId);
  if (!vehicle || !["live", "ended"].includes(vehicle.auctionStatus)) throw new Error("Auction not found");
  if (!vehicle.dealer) throw new Error("Auction vehicle has no dealer");
  return createLead(buyerId, vehicle.dealer, vehicle.id, "auction", auctionId);
};

export const findOrCreateLeadFromEscrow = async (escrowId) => {
  const escrow = await findById("escrows", escrowId);
  if (!escrow) throw new Error("Escrow not found");
  const vehicleId = toId(escrow.car);
  const source = escrow.source || "escrow";
  const lead = await createLead(escrow.buyer, escrow.seller, vehicleId, source, escrowId);
  if (lead.stage !== "escrow_started") await updateLeadStage(lead.id, "escrow_started", escrow.seller);
  return getLeadById(lead.id);
};

export default {
  createLead, updateLeadStage, addLeadActivity, addLeadNote, getDealerLeads, getDealerLeadRecords, updateLeadFields, getLeadById,
  archiveLead, markLeadAsHot, calculateConversionRate, calculateResponseTime,
  getLeadPipeline, getLeadAnalytics, findOrCreateLeadFromChat, findOrCreateLeadFromAuction,
  findOrCreateLeadFromEscrow, LEAD_STAGES,
};
