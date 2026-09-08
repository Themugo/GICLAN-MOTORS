import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const serviceDir = path.join(root, 'backend', 'services');
const scanDirs = [
  path.join(root, 'backend'),
  path.join(root, 'src'),
  path.join(root, 'scripts'),
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(?:js|mjs|cjs|ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = [...new Set(scanDirs.flatMap(walk))];
const source = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const identifiers = new Map();
for (const match of source.matchAll(/\b[A-Za-z_$][A-Za-z0-9_$]*\b/g)) {
  identifiers.set(match[0], (identifiers.get(match[0]) || 0) + 1);
}

const findings = [];
for (const file of walk(serviceDir)) {
  const text = fs.readFileSync(file, 'utf8');
  const pattern = /export\s+(?:(?:async)\s+)?(?:function|const|let|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  for (const match of text.matchAll(pattern)) {
    const name = match[1];
    if ((identifiers.get(name) || 0) <= 1) {
      findings.push(`${path.relative(root, file)}::${name}`);
    }
  }
}

if (findings.length) {
  console.error(`FAIL: ${findings.length} unused named service exports remain.`);
  for (const finding of findings) console.error(` - ${finding}`);
  process.exit(1);
}

console.log('PASS: backend service export surface has no statically unreferenced named exports.');
console.log(`Scanned ${walk(serviceDir).length} service modules across ${files.length} source files.`);
