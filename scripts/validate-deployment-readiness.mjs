import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const assert = (name, condition) => { checks.push([name, !!condition]); if (!condition) throw new Error(`FAIL ${name}`); console.log(`PASS ${name}`); };

const packageJson = JSON.parse(read('package.json'));
const ci = read('.github/workflows/ci.yml');
const deploy = read('.github/workflows/deploy.yml');
const api = read('src/api/api.exports.ts');
const http = read('src/api/httpRequest.ts');
const inspection = read('src/features/InspectionMarketplace/services/api.ts');
const supabase = read('src/lib/supabaseClient.ts');
const envExample = read('.env.production.example');
const marketplace = read('src/services/marketplaceCore.ts');
const chatController = read('backend/controllers/chatController.js');

assert('Node engine matches CI runner', packageJson.engines?.node === '>=22.22.2' && /node-version:\s*[\'\"]22\.22\.2/.test(ci) && /node-version:\s*[\'\"]22\.22\.2/.test(deploy));
assert('CI lint command exists', packageJson.scripts?.lint === 'tsc --noEmit');
assert('Production build no longer hard-fails on optional Supabase Realtime config', !deploy.includes('Require production frontend secrets') && !deploy.includes('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required for a production build'));
assert('Vercel production credentials are required for deployment certification', deploy.includes('ERROR: VERCEL_TOKEN is not configured') && deploy.includes('exit 1'));
assert('Production deployment uses the prebuilt artifact after Vercel build', deploy.includes('vercel deploy --prebuilt --prod'));
assert('Production verification runs after deployment', deploy.includes('npm run verify:production'));
assert('Production verification script is registered', packageJson.scripts?.['verify:production'] === 'node scripts/verify-production-deployment.mjs');
assert('Supabase frontend client is build-safe when Realtime config is absent', /SupabaseClient \| null/.test(supabase) && !supabase.includes('throw new Error'));
assert('Production environment template exists', envExample.includes('VITE_SUPABASE_URL=') && envExample.includes('VITE_SUPABASE_ANON_KEY='));
assert('Chat compatibility facade exports all legacy methods', ['inbox','messages','seen','start','send','confirmDelivery'].every((m) => new RegExp(`\\b${m}\\s*:`).test(api)));
assert('httpRequest compatibility export exists', /export const httpRequest = request/.test(http));
assert('Inspection marketplace API has typed payment responses', /initiateBookingPayment:[\s\S]*Promise<\{ success: boolean/.test(inspection) && /getPaymentStatus:[\s\S]*Promise<\{ status: string/.test(inspection));
assert('Auction self-recursion removed', !marketplace.includes('return fetchAuction(id);') && marketplace.includes('fetchAuctionById'));
assert('Chat message id is defined from atomic append result', /const messageId = messageData\?\.id/.test(chatController));
assert('Legacy Supabase JS duplicate removed', !fs.existsSync(path.join(root, 'src/lib/supabaseClient.js')));
assert('Inspection marketplace callback prop is destructured', /InspectionsViewProps> = \(\{[\s\S]*onOpenInspectionMarketplace[\s\S]*\}\)/.test(read('src/features/InspectionsView.tsx')));

console.log(`Deployment readiness validation: ${checks.length}/${checks.length} PASS`);
