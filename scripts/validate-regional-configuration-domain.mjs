import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [
  ['canonical regional service exists', 'backend/services/regionalConfiguration.service.js'],
  ['canonical controller exists', 'backend/controllers/regionalConfigurationController.js'],
  ['canonical routes exist', 'backend/routes/regionalConfigurationRoutes.js'],
  ['regional migration exists', 'supabase/migrations/20260908010000_regional_configuration_localization_domain.sql'],
  ['frontend regional API exists', 'src/services/regionalConfigurationApi.ts'],
  ['canonical localization service exists', 'backend/services/localization.service.js'],
  ['canonical localization frontend API exists', 'src/services/localizationApi.ts'],
  ['regional dashboard exists', 'src/features/MultiCountry/pages/RegionalDashboard.tsx'],
];
let passed = 0;
for (const [name, rel] of checks) {
  if (!fs.existsSync(path.join(root, rel))) throw new Error(`FAIL: ${name}`);
  console.log(`PASS: ${name}`); passed++;
}
const service = fs.readFileSync(path.join(root, 'backend/services/regionalConfiguration.service.js'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'src/features/MultiCountry/pages/RegionalDashboard.tsx'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260908010000_regional_configuration_localization_domain.sql'), 'utf8');
const assertions = [
  ['currency conversion requires configured rate', /No active exchange rate configured/ .test(service)],
  ['no hardcoded FX table remains', !/const rates\s*=/.test(service)],
  ['country dashboard loads backend data', /listCountries\(true\)/.test(dashboard)],
  ['country dashboard has no hardcoded country analytics', !/COUNTRY_ANALYTICS|PAYMENT_PROVIDERS|CROSS_BORDER_ROUTES|const COUNTRIES/.test(dashboard)],
  ['FX table has positive rate constraint', /rate NUMERIC\(24,12\) NOT NULL CHECK \(rate > 0\)/.test(migration)],
  ['country tables have RLS', /ALTER TABLE countries ENABLE ROW LEVEL SECURITY/.test(migration)],
  ['FX table has uniqueness boundary', /UNIQUE\(from_currency, to_currency\)/.test(migration)],
];
for (const [name, ok] of assertions) { if (!ok) throw new Error(`FAIL: ${name}`); console.log(`PASS: ${name}`); passed++; }
console.log(`Regional configuration validator: ${passed}/${passed} PASS`);
