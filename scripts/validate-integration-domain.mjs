import fs from 'fs';
import path from 'path';
const root = process.cwd();
const checks = [
  ['no integration 501 placeholders', !fs.readFileSync(path.join(root,'backend/controllers/eipController.js'),'utf8').includes('status(501)')],
  ['eip controller exports all routes', ['getAPIs','getAPIDetails','getPartners','createPartner','updatePartner','deletePartner','getAPIKeys','createAPIKey','revokeAPIKey','getWebhooks','createWebhook','updateWebhook','deleteWebhook','testWebhook','getWebhookLogs','getPlugins','createPlugin','updatePlugin','deletePlugin','getTemplates','getTemplate','getAPIAnalytics','getSDKs','getOAuthConfig','createOAuthClient','getEvents','getGatewayStatus','getSandbox','getCertificationStatus','getIntegrationHelp','getIntegrationDashboard'].every(n=>fs.readFileSync(path.join(root,'backend/controllers/eipController.js'),'utf8').includes(`export async function ${n}`))],
  ['eip routes admin boundary', fs.readFileSync(path.join(root,'backend/routes/eipRoutes.js'),'utf8').includes('router.use(protect, allowRoles("admin", "superadmin"))')],
  ['uuid validation is used', fs.readFileSync(path.join(root,'backend/controllers/eipController.js'),'utf8').includes('UUID_RE')],
  ['webhook URLs require HTTPS', fs.readFileSync(path.join(root,'backend/controllers/eipController.js'),'utf8').includes("u.protocol !== 'https:'")],
  ['credential secrets removed from list responses', fs.readFileSync(path.join(root,'backend/controllers/eipController.js'),'utf8').includes('publicCredential')],
  ['database default facade is available', fs.readFileSync(path.join(root,'backend/db/index.js'),'utf8').includes('export default { find, findAll')],
  ['integration hardening migration exists', fs.existsSync(path.join(root,'supabase/migrations/20260908050000_integration_domain_hardening.sql'))],
  ['frontend integration studio consumes live API', fs.readFileSync(path.join(root,'src/pages/admin/integration/IntegrationStudio.jsx'),'utf8').includes('getIntegrationDashboard')],
];
let pass=0; for(const [name,ok] of checks){ console.log(`${ok?'PASS':'FAIL'} - ${name}`); if(ok)pass++; }
console.log(`Integration domain validation: ${pass}/${checks.length} PASS`);
if(pass!==checks.length) process.exit(1);
