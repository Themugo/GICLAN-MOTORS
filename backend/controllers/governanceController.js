// KAYAD governance API boundary.
// Governance domain tables are not part of the authoritative Supabase migration
// chain yet. Never return invented policies, risks, compliance scores, releases,
// or decisions. The audit endpoint is backed by the canonical audit_logs table.

import AuditLog from "../models/AuditLog.js";

function notConfigured(res, domain = "Governance") {
  return res.status(501).json({
    success: false,
    error: `${domain} data is not configured in the authoritative database schema`,
    code: "GOVERNANCE_NOT_CONFIGURED",
  });
}

export async function getGovernanceDashboard(req, res) { return notConfigured(res); }
export async function getPolicies(req, res) { return notConfigured(res); }
export async function getPolicy(req, res) { return notConfigured(res); }
export async function createPolicy(req, res) { return notConfigured(res); }
export async function updatePolicy(req, res) { return notConfigured(res); }
export async function getChangeRequests(req, res) { return notConfigured(res); }
export async function getChangeRequest(req, res) { return notConfigured(res); }
export async function createChangeRequest(req, res) { return notConfigured(res); }
export async function submitForApproval(req, res) { return notConfigured(res); }
export async function approveChangeRequest(req, res) { return notConfigured(res); }
export async function rejectChangeRequest(req, res) { return notConfigured(res); }
export async function getApprovalRules(req, res) { return notConfigured(res); }
export async function createApprovalRule(req, res) { return notConfigured(res); }
export async function updateApprovalRule(req, res) { return notConfigured(res); }
export async function getFeatureLifecycles(req, res) { return notConfigured(res); }
export async function createFeatureLifecycle(req, res) { return notConfigured(res); }
export async function updateFeatureStage(req, res) { return notConfigured(res); }
export async function getRisks(req, res) { return notConfigured(res); }
export async function createRisk(req, res) { return notConfigured(res); }
export async function updateRiskStatus(req, res) { return notConfigured(res); }
export async function getStandards(req, res) { return notConfigured(res); }
export async function createStandard(req, res) { return notConfigured(res); }
export async function getCountryRules(req, res) { return notConfigured(res); }
export async function createCountryRule(req, res) { return notConfigured(res); }
export async function getPartnerRequirements(req, res) { return notConfigured(res); }
export async function createPartnerRequirement(req, res) { return notConfigured(res); }
export async function getReleases(req, res) { return notConfigured(res); }
export async function createRelease(req, res) { return notConfigured(res); }
export async function updateReleaseStatus(req, res) { return notConfigured(res); }
export async function getDecisions(req, res) { return notConfigured(res); }
export async function createDecision(req, res) { return notConfigured(res); }

export async function getAuditLogs(req, res) {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 200);
  const logs = await AuditLog.findAll({ limit });
  return res.json({ success: true, data: logs, source: "audit_logs" });
}

export async function getComplianceDashboard(req, res) { return notConfigured(res, "Compliance"); }
export async function getGovernanceHelp(req, res) { return notConfigured(res, "Governance assistance"); }
export async function getGovernanceReport(req, res) { return notConfigured(res, "Governance reports"); }
