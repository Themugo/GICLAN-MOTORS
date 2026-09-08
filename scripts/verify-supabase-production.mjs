#!/usr/bin/env node

const baseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';
const requiredTables = [
  'users', 'profiles', 'cars', 'bids', 'favorites', 'saved_searches',
  'payments', 'escrow_transactions', 'vehicle_inspections',
  'inspection_bookings', 'inspection_reports', 'support_tickets',
  'governance_policies', 'change_requests', 'partner_organizations',
];

if (!baseUrl || !serviceKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required.');
  process.exit(1);
}

let failures = 0;
for (const table of requiredTables) {
  const response = await fetch(`${baseUrl}/rest/v1/${table}?select=*&limit=1`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!response.ok) {
    failures += 1;
    let detail = '';
    try { detail = await response.text(); } catch {}
    console.error(`FAIL ${table}: HTTP ${response.status}${detail ? ` ${detail.slice(0, 240)}` : ''}`);
  } else {
    console.log(`PASS ${table}`);
  }
}

if (failures) {
  console.error(`\nSupabase production schema verification FAILED: ${failures} table(s) unavailable.`);
  process.exit(1);
}

console.log(`\nSupabase production schema verification PASS: ${requiredTables.length}/${requiredTables.length} required tables reachable.`);
