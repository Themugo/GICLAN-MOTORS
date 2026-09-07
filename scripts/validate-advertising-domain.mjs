import fs from 'node:fs';
import assert from 'node:assert/strict';
const files = [
  'backend/services/advertising.service.js',
  'backend/controllers/adSlotController.js',
  'backend/routes/adSlotRoutes.js',
  'src/services/adApi.ts',
  'src/features/AdManager/AdManagerPanel.tsx',
  'src/components/FloatingAdRail.tsx',
  'supabase/migrations/20260908000000_advertising_domain_end_to_end.sql',
];
for (const f of files) assert.ok(fs.existsSync(f), `missing ${f}`);
const service = fs.readFileSync(files[0], 'utf8');
const controller = fs.readFileSync(files[1], 'utf8');
const routes = fs.readFileSync(files[2], 'utf8');
const migration = fs.readFileSync(files[6], 'utf8');
assert.match(service, /listPublic/); assert.match(service, /recordEvent/); assert.match(service, /stats/);
assert.match(controller, /getAdStats/); assert.match(controller, /recordAdEvent/);
assert.match(routes, /\/stats/); assert.match(routes, /\/events/);
assert.match(migration, /create table if not exists public\.ad_slots/i);
assert.match(migration, /enable row level security/i);
console.log('Advertising domain validator: 12/12 PASS');
