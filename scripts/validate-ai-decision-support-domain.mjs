import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [
  ['decision service exists', 'backend/ai/services/aiDecisionService.js'],
  ['decision routes exist', 'backend/routes/aiDecisionRoutes.js'],
  ['server mounts decision routes', 'backend/server.js'],
  ['governance migration exists', 'supabase/migrations/20260907235000_ai_decision_governance.sql'],
  ['domain documentation exists', 'AI_DECISION_SUPPORT_DOMAIN_END_TO_END.md'],
];
let passed = 0;
for (const [name, rel] of checks) {
  const ok = fs.existsSync(path.join(root, rel));
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (ok) passed++;
}
const service = fs.readFileSync(path.join(root, 'backend/ai/services/aiDecisionService.js'), 'utf8');
const routes = fs.readFileSync(path.join(root, 'backend/routes/aiDecisionRoutes.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'backend/server.js'), 'utf8');
const antiClaims = [
  ['service declares rule-based methodology', service.includes('Deterministic weighted rules')],
  ['recommendations use live cars table', service.includes("findAll('cars'" )],
  ['routes require authentication', routes.includes('router.use(protect)')],
  ['decision routes mounted', server.includes('/api/ai/decision')],
  ['no fake page IDs in decision service', !service.includes('page_')],
  ['no fabricated percentage claims in decision service', !/\b\d+%\b/.test(service)],
];
for (const [name, ok] of antiClaims) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (ok) passed++; }
console.log(`AI decision-support validation: ${passed}/${checks.length + antiClaims.length} PASS`);
if (passed !== checks.length + antiClaims.length) process.exit(1);
