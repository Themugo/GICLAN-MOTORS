// Canonical Governance & Compliance controller.
// All reads/writes below target tables that are part of the authoritative
// Supabase migration chain. No synthetic governance records or scores are
// returned when the database contains no corresponding evidence.

import { findAll, findById, create, update } from "../db/index.js";
import AuditLog from "../models/AuditLog.js";
import { logAuditEvent } from "../services/auditService.js";

const TABLES = {
  policies: "governance_policies",
  changes: "change_requests",
  approvals: "approval_rules",
  features: "feature_lifecycles",
  risks: "risk_assessments",
  standards: "enterprise_standards",
  countries: "country_rules",
  partners: "partner_requirements",
  releases: "releases",
  decisions: "decision_registers",
};

const asString = (value, max = 200) => String(value ?? "").trim().slice(0, max);
const asOptionalString = (value, max = 200) => {
  const result = asString(value, max);
  return result || null;
};
const asEnum = (value, allowed, fallback = null) => {
  const normalized = asString(value, 80);
  return allowed.includes(normalized) ? normalized : fallback;
};
const actor = (req) => ({
  actor: req.user?.id || null,
  actorRole: req.user?.role || null,
  actorName: req.user?.name || null,
  actorEmail: req.user?.email || null,
  ipAddress: req.ip,
  userAgent: req.get?.("user-agent"),
  requestId: req.id,
});

async function audit(req, action, target, details = {}) {
  try {
    await logAuditEvent({
      action,
      target,
      targetModel: "Governance",
      details,
      ...actor(req),
    });
  } catch {
    // Governance mutations must not be rolled back solely because an audit
    // side-channel is unavailable. The canonical row remains authoritative.
  }
}

async function listTable(table, req, options = {}) {
  const limit = Math.min(Math.max(Number.parseInt(req.query?.limit, 10) || options.defaultLimit || 100, 1), options.maxLimit || 200);
  const filters = options.filters ? options.filters(req) : undefined;
  return findAll(table, {
    filters,
    orderBy: options.orderBy || "createdAt",
    ascending: false,
    limit,
  });
}

async function requireBody(req, res, fields) {
  const missing = fields.filter((field) => !asString(req.body?.[field]));
  if (missing.length) {
    res.status(400).json({ success: false, code: "GOVERNANCE_VALIDATION_ERROR", message: `Missing required field(s): ${missing.join(", ")}` });
    return false;
  }
  return true;
}

const notFound = (res, label) => res.status(404).json({ success: false, code: "GOVERNANCE_RECORD_NOT_FOUND", message: `${label} not found` });
const invalid = (res, message) => res.status(400).json({ success: false, code: "GOVERNANCE_VALIDATION_ERROR", message });

async function getSummary() {
  const [policies, changes, approvals, features, risks, standards, countries, partners, releases, decisions] = await Promise.all([
    findAll(TABLES.policies, { limit: 500 }),
    findAll(TABLES.changes, { limit: 500 }),
    findAll(TABLES.approvals, { limit: 500 }),
    findAll(TABLES.features, { limit: 500 }),
    findAll(TABLES.risks, { limit: 500 }),
    findAll(TABLES.standards, { limit: 500 }),
    findAll(TABLES.countries, { limit: 500 }),
    findAll(TABLES.partners, { limit: 500 }),
    findAll(TABLES.releases, { limit: 500 }),
    findAll(TABLES.decisions, { limit: 500 }),
  ]);

  const activePolicies = policies.filter((x) => x.status === "active").length;
  const pendingChanges = changes.filter((x) => ["submitted", "under_review"].includes(x.status)).length;
  const pendingApprovals = changes.filter((x) => x.status === "submitted").length;
  const openRisks = risks.filter((x) => !["mitigated", "accepted", "closed"].includes(x.status)).length;
  const upcomingReleases = releases.filter((x) => ["planned", "scheduled"].includes(x.status)).length;

  const riskOverview = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const risk of risks) {
    if (!riskOverview[risk.severity]) continue;
    if (!["mitigated", "accepted", "closed"].includes(risk.status)) riskOverview[risk.severity] += 1;
  }

  const policyCoverage = policies.length ? activePolicies / policies.length : null;
  const standardCoverage = standards.length ? standards.filter((x) => x.status === "active").length / standards.length : null;
  const riskControl = risks.length ? risks.filter((x) => ["mitigated", "accepted", "closed"].includes(x.status)).length / risks.length : null;
  const changeControl = changes.length ? changes.filter((x) => ["approved", "rejected"].includes(x.status)).length / changes.length : null;
  const partnerCoverage = partners.length ? partners.filter((x) => x.status === "active").length / partners.length : null;
  const components = [policyCoverage, standardCoverage, riskControl, changeControl, partnerCoverage].filter((x) => x !== null);
  const complianceScore = components.length ? Math.round((components.reduce((sum, value) => sum + value, 0) / components.length) * 100) : null;

  return {
    summary: {
      activePolicies,
      pendingChanges,
      pendingApprovals,
      openRisks,
      upcomingReleases,
      complianceScore,
    },
    riskOverview,
    pendingApprovals: changes
      .filter((x) => x.status === "submitted")
      .slice(0, 20)
      .map((x) => ({ id: x.id, name: x.title, type: "change_request", requestedBy: x.submittedBy || x.createdBy || "Unknown", submittedAt: x.submittedAt || null })),
    counts: {
      policies: policies.length,
      changes: changes.length,
      approvals: approvals.length,
      features: features.length,
      risks: risks.length,
      standards: standards.length,
      countries: countries.length,
      partners: partners.length,
      releases: releases.length,
      decisions: decisions.length,
    },
  };
}

export async function getGovernanceDashboard(_req, res) {
  return res.json({ success: true, data: await getSummary(), source: "governance_migration_tables" });
}

// ── Policies ───────────────────────────────────────────────────
export async function getPolicies(req, res) {
  const data = await listTable(TABLES.policies, req, { orderBy: "updatedAt" });
  return res.json({ success: true, data, source: "governance_policies" });
}
export async function getPolicy(req, res) {
  const data = await findById(TABLES.policies, req.params.id);
  return data ? res.json({ success: true, data }) : notFound(res, "Policy");
}
export async function createPolicy(req, res) {
  if (!(await requireBody(req, res, ["name", "description"]))) return;
  const data = await create(TABLES.policies, {
    name: asString(req.body.name), description: asString(req.body.description, 5000),
    status: asEnum(req.body.status, ["draft", "active", "retired"], "draft"), version: Math.max(1, Number(req.body.version) || 1),
    effectiveAt: req.body.effectiveAt || null, createdBy: req.user.id, updatedBy: req.user.id,
  });
  await audit(req, "governance_policy_created", data.id, { name: data.name });
  return res.status(201).json({ success: true, data });
}
export async function updatePolicy(req, res) {
  const current = await findById(TABLES.policies, req.params.id);
  if (!current) return notFound(res, "Policy");
  const updates = { updatedBy: req.user.id };
  if (req.body?.name !== undefined) updates.name = asString(req.body.name);
  if (req.body?.description !== undefined) updates.description = asString(req.body.description, 5000);
  if (req.body?.status !== undefined) updates.status = asEnum(req.body.status, ["draft", "active", "retired"]);
  if (req.body?.version !== undefined) updates.version = Math.max(1, Number(req.body.version) || current.version || 1);
  if (req.body?.effectiveAt !== undefined) updates.effectiveAt = req.body.effectiveAt || null;
  const data = await update(TABLES.policies, req.params.id, updates);
  await audit(req, "governance_policy_updated", data.id, { oldStatus: current.status, newStatus: data.status });
  return res.json({ success: true, data });
}

// ── Change management ─────────────────────────────────────────
export async function getChangeRequests(req, res) {
  const data = await listTable(TABLES.changes, req, { orderBy: "updatedAt" });
  return res.json({ success: true, data, source: "change_requests" });
}
export async function getChangeRequest(req, res) {
  const data = await findById(TABLES.changes, req.params.id);
  return data ? res.json({ success: true, data }) : notFound(res, "Change request");
}
export async function createChangeRequest(req, res) {
  if (!(await requireBody(req, res, ["title", "description"]))) return;
  const data = await create(TABLES.changes, {
    title: asString(req.body.title), description: asString(req.body.description, 5000), status: "draft",
    createdBy: req.user.id, updatedBy: req.user.id,
  });
  await audit(req, "governance_change_created", data.id, { title: data.title });
  return res.status(201).json({ success: true, data });
}
export async function submitForApproval(req, res) {
  const current = await findById(TABLES.changes, req.params.id);
  if (!current) return notFound(res, "Change request");
  if (!["draft", "rejected"].includes(current.status)) return invalid(res, "Only draft or rejected changes can be submitted.");
  const data = await update(TABLES.changes, req.params.id, { status: "submitted", submittedBy: req.user.id, submittedAt: new Date().toISOString(), updatedBy: req.user.id });
  await audit(req, "governance_change_submitted", data.id);
  return res.json({ success: true, data });
}
export async function approveChangeRequest(req, res) {
  const current = await findById(TABLES.changes, req.params.id);
  if (!current) return notFound(res, "Change request");
  if (current.status !== "submitted") return invalid(res, "Only submitted changes can be approved.");
  const data = await update(TABLES.changes, req.params.id, { status: "approved", reviewedBy: req.user.id, reviewedAt: new Date().toISOString(), reviewComments: asOptionalString(req.body?.comments, 5000), updatedBy: req.user.id });
  await audit(req, "governance_change_approved", data.id, { comments: data.reviewComments });
  return res.json({ success: true, data });
}
export async function rejectChangeRequest(req, res) {
  const current = await findById(TABLES.changes, req.params.id);
  if (!current) return notFound(res, "Change request");
  if (current.status !== "submitted") return invalid(res, "Only submitted changes can be rejected.");
  const reason = asString(req.body?.reason, 1000);
  if (!reason) return invalid(res, "A rejection reason is required.");
  const data = await update(TABLES.changes, req.params.id, { status: "rejected", reviewedBy: req.user.id, reviewedAt: new Date().toISOString(), reviewComments: asOptionalString(req.body?.comments, 5000), rejectionReason: reason, updatedBy: req.user.id });
  await audit(req, "governance_change_rejected", data.id, { reason });
  return res.json({ success: true, data });
}

// ── Generic governance collections ────────────────────────────
export async function getApprovalRules(req, res) { return res.json({ success: true, data: await listTable(TABLES.approvals, req, { orderBy: "updatedAt" }), source: TABLES.approvals }); }
export async function createApprovalRule(req, res) {
  if (!(await requireBody(req, res, ["name"]))) return;
  const data = await create(TABLES.approvals, { name: asString(req.body.name), requiredRole: asOptionalString(req.body.requiredRole, 80), threshold: req.body.threshold === undefined ? null : Math.max(0, Number(req.body.threshold) || 0), active: req.body.active !== false, createdBy: req.user.id, updatedBy: req.user.id });
  await audit(req, "governance_approval_rule_created", data.id);
  return res.status(201).json({ success: true, data });
}
export async function updateApprovalRule(req, res) {
  const current = await findById(TABLES.approvals, req.params.id); if (!current) return notFound(res, "Approval rule");
  const updates = { updatedBy: req.user.id };
  if (req.body?.name !== undefined) updates.name = asString(req.body.name);
  if (req.body?.requiredRole !== undefined) updates.requiredRole = asOptionalString(req.body.requiredRole, 80);
  if (req.body?.threshold !== undefined) updates.threshold = Math.max(0, Number(req.body.threshold) || 0);
  if (req.body?.active !== undefined) updates.active = Boolean(req.body.active);
  return res.json({ success: true, data: await update(TABLES.approvals, current.id, updates) });
}

export async function getFeatureLifecycles(req, res) { return res.json({ success: true, data: await listTable(TABLES.features, req, { orderBy: "updatedAt" }), source: TABLES.features }); }
export async function createFeatureLifecycle(req, res) { if (!(await requireBody(req, res, ["name"]))) return; const data = await create(TABLES.features, { name: asString(req.body.name), stage: asEnum(req.body.stage, ["proposed","planning","development","testing","uat","approved","pilot","production","deprecated","retired"], "proposed"), stageComments: asOptionalString(req.body.stageComments, 5000), ownerId: req.body.ownerId || null, createdBy: req.user.id, updatedBy: req.user.id }); await audit(req, "governance_feature_created", data.id); return res.status(201).json({ success: true, data }); }
export async function updateFeatureStage(req, res) { const current = await findById(TABLES.features, req.params.id); if (!current) return notFound(res, "Feature lifecycle"); const stage = asEnum(req.body?.stage, ["proposed","planning","development","testing","uat","approved","pilot","production","deprecated","retired"]); if (!stage) return invalid(res, "Invalid feature lifecycle stage."); const data = await update(TABLES.features, current.id, { stage, stageComments: asOptionalString(req.body?.comments, 5000), updatedBy: req.user.id }); await audit(req, "governance_feature_stage_changed", data.id, { from: current.stage, to: stage }); return res.json({ success: true, data }); }

export async function getRisks(req, res) { return res.json({ success: true, data: await listTable(TABLES.risks, req, { orderBy: "updatedAt" }), source: TABLES.risks }); }
export async function createRisk(req, res) { if (!(await requireBody(req, res, ["title","severity"]))) return; const severity = asEnum(req.body.severity, ["critical","high","medium","low"]); if (!severity) return invalid(res, "Invalid risk severity."); const data = await create(TABLES.risks, { title: asString(req.body.title), description: asOptionalString(req.body.description, 5000), severity, likelihood: asOptionalString(req.body.likelihood, 40), status: asEnum(req.body.status, ["open","mitigated","accepted","closed"], "open"), ownerId: req.body.ownerId || null, mitigation: asOptionalString(req.body.mitigation, 5000), createdBy: req.user.id, updatedBy: req.user.id }); await audit(req, "governance_risk_created", data.id, { severity }); return res.status(201).json({ success: true, data }); }
export async function updateRiskStatus(req, res) { const current = await findById(TABLES.risks, req.params.id); if (!current) return notFound(res, "Risk"); const status = asEnum(req.body?.status, ["open","mitigated","accepted","closed"]); if (!status) return invalid(res, "Invalid risk status."); const data = await update(TABLES.risks, current.id, { status, mitigation: req.body?.mitigation !== undefined ? asOptionalString(req.body.mitigation, 5000) : current.mitigation, updatedBy: req.user.id }); await audit(req, "governance_risk_status_changed", data.id, { from: current.status, to: status }); return res.json({ success: true, data }); }

export async function getStandards(req, res) { return res.json({ success: true, data: await listTable(TABLES.standards, req, { orderBy: "updatedAt" }), source: TABLES.standards }); }
export async function createStandard(req, res) { if (!(await requireBody(req, res, ["name"]))) return; const data = await create(TABLES.standards, { name: asString(req.body.name), description: asOptionalString(req.body.description, 5000), status: asEnum(req.body.status, ["draft","active","retired"], "draft"), version: asOptionalString(req.body.version, 40), ownerId: req.body.ownerId || null, createdBy: req.user.id, updatedBy: req.user.id }); await audit(req, "governance_standard_created", data.id); return res.status(201).json({ success: true, data }); }

export async function getCountryRules(req, res) { return res.json({ success: true, data: await listTable(TABLES.countries, req, { orderBy: "updatedAt" }), source: TABLES.countries }); }
export async function createCountryRule(req, res) { if (!(await requireBody(req, res, ["countryCode","name"]))) return; const countryCode = asString(req.body.countryCode, 8).toUpperCase(); if (!/^[A-Z]{2,3}$/.test(countryCode)) return invalid(res, "countryCode must be a 2-3 letter ISO-style code."); const data = await create(TABLES.countries, { countryCode, name: asString(req.body.name), ruleType: asOptionalString(req.body.ruleType, 80), ruleValue: req.body.ruleValue && typeof req.body.ruleValue === "object" && !Array.isArray(req.body.ruleValue) ? req.body.ruleValue : {}, status: asEnum(req.body.status, ["active","inactive"], "active"), createdBy: req.user.id, updatedBy: req.user.id }); await audit(req, "governance_country_rule_created", data.id, { countryCode }); return res.status(201).json({ success: true, data }); }

export async function getPartnerRequirements(req, res) { return res.json({ success: true, data: await listTable(TABLES.partners, req, { orderBy: "updatedAt" }), source: TABLES.partners }); }
export async function createPartnerRequirement(req, res) { if (!(await requireBody(req, res, ["partnerType","name"]))) return; const data = await create(TABLES.partners, { partnerType: asString(req.body.partnerType, 80), name: asString(req.body.name), description: asOptionalString(req.body.description, 5000), required: req.body.required !== false, status: asEnum(req.body.status, ["active","inactive"], "active"), createdBy: req.user.id, updatedBy: req.user.id }); await audit(req, "governance_partner_requirement_created", data.id); return res.status(201).json({ success: true, data }); }

export async function getReleases(req, res) { return res.json({ success: true, data: await listTable(TABLES.releases, req, { orderBy: "updatedAt" }), source: TABLES.releases }); }
export async function createRelease(req, res) { if (!(await requireBody(req, res, ["name"]))) return; const data = await create(TABLES.releases, { name: asString(req.body.name), version: asOptionalString(req.body.version, 40), description: asOptionalString(req.body.description, 5000), status: asEnum(req.body.status, ["planned","scheduled","released","cancelled"], "planned"), plannedAt: req.body.plannedAt || null, ownerId: req.body.ownerId || null, createdBy: req.user.id, updatedBy: req.user.id }); await audit(req, "governance_release_created", data.id); return res.status(201).json({ success: true, data }); }
export async function updateReleaseStatus(req, res) { const current = await findById(TABLES.releases, req.params.id); if (!current) return notFound(res, "Release"); const status = asEnum(req.body?.status, ["planned","scheduled","released","cancelled"]); if (!status) return invalid(res, "Invalid release status."); const updates = { status, updatedBy: req.user.id }; if (status === "released") updates.releasedAt = new Date().toISOString(); const data = await update(TABLES.releases, current.id, updates); await audit(req, "governance_release_status_changed", data.id, { from: current.status, to: status }); return res.json({ success: true, data }); }

export async function getDecisions(req, res) { return res.json({ success: true, data: await listTable(TABLES.decisions, req, { orderBy: "updatedAt" }), source: TABLES.decisions }); }
export async function createDecision(req, res) { if (!(await requireBody(req, res, ["title","decision"]))) return; const data = await create(TABLES.decisions, { title: asString(req.body.title), context: asOptionalString(req.body.context, 5000), decision: asString(req.body.decision, 5000), rationale: asOptionalString(req.body.rationale, 5000), status: asEnum(req.body.status, ["active","superseded"], "active"), decidedBy: req.body.decidedBy || req.user.id, decidedAt: req.body.decidedAt || new Date().toISOString(), createdBy: req.user.id, updatedBy: req.user.id }); await audit(req, "governance_decision_created", data.id); return res.status(201).json({ success: true, data }); }

export async function getAuditLogs(req, res) {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 200);
  const logs = await AuditLog.findAll({ limit });
  return res.json({ success: true, data: logs, source: "audit_logs" });
}

export async function getComplianceDashboard(req, res) {
  const summary = await getSummary();
  return res.json({ success: true, data: { score: summary.summary.complianceScore, riskOverview: summary.riskOverview, summary: summary.summary, source: "derived_governance_records" } });
}

export async function getGovernanceHelp(req, res) {
  const question = asString(req.body?.question, 1000);
  if (question.length < 3) return invalid(res, "A governance question is required.");
  const summary = await getSummary();
  const q = question.toLowerCase();
  let answer;
  if (q.includes("risk")) answer = { topic: "risk", openRisks: summary.summary.openRisks, riskOverview: summary.riskOverview };
  else if (q.includes("policy")) answer = { topic: "policy", activePolicies: summary.summary.activePolicies, totalPolicies: summary.counts.policies };
  else if (q.includes("change") || q.includes("approval")) answer = { topic: "change_control", pendingChanges: summary.summary.pendingChanges, pendingApprovals: summary.summary.pendingApprovals };
  else if (q.includes("release")) answer = { topic: "release", upcomingReleases: summary.summary.upcomingReleases };
  else if (q.includes("compliance")) answer = { topic: "compliance", score: summary.summary.complianceScore };
  else answer = { topic: "overview", summary: summary.summary };
  return res.json({ success: true, data: { question, answer, source: "derived_governance_records", generatedAt: new Date().toISOString() } });
}

export async function getGovernanceReport(req, res) {
  const summary = await getSummary();
  return res.json({ success: true, data: { generatedAt: new Date().toISOString(), summary: summary.summary, riskOverview: summary.riskOverview, counts: summary.counts, pendingApprovals: summary.pendingApprovals }, source: "derived_governance_records" });
}
