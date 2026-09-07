import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [
  ['canonical team table migration exists', fs.existsSync(path.join(root, 'supabase/migrations/20260907220000_dealer_workforce_access_control.sql'))],
  ['team middleware exists', fs.existsSync(path.join(root, 'backend/middleware/dealerOrgAccess.js'))],
  ['team controller no longer returns 501', !read('backend/controllers/dealerPlatformController.js').includes('DEALER_TEAM_UNAVAILABLE')],
  ['invite token is hashed at rest', read('backend/controllers/dealerPlatformController.js').includes('invite_token_hash: crypto.createHash("sha256")')],
  ['invite acceptance validates signed-in email', read('backend/controllers/dealerPlatformController.js').includes('Invitation email does not match')],
  ['self role/status escalation blocked', read('backend/controllers/dealerPlatformController.js').includes('cannot change their own role or status')],
  ['dealer platform routes use org access', read('backend/routes/dealerPlatformRoutes.js').includes('dealerOrgAccess("canManageTeam")')],
  ['team removal is canonical', read('backend/routes/dealerPlatformRoutes.js').includes('removeTeamMember')],
  ['frontend uses canonical team service', read('src/pages/dealer/DealerTeam.jsx').includes("../../services/dealerPlatformApi")],
  ['frontend no longer uses legacy team API', !read('src/pages/dealer/DealerTeam.jsx').includes('dealerAPI.')],
  ['listing creation uses dealer organization owner', read('backend/controllers/carController.js').includes('(req.dealerId || req.user.id)')],
  ['RLS enabled for dealer teams', read('supabase/migrations/20260907220000_dealer_workforce_access_control.sql').includes('enable row level security')],
];
let passed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (ok) passed++; }
console.log(`\n${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
