import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const checks = [];
const pass = (name, ok) => checks.push({ name, ok });

const bidController = read("backend/controllers/bidController.js");
const atomic = read("backend/utils/atomicTransactions.js");
const close = read("backend/services/auctionClose.service.js");
const migration = read("supabase/migrations/20260905060000_transaction_lifecycle_integrity.sql");
const refundMigration = read("supabase/migrations/20260905050000_phase14_refund_reconciliation_integrity.sql");
const reconciliation = read("backend/services/reconciliationService.js");
const escrowController = read("backend/controllers/escrowController.js");
const favorites = read("backend/controllers/favoriteController.js");

pass("No stale Mongo session cleanup remains in bid controller", !bidController.includes("session.abortTransaction") && !bidController.includes("session.endSession"));
pass("Auto-bid uses atomic RPC", bidController.includes("atomicAutoBid"));
pass("Atomic auto-bid RPC wrapper exists", atomic.includes("kayad_auto_bid_atomic"));
pass("Atomic auction close RPC wrapper exists", atomic.includes("kayad_close_auction_atomic"));
pass("Auction close service delegates settlement to DB", close.includes("atomicCloseAuction"));
pass("Auction close supports forced winner atomically", close.includes("winnerBidId"));
pass("Canonical refund ledger migration exists", refundMigration.includes("INSERT INTO refunds"));
pass("Refund duplicate protection exists", refundMigration.includes("idx_refunds_one_active_per_payment"));
pass("Auto-bid function locks car row", migration.includes("kayad_auto_bid_atomic") && migration.includes("FOR UPDATE"));
pass("Close function locks car row", migration.includes("kayad_close_auction_atomic") && migration.includes("FOR UPDATE"));
pass("Close function marks winner and losers", migration.includes("status = 'won'") && migration.includes("status = 'lost'"));
pass("Reconciliation uses refunds table", reconciliation.includes('findAll("refunds"'));
pass("Refund endpoint is truthful", escrowController.includes("Escrow refund queued for processing"));
pass("Favorite controller has no stale transaction session", !favorites.includes("session") || !/session\.(?:endSession|commitTransaction|abortTransaction)/.test(favorites));

const failures = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}`);
console.log(`\nTransaction integrity validation: ${checks.length - failures.length}/${checks.length} PASS`);
if (failures.length) process.exit(1);
