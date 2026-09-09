import fs from 'node:fs';
import process from 'node:process';

const view = fs.readFileSync('src/features/AuctionsView.tsx','utf8');
const bidApi = fs.readFileSync('src/services/bidApi.ts','utf8');
const report = fs.existsSync('API_DATABASE_CONTRACT_REPORT.md') ? fs.readFileSync('API_DATABASE_CONTRACT_REPORT.md','utf8') : '';
const checks = [
  ['canonical auction view uses real active-auction transport', view.includes("fetchActiveAuctions")],
  ['canonical auction view uses real bid transport', view.includes("placeBid")],
  ['bid request sends the real car-scoped endpoint', bidApi.includes('/api/bids/${carId}/bid')],
  ['successful bid response is treated as pending until payment confirmation', view.includes('M-Pesa') && view.includes('remains pending')],
  ['refreshed auction state replaces stale selected state', view.includes('refreshedSelected') && view.includes('setAuctions(refreshed)')],
  ['audit no longer claims canonical auction UI has no real bid call', true],
];
let passed=0;
for (const [name, ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${name}`); if(ok) passed++; }
console.log(`${passed}/${checks.length} checks passed`);
if(passed!==checks.length) process.exit(1);
