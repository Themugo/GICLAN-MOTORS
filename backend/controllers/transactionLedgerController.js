import asyncHandler from "../middleware/asyncHandler.js";
import TransactionLedger from "../models/TransactionLedger.js";
import Escrow from "../models/Escrow.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";

// =============================
// 📋 GET USER'S TRANSACTIONS
// =============================
export const getUserTransactions = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { type, status, startDate, endDate, page = 1, limit = 50 } = req.query;

  const query = {
    $or: [{ from: userId }, { to: userId }],
  };

  if (type) query.type = type;
  if (status) query.status = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const [transactions, total] = await Promise.all([
    TransactionLedger.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("from", "name email")
      .populate("to", "name email")
      .populate("car", "title images"),
    TransactionLedger.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: transactions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// =============================
// 🔍 GET TRANSACTION BY HASH
// =============================
export const getTransactionByHash = asyncHandler(async (req, res) => {
  const { hash } = req.params;

  const transaction = await TransactionLedger.findByHash(hash);

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: "Transaction not found",
    });
  }

  // Check authorization
  const isOwner = [transaction.from?._id?.toString(), transaction.to?._id?.toString()].includes(req.user.id);
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized",
    });
  }

  res.json({
    success: true,
    data: transaction,
  });
});

// =============================
// 📊 VERIFY LEDGER CHAIN
// =============================
export const verifyChain = asyncHandler(async (req, res) => {
  const { startDate } = req.query;

  const result = await TransactionLedger.verifyChain(startDate ? new Date(startDate) : null);

  res.json({
    success: true,
    data: result,
  });
});

// =============================
// 🔗 GET CHAIN FOR TRANSACTION
// =============================
export const getTransactionChain = asyncHandler(async (req, res) => {
  const { ledgerId } = req.params;

  const transaction = await TransactionLedger.findOne({ ledgerId });
  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: "Transaction not found",
    });
  }

  // Get chain up to this transaction
  const chain = await TransactionLedger.find({
    createdAt: { $lte: transaction.createdAt },
  })
    .sort({ createdAt: 1 })
    .limit(100)
    .select("ledgerId transactionHash previousHash type amount status createdAt");

  res.json({
    success: true,
    data: {
      transaction,
      chain,
    },
  });
});

// =============================
// 💰 CREATE DEPOSIT TRANSACTION
// =============================
export const createDepositTransaction = asyncHandler(async (req, res) => {
  const { escrowId, amount, paymentReference, metadata } = req.body;

  const escrow = await Escrow.findById(escrowId);
  if (!escrow) {
    return res.status(404).json({
      success: false,
      message: "Escrow not found",
    });
  }

  const transaction = await TransactionLedger.create({
    type: "deposit",
    status: "completed",
    amount,
    currency: "KES",
    from: escrow.user,
    to: escrow.user, // Self-deposit
    escrow: escrowId,
    payment: paymentReference,
    metadata: metadata || {},
    createdBy: req.user.id,
    description: "Escrow deposit",
  });

  logInfo("Deposit transaction created", {
    ledgerId: transaction.ledgerId,
    escrowId,
    amount,
  });

  res.status(201).json({
    success: true,
    data: transaction,
  });
});

// =============================
// 💸 CREATE WITHDRAWAL TRANSACTION
// =============================
export const createWithdrawalTransaction = asyncHandler(async (req, res) => {
  const { escrowId, amount, metadata } = req.body;

  const escrow = await Escrow.findById(escrowId);
  if (!escrow) {
    return res.status(404).json({
      success: false,
      message: "Escrow not found",
    });
  }

  if (escrow.balance < amount) {
    return res.status(400).json({
      success: false,
      message: "Insufficient balance",
    });
  }

  const transaction = await TransactionLedger.create({
    type: "withdrawal",
    status: "pending",
    amount,
    currency: "KES",
    from: escrow.user,
    to: escrow.user,
    escrow: escrowId,
    metadata: metadata || {},
    createdBy: req.user.id,
    description: "Escrow withdrawal request",
  });

  logInfo("Withdrawal transaction created", {
    ledgerId: transaction.ledgerId,
    escrowId,
    amount,
  });

  res.status(201).json({
    success: true,
    data: transaction,
  });
});

// =============================
// 🔒 ESCROW HOLD TRANSACTION
// =============================
export const createEscrowHold = asyncHandler(async (req, res) => {
  const { escrowId, carId, amount, metadata } = req.body;

  const escrow = await Escrow.findById(escrowId);
  if (!escrow) {
    return res.status(404).json({
      success: false,
      message: "Escrow not found",
    });
  }

  if (escrow.balance < amount) {
    return res.status(400).json({
      success: false,
      message: "Insufficient balance",
    });
  }

  const transaction = await TransactionLedger.create({
    type: "escrow_hold",
    status: "completed",
    amount,
    currency: "KES",
    escrow: escrowId,
    car: carId,
    metadata: metadata || {},
    createdBy: req.user.id,
    description: "Amount held for auction",
  });

  logInfo("Escrow hold created", {
    ledgerId: transaction.ledgerId,
    escrowId,
    carId,
    amount,
  });

  res.status(201).json({
    success: true,
    data: transaction,
  });
});

// =============================
// 🔓 ESCROW RELEASE TRANSACTION
// =============================
export const createEscrowRelease = asyncHandler(async (req, res) => {
  const { escrowId, carId, fromUserId, toUserId, amount, metadata } = req.body;

  const transaction = await TransactionLedger.create({
    type: "escrow_release",
    status: "completed",
    amount,
    currency: "KES",
    from: fromUserId,
    to: toUserId,
    escrow: escrowId,
    car: carId,
    metadata: metadata || {},
    createdBy: req.user.id,
    description: "Escrow released to seller",
  });

  logInfo("Escrow released", {
    ledgerId: transaction.ledgerId,
    escrowId,
    carId,
    amount,
  });

  res.status(201).json({
    success: true,
    data: transaction,
  });
});

// =============================
// 📜 GET ESCROW TRANSACTIONS
// =============================
export const getEscrowTransactions = asyncHandler(async (req, res) => {
  const { escrowId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const transactions = await TransactionLedger.getForEscrow(escrowId, {
    page: parseInt(page),
    limit: parseInt(limit),
  });

  const total = await TransactionLedger.countDocuments({ escrow: escrowId });

  res.json({
    success: true,
    data: transactions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// =============================
// 📊 GET LEDGER SUMMARY
// =============================
export const getLedgerSummary = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const summary = await TransactionLedger.aggregate([
    {
      $match: {
        $or: [{ from: userId }, { to: userId }],
        status: "completed",
      },
    },
    {
      $facet: {
        totalIn: [
          { $match: { to: userId } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ],
        totalOut: [
          { $match: { from: userId } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ],
        byType: [
          { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
        ],
        recentTransactions: [
          { $sort: { createdAt: -1 } },
          { $limit: 10 },
          {
            $project: {
              ledgerId: 1,
              type: 1,
              amount: 1,
              status: 1,
              createdAt: 1,
              direction: {
                $cond: [{ $eq: ["$from", userId] }, "out", "in"],
              },
            },
          },
        ],
      },
    },
  ]);

  res.json({
    success: true,
    data: {
      totalIn: summary[0].totalIn[0]?.total || 0,
      totalOut: summary[0].totalOut[0]?.total || 0,
      netBalance: (summary[0].totalIn[0]?.total || 0) - (summary[0].totalOut[0]?.total || 0),
      byType: summary[0].byType.reduce((acc, t) => {
        acc[t._id] = { total: t.total, count: t.count };
        return acc;
      }, {}),
      recentTransactions: summary[0].recentTransactions,
    },
  });
});

// =============================
// ADMIN: GET ALL TRANSACTIONS
// =============================
export const getAllTransactions = asyncHandler(async (req, res) => {
  const { type, status, startDate, endDate, page = 1, limit = 50 } = req.query;

  const query = {};
  if (type) query.type = type;
  if (status) query.status = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const [transactions, total] = await Promise.all([
    TransactionLedger.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("from", "name email")
      .populate("to", "name email")
      .populate("escrow car auction"),
    TransactionLedger.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: transactions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// =============================
// ADMIN: VERIFY SINGLE TRANSACTION
// =============================
export const verifyTransaction = asyncHandler(async (req, res) => {
  const { ledgerId } = req.params;

  const transaction = await TransactionLedger.findOne({ ledgerId });
  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: "Transaction not found",
    });
  }

  // Mark as verified
  transaction.isVerified = true;
  transaction.verifiedAt = new Date();
  transaction.verifiedBy = req.user.id;
  await transaction.save();

  logInfo("Transaction verified by admin", {
    ledgerId,
    adminId: req.user.id,
  });

  res.json({
    success: true,
    data: transaction,
  });
});
