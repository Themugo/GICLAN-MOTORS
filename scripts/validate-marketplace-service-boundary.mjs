import fs from 'node:fs';

const core = fs.readFileSync('src/services/marketplaceCore.ts', 'utf8');
const bid = fs.readFileSync('src/services/bidApi.ts', 'utf8');
const auction = fs.readFileSync('src/services/auctionService.ts', 'utf8');

const checks = [
  ['marketplaceCore does not import legacy api.exports', !core.includes("api/api.exports")],
  ['marketplaceCore delegates auction reads to auctionService', core.includes("from './auctionService'") && core.includes('fetchAuctionById')],
  ['marketplaceCore delegates bid reads to bidApi', core.includes("from './bidApi'") && core.includes('myBids()')],
  ['bidApi owns my-bids transport', bid.includes("/api/bids/my")],
  ['auctionService owns auction transport', auction.includes("from '../api/httpRequest'")],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`Marketplace service boundary: ${checks.length - failed}/${checks.length} PASS`);
process.exitCode = failed ? 1 : 0;
