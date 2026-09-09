import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const checks = [
  ['canonical valuation service exists', 'backend/services/vehicleValuation.service.js'],
  ['valuation routes exist', 'backend/routes/valuationRoutes.js'],
  ['valuation route mounted', 'backend/server.js'],
  ['valuation migration exists', 'supabase/migrations/20260907190500_vehicle_valuation_domain.sql'],
  ['valuation API exists', 'src/services/valuationApi.ts'],
  ['canonical valuation component exists', 'src/components/features/common/MarketValuationMatrix.tsx'],
  ['root valuation component is compatibility export', 'src/components/MarketValuationMatrix.tsx'],
];
let failed = 0;
for (const [label, rel] of checks) {
  const ok = fs.existsSync(path.join(root, rel));
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed++;
}
const component = fs.readFileSync(path.join(root, 'src/components/features/common/MarketValuationMatrix.tsx'), 'utf8');
for (const [label, condition] of [
  ['no hardcoded Toyota demo data', !component.includes("make: 'Toyota'")],
  ['uses canonical valuation API', component.includes('getValuationMatrix')],
  ['does not use legacy hardcoded market_data endpoint', !component.includes('market_data')],
]) { console.log(`${condition ? 'PASS' : 'FAIL'} ${label}`); if (!condition) failed++; }
console.log(`Vehicle valuation domain validation: ${checks.length + 3 - failed}/${checks.length + 3} PASS`);
process.exitCode = failed ? 1 : 0;
