import LoanApplication from "../models/LoanApplication.js";
import { logError } from "../infrastructure/logging/index.js";

// =============================
// 📝 CREATE LOAN APPLICATION (real applicant submits)
// =============================
export const createLoanApplication = async (req, res) => {
  try {
    const { car, vehiclePrice, depositAmount, loanAmount, termMonths, monthlyIncome, employmentStatus } = req.body;

    if (!vehiclePrice || !loanAmount) {
      return res.status(400).json({ success: false, message: "Vehicle price and loan amount are required" });
    }

    const application = await LoanApplication.create({
      applicant: req.user.id,
      car, vehiclePrice, depositAmount, loanAmount, termMonths, monthlyIncome, employmentStatus,
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

    const existing = await LoanApplication.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }
    if (status && !["submitted", "under_review", "approved", "declined", "withdrawn"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const updates = {};
    if (status) updates.status = status;
    if (reviewerNotes !== undefined) updates.reviewerNotes = reviewerNotes;
    if (status && status !== "submitted") {
      updates.reviewedBy = req.user.id;
      updates.reviewedAt = new Date().toISOString();
    }

    const updated = await LoanApplication.findByIdAndUpdate(id, updates, { new: true });
    res.json({ success: true, data: updated });
  } catch (error) {
    logError("Error updating loan application:", error);
    res.status(500).json({ success: false, message: "Failed to update application" });
  }
};
