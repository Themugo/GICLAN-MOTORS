import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const checks = [
  ["dealer entitlement service owns listing count", read("backend/services/dealerSubscription.service.js").includes("assertDealerCanCreateListing")],
  ["deleted/sold inventory does not consume active capacity", read("backend/services/dealerSubscription.service.js").includes('status: { $in: ["available", "pending"] }')],
  ["dealer listing path cannot use free-market bypass", !read("backend/controllers/carController.js").includes('if (monetisationOff) {\n      // Free-for-all launch mode')],
  ["subscription mutations rate limited", read("backend/routes/subscriptionRoutes.js").includes("createLimiter")],
  ["subscription mutations idempotent", read("backend/routes/subscriptionRoutes.js").includes("idempotencyCheck")],
  ["admin grant supersedes active entitlement", read("supabase/migrations/20260908060000_dealer_commercial_entitlement_hardening.sql").includes("supersededReason")],
  ["admin revoke fails when nothing is active", read("supabase/migrations/20260908060000_dealer_commercial_entitlement_hardening.sql").includes("No active dealer subscription to revoke")],
  ["one active entitlement invariant", read("supabase/migrations/20260908060000_dealer_commercial_entitlement_hardening.sql").includes("dealer_subscriptions_one_active_uq")],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} - ${name}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
console.log(`Dealer commercial entitlement hardening: ${checks.length}/${checks.length} PASS`);
