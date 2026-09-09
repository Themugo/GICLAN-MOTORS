import crypto from "crypto";
import { findAll, findOne, create, update } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";
import { deliver, sendUserCommunication } from "./communicationGateway.service.js";

const hash = (value) => crypto.createHash("sha256").update(String(value || "")).digest("hex");
const STAFF = new Set(["admin", "superadmin"]);
const CHANNELS = ["email", "sms", "whatsapp"];
const PREF_MAP = {
  email: { transactional: "emailTransactional", marketing: "emailMarketing" },
  sms: { transactional: "smsTransactional", marketing: "smsMarketing" },
  whatsapp: { transactional: "whatsappTransactional", marketing: "whatsappMarketing" },
};

export const getTemplate = async (code, channel) => {
  const row = await findOne("communication_templates", { code, channel, enabled: true });
  if (!row) throw new Error(`Communication template not found or disabled: ${code}/${channel}`);
  return row;
};

export const renderTemplate = (template, variables = {}) => {
  const render = (value) => String(value || "").replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, key) => {
    const v = key.split(".").reduce((acc, part) => acc?.[part], variables);
    return v == null ? "" : String(v);
  });
  return { subject: render(template.subjectTemplate), body: render(template.bodyTemplate) };
};

export const getPreferences = async (userId) => {
  let row = await findOne("communication_preferences", { userId });
  if (!row) row = await create("communication_preferences", { userId });
  return row;
};

export const updatePreferences = async (userId, patch) => {
  const current = await getPreferences(userId);
  const allowed = [
    "emailTransactional", "smsTransactional", "whatsappTransactional",
    "emailMarketing", "smsMarketing", "whatsappMarketing",
    "quietHoursStart", "quietHoursEnd", "timezone",
  ];
  const updates = {};
  for (const key of allowed) if (patch?.[key] !== undefined) updates[key] = patch[key];
  return Object.keys(updates).length ? update("communication_preferences", current.id, updates) : current;
};

export const channelAllowed = (preferences, channel, category) => {
  if (channel === "in_app") return true;
  if (!PREF_MAP[channel]) return false;
  if (category === "otp" || category === "system") return true;
  return preferences?.[PREF_MAP[channel][category]] !== false;
};

export const shouldDeliver = async ({ userId, channel, category }) => {
  if (!userId || channel === "in_app") return true;
  const prefs = await getPreferences(userId);
  return channelAllowed(prefs, channel, category);
};

export const getAdminTemplates = async ({ category, channel, enabled } = {}) => {
  const filters = {};
  if (category) filters.category = category;
  if (channel) filters.channel = channel;
  if (enabled !== undefined) filters.enabled = enabled;
  return findAll("communication_templates", { filters, orderBy: "updatedAt", ascending: false, limit: 500 });
};

export const saveTemplate = async (actor, payload, id = null) => {
  if (!STAFF.has(actor?.role)) throw new Error("Admin access required");
  const allowed = ["code", "name", "description", "category", "channel", "subjectTemplate", "bodyTemplate", "variables", "enabled"];
  const data = Object.fromEntries(allowed.filter(k => payload?.[k] !== undefined).map(k => [k, payload[k]]));
  if (!data.code || !data.name || !data.bodyTemplate) throw new Error("Template code, name and body are required");
  if (id) return update("communication_templates", id, { ...data, updatedBy: actor.id, updatedAt: new Date().toISOString() });
  return create("communication_templates", { ...data, createdBy: actor.id, updatedBy: actor.id });
};

export const getDeliveryHistory = async ({ userId, channel, category, status, limit = 100 } = {}) => {
  const filters = {};
  if (userId) filters.userId = userId;
  if (channel) filters.channel = channel;
  if (category) filters.category = category;
  if (status) filters.status = status;
  return findAll("communication_deliveries", { filters, orderBy: "createdAt", ascending: false, limit: Math.min(Number(limit) || 100, 500) });
};

export const getProviderHealth = async () => {
  const configured = {
    sendgrid: Boolean(process.env.SENDGRID_API_KEY),
    smtp: Boolean(process.env.EMAIL_HOST),
    africastalking: Boolean(process.env.AT_API_KEY),
    twilio_whatsapp: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER),
  };
  const rows = await findAll("communication_deliveries", { orderBy: "createdAt", ascending: false, limit: 1000 });
  const providers = {};
  for (const row of rows) {
    const key = row.provider || "unknown";
    const p = providers[key] ||= { provider: key, total: 0, sent: 0, delivered: 0, failed: 0, bounced: 0 };
    p.total++;
    if (row.status === "sent") p.sent++;
    if (row.status === "delivered" || row.status === "read") p.delivered++;
    if (row.status === "failed") p.failed++;
    if (row.status === "bounced") p.bounced++;
  }
  return Object.values(providers).map(p => ({ ...p, configured: configured[p.provider] ?? null, successRate: p.total ? Math.round(((p.delivered + p.sent) / p.total) * 10000) / 100 : 0 }));
};

export const getCommunicationAnalytics = async ({ hours = 24 } = {}) => {
  const since = new Date(Date.now() - Number(hours) * 3600000).toISOString();
  const { data, error } = await getSupabase().from("communication_deliveries").select("channel,category,status,provider,created_at").gte("created_at", since);
  if (error) throw error;
  const rows = data || [];
  const by = {};
  for (const r of rows) {
    const key = `${r.channel}:${r.category}`;
    const x = by[key] ||= { channel: r.channel, category: r.category, total: 0, sent: 0, delivered: 0, failed: 0, bounced: 0 };
    x.total++;
    if (r.status === "sent") x.sent++;
    if (["delivered", "read"].includes(r.status)) x.delivered++;
    if (r.status === "failed") x.failed++;
    if (r.status === "bounced") x.bounced++;
  }
  return Object.values(by).map(x => ({ ...x, deliveryRate: x.total ? Math.round((x.delivered / x.total) * 10000) / 100 : 0, failureRate: x.total ? Math.round((x.failed / x.total) * 10000) / 100 : 0 }));
};

export const retryDelivery = async (id) => {
  const row = (await findAll("communication_deliveries", { filters: { id }, limit: 1 }))[0];
  if (!row) throw new Error("Delivery not found");
  if (row.status !== "failed") throw new Error("Only failed deliveries can be retried");
  const metadata = row.metadata || {};
  if (!metadata.message && !metadata.text && !metadata.body) throw new Error("Delivery does not contain retryable message content");
  return deliver({ userId: row.userId, channel: row.channel, eventType: row.eventType, templateCode: row.templateCode, recipient: row.recipient, subject: metadata.subject, message: metadata.message || metadata.text || metadata.body, text: metadata.text || metadata.message || metadata.body, html: metadata.html, metadata: { ...metadata, retryOf: row.id }, deliveryId: row.id });
};

export const recordOtpAttempt = async ({ userId, purpose, code, ip, userAgent }) => {
  const recent = await findAll("otp_challenges", { filters: { userId, purpose }, orderBy: "createdAt", ascending: false, limit: 1 });
  return { recent: recent[0] || null, ipHash: hash(ip), userAgentHash: hash(userAgent), codeHash: hash(code) };
};
