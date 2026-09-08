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
    const booking = await db.findById('inspection_bookings', bookingId);
    if (!booking) throw new AppError('Booking not found', 404);
    if (String(booking.provider_id) !== String(providerId)) {
      throw new AppError('Booking does not belong to this provider', 403);
    }
    if (!booking.assigned_staff_id || String(booking.assigned_staff_id) !== String(inspectorId)) {
      throw new AppError('Inspector is not assigned to this booking', 403);
    }
    if (booking.payment_status !== 'fully_paid') {
      throw new AppError('Inspection payment must be fully settled before field work', 409);
    }
    if (!['inspector_assigned', 'travelling'].includes(booking.status)) {
      throw new AppError(`Booking cannot start inspection from ${booking.status}`, 400);
    }

    const staff = await db.findById('inspection_staff', inspectorId);
    if (!staff || !staff.is_active || String(staff.provider_id) !== String(providerId)) {
      throw new AppError('Inspector is inactive or invalid', 403);
    }
    if (!staff.user_id) throw new AppError('Inspector has no linked user account', 409);

    let existing = await db.findOne('digital_inspections', { booking_id: bookingId });
    if (existing) {
      if (existing.status === 'archived') throw new AppError('Inspection is archived', 409);
      return existing;
    }

    const inspection = await db.create('digital_inspections', {
      booking_id: bookingId,
      provider_id: providerId,
      inspector_id: staff.user_id,
      status: 'in_progress',
      current_stage: 'job_verification',
      vehicle_make: booking.vehicle_make,
      vehicle_model: booking.vehicle_model,
      vehicle_year: booking.vehicle_year,
      vehicle_registration: booking.vehicle_registration,
      vehicle_vin: booking.vehicle_vin,
      inspection_latitude: booking.inspection_latitude,
      inspection_longitude: booking.inspection_longitude,
      inspection_location_name: booking.inspection_address || booking.inspection_town,
      inspection_started_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });

    await this.initializeStages(inspection.id);
    await this.logAudit(inspection.id, 'inspection_started', {
      inspectorId,
      bookingId,
      providerId,
    });

    // Keep the booking lifecycle authoritative and synchronized.
    if (booking.status !== 'inspection_started') {
      await db.update('inspection_bookings', bookingId, {
        status: 'inspection_started',
        status_changed_at: new Date(),
        started_at: new Date(),
        updated_at: new Date(),
      });
      await db.create('inspection_status_history', {
        booking_id: bookingId,
        from_status: booking.status,
        to_status: 'inspection_started',
        changed_by: staff.user_id,
        staff_id: inspectorId,
        notes: 'Digital inspection session started',
        created_at: new Date(),
      });
    }

    await db.update('inspection_staff', inspectorId, {
      is_available: false,
      updated_at: new Date(),
    });

    logInfo('Inspection started', { inspectionId: inspection.id, bookingId, inspectorId });
    return this.getInspection(inspection.id);
  }

  /**
   * Initialize all 18 workflow stages
   */
  async initializeStages(inspectionId) {
    const template = this.getInspectionTemplate();
    const categoryItems = this.getInspectionPointDefinitions();

    for (const stage of template.stages) {
      const stageRow = await db.create('inspection_stages', {
        inspection_id: inspectionId,
        stage_name: stage.name,
        stage_order: stage.order,
        status: stage.order === 1 ? 'in_progress' : 'pending',
        started_at: stage.order === 1 ? new Date() : null,
        total_points: stage.name === 'vehicle_identification' ? 0 : (categoryItems[stage.name]?.length || 0),
        completed_points: 0,
        created_at: new Date(),
      });

      const definitions = categoryItems[stage.name] || [];
      for (let i = 0; i < definitions.length; i += 1) {
        const item = definitions[i];
        await db.create('inspection_points', {
          inspection_id: inspectionId,
          stage_id: stageRow.id,
          point_code: item.code,
          point_name: item.name,
          point_description: item.description,
          category: item.category,
          display_order: i + 1,
          is_mandatory: true,
          requires_photo: item.requiresPhoto || false,
          requires_diagnostic: item.requiresDiagnostic || false,
          severity_level: 'medium',
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
    logInfo('Inspection stages and checklist initialized', {
      inspectionId,
      stages: template.stages.length,
      vehiclePoints: Object.values(categoryItems).flat().length,
    });
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
    if (!inspection) throw new AppError('Inspection not found', 404);
    if (!['in_progress', 'completed'].includes(status)) {
      throw new AppError('Invalid stage status', 400);
    }
    const stage = await db.findOne('inspection_stages', { inspection_id: inspectionId, stage_name: stageName });
    if (!stage) throw new AppError('Stage not found', 404);

    if (status === 'in_progress' && inspection.current_stage !== stageName) {
      throw new AppError(`Current workflow stage is ${inspection.current_stage}`, 409);
    }
    if (status === 'completed' && inspection.current_stage !== stageName) {
      throw new AppError(`Cannot complete stage ${stageName} before ${inspection.current_stage}`, 409);
    }

    if (status === 'completed') {
      const incompleteRequired = await db.find('inspection_points', {
        stage_id: stage.id,
        is_mandatory: true,
      });
      const unrated = incompleteRequired.filter(p => !p.condition_rating);
      if (unrated.length) throw new AppError(`Stage has ${unrated.length} incomplete mandatory point(s)`, 409);

      await db.update('inspection_stages', stage.id, {
        status: 'completed',
        completed_at: new Date(),
        completed_points: incompleteRequired.length,
        updated_at: new Date(),
      });

      const nextStage = await db.findOne('inspection_stages', {
        inspection_id: inspectionId,
        stage_order: stage.stage_order + 1,
      });
      if (nextStage) {
        await db.update('inspection_stages', nextStage.id, {
          status: 'in_progress',
          started_at: nextStage.started_at || new Date(),
          updated_at: new Date(),
        });
        await db.update('digital_inspections', inspectionId, {
          current_stage: nextStage.stage_name,
          updated_at: new Date(),
        });
        // Field inspection becomes complete after final_assessment.
        // Customer review/signature/report publication remain separate actors.
        if (stageName === 'final_assessment') {
          await this.completeInspection(inspectionId, inspection.inspector_id || null);
        }
      } else {
        await this.completeInspection(inspectionId, inspection.inspector_id || null);
      }
    } else {
      await db.update('inspection_stages', stage.id, {
        status: 'in_progress',
        started_at: stage.started_at || new Date(),
        updated_at: new Date(),
      });
      await db.update('digital_inspections', inspectionId, {
        current_stage: stageName,
        updated_at: new Date(),
      });
    }

    await this.logAudit(inspectionId, 'stage_updated', { stageName, status });
    return this.getInspection(inspectionId);
  }

  /**
   * Record an inspection point
   */
  async recordPoint(inspectionId, pointData) {
    const { pointCode, stageName, ...data } = pointData;

    const inspection = await db.findById('digital_inspections', inspectionId);
    if (!inspection) throw new AppError('Inspection not found', 404);
    if (inspection.status !== 'in_progress') throw new AppError('Inspection is not editable', 409);
    if (!pointCode) throw new AppError('pointCode is required', 400);

    const existingPoint = await db.findOne('inspection_points', {
      inspection_id: inspectionId,
      point_code: pointCode,
    });
    const effectiveStageName = stageName || inspection.current_stage;

    // Get or create point
    let point = existingPoint;

    if (point) {
      await db.update('inspection_points', point.id, {
        ...data,
        updated_at: new Date(),
      });
    } else {
      const stage = await db.findOne('inspection_stages', {
        inspection_id: inspectionId,
        stage_name: effectiveStageName,
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
    await this.updateStageProgress(inspectionId, effectiveStageName);

    // Log at most one open defect for a point/rating transition.
    if (data.conditionRating === 'requires_attention' || data.conditionRating === 'critical') {
      const existingDefect = await db.findOne('inspection_defects', {
        point_id: point.id,
        is_resolved: false,
      });
      if (!existingDefect) await this.createDefectFromPoint(inspectionId, point, data);
    }

    await this.logAudit(inspectionId, 'point_recorded', { pointCode, data });

    return point;
  }

  /**
   * Add evidence to a point
   */
  async addEvidence(pointId, evidenceData) {
    const point = await db.findById('inspection_points', pointId);
    if (!point) throw new AppError('Inspection point not found', 404);
    if (!evidenceData?.type || !evidenceData?.url) {
      throw new AppError('Evidence type and URL are required', 400);
    }
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
    if (inspection.status !== 'in_progress') {
      throw new AppError('Inspection is not in progress', 409);
    }

    const requiredPoints = inspection.points.filter(p => p.is_mandatory);
    const unrated = requiredPoints.filter(p => !p.condition_rating);
    if (unrated.length) {
      throw new AppError(`Inspection has ${unrated.length} incomplete mandatory point(s)`, 409);
    }

    const fieldStages = inspection.stages.filter(s => s.stage_order <= 15);
    const incompleteFieldStages = fieldStages.filter(s => s.status !== 'completed');
    if (incompleteFieldStages.length) {
      throw new AppError(`Incomplete field stages: ${incompleteFieldStages.map(s => s.stage_name).join(', ')}`, 409);
    }

    const validation = await this.validateInspection(inspectionId);
    if (!validation.isValid) {
      throw new AppError(`Inspection validation failed: ${validation.errors.join(', ')}`, 400);
    }

    const scores = this.calculateScores(inspection.points, inspection.defects);
    await db.update('digital_inspections', inspectionId, {
      ...scores,
      status: 'completed',
      inspection_completed_at: new Date(),
      updated_at: new Date(),
    });

    const booking = await db.findById('inspection_bookings', inspection.booking_id);
    if (booking && booking.status === 'inspection_started') {
      await db.update('inspection_bookings', booking.id, {
        status: 'inspection_complete',
        status_changed_at: new Date(),
        completed_at: new Date(),
        updated_at: new Date(),
      });
      await db.create('inspection_status_history', {
        booking_id: booking.id,
        from_status: 'inspection_started',
        to_status: 'inspection_complete',
        changed_by: inspectorId,
        staff_id: booking.assigned_staff_id,
        notes: 'Digital inspection completed',
        created_at: new Date(),
      });
    }

    if (inspectorId) {
      const staff = await db.findById('inspection_staff', inspectorId);
      if (staff) {
        await db.update('inspection_staff', inspectorId, {
          is_available: true,
          total_inspections: (staff.total_inspections || 0) + 1,
          updated_at: new Date(),
        });
      }
    }

    await this.logAudit(inspectionId, 'inspection_completed', { inspectorId, scores });
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
      body: { weight: 0.00, points: 12 },
      paint: { weight: 0.00, points: 10 },
      tyres: { weight: 0.00, points: 8 },
      undercarriage: { weight: 0.00, points: 8 },
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
      mechanical_score: Math.round(((categoryScores.engine || 0) + (categoryScores.transmission || 0)) / 2),
      safety_score: Math.round(categoryScores.brakes || 0),
      body_score: Math.round(((categoryScores.exterior || 0) + (categoryScores.body || 0) + (categoryScores.paint || 0) + (categoryScores.tyres || 0)) / 4),
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

    // Field execution stages (1-15) must be complete before submission.
    // Customer review, signature and report publication are post-inspection actors.
    const incompleteStages = inspection.stages.filter(s => s.stage_order <= 15 && s.status !== 'completed');
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
      previous_state: details?.previousState || null,
      new_state: details?.newState || details || null,
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

  getInspectionPointDefinitions() {
    const categories = {
      engine: ['Oil level and condition','Oil leaks','Coolant level','Coolant condition','Coolant leaks','Belts condition','Hoses condition','Engine noises','Engine performance','Engine temperature','Exhaust smoke color','Exhaust emissions','Turbo (if applicable)','Catalytic converter','Muffler condition','Engine mounts','Timing belt/chain','Water pump','Starter motor','Alternator'],
      transmission: ['Fluid level','Fluid condition','Leak detection','Clutch operation (manual)','Gear shifts','Shifter mechanism','Transmission mounts','Driveshaft condition','CV joints','Universal joints','Differential','Transfer case (4WD)','Torque converter (auto)','Shift quality','Neutral engagement'],
      suspension: ['Front struts/shocks','Rear struts/shocks','Spring condition','Control arms','Ball joints','Tie rod ends','Sway bar links','Steering rack','Power steering','Steering column','Wheel bearings','Alignment'],
      brakes: ['Front brake pads','Rear brake pads','Front rotors','Rear rotors','Brake lines','Brake hoses','Brake fluid level','Brake fluid condition','ABS system','Parking brake','Master cylinder','Brake assistance'],
      electrical: ['Battery condition','Battery terminals','Charging system','Starting system','Headlights','Tail lights','Brake lights','Turn signals','Hazard lights','Interior lights','Horn','Wipers/washers','Dashboard instruments','Warning lights','OBD-II scan'],
      interior: ['Seat condition','Seat belts','Airbags','Dashboard','Steering wheel','Floor mats','Carpet condition','Headliner','Door panels','Windows operation','Sunroof/moonroof','Climate control','Audio system','Navigation system','Instrument cluster'],
      exterior: ['Front bumper','Rear bumper','Hood','Trunk/tailgate','Door latches','Mirrors','Windshield','Rear windshield','Side windows','Convertible top','Grille','Antenna','Roof rails','Running boards','Body trim'],
      body: ['Frame/unibody','Rust damage','Accident damage','Panel gaps','Door alignment','Hood alignment','Trunk alignment','Bumper alignment','Structural integrity','Floor pan condition','Firewall condition','Pillars condition'],
      paint: ['Paint condition','Clear coat','Faded areas','Scratches','Chips','Peeling','Blistering','Touch-up repairs','Paint mismatch','Aftermarket paint'],
      tyres: ['Front tyre condition','Rear tyre condition','Spare tyre','Wheel condition','Wheel alignment marks','Tire pressure','Tyre tread depth','Tyre age'],
      undercarriage: ['Exhaust system','Fuel lines','Brake lines','Transmission pan','Differential housing','CV boots','Shocks/leakage','Frame condition'],
      road_test: ['Engine performance','Transmission operation','Steering response','Braking performance','Suspension comfort','Noise/vibrations','AC/heating','Overall driveability'],
    };
    const stageMap = {
      engine: 'engine_inspection', transmission: 'transmission_inspection', suspension: 'suspension_inspection',
      brakes: 'brake_inspection', electrical: 'electrical_inspection', interior: 'interior_inspection',
      exterior: 'exterior_inspection', body: 'exterior_inspection', paint: 'exterior_inspection',
      tyres: 'exterior_inspection', undercarriage: 'engine_inspection', road_test: 'road_test',
    };
    const result = {};
    for (const [category, items] of Object.entries(categories)) {
      const stage = stageMap[category];
      result[stage] ||= [];
      items.forEach((name, i) => result[stage].push({
        code: `${category.toUpperCase()}_${String(i + 1).padStart(3, '0')}`,
        name,
        description: `Inspect ${name.toLowerCase()}`,
        category,
        requiresPhoto: ['exterior','body','paint','tyres'].includes(category),
        requiresDiagnostic: category === 'electrical' && name === 'OBD-II scan',
      }));
    }
    return result;
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
      totalPoints: 150, // Authoritative vehicle checklist points
      inspectionPoints: 150, // Actual vehicle inspection points
    };
  }
}

export const inspectionWorkflowService = new InspectionWorkflowService();
export default inspectionWorkflowService;
