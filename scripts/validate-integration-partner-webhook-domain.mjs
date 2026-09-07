import fs from 'fs';
import assert from 'assert';
const controller=fs.readFileSync('backend/controllers/eipController.js','utf8');
const routes=fs.readFileSync('backend/routes/eipRoutes.js','utf8');
const service=fs.readFileSync('backend/partnerPlatform/services/partnerPlatformService.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260907240000_integration_partner_webhook_domain.sql','utf8');
const ui=fs.readFileSync('src/pages/admin/integration/IntegrationStudio.jsx','utf8');
const checks=[
 ['EIP no longer fails closed', !controller.includes('INTEGRATION_NOT_CONFIGURED')],
 ['Dashboard is persisted-data backed', controller.includes("db.find('partner_organizations'")],
 ['Partner lifecycle is implemented', controller.includes('registerPartner')&&controller.includes("status:'terminated'")],
 ['API credential generation is wired', controller.includes('generateCredentials')],
 ['Webhook registry is persisted', controller.includes("db.find('webhook_configs'")],
 ['Webhook test invokes delivery', controller.includes('deliverWebhook(webhook')],
 ['Webhook delivery performs HTTP POST', service.includes("fetch(webhook.webhook_url")],
 ['Webhook signatures use HMAC', service.includes("createHmac('sha256'")],
 ['Webhook delivery records outcome', service.includes("response_status")&&service.includes("response_time_ms")],
 ['API analytics is persisted', controller.includes("db.find('api_usage_logs'")],
 ['OAuth client secrets are hashed', controller.includes('client_secret_hash')&&controller.includes('createHash')],
 ['Integration schema has 18 tables', (migration.match(/create table if not exists/g)||[]).length===18],
 ['Integration schema enables RLS', (migration.match(/enable row level security/g)||[]).length===18],
 ['UUID routes no longer use ObjectId validator', !routes.includes('validateObjectId')],
 ['Integration Studio uses canonical request transport', ui.includes("request('/api/integration/dashboard'")],
];
for(const [name,ok] of checks){ assert.ok(ok,name); console.log(`PASS ${name}`); }
console.log(`Integration Partner & Webhook Domain: ${checks.length}/${checks.length} PASS`);
