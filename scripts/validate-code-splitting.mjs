import fs from 'node:fs';
const app = fs.readFileSync('src/App.tsx', 'utf8');
const imports = [
  './features/AuctionsView','./features/EscrowView','./features/InspectionsView','./features/FinancingView','./features/DealersView','./features/DashboardView','./features/PrivateSellerDashboardView','./features/ChatView','./features/AdminView','./features/SupportView','./features/PaymentHistoryView','./pages/AuctionDiscoveryNetwork','./pages/KAYADLive','./features/OwnershipPlatform','./features/PrivateSellerPlatform','./pages/dealer/dashboard/DealerDashboard','./features/FinancePlatform','./features/InspectionMarketplace/pages/InspectionMarketplacePage'
];
let failed=0;
for(const path of imports){const ok=app.includes(`React.lazy(() => import('${path}')`); console.log(`${ok?'PASS':'FAIL'} lazy ${path}`); if(!ok) failed++;}
const okSusp=app.includes('<Suspense fallback='); console.log(`${okSusp?'PASS':'FAIL'} Suspense boundary`); if(!okSusp) failed++;
const eager=['AuctionsView','EscrowView','InspectionsView','FinancingView','DealersView','DashboardView','PrivateSellerDashboardView','ChatView','AdminView','SupportView','PaymentHistoryView','AuctionDiscoveryNetwork','KAYADLive','PrivateSellerPlatform','DealerDashboard','InspectionMarketplacePage'];
for(const name of eager){const ok=!new RegExp(`import\\s+${name}\\s+from`).test(app); console.log(`${ok?'PASS':'FAIL'} no eager import ${name}`); if(!ok) failed++;}
if(failed) process.exit(1); console.log(`\nCode splitting validation: PASS`);
