import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const pass = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const service = read('backend/services/leadService.js');
const timeline = read('backend/services/leadTimelineService.js');
const controller = read('backend/controllers/leadController.js');
const dealerController = read('backend/controllers/dealerPlatformController.js');
const migration = read('supabase/migrations/20260907200000_lead_crm_domain_end_to_end.sql');
const client = read('src/services/leadApi.ts');
const leadsTab = read('src/pages/dealer/components/DealerLeadsTab.jsx');
const leadModel = path.join(root, 'backend/models/Lead.js');
const activityModel = path.join(root, 'backend/models/LeadActivity.js');

pass('canonical lead service exists', service.includes('export const createLead'));
pass('canonical timeline service uses DB adapter', timeline.includes('findAll("lead_activities"') && timeline.includes('create("lead_activities"'));
pass('no LeadActivity model methods remain', !timeline.includes('LeadActivity.') && !service.includes('LeadActivity.'));
pass('obsolete lead model wrappers removed', !fs.existsSync(leadModel) && !fs.existsSync(activityModel));
pass('no Lead model methods remain in backend', !dealerController.includes('Lead.') && !service.includes('Lead.'));
pass('atomic lead creation RPC wired', service.includes('kayad_create_lead_atomic'));
pass('atomic stage transition RPC wired', service.includes('kayad_transition_lead_atomic'));
pass('stage transition records activity atomically', migration.includes("INSERT INTO lead_activities(lead,type,actor,actor_type,description,metadata)"));
pass('stage state machine is constrained', migration.includes("escrow_started' THEN p_new_stage IN ('sold','lost')") && migration.includes("sold' THEN false"));
pass('lead activity table has FK and index', migration.includes('REFERENCES leads(id) ON DELETE CASCADE') && migration.includes('idx_lead_activities_lead_created'));
pass('lead business identity is concurrency-indexed', migration.includes('idx_leads_business_identity') && migration.includes('pg_advisory_xact_lock'));
pass('lead RLS enabled', migration.includes('ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY') && migration.includes('ALTER TABLE leads ENABLE ROW LEVEL SECURITY'));
pass('lead controller validates authorization', controller.includes('authorizedLead') && controller.includes('Not authorized to access this lead'));
pass('dealer platform delegates to canonical lead service', dealerController.includes('getDealerLeads') && dealerController.includes('updateLeadStage') && dealerController.includes('serviceAddLeadNote'));
pass('canonical frontend lead API exists', client.includes('export const leadApi'));
pass('dealer leads UI uses canonical lead API', leadsTab.includes('leadApi.list') && leadsTab.includes('leadApi.updateStage') && leadsTab.includes('leadApi.archive'));

const failures = checks.filter((c) => !c.ok);
console.log(`Lead CRM domain validation: ${checks.length - failures.length}/${checks.length} PASS`);
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} - ${c.name}`);
if (failures.length) process.exit(1);
