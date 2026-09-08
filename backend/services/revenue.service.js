import { findAll } from "../db/index.js";

export const calculateRevenue = async ({ startDate, endDate } = {}) => {
  const filters = { status: "success" };

  if (startDate || endDate) {
    filters.createdAt = {};
    if (startDate) filters.createdAt.$gte = new Date(startDate).toISOString();
    if (endDate) filters.createdAt.$lte = new Date(endDate).toISOString();
  }

  const payments = await findAll("payments", { filters });

  const total = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  return { total, transactions: payments.length };
};
