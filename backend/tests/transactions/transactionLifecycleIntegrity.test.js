import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

describe("Transaction lifecycle integrity contracts", () => {
  test("bid controller has no stale transaction session cleanup", () => {
    const source = read("backend/controllers/bidController.js");
    expect(source).not.toContain("session.abortTransaction");
    expect(source).not.toContain("session.endSession");
    expect(source).toContain("atomicAutoBid");
  });

  test("auction close is delegated to the atomic settlement RPC", () => {
    const source = read("backend/services/auctionClose.service.js");
    expect(source).toContain("atomicCloseAuction");
    expect(source).toContain("winnerBidId");
  });

  test("canonical migration contains atomic auto-bid and close functions", () => {
    const sql = read("supabase/migrations/20260905050000_transaction_lifecycle_integrity.sql");
    expect(sql).toContain("kayad_auto_bid_atomic");
    expect(sql).toContain("kayad_close_auction_atomic");
    expect(sql).toContain("FOR UPDATE");
    expect(sql).toContain("status = 'won'");
    expect(sql).toContain("status = 'lost'");
  });

  test("refund reconciliation uses the refunds ledger", () => {
    const source = read("backend/services/reconciliationService.js");
    expect(source).toContain('findAll("refunds"');
    expect(source).toContain('findById("payments", refund.payment)');
    expect(source).toContain("refund_exceeds_original");
  });
});
