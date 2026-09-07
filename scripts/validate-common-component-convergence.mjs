import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
function check(name, ok, detail = '') { checks.push({ name, ok, detail }); }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

check('canonical SearchSidebar exists', exists('src/components/SearchSidebar.tsx'));
check('feature SearchSidebar is compatibility-only', read('src/components/features/common/SearchSidebar.tsx').includes("export { default } from '../../SearchSidebar';"));
check('root ReportButton is compatibility-only', read('src/components/ReportButton.tsx').includes("export { default } from './features/common/ReportButton';"));
check('canonical common ReportButton exists', exists('src/components/features/common/ReportButton.tsx'));
check('root AdminWidgets is compatibility-only', read('src/components/AdminWidgets.tsx').includes("export * from './features/admin/AdminWidgets';"));
check('canonical admin widgets exists', exists('src/components/features/admin/AdminWidgets.tsx'));
check('Showroom uses canonical SearchSidebar', read('src/pages/Showroom.jsx').includes("from '../components/SearchSidebar'"));
check('feature common index exports canonical ReportButton', read('src/components/features/common/index.ts').includes("export { default as ReportButton } from './ReportButton';"));

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
  if (!c.ok) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
process.exitCode = failed ? 1 : 0;
