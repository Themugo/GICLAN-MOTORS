import fs from 'fs';
import assert from 'assert';
const controller = fs.readFileSync('backend/controllers/dealerPlatformController.js','utf8');
const routes = fs.readFileSync('backend/routes/dealerPlatformRoutes.js','utf8');
const migration = fs.readFileSync('supabase/migrations/20260908043000_dealer_platform_domain_end_to_end.sql','utf8');
const api = fs.readFileSync('src/services/dealerPlatformApi.js','utf8');
const checks = [
  ['no dealer platform 501 placeholders', !controller.includes('DEALER_CRM_NOTE_UNAVAILABLE') && !controller.includes('DEALER_CRM_TASK_UNAVAILABLE') && !controller.includes('DEALER_MARKETING_UNAVAILABLE') && !controller.includes('DEALER_AI_RECOMMENDATIONS_UNAVAILABLE') && !controller.includes('DEALER_TEAM_UNAVAILABLE') && !controller.includes('DEALER_COPILOT_UNAVAILABLE') && !controller.includes('DEALER_FINANCE_UNAVAILABLE')],
  ['marketing canonical table', migration.includes('create table if not exists public.marketing_campaigns')],
  ['finance canonical table', migration.includes('create table if not exists public.loan_applications')],
  ['marketing RLS', migration.includes('alter table public.marketing_campaigns enable row level security')],
  ['finance RLS', migration.includes('alter table public.loan_applications enable row level security')],
  ['team invitation route', routes.includes('/team/invite') && routes.includes('/team/accept')],
  ['campaign update route', routes.includes('/marketing/:campaignId')],
  ['operational recommendations', controller.includes('source: "dealer_operational_records"')],
  ['copilot operational contract', controller.includes('supported_topics')],
  ['frontend dealer API convergence', api.includes('updateCampaign') && api.includes('inviteTeamMember')],
];
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`);
assert.ok(checks.every(([,ok])=>ok), 'Dealer platform validation failed');
console.log(`Dealer Platform validation: ${checks.length}/${checks.length} PASS`);
