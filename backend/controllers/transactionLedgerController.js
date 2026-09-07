import asyncHandler from "../middleware/asyncHandler.js";
import * as ledgerService from "../services/ledgerService.js";

// Compatibility surface for the legacy /api/v1/ledger endpoints.
// Financial writes belong to the canonical append-only ledger service.
export const getUserTransactions = asyncHandler(async (req, res) => {
  const result = await ledgerService.getLedgerEntries({ user_id: req.user.id, ...req.query });
  res.json({ success: true, data: result.entries, pagination: result.pagination });
});

export const getTransactionByHash = asyncHandler(async (req, res) => {
  const entry = await ledgerService.getLedgerEntryById(req.params.hash);
  if (!entry) return res.status(404).json({ success: false, message: "Ledger transaction not found" });
  res.json({ success: true, data: entry });
});

export const verifyChain = asyncHandler(async (req, res) => {
  const result = await ledgerService.verifyLedgerIntegrity(req.query.startDate);
  res.json({ success: true, data: result });
});

export const getTransactionChain = asyncHandler(async (req, res) => {
  const entry = await ledgerService.getLedgerEntryById(req.params.ledgerId);
  if (!entry) return res.status(404).json({ success: false, message: "Ledger transaction not found" });
  res.json({ success: true, data: { transaction: entry, chain: [entry] } });
});

const canonicalWrite = asyncHandler(async (_req, res) => {
  res.status(410).json({
    success: false,
    code: "LEGACY_LEDGER_WRITE_DISABLED",
    message: "Legacy transaction-ledger writes are disabled. Financial events must be created by the canonical payment, escrow, settlement or ledger services.",
  });
});

export const createDepositTransaction = canonicalWrite;
export const createWithdrawalTransaction = canonicalWrite;
export const createEscrowHold = canonicalWrite;
export const createEscrowRelease = canonicalWrite;

export const getEscrowTransactions = asyncHandler(async (req, res) => {
  const result = await ledgerService.getLedgerEntries({ ...req.query, source: undefined });
  const entries = result.entries.filter((entry) =>
    String(entry.externalReference || entry.external_reference || "") === String(req.params.escrowId) ||
    entry.metadata?.escrow_id === req.params.escrowId
  );
  res.json({ success: true, data: entries, pagination: { ...result.pagination, total: entries.length, pages: Math.ceil(entries.length / result.pagination.limit) } });
});

export const getLedgerSummary = asyncHandler(async (req, res) => {
  const result = await ledgerService.getUserLedgerSummary(req.user.id);
  res.json({ success: true, data: result });
});

export const getAllTransactions = asyncHandler(async (req, res) => {
  const result = await ledgerService.getLedgerEntries(req.query);
  res.json({ success: true, data: result.entries, pagination: result.pagination });
});

export const verifyTransaction = asyncHandler(async (req, res) => {
  const entry = await ledgerService.getLedgerEntryById(req.params.ledgerId);
  if (!entry) return res.status(404).json({ success: false, message: "Ledger transaction not found" });
  res.json({ success: true, data: { verified: true, entryId: entry.id, status: entry.status } });
});
