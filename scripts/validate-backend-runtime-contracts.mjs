import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (name, ok) => {
  checks.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
};

const response = read('backend/utils/response.js');
check('response facade export exists', /export const response\s*=\s*\{/.test(response));
check('response facade includes created', /created,/.test(response) && /export const created\b/.test(response));
check('response facade preserves existing named helpers', ['success','error','validationError','notFound','unauthorized'].every((name) => new RegExp(`export const ${name}\\b`).test(response)));

const auth = read('backend/middleware/auth.js');
check('requireAuth compatibility alias exists', /export const requireAuth\s*=\s*protect/.test(auth));
check('requireRole compatibility middleware exists', /export const requireRole\s*=\s*\(\.\.\.roles\)/.test(auth));
check('requireRole normalizes array role declarations', /roles\.flat\(\)/.test(auth));

const email = read('backend/services/email.service.js');
check('email compatibility sender export exists', /export const sendEmail\s*=\s*sendRawEmail/.test(email));

const atomic = read('backend/utils/atomicTransactions.js');
const auctionMigration = read('supabase/migrations/20260907140000_auction_lifecycle_atomicity.sql');
check('atomic auction start adapter exists', /export async function atomicStartAuction\b/.test(atomic));
check('atomic auction extend adapter exists', /export async function atomicExtendAuction\b/.test(atomic));
check('auction start RPC exists', /CREATE OR REPLACE FUNCTION kayad_start_auction_atomic\b/i.test(auctionMigration));
check('auction extend RPC exists', /CREATE OR REPLACE FUNCTION kayad_extend_auction_atomic\b/i.test(auctionMigration));

const validate = read('backend/middleware/validate.js');
check('subscription admin query schema is re-exported', /subscriptionAdminQuerySchema,/.test(validate));

const inspectionRoutes = read('backend/inspection/routes/inspectionRoutes.js');
const mediaRoutes = read('backend/routes/mediaEventRoutes.js');
check('inspection routes have auth compatibility dependency', /requireAuth/.test(inspectionRoutes) && /requireRole/.test(inspectionRoutes));
check('media event routes have role compatibility dependency', /requireRole/.test(mediaRoutes));

const backendFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) backendFiles.push(full);
  }
};
walk(path.join(root, 'backend'));
let status501 = [];
for (const file of backendFiles) {
  const source = fs.readFileSync(file, 'utf8');
  if (/\.status\(\s*501\s*\)/.test(source)) status501.push(path.relative(root, file));
}
check('no backend HTTP 501 placeholder responses remain', status501.length === 0);
if (status501.length) console.log(`  Found: ${status501.join(', ')}`);

check('obsolete Supabase JS duplicate remains absent', !fs.existsSync(path.join(root, 'src/lib/supabaseClient.js')));

const failed = checks.filter((item) => !item.ok);
console.log(`\nBackend runtime contract validation: ${checks.length - failed.length}/${checks.length} passed.`);
if (failed.length) process.exit(1);
