import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const compatibility = path.join(root, 'src/components/DealerProfileModal.tsx');
const canonical = path.join(root, 'src/features/DealersView/components/DealerProfileModal.tsx');

const failures = [];
const read = (p) => fs.readFileSync(p, 'utf8');

if (!fs.existsSync(compatibility)) failures.push('compatibility export missing');
if (!fs.existsSync(canonical)) failures.push('canonical DealerProfileModal missing');

if (!failures.length) {
  const compat = read(compatibility);
  const impl = read(canonical);
  if (!/export\s*\{[^}]*DealerProfileModal[^}]*\}\s*from\s*['"]\.\.\/features\/DealersView\/components\/DealerProfileModal['"]/.test(compat)) {
    failures.push('compatibility path is not a re-export of the canonical feature modal');
  }
  if (compat.length > 1000) failures.push('compatibility file still contains a duplicate implementation');
  if (impl.length < 10000) failures.push('canonical implementation unexpectedly truncated');
}

const sourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) sourceFiles.push(p);
  }
}
walk(path.join(root, 'src'));
const duplicateImplementations = sourceFiles.filter((p) => {
  if (p === canonical || p === compatibility) return false;
  return path.basename(p) === 'DealerProfileModal.tsx';
});
if (duplicateImplementations.length) failures.push(`additional DealerProfileModal implementations found: ${duplicateImplementations.map(p => path.relative(root,p)).join(', ')}`);

if (failures.length) {
  console.error(`Dealer modal convergence: FAIL (${failures.length})`);
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log('Dealer modal convergence: PASS');
console.log('1 canonical implementation + 1 compatibility re-export; no duplicate implementation.');
