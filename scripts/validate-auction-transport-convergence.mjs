import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  service: path.join(root, 'src/services/auctionService.ts'),
  view: path.join(root, 'src/features/AuctionsView.tsx'),
  core: path.join(root, 'src/services/marketplaceCore.ts'),
  exports: path.join(root, 'src/api/api.exports.ts'),
};
const read = (name) => fs.readFileSync(files[name], 'utf8');
const checks = [
  ['canonical auction service uses shared request transport', /from ['"]\.\.\/api\/httpRequest['"]/.test(read('service'))],
  ['AuctionsView uses canonical fetchActiveAuctions', /fetchActiveAuctions/.test(read('view')) && !/auctionAPI/.test(read('view'))],
  ['marketplaceCore uses canonical auction service', /fetchActiveAuctions|fetchAuction/.test(read('core')) && !/auctionAPI/.test(read('core'))],
  ['legacy public auction export removed', !/export const auctionAPI/.test(read('exports'))],
  ['auction service supports active/list/my/get contracts', ['fetchList','fetchAuction','fetchActiveAuctions','fetchMyAuctions'].every((n) => new RegExp(`export async function ${n}`).test(read('service')))],
];
let failed = 0;
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`), failed += ok ? 0 : 1;
if (failed) process.exit(1);
console.log(`Auction transport convergence: ${checks.length}/${checks.length} PASS`);
