import { createModel } from "../models/_base.js";
import AuditLog from "../models/AuditLog.js";

const models = {
  policies: createModel("GovernancePolicy"),
  changes: createModel("ChangeRequest"),
  approvals: createModel("ApprovalRule"),
  features: createModel("FeatureLifecycle"),
  risks: createModel("RiskAssessment"),
  standards: createModel("EnterpriseStandard"),
  countries: createModel("CountryRule"),
  partners: createModel("PartnerRequirement"),
  releases: createModel("Release"),
  decisions: createModel("DecisionRegister"),
};

const FEATURE_STAGES = ["proposed", "idea", "planning", "development", "testing", "uat", "approved", "pilot", "production", "deprecated", "retired"];
const CHANGE_STATES = ["draft", "pending", "approved", "rejected", "implemented", "cancelled"];
const RISK_SEVERITIES = ["low", "medium", "high", "critical"];
const RISK_STATUSES = ["open", "mitigating", "accepted", "resolved", "closed"];
const RELEASE_STATES = ["planned", "approved", "scheduled", "deployed", "rolled_back", "cancelled"];

function badRequest(res, message) {
  return res.status(400).json({ success: false, error: message });
}

function notFound(res, domain = "Governance record") {
  return res.status(404).json({ success: false, error: `${domain} not found` });
}

function cleanText(value, max = 5000) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text ? text.slice(0, max) : undefined;
}

function actorFields(req) {
  return {
    created_by: req.user?.id || null,
    updated_by: req.user?.id || null,
  };
}

async function audit(req, action, entityType, entityId, details = {}) {
  try {
    await AuditLog.create({
      action,
      actor: req.user?.id,
      actorRole: req.user?.role,
      actorName: req.user?.name,
      target: entityId,
      targetModel: entityType,
      details,
    });
  } catch (error) {
    console.error("Governance audit write failed:", error?.message || error);
  }
}

async function list(model, req, defaultLimit = 100) {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || defaultLimit, 1), 200);
  const query = {};
  for (const key of ["status", "stage", "severity", "countryCode", "partnerType", "active"]) {
    if (req.query[key] !== undefined) query[key] = req.query[key];
  }
  return model.find(query).sort({ createdAt: -1 }).limit(limit);
}

function sendData(res, data, extra = {}) {
  return res.json({ success: true, data, ...extra });
}

export async function getGovernanceDashboard(req, res) {
  const [policies, changes, approvals, risks, releases, features, decisions] = await Promise.all([
    models.policies.find({}), models.changes.find({}), models.approvals.find({ active: true }),
    models.risks.find({}), models.releases.find({}), models.features.find({}), models.decisions.find({}),
  ]);
  const activePolicies = policies.filter((x) => x.status === "active").length;
  const pendingChanges = changes.filter((x) => ["draft", "pending"].includes(x.status)).length;
  const pendingApprovals = changes.filter((x) => x.status === "pending").length;
  const openRisks = risks.filter((x) => !["resolved", "closed"].includes(x.status)).length;
  const upcomingReleases = releases.filter((x) => ["planned", "approved", "scheduled"].includes(x.status)).length;
  const critical = risks.filter((x) => x.severity === "critical" && !["resolved", "closed"].includes(x.status)).length;
  const high = risks.filter((x) => x.severity === "high" && !["resolved", "closed"].includes(x.status)).length;
  const medium = risks.filter((x) => x.severity === "medium" && !["resolved", "closed"].includes(x.status)).length;
  const low = risks.filter((x) => x.severity === "low" && !["resolved", "closed"].includes(x.status)).length;
  const complianceScore = Math.max(0, Math.min(100, Math.round(100 - critical * 12 - high * 6 - medium * 2 - Math.max(0, pendingChanges - 5))));
  const pendingApprovalItems = changes.filter((x) => x.status === "pending").slice(0, 10).map((x) => ({
    id: x.id, name: x.title, type: "change", requestedBy: x.submittedBy || x.createdBy || "unknown", riskLevel: x.riskLevel || "medium",
  }));
  return sendData(res, {
    summary: { activePolicies, pendingChanges, pendingApprovals, openRisks, upcomingReleases, complianceScore },
    riskOverview: { critical, high, medium, low },
    pendingApprovals: pendingApprovalItems,
    totals: { policies: policies.length, changes: changes.length, approvals: approvals.length, risks: risks.length, releases: releases.length, features: features.length, decisions: decisions.length },
  });
}

export async function getPolicies(req, res) { return sendData(res, await list(models.policies, req)); }
export async function getPolicy(req, res) { const row = await models.policies.findById(req.params.id); return row ? sendData(res, row) : notFound(res, "Policy"); }
export async function createPolicy(req, res) {
  const name = cleanText(req.body?.name, 200), description = cleanText(req.body?.description);
  if (!name || !description) return badRequest(res, "Policy name and description are required");
  const row = await models.policies.create({ name, description, status: req.body.status || "draft", version: Number(req.body.version) || 1, effectiveAt: req.body.effectiveAt || null, ...actorFields(req) });
  await audit(req, "governance_policy_created", "GovernancePolicy", row.id, { name });
  return res.status(201).json({ success: true, data: row });
}
export async function updatePolicy(req, res) {
  const current = await models.policies.findById(req.params.id); if (!current) return notFound(res, "Policy");
  const patch = {};
  for (const key of ["name", "description", "status", "effectiveAt"]) if (req.body?.[key] !== undefined) patch[key] = cleanText(req.body[key], key === "description" ? 5000 : 500);
  if (req.body?.version !== undefined) patch.version = Math.max(1, Number(req.body.version) || current.version || 1);
  patch.updatedBy = req.user?.id || null;
  const row = await models.policies.findByIdAndUpdate(req.params.id, { $set: patch }, { new: true });
  await audit(req, "governance_policy_updated", "GovernancePolicy", row.id, { changes: Object.keys(patch) });
  return sendData(res, row);
}

export async function getChangeRequests(req, res) { return sendData(res, await list(models.changes, req)); }
export async function getChangeRequest(req, res) { const row = await models.changes.findById(req.params.id); return row ? sendData(res, row) : notFound(res, "Change request"); }
export async function createChangeRequest(req, res) {
  const title = cleanText(req.body?.title, 250), description = cleanText(req.body?.description);
  if (!title || !description) return badRequest(res, "Change title and description are required");
  const row = await models.changes.create({ title, description, status: "draft", createdBy: req.user?.id, updatedBy: req.user?.id });
  await audit(req, "governance_change_created", "ChangeRequest", row.id, { title });
  return res.status(201).json({ success: true, data: row });
}
export async function submitForApproval(req, res) {
  const row = await models.changes.findOneAndUpdate({ id: req.params.id, status: "draft" }, { $set: { status: "pending", submittedBy: req.user?.id, submittedAt: new Date(), updatedBy: req.user?.id } }, { new: true });
  if (!row) return badRequest(res, "Only draft change requests can be submitted");
  await audit(req, "governance_change_submitted", "ChangeRequest", row.id);
  return sendData(res, row);
}
export async function approveChangeRequest(req, res) {
  const row = await models.changes.findOneAndUpdate({ id: req.params.id, status: "pending" }, { $set: { status: "approved", reviewedBy: req.user?.id, reviewedAt: new Date(), reviewComments: cleanText(req.body?.comments, 5000), updatedBy: req.user?.id } }, { new: true });
  if (!row) return badRequest(res, "Only pending change requests can be approved");
  await audit(req, "governance_change_approved", "ChangeRequest", row.id, { comments: req.body?.comments });
  return sendData(res, row);
}
export async function rejectChangeRequest(req, res) {
  const reason = cleanText(req.body?.reason, 1000); if (!reason) return badRequest(res, "A rejection reason is required");
  const row = await models.changes.findOneAndUpdate({ id: req.params.id, status: "pending" }, { $set: { status: "rejected", reviewedBy: req.user?.id, reviewedAt: new Date(), rejectionReason: reason, reviewComments: cleanText(req.body?.comments, 5000), updatedBy: req.user?.id } }, { new: true });
  if (!row) return badRequest(res, "Only pending change requests can be rejected");
  await audit(req, "governance_change_rejected", "ChangeRequest", row.id, { reason });
  return sendData(res, row);
}

export async function getApprovalRules(req, res) { return sendData(res, await list(models.approvals, req)); }
export async function createApprovalRule(req, res) {
  const name = cleanText(req.body?.name, 200); if (!name) return badRequest(res, "Approval rule name is required");
  const row = await models.approvals.create({ name, requiredRole: cleanText(req.body?.requiredRole, 100) || null, threshold: req.body?.threshold == null ? null : Number(req.body.threshold), active: req.body?.active !== false, ...actorFields(req) });
  await audit(req, "governance_approval_rule_created", "ApprovalRule", row.id, { name }); return res.status(201).json({ success: true, data: row });
}
export async function updateApprovalRule(req, res) {
  const current = await models.approvals.findById(req.params.id); if (!current) return notFound(res, "Approval rule");
  const patch = {}; for (const key of ["name", "requiredRole", "active", "threshold"]) if (req.body?.[key] !== undefined) patch[key] = key === "threshold" ? Number(req.body[key]) : req.body[key];
  patch.updatedBy = req.user?.id || null; const row = await models.approvals.findByIdAndUpdate(req.params.id, { $set: patch }, { new: true });
  await audit(req, "governance_approval_rule_updated", "ApprovalRule", row.id, { changes: Object.keys(patch) }); return sendData(res, row);
}

export async function getFeatureLifecycles(req, res) { return sendData(res, await list(models.features, req)); }
export async function createFeatureLifecycle(req, res) {
  const name = cleanText(req.body?.name, 200); if (!name) return badRequest(res, "Feature name is required");
  const stage = req.body?.stage || "proposed"; if (!FEATURE_STAGES.includes(stage)) return badRequest(res, "Invalid feature lifecycle stage");
  const row = await models.features.create({ name, stage, stageComments: cleanText(req.body?.comments, 2000) || null, ownerId: req.body?.ownerId || null, ...actorFields(req) });
  await audit(req, "governance_feature_created", "FeatureLifecycle", row.id, { name, stage }); return res.status(201).json({ success: true, data: row });
}
export async function updateFeatureStage(req, res) {
  const current = await models.features.findById(req.params.id); if (!current) return notFound(res, "Feature lifecycle");
  const stage = req.body?.stage; if (!FEATURE_STAGES.includes(stage)) return badRequest(res, "Invalid feature lifecycle stage");
  const row = await models.features.findOneAndUpdate({ id: req.params.id, stage: current.stage }, { $set: { stage, stageComments: cleanText(req.body?.comments, 2000) || null, updatedBy: req.user?.id } }, { new: true });
  await audit(req, "governance_feature_stage_changed", "FeatureLifecycle", row.id, { from: current.stage, to: stage }); return sendData(res, row);
}

export async function getRisks(req, res) { return sendData(res, await list(models.risks, req)); }
export async function createRisk(req, res) {
  const title = cleanText(req.body?.title, 250), severity = req.body?.severity || req.body?.level;
  if (!title || !RISK_SEVERITIES.includes(severity)) return badRequest(res, "Risk title and valid severity are required");
  const row = await models.risks.create({ title, description: cleanText(req.body?.description, 5000) || null, severity, likelihood: cleanText(req.body?.likelihood, 50) || null, status: "open", ownerId: req.body?.ownerId || null, mitigation: cleanText(req.body?.mitigation, 5000) || null, ...actorFields(req) });
  await audit(req, "governance_risk_created", "RiskAssessment", row.id, { title, severity }); return res.status(201).json({ success: true, data: row });
}
export async function updateRiskStatus(req, res) {
  const status = req.body?.status; if (!RISK_STATUSES.includes(status)) return badRequest(res, "Invalid risk status");
  const current = await models.risks.findById(req.params.id); if (!current) return notFound(res, "Risk");
  const row = await models.risks.findOneAndUpdate({ id: req.params.id, status: current.status }, { $set: { status, mitigation: cleanText(req.body?.mitigation, 5000) || current.mitigation, updatedBy: req.user?.id } }, { new: true });
  await audit(req, "governance_risk_status_changed", "RiskAssessment", row.id, { from: current.status, to: status }); return sendData(res, row);
}

export async function getStandards(req, res) { return sendData(res, await list(models.standards, req)); }
export async function createStandard(req, res) {
  const name = cleanText(req.body?.name, 200); if (!name) return badRequest(res, "Standard name is required");
  const row = await models.standards.create({ name, description: cleanText(req.body?.description, 5000) || null, status: req.body?.status || "draft", version: cleanText(req.body?.version, 50) || "1.0", ownerId: req.body?.ownerId || null, ...actorFields(req) });
  await audit(req, "governance_standard_created", "EnterpriseStandard", row.id, { name }); return res.status(201).json({ success: true, data: row });
}

export async function getCountryRules(req, res) { return sendData(res, await list(models.countries, req)); }
export async function createCountryRule(req, res) {
  const countryCode = cleanText(req.body?.countryCode, 3)?.toUpperCase(), name = cleanText(req.body?.name, 200);
  if (!countryCode || !/^[A-Z]{2,3}$/.test(countryCode) || !name) return badRequest(res, "Country code and rule name are required");
  const row = await models.countries.create({ countryCode, name, ruleType: cleanText(req.body?.ruleType, 100) || null, ruleValue: req.body?.ruleValue || {}, status: req.body?.status || "active", ...actorFields(req) });
  await audit(req, "governance_country_rule_created", "CountryRule", row.id, { countryCode, name }); return res.status(201).json({ success: true, data: row });
}

export async function getPartnerRequirements(req, res) { return sendData(res, await list(models.partners, req)); }
export async function createPartnerRequirement(req, res) {
  const partnerType = cleanText(req.body?.partnerType, 100), name = cleanText(req.body?.name, 200); if (!partnerType || !name) return badRequest(res, "Partner type and requirement name are required");
  const row = await models.partners.create({ partnerType, name, description: cleanText(req.body?.description, 5000) || null, required: req.body?.required !== false, status: req.body?.status || "active", ...actorFields(req) });
  await audit(req, "governance_partner_requirement_created", "PartnerRequirement", row.id, { partnerType, name }); return res.status(201).json({ success: true, data: row });
}

export async function getReleases(req, res) { return sendData(res, await list(models.releases, req)); }
export async function createRelease(req, res) {
  const name = cleanText(req.body?.name, 200), version = cleanText(req.body?.version, 100); if (!name) return badRequest(res, "Release name is required");
  const row = await models.releases.create({ name, version: version || null, description: cleanText(req.body?.description, 5000) || null, status: "planned", plannedAt: req.body?.plannedAt || null, ownerId: req.body?.ownerId || null, ...actorFields(req) });
  await audit(req, "governance_release_created", "Release", row.id, { name, version }); return res.status(201).json({ success: true, data: row });
}
export async function updateReleaseStatus(req, res) {
  const status = req.body?.status; if (!RELEASE_STATES.includes(status)) return badRequest(res, "Invalid release status");
  const current = await models.releases.findById(req.params.id); if (!current) return notFound(res, "Release");
  const patch = { status, updatedBy: req.user?.id }; if (status === "deployed") patch.releasedAt = new Date();
  const row = await models.releases.findOneAndUpdate({ id: req.params.id, status: current.status }, { $set: patch }, { new: true });
  await audit(req, "governance_release_status_changed", "Release", row.id, { from: current.status, to: status }); return sendData(res, row);
}

export async function getDecisions(req, res) { return sendData(res, await list(models.decisions, req)); }
export async function createDecision(req, res) {
  const title = cleanText(req.body?.title, 250), decision = cleanText(req.body?.decision, 5000); if (!title || !decision) return badRequest(res, "Decision title and decision are required");
  const row = await models.decisions.create({ title, context: cleanText(req.body?.context, 5000) || null, decision, rationale: cleanText(req.body?.rationale, 5000) || null, status: "active", decidedBy: req.user?.id, decidedAt: new Date(), ...actorFields(req) });
  await audit(req, "governance_decision_created", "DecisionRegister", row.id, { title }); return res.status(201).json({ success: true, data: row });
}

export async function getAuditLogs(req, res) {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 200);
  return sendData(res, await AuditLog.find({}).sort({ createdAt: -1 }).limit(limit));
}

export async function getComplianceDashboard(req, res) {
  const [policies, changes, risks, standards, releases] = await Promise.all([
    models.policies.find({}), models.changes.find({}), models.risks.find({}), models.standards.find({}), models.releases.find({}),
  ]);
  const policyCompliance = policies.length ? Math.round((policies.filter((x) => x.status === "active").length / policies.length) * 100) : 100;
  const approvalCompliance = changes.length ? Math.round((changes.filter((x) => ["approved", "implemented", "cancelled"].includes(x.status)).length / changes.length) * 100) : 100;
  const openHighRisk = risks.filter((x) => ["high", "critical"].includes(x.severity) && !["resolved", "closed"].includes(x.status)).length;
  const standardCoverage = standards.length ? Math.round((standards.filter((x) => ["active", "approved"].includes(x.status)).length / standards.length) * 100) : 100;
  const releaseDiscipline = releases.length ? Math.round((releases.filter((x) => ["deployed", "cancelled", "rolled_back"].includes(x.status)).length / releases.length) * 100) : 100;
  const overall = Math.max(0, Math.min(100, Math.round((policyCompliance + approvalCompliance + standardCoverage + releaseDiscipline) / 4 - openHighRisk * 3)));
  return sendData(res, {
    overall: { score: overall },
    metrics: {
      policyCompliance: { score: policyCompliance, total: policies.length },
      approvalCompliance: { score: approvalCompliance, total: changes.length },
      standardCoverage: { score: standardCoverage, total: standards.length },
      releaseDiscipline: { score: releaseDiscipline, total: releases.length },
      auditFindings: { open: openHighRisk, resolved: risks.filter((x) => ["resolved", "closed"].includes(x.status)).length },
    },
    upcomingReviews: policies.filter((x) => x.effectiveAt).slice(0, 10).map((x) => ({ policy: x.name, reviewDate: x.effectiveAt })),
  });
}

export async function getGovernanceHelp(req, res) {
  const question = cleanText(req.body?.question, 1000); if (!question) return badRequest(res, "Question is required");
  const q = question.toLowerCase();
  let answer = "Use Governance Studio to manage policies, controlled changes, risks, releases and decision records. All write actions are role-protected and audited.";
  let steps = ["Create the required governance record.", "Submit controlled changes for approval when applicable.", "Record the decision or status transition.", "Review the audit trail after the action."];
  if (q.includes("approve") || q.includes("policy")) answer = "Policies are created as drafts and can be activated by an administrator after review. Change requests use a separate submit → approve/reject lifecycle.";
  else if (q.includes("risk")) answer = "Risks are classified as low, medium, high or critical and move through open, mitigating, accepted, resolved or closed states.";
  else if (q.includes("release") || q.includes("feature")) answer = "Use the feature lifecycle to track delivery through testing/UAT/approval/pilot/production, then govern releases separately through planned, approved, scheduled and deployed states.";
  else if (q.includes("change")) answer = "Create a change request in draft, submit it for approval, then an authorized reviewer can approve or reject it with an auditable comment or reason.";
  return sendData(res, { answer, steps, categories: [
    { name: "Policy", description: "Controlled rules and standards." },
    { name: "Change", description: "Auditable operational change approval." },
    { name: "Risk", description: "Risk identification, mitigation and closure." },
    { name: "Release", description: "Controlled production release lifecycle." },
  ] });
}

export async function getGovernanceReport(req, res) {
  const [dashboard, compliance, policies, changes, risks, releases, decisions] = await Promise.all([
    getGovernanceSnapshot(), getComplianceSnapshot(), models.policies.find({}), models.changes.find({}), models.risks.find({}), models.releases.find({}), models.decisions.find({}),
  ]);
  return sendData(res, { generatedAt: new Date().toISOString(), dashboard, compliance, policies, changes, risks, releases, decisions });
}

async function getGovernanceSnapshot() {
  const [policies, changes, approvals, risks, releases] = await Promise.all([models.policies.find({}), models.changes.find({}), models.approvals.find({ active: true }), models.risks.find({}), models.releases.find({})]);
  return {
    activePolicies: policies.filter((x) => x.status === "active").length,
    pendingChanges: changes.filter((x) => ["draft", "pending"].includes(x.status)).length,
    pendingApprovals: changes.filter((x) => x.status === "pending").length,
    activeApprovalRules: approvals.length,
    openRisks: risks.filter((x) => !["resolved", "closed"].includes(x.status)).length,
    upcomingReleases: releases.filter((x) => ["planned", "approved", "scheduled"].includes(x.status)).length,
  };
}

async function getComplianceSnapshot() {
  const [policies, changes, risks, standards, releases] = await Promise.all([models.policies.find({}), models.changes.find({}), models.risks.find({}), models.standards.find({}), models.releases.find({})]);
  const p = policies.length ? Math.round(policies.filter((x) => x.status === "active").length / policies.length * 100) : 100;
  const c = changes.length ? Math.round(changes.filter((x) => ["approved", "implemented", "cancelled"].includes(x.status)).length / changes.length * 100) : 100;
  const s = standards.length ? Math.round(standards.filter((x) => ["active", "approved"].includes(x.status)).length / standards.length * 100) : 100;
  const r = releases.length ? Math.round(releases.filter((x) => ["deployed", "cancelled", "rolled_back"].includes(x.status)).length / releases.length * 100) : 100;
  const penalty = risks.filter((x) => ["high", "critical"].includes(x.severity) && !["resolved", "closed"].includes(x.status)).length * 3;
  return { score: Math.max(0, Math.min(100, Math.round((p + c + s + r) / 4 - penalty))), policyCompliance: p, approvalCompliance: c, standardCoverage: s, releaseDiscipline: r };
}

export const GOVERNANCE_ENUMS = { FEATURE_STAGES, CHANGE_STATES, RISK_SEVERITIES, RISK_STATUSES, RELEASE_STATES };
