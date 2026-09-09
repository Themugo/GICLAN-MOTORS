import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));

const floors = {
  undici: '8.10.2',
  esbuild: '0.28.1',
  'follow-redirects': '1.16.0',
  'js-yaml': '4.3.1',
  nanoid: '3.3.18',
  axios: '1.19.0',
};

function parseVersion(version) {
  const match = String(version ?? '').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return match.slice(1).map(Number);
}

function gte(a, b) {
  const av = parseVersion(a);
  const bv = parseVersion(b);
  if (!av || !bv) return false;
  for (let i = 0; i < 3; i += 1) {
    if (av[i] !== bv[i]) return av[i] > bv[i];
  }
  return true;
}

for (const [name, floor] of Object.entries(floors)) {
  const lockEntry = lock.packages?.[`node_modules/${name}`];
  const actual = lockEntry?.version;
  if (!actual || !gte(actual, floor)) {
    throw new Error(`${name} security floor failed: expected >= ${floor}, found ${actual ?? 'missing'}`);
  }
  console.log(`PASS ${name} ${actual} >= ${floor}`);
}

if (pkg.overrides?.undici !== floors.undici) {
  throw new Error(`Expected package.json override undici=${floors.undici}; found ${pkg.overrides?.undici ?? 'missing'}`);
}
const lockUndici = lock.packages?.['node_modules/undici']?.version;
if (!lockUndici || !gte(lockUndici, floors.undici)) {
  throw new Error(`Expected package-lock resolved undici>=${floors.undici}; found ${lockUndici ?? 'missing'}`);
}

const vitestFloor = '4.1.11';
const vitestVersion = lock.packages?.['node_modules/vitest']?.version;
const coverageVersion = lock.packages?.['node_modules/@vitest/coverage-v8']?.version;
const mockerVersion = lock.packages?.['node_modules/@vitest/mocker']?.version;
for (const [name, version] of [['vitest', vitestVersion], ['@vitest/coverage-v8', coverageVersion], ['@vitest/mocker', mockerVersion]]) {
  if (!version || !gte(version, vitestFloor)) {
    throw new Error(`${name} security floor failed: expected >= ${vitestFloor}, found ${version ?? 'missing'}`);
  }
  console.log(`PASS ${name} ${version} >= ${vitestFloor}`);
}

console.log(`PASS package.json override undici=${pkg.overrides?.undici}`);
console.log(`PASS package-lock resolves undici=${lockUndici}`);
console.log('PASS vulnerable dependency floors are enforced in package.json and package-lock.json');
console.log('Dependency security validation: PASS');
