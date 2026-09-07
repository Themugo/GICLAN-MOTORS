import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const checks = [
  ['canonical analytics service', 'backend/services/executiveAnalytics.service.js'],
  ['executive controller', 'backend/controllers/executiveAnalyticsController.js'],
  ['sales controller', 'backend/controllers/salesDashboardController.js'],
  ['frontend analytics API', 'src/services/executiveAnalyticsApi.ts'],
  ['live executive intelligence', 'src/pages/admin/intelligence/ExecutiveIntelligenceCenter.jsx'],
];
let pass = 0;
for (const [label, file] of checks) {
  const exists = fs.existsSync(path.join(root, file));
  console.log(`${exists ? 'PASS' : 'FAIL'} ${label}: ${file}`);
  pass += exists ? 1 : 0;
}
const controller = fs.readFileSync(path.join(root, 'backend/controllers/executiveAnalyticsController.js'), 'utf8');
const sales = fs.readFileSync(path.join(root, 'backend/controllers/salesDashboardController.js'), 'utf8');
for (const [label, text] of [['executive controller', controller], ['sales controller', sales]]) {
  const clean = !/\.aggregate\(|countDocuments|\.distinct\(|from ["']\.\.\/models\//.test(text);
  console.log(`${clean ? 'PASS' : 'FAIL'} ${label} uses canonical database service boundary`);
  pass += clean ? 1 : 0;
}
console.log(`\nAnalytics domain validation: ${pass}/7 PASS`);
if (pass !== 7) process.exit(1);
