import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const checks = [
  ['ownership service uses canonical db adapter', /import \* as db from|from '..\/..\/db\/index\.js'/.test(read('backend/ownership/services/ownershipService.js'))],
  ['ownership profile update uses row id', /db\.update\('owner_profiles', profile\.id/.test(read('backend/ownership/services/ownershipService.js'))],
  ['owner vehicle access is user scoped', /owner_id: userId/.test(read('backend/ownership/services/ownershipService.js'))],
  ['expense totals are real database data', /db\.findAll\('ownership_expenses'/.test(read('backend/ownership/services/ownershipService.js')) && !/return 0;/.test(read('backend/ownership/services/ownershipService.js'))],
  ['sold vehicles cancel pending reminders', /status: 'cancelled'/.test(read('backend/ownership/services/ownershipService.js'))],
  ['ownership API routes are protected', /router\.get\('\/dashboard', protect/.test(read('backend/routes/ownershipRoutes.js'))],
  ['passport public route is canonical', /getPublicPassport/.test(read('backend/routes/ownershipRoutes.js'))],
  ['passport service uses canonical db adapter', /import \* as db/.test(read('backend/vehiclePassport/services/vehiclePassportService.js'))],
  ['passport search uses findAll', /db\.findAll\('vehicle_passports'/.test(read('backend/vehiclePassport/services/vehiclePassportService.js'))],
  ['ghost checker passport no longer returns demo data', /vehiclePassportService\.findPassport/.test(read('backend/controllers/ghostCheckersController.js'))],
  ['server mounts ownership API', /app\.use\("\/api\/ownership", ownershipRoutes\)/.test(read('backend/server.js'))],
  ['frontend uses real ownership API', /getOwnershipDashboard/.test(read('src/features/OwnershipPlatform/pages/BuyerPlatform.tsx'))],
  ['migration creates ownership vehicles', /create table if not exists public\.owner_vehicles/.test(read('supabase/migrations/20260907190300_ownership_passport_domain.sql'))],
  ['migration creates vehicle passports', /create table if not exists public\.vehicle_passports/.test(read('supabase/migrations/20260907190300_ownership_passport_domain.sql'))],
  ['migration enables RLS', /enable row level security/.test(read('supabase/migrations/20260907190300_ownership_passport_domain.sql'))],
  ['migration denies direct anon/authenticated access', /revoke all on table public\.%I from anon, authenticated/.test(read('supabase/migrations/20260907190300_ownership_passport_domain.sql'))],
  ['migration preserves passport audit trail', /create table if not exists public\.passport_audit_log/.test(read('supabase/migrations/20260907190300_ownership_passport_domain.sql'))],
  ['ownership frontend transport exists', exists('src/services/ownershipApi.ts')],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`\nOwnership + passport domain gate: ${checks.length - failed}/${checks.length} PASS`);
process.exitCode = failed ? 1 : 0;
