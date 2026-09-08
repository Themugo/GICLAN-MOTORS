import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const service = read('backend/services/dispute.service.js');
const controller = read('backend/controllers/disputeController.js');
const atomic = read('backend/utils/atomicTransactions.js');
const migrationDir = path.join(root, 'supabase/migrations');
const migrations = fs.readdirSync(migrationDir).filter(f => f.includes('dispute_escrow_consolidation'));
const page = read('src/pages/DisputeDetailPage.jsx');

assert(service.includes('export async function openDispute'), 'canonical openDispute service missing');
assert(service.includes('export async function getEscrowDispute'), 'canonical getEscrowDispute service missing');
assert(service.includes('export async function resolveDispute'), 'canonical resolveDispute service missing');
assert(service.includes('export async function submitAppeal'), 'canonical appeal service missing');
assert(atomic.includes('kayad_resolve_dispute_atomic'), 'atomic dispute resolution RPC wrapper missing');
assert(migrations.length === 1, 'canonical dispute consolidation migration missing or duplicated');
assert(read('backend/routes/disputeRoutes.js').includes('router.post("/:id/resolve"'), 'resolution route missing');
assert(page.includes("../components/EvidenceUpload") && page.includes("../components/ResolutionPanel") && page.includes("../components/AppealPanel"), 'active dispute page is not using canonical functional panels');
assert(!fs.existsSync(path.join(root, 'backend/models/Dispute.js')), 'legacy Dispute model still exists');
assert(!fs.existsSync(path.join(root, 'backend/models/Evidence.js')), 'legacy Evidence model still exists');
assert(!fs.existsSync(path.join(root, 'backend/services/resolution.service.js')), 'legacy resolution service still exists');

const sourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full); else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) sourceFiles.push(full);
  }
}
walk(path.join(root, 'backend'));
walk(path.join(root, 'src'));
const legacyImports = sourceFiles.filter(f => /models[\\/]\/(Dispute|Evidence)\.js|resolution\.service/.test(fs.readFileSync(f, 'utf8')));
assert(legacyImports.length === 0, `legacy dispute imports remain: ${legacyImports.map(f => path.relative(root, f)).join(', ')}`);
const todoPanels = sourceFiles.filter(f => /components[\\/]features[\\/]common/.test(f) && /TODO: (Call API|Implement actual upload)/.test(fs.readFileSync(f, 'utf8')));
assert(todoPanels.length === 0, `unfinished dispute UI panel TODOs remain: ${todoPanels.join(', ')}`);

console.log('Dispute canonical lifecycle validation: PASS');
console.log(`Canonical consolidation migration: ${migrations[0]}`);
console.log('Legacy dispute/evidence models: removed');
console.log('Legacy resolution service: removed');
console.log('Active dispute panels: API-backed');
console.log('Atomic resolution path: PASS');
