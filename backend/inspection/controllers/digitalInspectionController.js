import asyncHandler from '../../middleware/asyncHandler.js';
import { response } from '../../utils/response.js';
import db from '../services/dbAdapter.js';
import { inspectionWorkflowService } from '../../digitalInspection/services/inspectionWorkflowService.js';
import { assertInspectorAccess } from '../services/workforceService.js';
import { reportGenerationService } from '../../digitalInspection/services/reportGenerationService.js';
import { AppError } from '../../utils/AppError.js';

const getBooking = async (bookingId) => {
  const booking = await db.findById('inspection_bookings', bookingId);
  if (!booking) throw new AppError('Booking not found', 404);
  return booking;
};

export const getWorkflow = asyncHandler(async (req, res) => {
  const booking = await getBooking(req.params.bookingId);
  const staff = await assertInspectorAccess(booking, req.user.id, req.user.role);
  const inspection = await db.findOne('digital_inspections', { booking_id: booking.id });
  if (!inspection) return response.success(res, { inspection: null, booking });
  const details = await inspectionWorkflowService.getInspection(inspection.id);
  response.success(res, { booking, inspection: details, inspector: { id: staff.id, userId: staff.user_id } });
});

export const startWorkflow = asyncHandler(async (req, res) => {
  const booking = await getBooking(req.params.bookingId);
  const staff = await assertInspectorAccess(booking, req.user.id, req.user.role);
  if (String(staff.user_id) !== String(req.user.id) && !['admin','superadmin'].includes(req.user.role)) {
    throw new AppError('Only the assigned inspector can start field work', 403);
  }
  const result = await inspectionWorkflowService.startInspection(booking.id, booking.provider_id, staff.id);
  response.success(res, result);
});

export const updateStage = asyncHandler(async (req, res) => {
  const inspection = await db.findById('digital_inspections', req.params.inspectionId);
  if (!inspection) throw new AppError('Inspection not found', 404);
  const booking = await getBooking(inspection.booking_id);
  await assertInspectorAccess(booking, req.user.id, req.user.role);
  const result = await inspectionWorkflowService.updateStage(
    inspection.id,
    req.params.stageName,
    req.body.status || 'in_progress'
  );
  response.success(res, result);
});

export const recordPoint = asyncHandler(async (req, res) => {
  const inspection = await db.findById('digital_inspections', req.params.inspectionId);
  if (!inspection) throw new AppError('Inspection not found', 404);
  const booking = await getBooking(inspection.booking_id);
  await assertInspectorAccess(booking, req.user.id, req.user.role);
  const result = await inspectionWorkflowService.recordPoint(inspection.id, req.body);
  response.success(res, result);
});

export const addEvidence = asyncHandler(async (req, res) => {
  const point = await db.findById('inspection_points', req.params.pointId);
  if (!point) throw new AppError('Inspection point not found', 404);
  const inspection = await db.findById('digital_inspections', point.inspection_id);
  const booking = await getBooking(inspection.booking_id);
  await assertInspectorAccess(booking, req.user.id, req.user.role);
  const result = await inspectionWorkflowService.addEvidence(point.id, req.body);
  response.created(res, result);
});

export const completeWorkflow = asyncHandler(async (req, res) => {
  const inspection = await db.findById('digital_inspections', req.params.inspectionId);
  if (!inspection) throw new AppError('Inspection not found', 404);
  const booking = await getBooking(inspection.booking_id);
  const staff = await assertInspectorAccess(booking, req.user.id, req.user.role);
  const result = await inspectionWorkflowService.completeInspection(inspection.id, staff.id);
  response.success(res, result);
});

export const submitWorkflow = asyncHandler(async (req, res) => {
  const inspection = await db.findById('digital_inspections', req.params.inspectionId);
  if (!inspection) throw new AppError('Inspection not found', 404);
  const booking = await getBooking(inspection.booking_id);
  const staff = await assertInspectorAccess(booking, req.user.id, req.user.role);
  const result = await inspectionWorkflowService.submitForReview(inspection.id, staff.id);
  response.success(res, result);
});

export const generateWorkflowReport = asyncHandler(async (req, res) => {
  const inspection = await db.findById('digital_inspections', req.params.inspectionId);
  if (!inspection) throw new AppError('Inspection not found', 404);
  const booking = await getBooking(inspection.booking_id);
  await assertInspectorAccess(booking, req.user.id, req.user.role);
  if (!['completed', 'submitted', 'under_review', 'approved', 'published'].includes(inspection.status)) {
    throw new AppError('Inspection must be completed before report generation', 409);
  }
  const report = await reportGenerationService.generateReport(inspection.id, { actorId: req.user.id });
  if (booking.status === 'inspection_complete') {
    await db.update('inspection_bookings', booking.id, {
      status: 'report_generated',
      status_changed_at: new Date(),
      updated_at: new Date(),
    });
    await db.create('inspection_status_history', {
      booking_id: booking.id,
      from_status: 'inspection_complete',
      to_status: 'report_generated',
      changed_by: req.user.id,
      staff_id: booking.assigned_staff_id,
      notes: 'Digital inspection report generated',
      created_at: new Date(),
    });
  }
  response.created(res, report);
});


export const customerReviewWorkflow = asyncHandler(async (req, res) => {
  const inspection = await db.findById('digital_inspections', req.params.inspectionId);
  if (!inspection) throw new AppError('Inspection not found', 404);
  const booking = await getBooking(inspection.booking_id);
  if (String(booking.customer_id) !== String(req.user.id)) {
    throw new AppError('Only the booking customer can review this inspection', 403);
  }
  if (!['submitted', 'under_review', 'approved'].includes(inspection.status)) {
    throw new AppError('Inspection is not ready for customer review', 409);
  }

  await db.update('digital_inspections', inspection.id, {
    customer_reviewed_at: new Date(),
    customer_review_notes: req.body.notes || null,
    status: 'approved',
    updated_at: new Date(),
  });
  const reviewStage = await db.findOne('inspection_stages', {
    inspection_id: inspection.id,
    stage_name: 'customer_review',
  });
  if (reviewStage) await db.update('inspection_stages', reviewStage.id, {
    status: 'completed',
    completed_at: new Date(),
    updated_at: new Date(),
  });
  await db.create('inspection_audit_logs', {
    inspection_id: inspection.id,
    action_type: 'customer_reviewed',
    action_description: 'Customer reviewed inspection findings',
    entity_type: 'inspection',
    entity_id: inspection.id,
    performed_by: req.user.id,
    new_state: { notes: req.body.notes || null },
    created_at: new Date(),
  });

  response.success(res, await inspectionWorkflowService.getInspection(inspection.id));
});

export const signWorkflow = asyncHandler(async (req, res) => {
  const inspection = await db.findById('digital_inspections', req.params.inspectionId);
  if (!inspection) throw new AppError('Inspection not found', 404);
  const booking = await getBooking(inspection.booking_id);
  const staff = await assertInspectorAccess(booking, req.user.id, req.user.role);
  const signature = String(req.body.signature || '').trim();
  if (!signature) throw new AppError('Signature is required', 400);
  if (inspection.status !== 'approved') throw new AppError('Customer review must be completed before signing', 409);

  await db.update('digital_inspections', inspection.id, {
    inspector_signature: signature,
    inspector_signed_at: new Date(),
    status: 'published',
    published_at: new Date(),
    updated_at: new Date(),
  });
  const stage = await db.findOne('inspection_stages', {
    inspection_id: inspection.id,
    stage_name: 'digital_signature',
  });
  if (stage) await db.update('inspection_stages', stage.id, {
    status: 'completed',
    completed_at: new Date(),
    updated_at: new Date(),
  });
  const reportStage = await db.findOne('inspection_stages', {
    inspection_id: inspection.id,
    stage_name: 'report_generation',
  });
  if (reportStage) await db.update('inspection_stages', reportStage.id, {
    status: 'completed',
    completed_at: new Date(),
    updated_at: new Date(),
  });
  if (booking.status === 'report_generated') {
    await db.update('inspection_bookings', booking.id, {
      status: 'closed',
      status_changed_at: new Date(),
      updated_at: new Date(),
    });
    await db.create('inspection_status_history', {
      booking_id: booking.id,
      from_status: 'report_generated',
      to_status: 'closed',
      changed_by: req.user.id,
      staff_id: staff.id,
      notes: 'Customer review completed; inspector signed report',
      created_at: new Date(),
    });
  }
  response.success(res, await inspectionWorkflowService.getInspection(inspection.id));
});
