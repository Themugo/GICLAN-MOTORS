// ============================================================
// KAYAD INSPECTION MARKETPLACE - CONTROLLERS
// ============================================================

import asyncHandler from '../../middleware/asyncHandler.js';
import { response } from '../../utils/response.js';
import { providerService, bookingService, reportService, settlementService } from '../services/index.js';
import db from '../services/dbAdapter.js';
import { assertStaffAssignable } from '../services/workforceService.js';

/**
 * ============================================================
 * PROVIDER CONTROLLERS
 * ============================================================
 */

// Search providers
export const searchProviders = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,
    verified: req.query.verified === 'true',
    country: req.query.country,
    county: req.query.county,
    town: req.query.town,
    mobileOnly: req.query.mobileOnly === 'true',
    workshopOnly: req.query.workshopOnly === 'true',
    sameDayAvailable: req.query.sameDayAvailable === 'true',
    weekendAvailable: req.query.weekendAvailable === 'true',
    vehicleTypes: req.query.vehicleTypes ? req.query.vehicleTypes.split(',') : null,
    inspectionType: req.query.inspectionType,
    commercialVehicles: req.query.commercialVehicles === 'true',
    electricVehicles: req.query.electricVehicles === 'true',
    luxuryVehicles: req.query.luxuryVehicles === 'true',
    minRating: parseFloat(req.query.minRating) || null,
    sortBy: req.query.sortBy,
    page: req.query.page,
    limit: req.query.limit,
  };

  const providers = await providerService.searchProviders(filters);
  response.success(res, providers);
});

// Get provider profile (public)
export const getProviderProfile = asyncHandler(async (req, res) => {
  const profile = await providerService.getProviderProfile(req.params.providerId);
  response.success(res, profile);
});

// Get provider dashboard (provider view)
export const getProviderDashboard = asyncHandler(async (req, res) => {
  const dashboard = await providerService.getProviderDashboard(req.params.providerId);
  response.success(res, dashboard);
});

// Create provider
export const createProvider = asyncHandler(async (req, res) => {
  const provider = await providerService.createProvider(req.body, req.user.id);
  response.created(res, provider);
});

// Update provider
export const updateProvider = asyncHandler(async (req, res) => {
  const provider = await providerService.updateProvider(req.params.providerId, req.body);
  response.success(res, provider);
});

// Get provider earnings
export const getProviderEarnings = asyncHandler(async (req, res) => {
  const earnings = await providerService.getEarningsSummary(
    req.params.providerId,
    req.query.period || 'monthly'
  );
  response.success(res, earnings);
});

// Add credential
export const addCredential = asyncHandler(async (req, res) => {
  const credential = await providerService.addCredential(req.params.providerId, req.body);
  response.created(res, credential);
});

/**
 * ============================================================
 * BOOKING CONTROLLERS
 * ============================================================
 */

// Create booking
export const createBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.createBooking(req.body, req.user.id);
  response.created(res, booking);
});

// Get booking by reference
export const getBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.getBookingByReference(req.params.reference);
  const details = await bookingService.getBookingDetails(booking.id, 'customer', req.user.id);
  response.success(res, details);
});

// Get customer bookings
export const getCustomerBookings = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,
    upcoming: req.query.upcoming === 'true',
  };
  const bookings = await bookingService.getCustomerBookings(req.user.id, filters);
  response.success(res, { bookings });
});

// Get provider bookings
export const getProviderBookings = asyncHandler(async (req, res) => {
  const provider = req.provider || await providerService.getProviderById(req.params.providerId);
  if (!provider) {
    response.notFound(res, 'Provider not found');
    return;
  }

  const result = await bookingService.getProviderBookings(provider.id, req.query);
  response.success(res, result);
});

// Update booking status
export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const booking = await bookingService.updateBookingStatus(
    req.params.bookingId,
    status,
    req.user.id,
    req.body.staffId,
    notes,
    req.params.providerId
  );
  response.success(res, booking);
});

// Assign inspector
export const assignInspector = asyncHandler(async (req, res) => {
  const { staffId } = req.body;
  await assertStaffAssignable(req.params.providerId, staffId);
  const booking = await bookingService.assignInspector(
    req.params.bookingId,
    staffId,
    req.user.id,
    req.params.providerId
  );
  response.success(res, booking);
});

// Cancel booking
export const cancelBooking = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const result = await bookingService.cancelBooking(
    req.params.bookingId,
    reason,
    req.user.id
  );
  response.success(res, result);
});

// Get available slots
export const getAvailableSlots = asyncHandler(async (req, res) => {
  const { date, staffId } = req.query;
  const slots = await bookingService.getAvailableSlots(req.params.providerId, date, staffId);
  response.success(res, slots);
});

/**
 * ============================================================
 * REPORT CONTROLLERS
 * ============================================================
 */

// Create report
export const createReport = asyncHandler(async (req, res) => {
  const report = await reportService.createReport(
    req.params.bookingId,
    req.body,
    req.user.id,
    req.params.providerId
  );
  response.created(res, report);
});

// Get report
export const getReport = asyncHandler(async (req, res) => {
  const report = await reportService.getReportDetails(req.params.reportId, {
    userId: req.user.id,
    role: req.user.role,
  });
  response.success(res, report);
});

// Get report by share token
export const getReportByShareToken = asyncHandler(async (req, res) => {
  const report = await reportService.getReportByShareToken(req.params.token);
  response.success(res, report);
});

// Generate PDF
export const generatePDF = asyncHandler(async (req, res) => {
  const result = await reportService.generatePDF(req.params.reportId, { providerId: req.params.providerId, userId: req.user.id, role: req.user.role });
  response.success(res, result);
});

// Share report
export const shareReport = asyncHandler(async (req, res) => {
  const result = await reportService.shareReport(req.params.reportId, req.body, { providerId: req.params.providerId, userId: req.user.id, role: req.user.role });
  response.success(res, result);
});

// Revoke share
export const revokeReportShare = asyncHandler(async (req, res) => {
  await reportService.revokeShare(req.params.reportId, { providerId: req.params.providerId, userId: req.user.id, role: req.user.role });
  response.success(res, { message: 'Share revoked' });
});

// Get inspection categories
export const getInspectionCategories = asyncHandler(async (req, res) => {
  const categories = reportService.getInspectionCategories();
  response.success(res, { categories });
});

/**
 * ============================================================
 * PAYMENT & SETTLEMENT CONTROLLERS
 * ============================================================
 */

// Process payment
export const processPayment = asyncHandler(async (req, res) => {
  const result = await settlementService.processPayment(req.params.bookingId, req.body);
  response.success(res, result);
});

// Process refund
export const processRefund = asyncHandler(async (req, res) => {
  const result = await settlementService.processRefund(
    req.params.bookingId,
    req.body,
    req.user.id
  );
  response.success(res, result);
});

// Generate settlement
export const generateSettlement = asyncHandler(async (req, res) => {
  const { periodStart, periodEnd } = req.body;
  const result = await settlementService.generateSettlement(
    req.params.providerId,
    periodStart,
    periodEnd
  );
  response.created(res, result);
});

// Get transactions
export const getTransactions = asyncHandler(async (req, res) => {
  const result = await settlementService.getProviderTransactions(
    req.params.providerId,
    req.query
  );
  response.success(res, result);
});

// Get settlements
export const getSettlements = asyncHandler(async (req, res) => {
  const result = await settlementService.getProviderSettlements(
    req.params.providerId,
    req.query
  );
  response.success(res, { settlements: result });
});

// Get earnings summary
export const getEarningsSummary = asyncHandler(async (req, res) => {
  const result = await settlementService.getEarningsSummary(
    req.params.providerId,
    req.query.period || 'monthly'
  );
  response.success(res, result);
});

/**
 * ============================================================
 * REVIEW CONTROLLERS
 * ============================================================
 */

// Submit review
export const submitReview = asyncHandler(async (req, res) => {
  const { bookingId, ratings, reviewText } = req.body;
  
  const review = {
    booking_id: bookingId,
    provider_id: req.body.providerId,
    customer_id: req.user.id,
    overall_rating: ratings.overall,
    professionalism_rating: ratings.professionalism,
    thoroughness_rating: ratings.thoroughness,
    timeliness_rating: ratings.timeliness,
    communication_rating: ratings.communication,
    review_text: reviewText,
    is_verified: true,
    created_at: new Date(),
  };

  const result = await db.create('inspection_reviews', review);

  // Update provider ratings
  await providerService.updateProviderRatings(req.body.providerId);

  response.created(res, result);
});

// Get provider reviews
export const getProviderReviews = asyncHandler(async (req, res) => {
  const reviews = await db.find('inspection_reviews', {
    provider_id: req.params.providerId,
    is_published: true
  }, { 
    sort: { created_at: -1 },
    limit: parseInt(req.query.limit) || 20 
  });
  response.success(res, { reviews });
});

export default {
  // Provider
  searchProviders,
  getProviderProfile,
  getProviderDashboard,
  createProvider,
  updateProvider,
  getProviderEarnings,
  addCredential,
  // Booking
  createBooking,
  getBooking,
  getCustomerBookings,
  getProviderBookings,
  updateBookingStatus,
  assignInspector,
  cancelBooking,
  getAvailableSlots,
  // Report
  createReport,
  getReport,
  getReportByShareToken,
  generatePDF,
  shareReport,
  revokeReportShare,
  getInspectionCategories,
  // Payment
  processPayment,
  processRefund,
  generateSettlement,
  getTransactions,
  getSettlements,
  getEarningsSummary,
  // Review
  submitReview,
  getProviderReviews,
};
