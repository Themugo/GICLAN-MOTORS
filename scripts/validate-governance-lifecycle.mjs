import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const controller = fs.readFileSync(path.join(root, 'backend/controllers/governanceController.js'), 'utf8');
const routes = fs.readFileSync(path.join(root, 'backend/routes/governanceRoutes.js'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260907240000_governance_domain.sql'), 'utf8');
const api = fs.readFileSync(path.join(root, 'src/services/governanceApi.js'), 'utf8');
const checks = [];
const check = (name, ok) => { checks.push({ name, ok: Boolean(ok) }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); };

const expectedTables = [
  'governance_policies','change_requests','approval_rules','feature_lifecycles',
  'risk_assessments','enterprise_standards','country_rules','partner_requirements',
  'releases','decision_registers',
];
for (const table of expectedTables) check(`authoritative migration defines ${table}`, new RegExp(`create table if not exists ${table}\\b`, 'i').test(migration));

const functions = [
  'getGovernanceDashboard','getPolicies','getPolicy','createPolicy','updatePolicy',
  'getChangeRequests','getChangeRequest','createChangeRequest','submitForApproval',
  'approveChangeRequest','rejectChangeRequest','getApprovalRules','createApprovalRule',
  'updateApprovalRule','getFeatureLifecycles','createFeatureLifecycle','updateFeatureStage',
  'getRisks','createRisk','updateRiskStatus','getStandards','createStandard',
  'getCountryRules','createCountryRule','getPartnerRequirements','createPartnerRequirement',
  'getReleases','createRelease','updateReleaseStatus','getDecisions','createDecision',
  'getAuditLogs','getComplianceDashboard','getGovernanceHelp','getGovernanceReport',
];
for (const fn of functions) check(`controller exports ${fn}`, new RegExp(`export async function ${fn}\\b`).test(controller));
check('legacy governance 501 boundary removed', !controller.includes('GOVERNANCE_NOT_CONFIGURED') && !controller.includes('status(501)'));
check('dashboard derives summary from canonical governance tables', controller.includes('governance_migration_tables'));
check('compliance score is derived from stored governance records', controller.includes('derived_governance_records'));
check('change approval enforces submitted state', controller.includes('Only submitted changes can be approved.'));
check('change rejection requires a reason', controller.includes('A rejection reason is required.'));
check('governance routes retain authentication boundary', routes.includes('router.use(protect)'));
check('governance mutations retain role gates', routes.includes('allowRoles("admin", "superadmin")'));
check('frontend dashboard API remains wired', api.includes("/governance/dashboard"));

const passed = checks.filter((x) => x.ok).length;
console.log(`\nGovernance lifecycle validation: ${passed}/${checks.length} checks passed.`);
if (passed !== checks.length) process.exit(1);
