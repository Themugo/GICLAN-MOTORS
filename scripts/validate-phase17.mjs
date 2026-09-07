import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'src');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const failures = [];
const apiTs = read('src/api/api.ts');
const exportsTs = read('src/api/api.exports.ts');
const authContext = read('src/context/AuthContext.tsx');

if (!apiTs.includes("from './httpClient'")) failures.push('api.ts is not a compatibility facade over httpClient');
if (!exportsTs.includes('from "./httpClient"')) failures.push('api.exports.ts still depends on api.ts transport');
if (/import\s+\{[^}]*authAPI[^}]*\}\s+from ['"]\.\.\/api\/api['"]/.test(authContext)) failures.push('AuthContext still imports legacy authAPI facade');
if (!authContext.includes("from '../services/authApi'")) failures.push('AuthContext does not use canonical authApi service');
if (fs.existsSync(path.join(src, 'api/api.exports.backup.ts'))) failures.push('unreferenced api.exports.backup.ts remains');

const serviceFiles = ['authApi.ts','inspectionApi.ts','loanApi.ts','vehicleApi.ts','heroApi.ts','supportApi.ts','chatApi.ts','favoriteApi.ts','escrowApi.ts','phoneVerificationApi.ts','adApi.ts'];
for (const file of serviceFiles) {
  const p = path.join(src, 'services', file);
  if (!fs.existsSync(p)) continue;
  const s = fs.readFileSync(p, 'utf8');
  if (/method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/.test(s) &&
      !s.includes('getCsrfHeaders') &&
      !s.includes("from '../api/httpClient'") &&
      !s.includes("from '../api/httpRequest'")) {
    failures.push(`mutation transport is not routed through canonical CSRF-aware client in ${file}`);
  }
}

const authTokenPattern = /localStorage\.(?:getItem|setItem|removeItem)\([^)]*(?:token|accessToken|refreshToken|jwt|authToken)[^)]*\)/i;
function walk(dir) {
  for (const ent of fs.readdirSync(dir, {withFileTypes:true})) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|jsx)$/.test(ent.name)) {
      const s = fs.readFileSync(p, 'utf8');
      if (authTokenPattern.test(s)) failures.push(`browser token persistence found in ${path.relative(root,p)}`);
    }
  }
}
walk(src);

if (failures.length) {
  console.error('PHASE 17 API TRANSPORT VALIDATION: FAIL');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log('PHASE 17 API TRANSPORT VALIDATION: PASS');
console.log(`- canonical shared transport: src/api/httpClient.ts`);
console.log(`- endpoint compatibility facade: src/api/api.ts`);
console.log(`- canonical AuthContext transport: src/services/authApi.ts`);
console.log(`- CSRF-aware service clients checked: ${serviceFiles.length}`);
console.log('- browser token persistence scan: PASS');
