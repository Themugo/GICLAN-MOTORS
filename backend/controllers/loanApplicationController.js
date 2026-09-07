import LoanApplication from "../models/LoanApplication.js";
import { logError } from "../infrastructure/logging/index.js";

// =============================
// 📝 CREATE LOAN APPLICATION (real applicant submits)
// =============================
export const createLoanApplication = async (req, res) => {
  try {
    const { car, vehiclePrice, depositAmount = 0, loanAmount, termMonths, monthlyIncome, employmentStatus } = req.body;
    const price = Number(vehiclePrice);
    const deposit = Number(depositAmount);
    const requestedLoan = Number(loanAmount);
    const term = Number(termMonths);

    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(requestedLoan) || requestedLoan <= 0) {
      return res.status(400).json({ success: false, message: "Vehicle price and loan amount must be positive numbers" });
    }
    if (!Number.isFinite(deposit) || deposit < 0 || deposit > price || Math.abs((price - deposit) - requestedLoan) > 0.01) {
      return res.status(400).json({ success: false, message: "Deposit and loan amount must match the vehicle price" });
    }
    if (![24, 36, 48, 60].includes(term)) {
      return res.status(400).json({ success: false, message: "Term must be 24, 36, 48, or 60 months" });
    }
    if (monthlyIncome !== undefined && (!Number.isFinite(Number(monthlyIncome)) || Number(monthlyIncome) <= 0)) {
      return res.status(400).json({ success: false, message: "Monthly income must be a positive number" });
    }
    if (!['employed', 'self_employed', 'business_owner'].includes(employmentStatus)) {
      return res.status(400).json({ success: false, message: "Invalid employment status" });
    }

    const application = await LoanApplication.create({
      applicant: req.user.id,
      car: car || undefined,
      vehiclePrice: price,
      depositAmount: deposit,
      loanAmount: requestedLoan,
      termMonths: term,
      monthlyIncome: monthlyIncome === undefined ? undefined : Number(monthlyIncome),
      employmentStatus,
      status: "submitted",
    });

    res.status(201).json({ success: true, data: application });
  } catch (error) {
    logError("Error creating loan application:", error);
    res.status(500).json({ success: false, message: "Failed to submit application" });
  }
};

// =============================
// 📋 GET MY LOAN APPLICATIONS (the real, signed-in applicant's own)
// =============================
export const getMyLoanApplications = async (req, res) => {
  try {
    const applications = await LoanApplication.find({ applicant: req.user.id })
      .populate("car")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: applications });
  } catch (error) {
    logError("Error fetching loan applications:", error);
    res.status(500).json({ success: false, message: "Failed to load your applications" });
  }
};

// =============================
// 📋 GET ALL LOAN APPLICATIONS (ADMIN)
// =============================
export const getAllLoanApplications = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const applications = await LoanApplication.find(filter)
      .populate("applicant", "name email phone")
      .populate("car")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: applications });
  } catch (error) {
    logError("Error fetching all loan applications:", error);
    res.status(500).json({ success: false, message: "Failed to load applications" });
  }
};

// =============================
// ✏️ UPDATE LOAN APPLICATION STATUS (ADMIN)
// =============================
export const updateLoanApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewerNotes } = req.body;
    const allowed = new Set(["submitted", "under_review", "approved", "declined", "withdrawn"]);
    if (!allowed.has(status)) return res.status(400).json({ success: false, message: "Invalid status" });

    const existing = await LoanApplication.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: "Application not found" });

    const transitions = {
      submitted: new Set(["under_review", "withdrawn"]),
      under_review: new Set(["approved", "declined", "withdrawn"]),
      approved: new Set(),
      declined: new Set(),
      withdrawn: new Set(),
    };
    if (status !== existing.status && !transitions[existing.status]?.has(status)) {
      return res.status(409).json({ success: false, message: `Cannot move application from ${existing.status} to ${status}` });
    }

    const updates = {
      status,
      ...(reviewerNotes !== undefined ? { reviewerNotes: String(reviewerNotes).trim() } : {}),
      reviewedBy: req.user.id,
      reviewedAt: new Date().toISOString(),
    };
    const updated = await LoanApplication.findByIdAndUpdate(id, updates, { new: true });
    res.json({ success: true, data: updated });
  } catch (error) {
    logError("Error updating loan application:", error);
    res.status(500).json({ success: false, message: "Failed to update application" });
  }
};
