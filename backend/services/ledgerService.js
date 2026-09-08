import { findAll, findById, update, upsert } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";
import crypto from "crypto";
import { mapRowIn } from "../utils/fieldMap.js";

function generateTransactionId() {
  return `LGR-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function formatCurrency(amount) {
  return Math.round(amount * 100) / 100;
}

async function ensureAccounts() {
  const seed = [
    { code: "1000", name: "Cash - M-Pesa", type: "asset", category: "cash", description: "M-Pesa payment collections" },
    { code: "1100", name: "Escrow Holdings", type: "asset", category: "escrow", description: "Funds held in escrow" },
    { code: "1200", name: "Bank Account", type: "asset", category: "cash", description: "Platform bank account" },
    { code: "2000", name: "Escrow Payable", type: "liability", category: "escrow", description: "Funds owed to sellers" },
    { code: "2100", name: "Refund Payable", type: "liability", category: "refund", description: "Funds owed to buyers" },
    { code: "2200", name: "Commission Payable", type: "liability", category: "commission", description: "Unpaid commissions" },
    { code: "3000", name: "Retained Earnings", type: "equity", category: "reserve", description: "Platform retained earnings" },
    { code: "4000", name: "Commission Revenue", type: "revenue", category: "commission", description: "Platform commission fees" },
    { code: "4100", name: "Subscription Revenue", type: "revenue", category: "subscription", description: "Dealer subscription fees" },
    { code: "4200", name: "Inspection Fees", type: "revenue", category: "inspection", description: "Vehicle inspection fees" },
    { code: "4300", name: "Listing Fees", type: "revenue", category: "fees", description: "Listing promotion fees" },
    { code: "5000", name: "B2C Disbursement Payable", type: "liability", category: "payable", description: "Pending seller payouts" },
  ];

  // Upsert by the unique account code so concurrent workers cannot both
  // observe an empty ledger and race into duplicate-account creation.
  for (const acct of seed) await upsert("ledger_accounts", acct, "code");
  return findAll("ledger_accounts", {});
}

export async function recordLedgerEntry({
  external_reference,
  user_id,
  amount,
  currency = "KES",
  source,
  destination,
  description,
  metadata = {},
  debitAccountCode,
  creditAccountCode,
}) {
  try {
    await ensureAccounts();
    const roundedAmount = formatCurrency(amount);

    const { data: entry, error } = await getSupabase().rpc("kayad_post_ledger_entry_atomic", {
      p_external_reference: String(external_reference),
      p_user_id: user_id || null,
      p_amount: roundedAmount,
      p_currency: currency,
      p_source: source,
      p_destination: destination,
      p_description: description || `${source} → ${destination}`,
      p_metadata: metadata,
      p_debit_account_code: debitAccountCode,
      p_credit_account_code: creditAccountCode,
    });
    if (error) throw error;
    return entry ? mapRowIn("ledger_entries", entry) : entry;
  } catch (err) {
    throw err;
  }
}

export async function recordEscrowDeposit({ payment_id, user_id, amount }) {
  return recordLedgerEntry({
    external_reference: String(payment_id),
    user_id,
    amount,
    source: "escrow_deposit",
    destination: "buyer",
    description: `Escrow deposit of KES ${amount.toLocaleString("en-KE")}`,
    metadata: { payment_id, event: "escrow_deposit" },
    debitAccountCode: "1100",
    creditAccountCode: "2000",
  });
}

export async function recordEscrowRelease({ escrow_id, user_id, amount, commission }) {
  const sellerAmount = amount - commission;
  const releaseEntry = await recordLedgerEntry({
    external_reference: String(escrow_id),
    user_id,
    amount: sellerAmount,
    source: "escrow_release",
    destination: "seller",
    description: `Escrow release of KES ${sellerAmount.toLocaleString("en-KE")} to seller`,
    metadata: { escrow_id, commission, event: "escrow_release" },
    debitAccountCode: "2000",
    creditAccountCode: "5000",
  });
  if (commission > 0) {
    await recordLedgerEntry({
      external_reference: String(escrow_id),
      user_id,
      amount: commission,
      source: "commission",
      destination: "platform",
      description: `Platform commission of KES ${commission.toLocaleString("en-KE")}`,
      metadata: { escrow_id, event: "commission" },
      debitAccountCode: "2000",
      creditAccountCode: "4000",
    });
  }
  return releaseEntry;
}

export async function recordRefund({ escrow_id, user_id, amount }) {
  return recordLedgerEntry({
    external_reference: String(escrow_id),
    user_id,
    amount,
    source: "refund",
    destination: "buyer",
    description: `Refund of KES ${amount.toLocaleString("en-KE")} to buyer`,
    metadata: { escrow_id, event: "refund" },
    debitAccountCode: "2100",
    creditAccountCode: "1100",
  });
}

export async function recordSubscriptionPayment({ subscription_id, user_id, amount }) {
  return recordLedgerEntry({
    external_reference: String(subscription_id),
    user_id,
    amount,
    source: "subscription",
    destination: "platform",
    description: `Dealer subscription payment of KES ${amount.toLocaleString("en-KE")}`,
    metadata: { subscription_id, event: "subscription" },
    debitAccountCode: "1000",
    creditAccountCode: "4100",
  });
}

export async function recordInspectionFee({ inspection_id, user_id, amount }) {
  return recordLedgerEntry({
    external_reference: String(inspection_id),
    user_id,
    amount,
    source: "inspection_fee",
    destination: "platform",
    description: `Inspection fee of KES ${amount.toLocaleString("en-KE")}`,
    metadata: { inspection_id, event: "inspection_fee" },
    debitAccountCode: "1000",
    creditAccountCode: "4200",
  });
}

export async function recordAuctionPayment({ payment_id, user_id, amount, commission }) {
  const sellerAmount = amount - (commission || 0);
  const paymentEntry = await recordLedgerEntry({
    external_reference: String(payment_id),
    user_id,
    amount: sellerAmount,
    source: "auction_payment",
    destination: "seller",
    description: `Auction payment of KES ${sellerAmount.toLocaleString("en-KE")}`,
    metadata: { payment_id, commission, event: "auction_payment" },
    debitAccountCode: "1000",
    creditAccountCode: "5000",
  });
  if (commission > 0) {
    await recordLedgerEntry({
      external_reference: String(payment_id),
      user_id,
      amount: commission,
      source: "commission",
      destination: "platform",
      description: `Auction commission of KES ${commission.toLocaleString("en-KE")}`,
      metadata: { payment_id, event: "auction_commission" },
      debitAccountCode: "1000",
      creditAccountCode: "4000",
    });
  }
  return paymentEntry;
}

export async function getBalanceSheet() {
  const accounts = await findAll("ledger_accounts", { filters: { isActive: true } });
  const totals = { asset: 0, liability: 0, equity: 0, revenue: 0, expense: 0 };
  for (const acc of accounts) {
    totals[acc.type] = (totals[acc.type] || 0) + (acc.balance || 0);
  }
  return { accounts, totals, generatedAt: new Date() };
}

export async function getTrialBalance() {
  const accounts = await findAll("ledger_accounts", { filters: { isActive: true } });
  let totalDebit = 0;
  let totalCredit = 0;
  for (const acc of accounts) {
    if (acc.balance > 0) totalDebit += acc.balance;
    else totalCredit += Math.abs(acc.balance);
  }
  return { accounts, totalDebit: formatCurrency(totalDebit), totalCredit: formatCurrency(totalCredit), inBalance: Math.abs(totalDebit - totalCredit) < 0.01, generatedAt: new Date() };
}

export async function getLedgerEntries({ source, status, user_id, startDate, endDate, page = 1, limit = 50 }) {
  const sb = getSupabase();
  let query = sb.from("ledger_entries").select("*", { count: "exact" });

  if (source) query = query.eq("source", source);
  if (status) query = query.eq("status", status);
  if (user_id) query = query.eq("user_id", user_id);
  if (startDate) query = query.gte("created_at", new Date(startDate).toISOString());
  if (endDate) query = query.lte("created_at", new Date(endDate).toISOString());

  query = query.order("created_at", { ascending: false });
  query = query.range((page - 1) * limit, (page - 1) * limit + limit - 1);

  const { data: entries, error, count } = await query;
  if (error) throw error;

  for (const entry of entries) {
    if (entry.entries) {
      for (const e of entry.entries) {
        if (e.account) {
          const acc = await findById("ledger_accounts", e.account);
          if (acc) e.account = { id: acc.id, code: acc.code, name: acc.name, type: acc.type };
        }
      }
    }
  }

  return { entries, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } };
}

export async function getLedgerEntryById(id) {
  const entry = await findById("ledger_entries", id);
  if (!entry) return null;
  if (entry.entries) {
    for (const e of entry.entries) {
      if (e.account) {
        const acc = await findById("ledger_accounts", e.account);
        if (acc) e.account = { id: acc.id, code: acc.code, name: acc.name, type: acc.type };
      }
    }
  }
  if (entry.user) {
    const user = await findById("users", entry.user);
    if (user) entry.user = { id: user.id, name: user.name, email: user.email };
  }
  return entry;
}

export async function reverseLedgerEntry(entryId, userId, reason) {
  const { data, error } = await getSupabase().rpc("kayad_reverse_ledger_entry_atomic", {
    p_entry_id: entryId,
    p_user_id: userId || null,
    p_reason: reason || null,
  });
  if (error) throw error;
  return data ? mapRowIn("ledger_entries", data) : data;
}

export async function getReconciliationReport({ startDate, endDate }) {
  const sb = getSupabase();
  let query = sb.from("ledger_entries").select("*");

  if (startDate) query = query.gte("created_at", new Date(startDate).toISOString());
  if (endDate) query = query.lte("created_at", new Date(endDate).toISOString());

  query = query.order("created_at", { ascending: false });

  const { data: entries, error } = await query;
  if (error) throw error;

  for (const entry of entries) {
    if (entry.entries) {
      for (const e of entry.entries) {
        if (e.account) {
          const acc = await findById("ledger_accounts", e.account);
          if (acc) e.account = { id: acc.id, code: acc.code, name: acc.name };
        }
      }
    }
  }

  const summary = {
    total_entries: entries.length,
    total_debit: 0,
    total_credit: 0,
    by_source: {},
    by_status: {},
  };
  for (const entry of entries) {
    for (const e of entry.entries) {
      summary.total_debit += e.debit || 0;
      summary.total_credit += e.credit || 0;
    }
    summary.by_source[entry.source] = (summary.by_source[entry.source] || 0) + entry.amount;
    summary.by_status[entry.status] = (summary.by_status[entry.status] || 0) + 1;
  }
  summary.total_debit = formatCurrency(summary.total_debit);
  summary.total_credit = formatCurrency(summary.total_credit);
  return { entries, summary };
}

export async function seedAccounts() {
  return ensureAccounts();
}
