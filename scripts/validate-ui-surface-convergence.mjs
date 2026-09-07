import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const pass = (name, ok) => checks.push([name, ok]);

pass('canonical escrow PaymentModal exists', exists('src/components/features/escrow/PaymentModal.tsx'));
pass('legacy PaymentModal TS removed', !exists('src/components/PaymentModal.tsx'));
pass('legacy PaymentModal JSX removed', !exists('src/components/PaymentModal.jsx'));
pass('canonical common InternalNotes exists', exists('src/components/features/common/InternalNotes.tsx'));
pass('legacy InternalNotes removed', !exists('src/components/InternalNotes.jsx'));
pass('root SearchBar is compatibility re-export', read('src/components/SearchBar.tsx').includes("./features/common/SearchBar"));
pass('Showroom still imports compatibility SearchBar', read('src/pages/Showroom.jsx').includes("../components/SearchBar"));
pass('AuctionLivePage uses canonical escrow PaymentModal', read('src/pages/AuctionLivePage.jsx').includes("../components/features/escrow/PaymentModal"));
pass('DisputeDetailPage uses canonical InternalNotes', read('src/pages/DisputeDetailPage.jsx').includes("../components/features/common/InternalNotes"));

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
console.log(`\nUI surface convergence: ${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length) process.exit(1);
