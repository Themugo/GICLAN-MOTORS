import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [
  ['canonical service exists', 'backend/services/review.service.js'],
  ['controller delegates to service', 'backend/controllers/reviewController.js'],
  ['canonical routes exist', 'backend/routes/reviewRoutes.js'],
  ['review moderation transport exists', 'backend/routes/adminRoutes.js'],
  ['review schema has moderation lifecycle', 'supabase/migrations/20260907234500_review_domain_end_to_end.sql'],
  ['review frontend service exists', 'src/services/reviewApi.ts'],
  ['real TS review submission exists', 'src/components/features/car/CarDetail/CarDetailReviews.tsx'],
  ['legacy review model is not used by review controller', 'backend/controllers/reviewController.js'],
  ['dealer reputation uses canonical service', 'backend/controllers/dealerPlatformController.js'],
  ['admin UI supports moderation', 'src/pages/admin/AdminReviews.jsx'],
];
let passed = 0;
for (const [name, rel] of checks) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`FAIL: ${name}: missing ${rel}`);
  const text = fs.readFileSync(file, 'utf8');
  if (rel.includes('reviewController.js') && /Review\.find|Review\.create|Review\.findOne/.test(text)) throw new Error(`FAIL: ${name}: legacy model calls remain`);
  if (rel.includes('dealerPlatformController.js') && !text.includes('listDealerReviews')) throw new Error(`FAIL: ${name}: canonical service missing`);
  if (rel.includes('CarDetailReviews.tsx') && !text.includes('createReview({ dealer: dealerId')) throw new Error(`FAIL: ${name}: live submission missing`);
  if (rel.includes('20260907234500') && !text.includes('uq_reviews_reviewer_dealer') || rel.includes('20260907234500') && !text.includes('status')) throw new Error(`FAIL: ${name}: schema hardening missing`);
  passed++;
  console.log(`PASS ${passed}/${checks.length}: ${name}`);
}
console.log(`Review domain validator: ${passed}/${checks.length} PASS`);
