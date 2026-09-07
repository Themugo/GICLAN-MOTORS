import { findAll, findById, create, update, count } from "../db/index.js";
import { logAuditEvent } from "../services/auditService.js";
import {
  getExecutiveDashboard,
  getSystemHealth,
  getBusinessHealth,
  getPerformanceMetrics,
  getSecurityStatus,
  getCapacityPlanning,
  getComplianceStatus,
  getDeployments,
  getDisasterRecovery,
  getRootCauseAnalysis,
  askOperationsQuestion,
  getIncidents,
  getIncident,
  createIncidentRecord,
  updateIncidentRecord,
  getAlerts,
  createAlertRecord,
  acknowledgeAlert as acknowledgeEcpAlert,
  resolveAlert as resolveEcpAlert,
  getSelfHealingActions,
  executeSelfHealing,
} from "../services/ecpService.js";

const ROLES = new Set(["admin", "superadmin", "executive", "engineer", "manager", "webhoist"]);
const OPERATORS = new Set(["admin", "superadmin", "executive", "engineer", "manager", "webhoist"]);
const ADMIN = new Set(["admin", "superadmin", "webhoist"]);
const text = (value, max = 160) => String(value ?? "").trim().slice(0, max);
const fail = (status, message) => Object.assign(new Error(message), { status });
const role = (req) => req.user?.effectiveRole || req.user?.role;
const ensureOperator = (req) => { if (!ROLES.has(role(req))) throw fail(403, "Command Center access denied"); };
const ensureMutation = (req) => { if (!OPERATORS.has(role(req))) throw fail(403, "Command Center mutation denied"); };
const ensureAdmin = (req) => { if (!ADMIN.has(role(req))) throw fail(403, "Administrator access required"); };
const since = (days = 1) => new Date(Date.now() - days * 86400000).toISOString();
const ok = (res, data) => res.json({ success: true, data, timestamp: new Date().toISOString() });
const safe = async (fn, fallback = null) => { try { return await fn(); } catch { return fallback; } };

const counts = async (table, filters) => safe(() => count(table, filters), 0);
const list = async (table, filters = {}, orderBy = "createdAt", limit = 50) => safe(() => findAll(table, { filters, orderBy, ascending: false, limit }), []);

async function operationalSnapshot() {
  const [dashboard, health, performance, security, capacity, compliance] = await Promise.all([
    getExecutiveDashboard(), getSystemHealth(), getPerformanceMetrics(), getSecurityStatus(), getCapacityPlanning(), getComplianceStatus(),
  ]);
  return { dashboard: dashboard.data, health: health.data, performance: performance.data, security: security.data, capacity: capacity.data, compliance: compliance.data };
}

export async function getMissionControl(req, res) {
  ensureOperator(req);
  const [snapshot, incidents, alerts, deployments] = await Promise.all([operationalSnapshot(), getIncidents({ status: { $in: ["open", "investigating", "mitigated"] } }), getAlerts({ status: { $in: ["open", "acknowledged"] } }), getDeployments()]);
  return ok(res, { ...snapshot, incidents: incidents.slice(0, 20), alerts: alerts.slice(0, 20), deployments: deployments.slice(0, 10) });
}

export async function getLiveActivity(req, res) {
  ensureOperator(req);
  const [incidents, alerts, payments, listings, inspections, users] = await Promise.all([
    list("incidents", {}, "createdAt", 20), list("alerts", {}, "createdAt", 20), list("payments", { createdAt: { $gte: since(1) } }, "createdAt", 20),
    list("cars", { createdAt: { $gte: since(1) }, deletedAt: null }, "createdAt", 20), list("vehicle_inspections", { createdAt: { $gte: since(1) } }, "createdAt", 20),
    list("users", { createdAt: { $gte: since(1) } }, "createdAt", 20),
  ]);
  const events = [
    ...incidents.map(x => ({ type: "incident", severity: x.severity, title: x.title, status: x.status, createdAt: x.createdAt, id: x.id })),
    ...alerts.map(x => ({ type: "alert", severity: x.severity, title: x.title, status: x.status, createdAt: x.createdAt, id: x.id })),
    ...payments.map(x => ({ type: "payment", title: `Payment ${x.status || "updated"}`, status: x.status, createdAt: x.createdAt, id: x.id })),
    ...listings.map(x => ({ type: "listing", title: "Vehicle listing activity", status: x.status, createdAt: x.createdAt, id: x.id })),
    ...inspections.map(x => ({ type: "inspection", title: "Inspection activity", status: x.status, createdAt: x.createdAt, id: x.id })),
    ...users.map(x => ({ type: "registration", title: "New account registration", status: x.status, createdAt: x.createdAt, id: x.id })),
  ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 100);
  return ok(res, { events, generatedAt: new Date().toISOString() });
}

async function domainCounts() {
  const [users, dealers, cars, auctions, payments, inspections, support, disputes] = await Promise.all([
    counts("users", { isBanned: false, deactivatedAt: null }), counts("users", { role: "dealer", isBanned: false, deactivatedAt: null }),
    counts("cars", { deletedAt: null }), counts("cars", { hasAuction: true, auctionStatus: "active", deletedAt: null }), counts("payments", { status: "pending" }),
    counts("vehicle_inspections", {}), counts("support_tickets", { status: { $in: ["open", "pending", "in_progress"] } }), counts("disputes", { status: { $in: ["open", "appealed"] } }),
  ]);
  return { users, dealers, cars, auctions, pendingPayments: payments, inspections, openSupport: support, openDisputes: disputes };
}

export async function getOperationsCenter(req, res) { ensureOperator(req); return ok(res, { snapshot: await operationalSnapshot(), queues: await domainCounts() }); }
export async function getMarketplaceCenter(req, res) { ensureOperator(req); return ok(res, { listings: await counts("cars", { status: "available", deletedAt: null }), newListings24h: await counts("cars", { createdAt: { $gte: since(1) }, deletedAt: null }), sold24h: await counts("cars", { status: { $in: ["sold", "completed"] }, updatedAt: { $gte: since(1) } }), activeAuctions: await counts("cars", { hasAuction: true, auctionStatus: "active", deletedAt: null }), disputes: await counts("disputes", { status: { $in: ["open", "appealed"] } }) }); }
export async function getDealerOperations(req, res) { ensureOperator(req); return ok(res, { totalDealers: await counts("users", { role: "dealer" }), pendingVerification: await counts("users", { role: "dealer", verified: false }), pendingKyc: await counts("users", { role: "dealer", kycVerified: false }), pendingApproval: await counts("users", { role: "dealer", status: "pending" }) }); }
export async function getAuctionOperations(req, res) { ensureOperator(req); return ok(res, { activeAuctions: await counts("cars", { hasAuction: true, auctionStatus: "active", deletedAt: null }), pendingBids: await counts("bids", { status: "pending" }), recentBids: await counts("bids", { createdAt: { $gte: since(1) } }) }); }
export async function getInspectionOperations(req, res) { ensureOperator(req); return ok(res, { requested: await counts("vehicle_inspections", { status: "requested" }), assigned: await counts("vehicle_inspections", { status: "assigned" }), completed24h: await counts("vehicle_inspections", { status: "completed", updatedAt: { $gte: since(1) } }), overdue: await counts("vehicle_inspections", { status: { $in: ["requested", "assigned"] }, scheduledDate: { $lt: new Date().toISOString() } }) }); }
export async function getFinanceOperations(req, res) { ensureOperator(req); const [pending, failed, processing, successful] = await Promise.all([counts("payments", { status: "pending" }), counts("payments", { status: "failed", createdAt: { $gte: since(1) } }), counts("payments", { status: "processing" }), counts("payments", { status: "success", createdAt: { $gte: since(1) } })]); return ok(res, { pending, failed24h: failed, processing, successful24h: successful }); }
export async function getSupportOperations(req, res) { ensureOperator(req); return ok(res, { open: await counts("support_tickets", { status: { $in: ["open", "pending", "in_progress"] } }), urgent: await counts("support_tickets", { priority: { $in: ["urgent", "critical"] }, status: { $nin: ["closed", "resolved"] } }), escalated: await counts("support_tickets", { status: "escalated" }) }); }
export async function getSecurityOperations(req, res) { ensureOperator(req); return ok(res, (await getSecurityStatus()).data); }
export async function getInfrastructureOperations(req, res) { ensureOperator(req); return ok(res, { health: (await getSystemHealth()).data, performance: (await getPerformanceMetrics()).data, disasterRecovery: (await getDisasterRecovery()).data }); }
export async function getAIOperations(req, res) { ensureOperator(req); return ok(res, { rootCauseAvailable: true, selfHealing: await getSelfHealingActions(), methodology: "Evidence-backed operational analysis only; no synthetic KPIs or autonomous arbitrary execution." }); }

export async function getPendingActions(req, res) { ensureMutation(req); const [incidents, alerts] = await Promise.all([getIncidents({ status: { $in: ["open", "investigating", "mitigated"] } }), getAlerts({ status: { $in: ["open", "acknowledged"] } })]); return ok(res, { actions: [...alerts.slice(0, 20).map(a => ({ type: "alert", id: a.id, action: a.status === "open" ? "acknowledge" : "resolve", title: a.title, severity: a.severity })), ...incidents.slice(0, 20).map(i => ({ type: "incident", id: i.id, action: "mitigate", title: i.title, severity: i.severity }))] }); }
export async function executeAction(req, res) { ensureAdmin(req); const action = text(req.body?.action, 60); const targetId = text(req.body?.targetId, 80); if (!targetId) throw fail(400, "targetId is required"); let result; if (action === "acknowledge_alert") result = await acknowledgeEcpAlert(targetId, req.user.id, req); else if (action === "resolve_alert") result = await resolveEcpAlert(targetId, req.user.id, req); else if (action === "mitigate_incident") result = await updateIncidentRecord(targetId, { status: "mitigated" }, req.user.id, req); else throw fail(400, "Unsupported command-center action"); await logAuditEvent({ action: "command_center_action_executed", actor: req.user.id, target: targetId, targetModel: action.includes("incident") ? "Incident" : "Alert", requestId: req.id, ipAddress: req.ip, userAgent: req.get("user-agent"), details: { action } }); return ok(res, result); }

export async function getNotifications(req, res) { ensureOperator(req); return ok(res, await list("notifications", { user: req.user.id }, "createdAt", 100)); }
export async function markNotificationRead(req, res) { ensureOperator(req); const id = text(req.params.notificationId, 80); const row = await findById("notifications", id); if (!row || String(row.user) !== String(req.user.id)) throw fail(404, "Notification not found"); const updated = await update("notifications", id, { isRead: true, readAt: new Date().toISOString() }); return ok(res, updated); }
export async function getDecisions(req, res) { ensureOperator(req); return ok(res, await list("governance_decisions", {}, "createdAt", 100)); }
export async function getCommands(req, res) { ensureMutation(req); return ok(res, { commands: [{ id: "acknowledge_alert", label: "Acknowledge alert", requires: "operator" }, { id: "resolve_alert", label: "Resolve alert", requires: "operator" }, { id: "mitigate_incident", label: "Mitigate incident", requires: "administrator" }] }); }
export async function executeCommand(req, res) { return executeAction(req, res); }

export async function getWarRoom(req, res) { ensureOperator(req); const row = await findById("command_center_war_rooms", "active"); return ok(res, row || { status: "inactive" }); }
export async function activateWarRoom(req, res) { ensureAdmin(req); const purpose = text(req.body?.purpose, 500); const row = await update("command_center_war_rooms", "active", { status: "active", purpose, activatedBy: req.user.id, activatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).catch(async () => create("command_center_war_rooms", { id: "active", status: "active", purpose, activatedBy: req.user.id, activatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })); await logAuditEvent({ action: "command_center_war_room_activated", actor: req.user.id, target: "active", targetModel: "CommandCenterWarRoom", requestId: req.id }); return ok(res, row); }
export async function deactivateWarRoom(req, res) { ensureAdmin(req); const row = await update("command_center_war_rooms", "active", { status: "inactive", deactivatedBy: req.user.id, deactivatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); await logAuditEvent({ action: "command_center_war_room_deactivated", actor: req.user.id, target: "active", targetModel: "CommandCenterWarRoom", requestId: req.id }); return ok(res, row); }

export async function getExecutiveTimeline(req, res) { ensureOperator(req); const limit = Math.min(Number(req.query?.limit) || 50, 100); const [incidents, alerts, audits] = await Promise.all([list("incidents", {}, "createdAt", limit), list("alerts", {}, "createdAt", limit), list("audit_logs", {}, "createdAt", limit)]); const events = [...incidents.map(x => ({ type: "incident", id: x.id, title: x.title, status: x.status, severity: x.severity, at: x.createdAt })), ...alerts.map(x => ({ type: "alert", id: x.id, title: x.title, status: x.status, severity: x.severity, at: x.createdAt })), ...audits.map(x => ({ type: "audit", id: x.id, title: x.action || "Audit event", at: x.createdAt }))].sort((a,b)=>new Date(b.at||0)-new Date(a.at||0)).slice(0, limit); return ok(res, events); }
export async function getExecutiveBriefing(req, res) { ensureOperator(req); const [dashboard, incidents, alerts] = await Promise.all([getExecutiveDashboard(), getIncidents({ status: { $in: ["open", "investigating", "mitigated"] } }), getAlerts({ status: { $in: ["open", "acknowledged"] } })]); return ok(res, { generatedAt: new Date().toISOString(), dashboard: dashboard.data, priorities: [...incidents.slice(0, 5).map(i => ({ type: "incident", title: i.title, severity: i.severity, status: i.status })), ...alerts.slice(0, 5).map(a => ({ type: "alert", title: a.title, severity: a.severity, status: a.status }))] }); }
export async function enterpriseSearch(req, res) { ensureOperator(req); const q = text(req.query?.q, 100); if (q.length < 2) throw fail(400, "Search query must contain at least 2 characters"); const [cars, users, incidents, alerts] = await Promise.all([list("cars", { $text: { $search: q } }, "createdAt", 20), list("users", { $text: { $search: q } }, "createdAt", 20), list("incidents", { $text: { $search: q } }, "createdAt", 20), list("alerts", { $text: { $search: q } }, "createdAt", 20)]); return ok(res, { query: q, results: { vehicles: cars, users, incidents, alerts } }); }
export async function getWidgets(req, res) { ensureOperator(req); const row = await findById("command_center_widget_layouts", req.user.id); return ok(res, row?.layout || []); }
export async function saveWidgetLayout(req, res) { ensureMutation(req); if (!Array.isArray(req.body?.layout) || req.body.layout.length > 50) throw fail(400, "layout must be an array of at most 50 widgets"); const layout = req.body.layout.map(w => ({ id: text(w?.id, 80), x: Number(w?.x) || 0, y: Number(w?.y) || 0, w: Math.min(Math.max(Number(w?.w) || 1, 1), 12), h: Math.min(Math.max(Number(w?.h) || 1, 1), 12) })).filter(w => w.id); const row = await update("command_center_widget_layouts", req.user.id, { id: req.user.id, userId: req.user.id, layout, updatedAt: new Date().toISOString() }).catch(() => create("command_center_widget_layouts", { id: req.user.id, userId: req.user.id, layout, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })); return ok(res, row); }
export async function getRegionalMap(req, res) { ensureOperator(req); const rows = await list("regional_metrics", {}, "regionName", 100); return ok(res, rows); }

export { getIncidents, getIncident, createIncidentRecord, updateIncidentRecord, createAlertRecord, getRootCauseAnalysis, askOperationsQuestion };
