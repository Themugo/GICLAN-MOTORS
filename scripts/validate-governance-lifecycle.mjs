import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const pass = (name, ok, detail='') => checks.push({name, ok, detail});

const controller = read('backend/controllers/governanceController.js');
const routes = read('backend/routes/governanceRoutes.js');
const migration = fs.readdirSync(path.join(root,'supabase/migrations')).filter(x => x.includes('governance_lifecycle_hardening'));
const domain = read('supabase/migrations/20260907240000_governance_domain.sql');
const ui = read('src/pages/admin/governance/GovernanceStudio.jsx');
const api = read('src/services/governanceApi.js');

const requiredExports = [
  'getGovernanceDashboard','getPolicies','getPolicy','createPolicy','updatePolicy',
  'getChangeRequests','getChangeRequest','createChangeRequest','submitForApproval','approveChangeRequest','rejectChangeRequest',
  'getApprovalRules','createApprovalRule','updateApprovalRule','getFeatureLifecycles','createFeatureLifecycle','updateFeatureStage',
  'getRisks','createRisk','updateRiskStatus','getStandards','createStandard','getCountryRules','createCountryRule',
  'getPartnerRequirements','createPartnerRequirement','getReleases','createRelease','updateReleaseStatus','getDecisions','createDecision',
  'getAuditLogs','getComplianceDashboard','getGovernanceHelp','getGovernanceReport'
];
pass('All governance controller handlers implemented', requiredExports.every(x => new RegExp(`export async function ${x}\\b`).test(controller)));
pass('No governance 501 placeholder remains', !controller.includes('status(501)') && !controller.includes('GOVERNANCE_NOT_CONFIGURED'));
pass('Governance routes remain mounted', routes.includes('router.get("/dashboard"') && routes.includes('router.post("/changes/:id/submit"') && routes.includes('router.post("/changes/:id/approve"'));
pass('Authoritative governance migration exists', migration.length === 1);
for (const table of ['governance_policies','change_requests','approval_rules','feature_lifecycles','risk_assessments','enterprise_standards','country_rules','partner_requirements','releases','decision_registers']) pass(`Domain table: ${table}`, domain.includes(`create table if not exists ${table}`));
for (const fn of ['governance_touch_updated_at','governance_policies_status_check','change_requests_status_check','risk_assessments_severity_check','releases_status_check']) pass(`Governance integrity: ${fn}`, read(`supabase/migrations/${migration[0]}`).includes(fn));
pass('UI has no synthetic compliance fallback', !ui.includes('|| 96') && !ui.includes('|| 98') && !ui.includes('|| 94') && !ui.includes("reviewDate: '2024-03-01'"));
pass('Frontend governance API covers report/help/compliance', ['getGovernanceReport','getGovernanceHelp','getComplianceDashboard'].every(x => api.includes(x)));

let failed = 0;
for (const c of checks) { console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`); if (!c.ok) failed++; }
console.log(`\\nGovernance lifecycle validation: ${checks.length-failed}/${checks.length} passed`);
if (failed) process.exit(1);
