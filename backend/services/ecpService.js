import { getSupabase } from "../utils/supabase.js";
import { create, findAll, findById, update, count } from "../db/index.js";
import { logAuditEvent } from "./auditService.js";

const INCIDENT_STATUSES = ["open", "investigating", "mitigated", "resolved", "closed"];
const INCIDENT_SEVERITIES = ["low", "medium", "high", "critical"];
const ALERT_STATUSES = ["open", "acknowledged", "resolved"];
const ALERT_SEVERITIES = INCIDENT_SEVERITIES;
const SELF_HEAL_ACTIONS = ["acknowledge_alert", "resolve_alert", "mitigate_incident"];
const SERVICE_NAMES = ["database", "marketplace", "payments", "inspections", "search", "notifications"];
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n)));
const text = (v, max) => String(v ?? "").trim().slice(0, max);

const since = (days = 1) => new Date(Date.now() - days * 86400000).toISOString();

export async function getSystemHealth() {
  const services = [];
  for (const name of SERVICE_NAMES) {
    const started = Date.now();
    let status = "healthy";
    let error = null;
    try {
      if (name === "database") await count("users", {});
      else if (name === "marketplace") await count("cars", { deletedAt: null });
      else if (name === "payments") await count("payments", { status: "pending" });
      else if (name === "inspections") await count("vehicle_inspections", {});
      else if (name === "search") await count("search_analytics", {});
      else if (name === "notifications") await count("notifications", { isRead: false });
    } catch (e) { status = "degraded"; error = e.message; }
    services.push({ name, status, latency: Date.now() - started, error });
  }
  const healthy = services.filter(s => s.status === "healthy").length;
  return { success: true, data: { services, summary: { healthy, degraded: services.length - healthy, down: 0 }, checkedAt: new Date().toISOString() } };
}

export async function checkServiceHealth(serviceId) {
  const name = text(serviceId, 50).toLowerCase();
  if (!SERVICE_NAMES.includes(name)) throw Object.assign(new Error("Unknown service"), { status: 404 });
  const health = await getSystemHealth();
  const service = health.data.services.find(s => s.name === name);
  await create("health_checks", { service: name, status: service.status, latencyMs: service.latency, details: service.error ? { error: service.error } : {}, checkedAt: new Date().toISOString() });
  return { success: true, data: service };
}

export async function getIncidents(filters = {}) { return findAll("incidents", { filters, orderBy: "createdAt", ascending: false, limit: 200 }); }
export async function getIncident(id) { const row = await findById("incidents", id); if (!row) throw Object.assign(new Error("Incident not found"), { status: 404 }); return row; }

export async function createIncidentRecord(body, actorId, req) {
  const title = text(body.title, 180), description = text(body.description, 5000), severity = body.severity || "medium";
  if (title.length < 3 || description.length < 10 || !INCIDENT_SEVERITIES.includes(severity)) throw Object.assign(new Error("Valid title, description and severity are required"), { status: 400 });
  const row = await create("incidents", { title, description, severity, status: "open", service: text(body.service, 80) || null, createdBy: actorId, ownerId: body.ownerId || null, metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {} });
  await logAuditEvent({ action: "ecp_incident_created", actor: actorId, target: row.id, targetModel: "Incident", targetName: title, newValue: row, ipAddress: req?.ip, userAgent: req?.get("user-agent"), requestId: req?.id, details: { severity }, severity: severity === "critical" ? "critical" : "warning" });
  return row;
}

export async function updateIncidentRecord(id, body, actorId, req) {
  const current = await getIncident(id);
  if (["resolved", "closed"].includes(current.status)) throw Object.assign(new Error("Resolved/closed incidents are immutable"), { status: 409 });
  const patch = {};
  if (body.title !== undefined) patch.title = text(body.title, 180);
  if (body.description !== undefined) patch.description = text(body.description, 5000);
  if (body.severity !== undefined && INCIDENT_SEVERITIES.includes(body.severity)) patch.severity = body.severity;
  if (body.ownerId !== undefined) patch.ownerId = body.ownerId || null;
  if (body.service !== undefined) patch.service = text(body.service, 80) || null;
  if (body.metadata !== undefined && body.metadata && typeof body.metadata === "object") patch.metadata = body.metadata;
  if (body.status !== undefined) {
    if (!INCIDENT_STATUSES.includes(body.status)) throw Object.assign(new Error("Invalid incident status"), { status: 400 });
    const allowed = { open: ["investigating", "mitigated", "resolved", "closed"], investigating: ["mitigated", "resolved", "closed"], mitigated: ["investigating", "resolved", "closed"], resolved: ["closed"], closed: [] };
    if (!allowed[current.status]?.includes(body.status)) throw Object.assign(new Error(`Cannot move incident from ${current.status} to ${body.status}`), { status: 409 });
    patch.status = body.status;
    if (body.status === "resolved") patch.resolvedAt = new Date().toISOString();
    if (body.status === "closed") patch.closedAt = new Date().toISOString();
  }
  const updated = await update("incidents", id, patch);
  await logAuditEvent({ action: "ecp_incident_updated", actor: actorId, target: id, targetModel: "Incident", targetName: updated.title, oldValue: current, newValue: updated, ipAddress: req?.ip, userAgent: req?.get("user-agent"), requestId: req?.id, details: { changes: Object.keys(patch) }, severity: "warning" });
  return updated;
}

export async function deleteIncidentRecord(id, actorId, req) {
  const current = await getIncident(id);
  if (current.status !== "closed") throw Object.assign(new Error("Only closed incidents can be deleted"), { status: 409 });
  const { error } = await getSupabase().from("incidents").delete().eq("id", id);
  if (error) throw error;
  await logAuditEvent({ action: "ecp_incident_deleted", actor: actorId, target: id, targetModel: "Incident", targetName: current.title, oldValue: current, ipAddress: req?.ip, userAgent: req?.get("user-agent"), requestId: req?.id, severity: "critical" });
  return { id, deleted: true };
}

export async function getAlerts(filters = {}) { return findAll("alerts", { filters, orderBy: "createdAt", ascending: false, limit: 200 }); }
export async function createAlertRecord(body, actorId, req) {
  const title = text(body.title, 180), message = text(body.message, 2000), severity = body.severity || "medium";
  if (title.length < 3 || message.length < 3 || !ALERT_SEVERITIES.includes(severity)) throw Object.assign(new Error("Valid title, message and severity are required"), { status: 400 });
  const row = await create("alerts", { title, message, severity, status: "open", service: text(body.service, 80) || null, source: text(body.source, 80) || "manual", metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {}, createdBy: actorId });
  await logAuditEvent({ action: "ecp_alert_created", actor: actorId, target: row.id, targetModel: "Alert", targetName: title, newValue: row, ipAddress: req?.ip, userAgent: req?.get("user-agent"), requestId: req?.id, severity: severity === "critical" ? "critical" : "warning" });
  return row;
}

async function transitionAlert(id, status, actorId, req) {
  const current = await findById("alerts", id); if (!current) throw Object.assign(new Error("Alert not found"), { status: 404 });
  if (!ALERT_STATUSES.includes(status)) throw Object.assign(new Error("Invalid alert status"), { status: 400 });
  const allowed = { open: ["acknowledged", "resolved"], acknowledged: ["resolved"], resolved: [] };
  if (!allowed[current.status]?.includes(status)) throw Object.assign(new Error(`Cannot move alert from ${current.status} to ${status}`), { status: 409 });
  const patch = { status };
  if (status === "acknowledged") { patch.acknowledgedAt = new Date().toISOString(); patch.acknowledgedBy = actorId; }
  if (status === "resolved") { patch.resolvedAt = new Date().toISOString(); patch.resolvedBy = actorId; }
  const updated = await update("alerts", id, patch);
  await logAuditEvent({ action: `ecp_alert_${status}`, actor: actorId, target: id, targetModel: "Alert", targetName: current.title, oldValue: current, newValue: updated, ipAddress: req?.ip, userAgent: req?.get("user-agent"), requestId: req?.id, severity: "warning" });
  return updated;
}
export const acknowledgeAlert = (id, actorId, req) => transitionAlert(id, "acknowledged", actorId, req);
export const resolveAlert = (id, actorId, req) => transitionAlert(id, "resolved", actorId, req);

export async function getSelfHealingActions() { return findAll("self_healing_actions", { orderBy: "createdAt", ascending: false, limit: 100 }); }
export async function getSelfHealingRules() { return SELF_HEAL_ACTIONS.map(action => ({ action, enabled: true, requiresAdmin: true, reversible: false })); }
export async function executeSelfHealing(action, actorId, req) {
  const actionType = text(action.actionType, 60);
  if (!SELF_HEAL_ACTIONS.includes(actionType)) throw Object.assign(new Error("Unsupported self-healing action"), { status: 400 });
  if (!action.targetId) throw Object.assign(new Error("targetId is required"), { status: 400 });
  const started = new Date().toISOString();
  let result;
  if (actionType === "acknowledge_alert") result = await acknowledgeAlert(action.targetId, actorId, req);
  if (actionType === "resolve_alert") result = await resolveAlert(action.targetId, actorId, req);
  if (actionType === "mitigate_incident") result = await updateIncidentRecord(action.targetId, { status: "mitigated" }, actorId, req);
  const row = await create("self_healing_actions", { actionType, targetId: action.targetId, requestedBy: actorId, status: "completed", startedAt: started, completedAt: new Date().toISOString(), result: { id: result.id, status: result.status } });
  return { success: true, data: row };
}

export async function getBusinessHealth() {
  const [activeUsers, activeDealers, vehiclesListed, liveAuctions, revenueRows, incidents] = await Promise.all([
    count("users", { isBanned: false, deactivatedAt: null }), count("users", { role: "dealer", isBanned: false, deactivatedAt: null }), count("cars", { status: "available", deletedAt: null }), count("cars", { hasAuction: true, auctionStatus: "active", deletedAt: null }), findAll("payments", { filters: { status: "success", createdAt: { $gte: since(1) } }, limit: 500 }), count("incidents", { status: { $in: ["open", "investigating", "mitigated"] } })
  ]);
  return { success: true, data: { activeUsers, activeDealers, vehiclesListed, liveAuctions, revenueToday: revenueRows.reduce((s,p) => s + Number(p.amount || 0), 0), openIncidents: incidents } };
}

export async function getExecutiveDashboard() {
  const [health, business, alerts, incidents, security, performance] = await Promise.all([getSystemHealth(), getBusinessHealth(), getAlerts({ status: { $in: ["open", "acknowledged"] } }), getIncidents({ status: { $in: ["open", "investigating", "mitigated"] } }), getSecurityStatus(), getPerformanceMetrics()]);
  const healthScore = Math.round((health.data.summary.healthy / health.data.services.length) * 100);
  return { success: true, data: { overall: { healthScore, uptime: healthScore, riskLevel: incidents.length ? (incidents.some(i => i.severity === "critical") ? "critical" : "elevated") : "low" }, business: { ...business.data, activeUsers: business.data.activeUsers }, system: Object.fromEntries(health.data.services.map(s => [s.name, { status: s.status, latency: s.latency }])), security: security.data, performance: performance.data, openAlerts: alerts.length, openIncidents: incidents.length } };
}

export async function getPerformanceMetrics() {
  const start = Date.now(); await count("cars", { deletedAt: null }); const dbLatency = Date.now() - start;
  const failedJobs = await count("job_failures", { createdAt: { $gte: since(1) } }).catch(() => 0);
  return { success: true, data: { databaseLatencyMs: dbLatency, failedJobs24h: failedJobs, status: dbLatency < 500 ? "healthy" : "degraded", measuredAt: new Date().toISOString() } };
}
export async function getSecurityStatus() {
  const failedLogins = await count("security_logs", { action: "login_failed", createdAt: { $gte: since(1) } }).catch(() => 0);
  const criticalIncidents = await count("incidents", { severity: "critical", status: { $in: ["open", "investigating", "mitigated"] } });
  return { success: true, data: { status: criticalIncidents ? "attention_required" : "healthy", threatsDetected: criticalIncidents, failedLogins, measuredAt: new Date().toISOString() } };
}
export async function getCapacityPlanning() { const [users, cars, payments] = await Promise.all([count("users"), count("cars"), count("payments")]); return { success: true, data: { users, cars, payments, measuredAt: new Date().toISOString() } }; }
export async function getComplianceStatus() { const [openIncidents, unresolvedAlerts] = await Promise.all([count("incidents", { status: { $in: ["open", "investigating", "mitigated"] } }), count("alerts", { status: { $in: ["open", "acknowledged"] } })]); return { success: true, data: { status: openIncidents === 0 && unresolvedAlerts === 0 ? "healthy" : "attention_required", openIncidents, unresolvedAlerts } }; }
export async function getAuditLogs(filters = {}) { return findAll("audit_logs", { filters, orderBy: "createdAt", ascending: false, limit: 200 }); }
export async function getDeployments() { return findAll("events", { filters: { type: "deployment" }, orderBy: "createdAt", ascending: false, limit: 50 }).catch(() => []); }
export async function getDisasterRecovery() { const latest = await findAll("health_checks", { orderBy: "checkedAt", ascending: false, limit: 20 }); return { success: true, data: { status: "manual_verification_required", latestHealthChecks: latest, lastVerifiedAt: latest[0]?.checkedAt || null } }; }
export async function getRootCauseAnalysis(id) { const incident = await getIncident(id); const alerts = await getAlerts({ service: incident.service, createdAt: { $gte: incident.createdAt } }); return { success: true, data: { incident, relatedAlerts: alerts.slice(0, 20), hypotheses: alerts.length ? ["Review correlated alerts and service health around incident creation time."] : ["No correlated alert evidence recorded; collect service telemetry before assigning a root cause."], confidence: alerts.length ? "medium" : "low" } }; }
export async function askOperationsQuestion(question) { const q = text(question, 500); if (q.length < 3) throw Object.assign(new Error("Question is required"), { status: 400 }); const [incidents, alerts, health] = await Promise.all([getIncidents({ status: { $in: ["open", "investigating", "mitigated"] } }), getAlerts({ status: { $in: ["open", "acknowledged"] } }), getSystemHealth()]); return { success: true, data: { question: q, answer: `Current operations show ${incidents.length} active incidents, ${alerts.length} active alerts, and ${health.data.summary.degraded} degraded services. Use the incident and alert records as the evidence base for the next action.`, evidence: { activeIncidents: incidents.length, activeAlerts: alerts.length, degradedServices: health.data.summary.degraded } } }; }
