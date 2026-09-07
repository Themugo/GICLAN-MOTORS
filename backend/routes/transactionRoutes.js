// backend/routes/transactionRoutes.js
import express from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import { getUserPayments, getPaymentById } from "../controllers/paymentController.js";
import { findAll } from "../db/index.js";

const router = express.Router();
router.use(protect);

router.get("/", asyncHandler(getUserPayments));
router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const payments = await findAll("payments", { filters: { user: req.user.id }, select: "id amount type status createdAt" });
    const total = payments.filter((p) => p.status === "success").reduce((s, p) => s + p.amount, 0);
    const byType = payments.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + p.amount;
      return acc;
    }, {});
    res.json({ success: true, total, byType, count: payments.length });
  }),
);
router.get("/:id", asyncHandler(getPaymentById));

export default router;
