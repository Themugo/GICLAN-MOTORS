// ============================================================
// KAYAD 150-POINT DIGITAL INSPECTION ENGINE
// INSPECTION WORKFLOW SERVICE
// ============================================================

import db from '../../db/index.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo, logError } from '../../utils/logger.js';
import crypto from 'crypto';

/**
 * Inspection Workflow Service
 * Manages the 18-stage digital inspection process
 */
class InspectionWorkflowService {
  /**
   * Start a new inspection
   */
  async startInspection(bookingId, providerId, inspectorId) {
    // Verify booking exists
    const booking = await db.findById('inspection_bookings', bookingId);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // Check for existing inspection
    const existing = await db.findOne('digital_inspections', { booking_id: bookingId });
    if (existing) {
      throw new AppError('Inspection already exists for this booking', 400);
    }

    // Create inspection
    const inspection = await db.create('digital_inspections', {
      booking_id: bookingId,
      provider_id: providerId,
      status: 'in_progress',
      current_stage: 'job_verification',
      vehicle_make: booking.vehicle_make,
      vehicle_model: booking.vehicle_model,
      vehicle_year: booking.vehicle_year,
      vehicle_registration: booking.vehicle_registration,
      inspection_started_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Initialize workflow stages
    await this.initializeStages(inspection.id);

    // Create audit log
    await this.logAudit(inspection.id, 'inspection_started', {
      inspectorId,
      bookingId,
    });

    logInfo('Inspection started', { inspectionId: inspection.id, bookingId });
    return inspection;
  }

  /**
   * Initialize all 18 workflow stages
   */
  async initializeStages(inspectionId) {
    const stages = [
      { name: 'job_verification', order: 1, description: 'Verify job details and requirements' },
      { name: 'customer_confirmation', order: 2, description: 'Confirm inspection scope with customer' },
      { name: 'vehicle_identification', order: 3, description: 'Record vehicle identification details' },
      { name: 'exterior_inspection', order: 4, description: 'Exterior body and paint assessment' },
      { name: 'interior_inspection', order: 5, description: 'Interior condition assessment' },
      { name: 'engine_inspection', order: 6, description: 'Engine bay examination' },
      { name: 'transmission_inspection', order: 7, description: 'Transmission and drivetrain' },
      { name: 'suspension_inspection', order: 8, description: 'Suspension system check' },
      { name: 'steering_inspection', order: 9, description: 'Steering system assessment' },
      { name: 'brake_inspection', order: 10, description: 'Brake system evaluation' },
      { name: 'electrical_inspection', order: 11, description: 'Electrical systems check' },
      { name: 'diagnostics', order: 12, description: 'OBD diagnostics and fault codes' },
      { name: 'road_test', order: 13, description: 'Road test assessment' },
      { name: 'safety_systems', order: 14, description: 'Safety systems verification' },
      { name: 'final_assessment', order: 15, description: 'Overall condition assessment' },
      { name: 'customer_review', order: 16, description: 'Customer review of findings' },
      { name: 'digital_signature', order: 17, description: 'Digital signatures and verification' },
      { name: 'report_generation', order: 18, description: 'Generate final report' },
    ];

    for (const stage of stages) {
      await db.create('inspection_stages', {
        inspection_id: inspectionId,
        stage_name: stage.name,
        stage_order: stage.order,
        status: 'pending',
        total_points: 0,
        completed_points: 0,
        created_at: new Date(),
      });
    }

    logInfo('Inspection stages initialized', { inspectionId, count: stages.length });
  }

  /**
   * Get inspection with all details
   */
  async getInspection(inspectionId) {
    const inspection = await db.findById('digital_inspections', inspectionId);
    if (!inspection) {
      throw new AppError('Inspection not found', 404);
    }

    const stages = await db.find('inspection_stages',
      { inspection_id: inspectionId },
      { sort: { stage_order: 1 } }
    );

    const points = await db.find('inspection_points', { inspection_id: inspectionId });
    const defects = await db.find('inspection_defects', { inspection_id: inspectionId });
    const evidence = await this.getEvidenceForInspection(inspectionId);

    return {
      ...inspection,
      stages,
      points,
      defects,
      evidence,
      progress: this.calculateProgress(stages, points),
    };
  }

  /**
   * Get evidence for an inspection
   */
  async getEvidenceForInspection(inspectionId) {
    const points = await db.find('inspection_points', { inspection_id: inspectionId });
    const pointIds = points.map(p => p.id);

    const evidenceMap = {};
    for (const pointId of pointIds) {
      evidenceMap[pointId] = await db.find('inspection_evidence', { point_id: pointId });
    }

    return evidenceMap;
  }

  /**
   * Update current stage
   */
  async updateStage(inspectionId, stageName, status = 'in_progress') {
    const inspection = await db.findById('digital_inspections', inspectionId);
    if (!inspection) {
      throw new AppError('Inspection not found', 404);
    }

    // Update stage
    const stage = await db.findOne('inspection_stages', {
      inspection_id: inspectionId,
      stage_name: stageName,
    });

    if (!stage) {
      throw new AppError('Stage not found', 404);
    }

    const updates = { updated_at: new Date() };
    if (status === 'in_progress' && !stage.started_at) {
      updates.started_at = new Date();
    } else if (status === 'completed') {
      updates.completed_at = new Date();
      updates.status = 'completed';
    }

    await db.update('inspection_stages', stage.id, updates);

    // Update inspection current stage if moving forward
    if (status === 'completed') {
      const nextStage = await db.findOne('inspection_stages', {
        inspection_id: inspectionId,
        stage_order: stage.stage_order + 1,
      });

      if (nextStage) {
        await db.update('digital_inspections', inspectionId, {
          current_stage: nextStage.stage_name,
          updated_at: new Date(),
        });
      } else {
        // All stages completed
        await db.update('digital_inspections', inspectionId, {
          status: 'completed',
          inspection_completed_at: new Date(),
          updated_at: new Date(),
        });
      }
    } else if (status === 'in_progress') {
      await db.update('digital_inspections', inspectionId, {
        current_stage: stageName,
        updated_at: new Date(),
      });
    }

    await this.logAudit(inspectionId, 'stage_updated', {
      stageName,
      status,
    });

    return this.getInspection(inspectionId);
  }

  /**
   * Record an inspection point
   */
  async recordPoint(inspectionId, pointData) {
    const { pointCode, stageName, ...data } = pointData;

    const inspection = await db.findById('digital_inspections', inspectionId);
    if (!inspection) {
      throw new AppError('Inspection not found', 404);
    }

    // Get or create point
    let point = await db.findOne('inspection_points', {
      inspection_id: inspectionId,
      point_code: pointCode,
    });

    if (point) {
      await db.update('inspection_points', point.id, {
        ...data,
        updated_at: new Date(),
      });
    } else {
      const stage = await db.findOne('inspection_stages', {
        inspection_id: inspectionId,
        stage_name: stageName,
      });

      point = await db.create('inspection_points', {
        inspection_id: inspectionId,
        stage_id: stage?.id,
        point_code: pointCode,
        point_name: data.pointName || pointCode,
        display_order: data.displayOrder || 0,
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Update stage progress
    await this.updateStageProgress(inspectionId, stageName);

    // Log defect if rating is requires_attention or critical
    if (data.conditionRating === 'requires_attention' || data.conditionRating === 'critical') {
      await this.createDefectFromPoint(inspectionId, point, data);
    }

    await this.logAudit(inspectionId, 'point_recorded', { pointCode, data });

    return point;
  }

  /**
   * Add evidence to a point
   */
  async addEvidence(pointId, evidenceData) {
    const evidence = await db.create('inspection_evidence', {
      point_id: pointId,
      evidence_type: evidenceData.type,
      file_url: evidenceData.url,
      file_type: evidenceData.fileType,
      thumbnail_url: evidenceData.thumbnailUrl,
      caption: evidenceData.caption,
      measurement_value: evidenceData.measurementValue,
      measurement_unit: evidenceData.measurementUnit,
      diagnostic_code: evidenceData.diagnosticCode,
      diagnostic_description: evidenceData.diagnosticDescription,
      display_order: evidenceData.displayOrder || 0,
      created_at: new Date(),
    });

    logInfo('Evidence added', { pointId, evidenceId: evidence.id, type: evidenceData.type });
    return evidence;
  }

  /**
   * Create defect from inspection point
   */
  async createDefectFromPoint(inspectionId, point, data) {
    const defect = await db.create('inspection_defects', {
      inspection_id: inspectionId,
      point_id: point.id,
      defect_title: data.pointName || point.point_name,
      defect_description: data.inspectorNotes,
      classification: data.defectClassification || 'maintenance',
      severity: data.conditionRating === 'critical' ? 'critical' : 'medium',
      recommendation: data.recommendation,
      created_at: new Date(),
    });

    return defect;
  }

  /**
   * Update stage progress
   */
  async updateStageProgress(inspectionId, stageName) {
    const stage = await db.findOne('inspection_stages', {
      inspection_id: inspectionId,
      stage_name: stageName,
    });

    if (!stage) return;

    const points = await db.find('inspection_points', { stage_id: stage.id });
    const completedPoints = points.filter(p => p.condition_rating);

    await db.update('inspection_stages', stage.id, {
      total_points: points.length,
      completed_points: completedPoints.length,
      updated_at: new Date(),
    });
  }

  /**
   * Calculate overall progress
   */
  calculateProgress(stages, points) {
    const totalPoints = stages.reduce((sum, s) => sum + s.total_points, 0);
    const completedPoints = stages.reduce((sum, s) => sum + s.completed_points, 0);
    const completedStages = stages.filter(s => s.status === 'completed').length;

    return {
      pointsPercentage: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
      stagesPercentage: Math.round((completedStages / stages.length) * 100),
      completedStages,
      totalStages: stages.length,
      completedPoints,
      totalPoints,
    };
  }

  /**
   * Complete inspection and calculate scores
   */
  async completeInspection(inspectionId, inspectorId) {
    const inspection = await this.getInspection(inspectionId);

    // Calculate scores
    const scores = this.calculateScores(inspection.points, inspection.defects);

    // Update inspection
    const updates = {
      ...scores,
      status: 'completed',
      inspection_completed_at: new Date(),
      updated_at: new Date(),
    };

    await db.update('digital_inspections', inspectionId, updates);

    // Update final stage
    await this.updateStage(inspectionId, 'report_generation', 'completed');

    await this.logAudit(inspectionId, 'inspection_completed', {
      inspectorId,
      scores,
    });

    logInfo('Inspection completed', { inspectionId, scores });
    return this.getInspection(inspectionId);
  }

  /**
   * Calculate condition scores
   */
  calculateScores(points, defects) {
    // Category weights
    const categories = {
      exterior: { weight: 0.15, points: 30 },
      interior: { weight: 0.10, points: 20 },
      engine: { weight: 0.20, points: 15 },
      transmission: { weight: 0.10, points: 10 },
      suspension: { weight: 0.08, points: 10 },
      steering: { weight: 0.05, points: 8 },
      brakes: { weight: 0.10, points: 12 },
      electrical: { weight: 0.10, points: 15 },
      road_test: { weight: 0.07, points: 15 },
      safety: { weight: 0.05, points: 15 },
    };

    // Calculate category scores
    const categoryScores = {};
    let totalScore = 0;
    let totalWeight = 0;

    for (const [category, config] of Object.entries(categories)) {
      const categoryPoints = points.filter(p => p.category === category);
      const ratedPoints = categoryPoints.filter(p =>
        p.condition_rating && p.condition_rating !== 'not_tested' && p.condition_rating !== 'not_applicable'
      );

      if (ratedPoints.length > 0) {
        const score = ratedPoints.reduce((sum, p) => {
          const ratingScores = {
            excellent: 100,
            good: 85,
            fair: 70,
            requires_attention: 40,
            critical: 20,
          };
          return sum + (ratingScores[p.condition_rating] || 50);
        }, 0) / ratedPoints.length;

        categoryScores[category] = Math.round(score);
        totalScore += score * config.weight;
        totalWeight += config.weight;
      }
    }

    const overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    const grade = this.calculateGrade(overallScore);

    // Count defects by severity
    const defectCounts = {
      critical: defects.filter(d => d.severity === 'critical').length,
      high: defects.filter(d => d.severity === 'high').length,
      medium: defects.filter(d => d.severity === 'medium').length,
      low: defects.filter(d => d.severity === 'low').length,
    };

    return {
      mechanical_score: Math.round((categoryScores.engine || 0 + categoryScores.transmission || 0) / 2),
      safety_score: Math.round((categoryScores.brakes || 0 + categoryScores.safety || 0) / 2),
      body_score: categoryScores.exterior || 0,
      interior_score: categoryScores.interior || 0,
      electrical_score: categoryScores.electrical || 0,
      roadworthiness_score: overallScore,
      overall_score: overallScore,
      overall_grade: grade,
      defect_counts: defectCounts,
    };
  }

  /**
   * Calculate grade from score
   */
  calculateGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'A-';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    if (score >= 50) return 'C-';
    return 'D';
  }

  /**
   * Submit inspection for review
   */
  async submitForReview(inspectionId, inspectorId) {
    const inspection = await db.findById('digital_inspections', inspectionId);
    if (!inspection) {
      throw new AppError('Inspection not found', 404);
    }

    if (inspection.status !== 'completed') {
      throw new AppError('Inspection must be completed before submission', 400);
    }

    // Validate inspection
    const validation = await this.validateInspection(inspectionId);
    if (!validation.isValid) {
      throw new AppError(`Inspection validation failed: ${validation.errors.join(', ')}`, 400);
    }

    await db.update('digital_inspections', inspectionId, {
      status: 'submitted',
      submitted_at: new Date(),
      updated_at: new Date(),
    });

    await this.logAudit(inspectionId, 'inspection_submitted', { inspectorId });

    logInfo('Inspection submitted for review', { inspectionId });
    return this.getInspection(inspectionId);
  }

  /**
   * Validate inspection completeness
   */
  async validateInspection(inspectionId) {
    const inspection = await this.getInspection(inspectionId);
    const errors = [];
    const warnings = [];

    // Check all stages completed
    const incompleteStages = inspection.stages.filter(s => s.status !== 'completed');
    if (incompleteStages.length > 0) {
      errors.push(`Incomplete stages: ${incompleteStages.map(s => s.stage_name).join(', ')}`);
    }

    // Check mandatory photos
    const pointsRequiringPhoto = inspection.points.filter(p => p.requires_photo && !p.condition_rating);
    if (pointsRequiringPhoto.length > 0) {
      warnings.push(`${pointsRequiringPhoto.length} points require photo evidence`);
    }

    // Check critical defects have evidence
    const criticalDefects = inspection.defects.filter(d => d.severity === 'critical');
    for (const defect of criticalDefects) {
      const evidence = await db.find('inspection_evidence', { point_id: defect.point_id });
      if (evidence.length === 0) {
        errors.push(`Critical defect "${defect.defect_title}" requires evidence`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Log audit event
   */
  async logAudit(inspectionId, actionType, details) {
    await db.create('inspection_audit_logs', {
      inspection_id: inspectionId,
      action_type: actionType,
      action_description: this.getActionDescription(actionType),
      entity_type: 'inspection',
      entity_id: inspectionId,
      details: details,
      created_at: new Date(),
    });
  }

  /**
   * Get human-readable action description
   */
  getActionDescription(actionType) {
    const descriptions = {
      inspection_started: 'Inspection started',
      stage_updated: 'Stage status updated',
      point_recorded: 'Inspection point recorded',
      evidence_added: 'Evidence added',
      defect_created: 'Defect recorded',
      inspection_completed: 'Inspection completed',
      inspection_submitted: 'Inspection submitted for review',
    };
    return descriptions[actionType] || actionType;
  }

  /**
   * Get inspection workflow template (150 points)
   */
  getInspectionTemplate() {
    return {
      stages: [
        { name: 'job_verification', order: 1, points: 5 },
        { name: 'customer_confirmation', order: 2, points: 3 },
        { name: 'vehicle_identification', order: 3, points: 15 },
        { name: 'exterior_inspection', order: 4, points: 30 },
        { name: 'interior_inspection', order: 5, points: 20 },
        { name: 'engine_inspection', order: 6, points: 15 },
        { name: 'transmission_inspection', order: 7, points: 10 },
        { name: 'suspension_inspection', order: 8, points: 10 },
        { name: 'steering_inspection', order: 9, points: 8 },
        { name: 'brake_inspection', order: 10, points: 12 },
        { name: 'electrical_inspection', order: 11, points: 15 },
        { name: 'diagnostics', order: 12, points: 8 },
        { name: 'road_test', order: 13, points: 15 },
        { name: 'safety_systems', order: 14, points: 15 },
        { name: 'final_assessment', order: 15, points: 5 },
        { name: 'customer_review', order: 16, points: 3 },
        { name: 'digital_signature', order: 17, points: 2 },
        { name: 'report_generation', order: 18, points: 4 },
      ],
      totalPoints: 195, // Including job and customer stages
      inspectionPoints: 150, // Actual vehicle inspection points
    };
  }
}

export const inspectionWorkflowService = new InspectionWorkflowService();
export default inspectionWorkflowService;
