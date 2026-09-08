import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
const pass = (name) => checks.push({ name, ok: true });
const fail = (name, detail) => checks.push({ name, ok: false, detail });

const jsSupabase = path.join(root, 'src/lib/supabaseClient.js');
if (fs.existsSync(jsSupabase)) fail('obsolete Supabase JS client removed', 'src/lib/supabaseClient.js still exists and can shadow supabaseClient.ts');
else pass('obsolete Supabase JS client removed');

const socket = fs.readFileSync(path.join(root, 'src/context/SocketContext.tsx'), 'utf8');
if (/from ['"]\.\.\/lib\/supabaseClient['"]/.test(socket)) pass('SocketContext uses canonical Supabase client module');
else fail('SocketContext Supabase import intact', 'canonical client import not found');

const http = fs.readFileSync(path.join(root, 'src/api/httpClient.ts'), 'utf8');
if (http.includes("https://api.kayad.space") && http.includes('import.meta.env.PROD')) pass('production API fallback is explicit');
else fail('production API fallback is explicit', 'production fallback missing');

const prefs = fs.readFileSync(path.join(root, 'backend/controllers/userPreferenceController.js'), 'utf8');
if (!/status\(501\)/.test(prefs)) pass('user preference stats no longer returns 501');
else fail('user preference stats no longer returns 501', '501 placeholder remains');

for (const file of ['src/main.tsx', 'src/App.tsx', 'src/api/httpRequest.ts']) {
  if (fs.existsSync(path.join(root, file))) pass(`${file} exists`);
  else fail(`${file} exists`, 'missing runtime entry');
}

const failures = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
if (failures.length) process.exit(1);
console.log(`Runtime integrity validation passed: ${checks.length}/${checks.length}`);
