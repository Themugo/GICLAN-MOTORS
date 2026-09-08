// ============================================================
// KAYAD INSPECTION MARKETPLACE - ROUTES
// ============================================================

import express from 'express';
import * as controller from '../controllers/providerController.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/auth.js';
import requireProviderOwnership from '../middleware/requireProviderOwnership.js';
import * as digitalController from '../controllers/digitalInspectionController.js';

const router = express.Router();

/**
 * ============================================================
 * PUBLIC ROUTES
 * ============================================================
 */

// Search providers (public marketplace)
router.get('/providers', controller.searchProviders);

// Get provider profile (public)
router.get('/providers/:providerId', controller.getProviderProfile);

// Get provider reviews (public)
router.get('/providers/:providerId/reviews', controller.getProviderReviews);

// Get available time slots (public)
router.get('/providers/:providerId/slots', controller.getAvailableSlots);

// Get report by share token (public - no auth required)
router.get('/reports/share/:token', controller.getReportByShareToken);

// Get inspection categories (public)
router.get('/categories', controller.getInspectionCategories);

/**
 * ============================================================
 * CUSTOMER ROUTES (Authenticated)
 * ============================================================
 */

// Create booking
router.post('/bookings', requireAuth, controller.createBooking);

// Get customer bookings
router.get('/bookings', requireAuth, controller.getCustomerBookings);

// Get booking by reference
router.get('/bookings/:reference', requireAuth, controller.getBooking);

// Cancel booking
router.post('/bookings/:bookingId/cancel', requireAuth, controller.cancelBooking);

// Submit review
router.post('/reviews', requireAuth, controller.submitReview);


/**
 * ============================================================
 * CANONICAL DIGITAL INSPECTION WORKFORCE
 * ============================================================
 */

// Assigned inspector/customer/admin workflow view
router.get('/bookings/:bookingId/workflow', requireAuth, digitalController.getWorkflow);

// Assigned inspector starts the field inspection and initializes the 150-point engine
router.post('/bookings/:bookingId/workflow/start', requireAuth, digitalController.startWorkflow);

// Inspector executes the ordered digital workflow
router.post('/workflow/:inspectionId/stages/:stageName', requireAuth, digitalController.updateStage);
router.post('/workflow/:inspectionId/points', requireAuth, digitalController.recordPoint);
router.post('/workflow/points/:pointId/evidence', requireAuth, digitalController.addEvidence);
router.post('/workflow/:inspectionId/complete', requireAuth, digitalController.completeWorkflow);
router.post('/workflow/:inspectionId/submit', requireAuth, digitalController.submitWorkflow);
router.post('/workflow/:inspectionId/report', requireAuth, digitalController.generateWorkflowReport);
router.post('/workflow/:inspectionId/customer-review', requireAuth, digitalController.customerReviewWorkflow);
router.post('/workflow/:inspectionId/sign', requireAuth, digitalController.signWorkflow);

/**
 * ============================================================
 * PROVIDER ROUTES (Provider/Admin only)
 * ============================================================
 */

// Provider dashboard
router.get('/provider/:providerId/dashboard', requireAuth, requireProviderOwnership, controller.getProviderDashboard);

// Update provider
router.put('/provider/:providerId', requireAuth, requireProviderOwnership, controller.updateProvider);

// Add credential
router.post('/provider/:providerId/credentials', requireAuth, requireProviderOwnership, controller.addCredential);

// Get provider bookings
router.get('/provider/:providerId/bookings', requireAuth, requireProviderOwnership, controller.getProviderBookings);

// Update booking status
router.post('/provider/:providerId/bookings/:bookingId/status', requireAuth, requireProviderOwnership, controller.updateBookingStatus);

// Assign inspector
router.post('/provider/:providerId/bookings/:bookingId/assign', requireAuth, requireProviderOwnership, controller.assignInspector);

// Create report
router.post('/provider/:providerId/bookings/:bookingId/report', requireAuth, requireProviderOwnership, controller.createReport);

// Generate PDF
router.post('/provider/:providerId/reports/:reportId/pdf', requireAuth, requireProviderOwnership, controller.generatePDF);

// Share report
router.post('/provider/:providerId/reports/:reportId/share', requireAuth, requireProviderOwnership, controller.shareReport);

// Revoke share
router.delete('/provider/:providerId/reports/:reportId/share', requireAuth, requireProviderOwnership, controller.revokeReportShare);

// Get transactions
router.get('/provider/:providerId/transactions', requireAuth, requireProviderOwnership, controller.getTransactions);

// Get settlements
router.get('/provider/:providerId/settlements', requireAuth, requireProviderOwnership, controller.getSettlements);

// Generate settlement
router.post('/provider/:providerId/settlements', requireAuth, requireProviderOwnership, controller.generateSettlement);

// Get earnings summary
router.get('/provider/:providerId/earnings', requireAuth, requireProviderOwnership, controller.getEarningsSummary);

// Get earnings summary (alternative endpoint)
router.get('/provider/:providerId/earnings-summary', requireAuth, requireProviderOwnership, controller.getProviderEarnings);

/**
 * ============================================================
 * ADMIN ROUTES
 * ============================================================
 */

// Process payment (admin)
router.post('/bookings/:bookingId/payment', requireRole(['admin']), controller.processPayment);

// Process refund (admin)
router.post('/bookings/:bookingId/refund', requireRole(['admin']), controller.processRefund);

/**
 * ============================================================
 * LEGACY/REPORT ROUTES (for backward compatibility)
 * ============================================================
 */

// Get report
router.get('/reports/:reportId', requireAuth, controller.getReport);

export default router;
