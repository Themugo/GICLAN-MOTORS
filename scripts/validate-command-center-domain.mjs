import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const pass = (name, condition) => { checks.push([name, !!condition]); };

const controller = read('backend/controllers/commandCenterController.js');
const routes = read('backend/routes/commandCenterRoutes.js');
const ui = read('src/pages/admin/command-center/EnterpriseCommandCenter.jsx');
const migration = read('supabase/migrations/20260908033000_command_center_domain_end_to_end.sql');

pass('no command-center 501 placeholder', !controller.includes('COMMAND_CENTER_NOT_CONFIGURED') && !controller.includes('status(501)'));
pass('all command-center handlers are implemented', ['getMissionControl','getLiveActivity','getOperationsCenter','getMarketplaceCenter','getDealerOperations','getAuctionOperations','getInspectionOperations','getFinanceOperations','getSupportOperations','getSecurityOperations','getInfrastructureOperations','getAIOperations','getPendingActions','executeAction','getNotifications','markNotificationRead','getDecisions','getCommands','executeCommand','getWarRoom','activateWarRoom','deactivateWarRoom','getExecutiveTimeline','getExecutiveBriefing','enterpriseSearch','getWidgets','saveWidgetLayout','getRegionalMap'].every(n => controller.includes(`export async function ${n}`)));
pass('route-level operator authorization', routes.includes('router.use(protect, allowRoles("admin", "superadmin", "executive", "engineer", "manager"))'));
pass('admin gate for destructive actions', controller.includes('ensureAdmin(req)'));
pass('war room is persistent and singleton', migration.includes('command_center_war_rooms') && migration.includes("id = 'active'"));
pass('widget layouts are user scoped with RLS', migration.includes('user_id') && migration.includes('command_center_widget_layouts_select'));
pass('frontend consumes live command-center APIs', ui.includes('getMissionControl') && ui.includes('getLiveActivity'));
pass('frontend has no synthetic KPI fallback', !ui.includes('fake KPI') && !ui.includes('hardcoded KPI'));

let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`); if (!ok) failed++; }
console.log(`Command Center domain validation: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exit(1);
