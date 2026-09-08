// KAYAD escrow custody configuration.
// Vehicle purchase funds are NOT collected through M-Pesa STK. Until a future
// KAYAD e-wallet/custody rail exists, escrow funding is by bank transfer into
// an admin-configured KAYAD escrow account.

import { findById, findOne, findAll, create, update, remove } from "../db/index.js";

const DEFAULT_RULES = Object.freeze({
  enabled: false,
  privateSellerRequirement: "mandatory", // mandatory | optional | disabled
  fundingMethods: ["bank_transfer"],
  releaseDays: 3,
  minimumAmount: 0,
  maximumAmount: null,
  commissionPct: 0,
  futureWalletEnabled: false,
});

const mergeRules = (rules = {}) => ({ ...DEFAULT_RULES, ...rules, fundingMethods: ["bank_transfer"] });

export async function getEscrowRules() {
  const config = await findOne("platform_config", {});
  return mergeRules(config?.escrowRules || config?.escrow_rules || {});
}

async function getActiveEscrowAccounts() {
  return findAll("escrow_accounts", {
    filters: { isActive: true },
    orderBy: [{ field: "isPrimary", ascending: false }, { field: "createdAt", ascending: true }],
  });
}

export async function getPrimaryEscrowAccount() {
  const primary = await findOne("escrow_accounts", { isActive: true, isPrimary: true });
  if (primary) return primary;
  return findOne("escrow_accounts", { isActive: true });
}

async function getEscrowAccountById(id) {
  return findById("escrow_accounts", id);
}

async function saveEscrowAccount(data, id = null) {
  const payload = {
    accountName: String(data.accountName || "").trim(),
    accountType: "bank",
    bankName: String(data.bankName || "").trim(),
    accountNumber: String(data.accountNumber || "").trim(),
    branch: String(data.branch || "").trim() || null,
    currency: String(data.currency || "KES").toUpperCase(),
    isActive: data.isActive !== false,
    isPrimary: data.isPrimary === true,
    notes: String(data.notes || "").trim() || null,
  };
  if (!payload.accountName || !payload.bankName || !payload.accountNumber) {
    throw new Error("Escrow bank account name, bank name and account number are required");
  }
  if (id) return update("escrow_accounts", id, payload);
  return create("escrow_accounts", payload);
}

async function removeEscrowAccount(id) {
  const account = await findById("escrow_accounts", id);
  if (!account) throw new Error("Escrow account not found");
  const inUse = await findOne("escrows", { custodianAccount: id });
  if (inUse) throw new Error("This escrow account is referenced by an escrow and cannot be deleted; deactivate it instead");
  await remove("escrow_accounts", id);
  return true;
}

async function validatePrivateSellerEscrow({ car, seller, amount }) {
  if (!seller || seller.role !== "individual_seller") {
    throw new Error("KAYAD vehicle escrow is available only for private-seller transactions");
  }

  const rules = await getEscrowRules();
  if (!rules.enabled || rules.privateSellerRequirement === "disabled") {
    throw new Error("Private-seller escrow is currently disabled by KAYAD administration");
  }
  if (rules.minimumAmount > 0 && Number(amount) < Number(rules.minimumAmount)) {
    throw new Error(`Escrow minimum is KES ${Number(rules.minimumAmount).toLocaleString("en-KE")}`);
  }
  if (rules.maximumAmount != null && Number(amount) > Number(rules.maximumAmount)) {
    throw new Error(`Escrow maximum is KES ${Number(rules.maximumAmount).toLocaleString("en-KE")}`);
  }

  const account = await getPrimaryEscrowAccount();
  if (!account) throw new Error("No active KAYAD escrow bank account is configured by an administrator");
  return { rules, account };
}

function sanitizeEscrowAccount(account) {
  if (!account) return null;
  return {
    id: account.id,
    accountName: account.accountName,
    accountType: "bank",
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    branch: account.branch,
    currency: account.currency || "KES",
    notes: account.notes || null,
  };
}

async function verifyEscrowFunding(escrowId, actorId, fundingReference) {
  const { atomicVerifyEscrowFunding } = await import("../utils/atomicTransactions.js");
  return atomicVerifyEscrowFunding(escrowId, actorId, fundingReference);
}
