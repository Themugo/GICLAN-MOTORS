import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

check('backend package declares Node 22.22.2+', /"node"\s*:\s*">=22\.22\.2"/.test(read('backend/package.json')));
check('Render Blueprint uses native Node runtime', /runtime:\s*node/.test(read('render.yaml')));
check('Render Blueprint anchors service at backend/', /rootDir:\s*backend/.test(read('render.yaml')));
check('Render Blueprint uses deterministic npm ci', /buildCommand:\s*npm ci --omit=dev/.test(read('render.yaml')));
check('Render Blueprint starts the canonical backend package', /startCommand:\s*npm start/.test(read('render.yaml')));
check('Render health check is /health', /healthCheckPath:\s*\/health/.test(read('render.yaml')));
check('Render persistent upload path matches native Node source tree', /mountPath:\s*\/opt\/render\/project\/src\/backend\/uploads/.test(read('render.yaml')));

const dockerfile = read('backend/Dockerfile');
check('Dockerfile has no stale backend/realtime copy', !dockerfile.includes('COPY backend/realtime'));
check('Dockerfile copies every declared source directory', (() => {
  for (const line of dockerfile.split(/\r?\n/)) {
    const m = line.match(/^COPY\s+([^\s]+)\s+[^\s]+/);
    if (!m || m[1].startsWith('--') || m[1].includes('*')) continue;
    if (!fs.existsSync(path.join(root, m[1]))) return false;
  }
  return true;
})());
check('Dockerignore does not exclude backend source', !/^backend\s*$/m.test(read('.dockerignore')));

const response = read('backend/utils/response.js');
check('shared response facade exists', /export const response\s*=\s*\{/.test(response));
check('shared response facade exposes created()', /created,/.test(response) && /export const created\b/.test(response));

const auth = read('backend/middleware/auth.js');
check('auth compatibility aliases exist', /export const requireAuth\s*=\s*protect/.test(auth) && /export const requireRole/.test(auth));

const atomic = read('backend/utils/atomicTransactions.js');
check('auction atomic adapters exist', /export async function atomicStartAuction\b/.test(atomic) && /export async function atomicExtendAuction\b/.test(atomic));

const startupContracts = [
  ['admin routes import protectAccount', read('backend/routes/adminRoutes.js'), /import protectAccount from \"\.\.\/middleware\/protectAccount\.js\";/],
  ['user preference stats imports findAll', read('backend/controllers/userPreferenceController.js'), /import \{ findAll, findOne, create, update \}/],
  ['auction reminder imports Supabase health guard', read('backend/services/auctionReminderCron.js'), /import \{ isSupabaseConnected \} from \"\.\.\/utils\/supabase\.js\";/],
  ['queue DLQ warning uses queue-local name', read('backend/config/queue.js').includes('Dead letter queue size warning: ${queueName}:dlq')],
  ['admin chat search keeps userIds in scope', read('backend/routes/adminRoutes.js'), /let userIds = \[\];/],
  ['reconciliation escrow branch initializes result', read('backend/services/reconciliationService.js'), /if \(runType\(\"escrow_vault\"\)\) \{\s*const r = await reconcilePaymentEscrow/s],
  ['receipt service binds sendEmail to canonical sender', read('backend/services/receiptService.js'), /const sendEmail = sendRawEmail;/],
  ['notification worker has email compatibility fallback', read('backend/workers/notificationWorker.js'), /emailService\.sendGenericEmail \|\| emailService\.sendEmail \|\| emailService\.sendRawEmail/],
];
for (const item of startupContracts) check(item[0], item.length === 2 ? item[1] : item[2].test(item[1]));

const backendFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name === 'coverage') continue;
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) backendFiles.push(full);
  }
};
walk(path.join(root, 'backend'));
let syntaxFailures = [];
for (const file of backendFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) syntaxFailures.push(path.relative(root, file));
}
check('all backend JavaScript modules pass node --check', syntaxFailures.length === 0, syntaxFailures.slice(0, 10).join(', '));

let status501 = [];
for (const file of backendFiles) {
  const source = fs.readFileSync(file, 'utf8');
  if (/\.status\(\s*501\s*\)/.test(source)) status501.push(path.relative(root, file));
}
check('no backend HTTP 501 placeholders remain', status501.length === 0, status501.join(', '));

check('obsolete duplicate Supabase JS client remains absent', !fs.existsSync(path.join(root, 'src/lib/supabaseClient.js')));
check('canonical Supabase TS client remains', fs.existsSync(path.join(root, 'src/lib/supabaseClient.ts')));
check('production API fallback remains explicit', read('src/api/httpClient.ts').includes('https://api.kayad.space'));

const failures = checks.filter((x) => !x.ok);
console.log(`\nProduction backend validation: ${checks.length - failures.length}/${checks.length} PASS`);
if (failures.length) process.exit(1);
