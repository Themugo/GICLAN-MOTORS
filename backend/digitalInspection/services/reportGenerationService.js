// ============================================================
// KAYAD 150-POINT DIGITAL INSPECTION ENGINE
// REPORT GENERATION SERVICE
// ============================================================

import db from '../../db/index.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo } from '../../utils/logger.js';
import crypto from 'crypto';

/**
 * Report Generation Service
 * Creates tamper-resistant, professional inspection reports
 */
class ReportGenerationService {
  /**
   * Generate inspection report
   */
  async generateReport(inspectionId, options = {}) {
    const inspection = await db.findById('digital_inspections', inspectionId);
    if (!inspection) {
      throw new AppError('Inspection not found', 404);
    }

    // Get all related data
    const [points, defects, evidence, booking, provider, stages] = await Promise.all([
      db.find('inspection_points', { inspection_id: inspectionId }),
      db.find('inspection_defects', { inspection_id: inspectionId }),
      this.getInspectionEvidence(inspectionId),
      db.findById('inspection_bookings', inspection.booking_id),
      db.findById('inspection_providers', inspection.provider_id),
      db.find('inspection_stages', { inspection_id: inspectionId }, { sort: { stage_order: 1 } }),
    ]);

    // Generate report content
    const reportContent = await this.buildReportContent({
      inspection,
      points,
      defects,
      evidence,
      booking,
      provider,
      stages,
    });

    // Calculate content hash
    const contentHash = this.calculateContentHash(reportContent);

    // Reports are immutable versions. Never overwrite a published/audited
    // version; each regeneration becomes the next chained version.
    const existingReports = await db.find('inspection_reports', { inspection_id: inspectionId });
    const versionNumber = existingReports.length + 1;
    const reportNumber = this.generateReportNumber(inspection, versionNumber);
    const report = await db.create('inspection_reports', {
      inspection_id: inspectionId,
      report_number: reportNumber,
      report_version: versionNumber,
      status: 'draft',
      content: reportContent,
      content_hash: contentHash,
      previous_hash: existingReports.length
        ? existingReports.sort((a, b) => (a.report_version || 0) - (b.report_version || 0))[existingReports.length - 1].content_hash
        : null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    logInfo('Report generated', { reportId: report.id, inspectionId });
    return report;
  }

  /**
   * Build comprehensive report content
   */
  async buildReportContent(data) {
    const { inspection, points, defects, evidence, booking, provider, stages } = data;

    // Group points by category
    const pointsByCategory = this.groupPointsByCategory(points, evidence);

    // Classify defects
    const classifiedDefects = this.classifyDefects(defects);

    // Build executive summary
    const executiveSummary = this.buildExecutiveSummary(inspection, defects);

    // Build vehicle overview
    const vehicleOverview = this.buildVehicleOverview(inspection);

    // Build inspection findings
    const inspectionFindings = this.buildInspectionFindings(pointsByCategory);

    // Build severity analysis
    const severityAnalysis = this.buildSeverityAnalysis(defects);

    return {
      reportMetadata: {
        reportNumber: this.generateReportNumber(inspection, 1),
        generatedAt: new Date().toISOString(),
        inspectionDate: inspection.inspection_started_at,
        reportVersion: 1,
      },
      executiveSummary,
      vehicleOverview,
      scores: {
        overallScore: inspection.overall_score,
        overallGrade: inspection.overall_grade,
        mechanicalScore: inspection.mechanical_score,
        safetyScore: inspection.safety_score,
        bodyScore: inspection.body_score,
        interiorScore: inspection.interior_score,
        electricalScore: inspection.electrical_score,
        roadworthinessScore: inspection.roadworthiness_score,
      },
      inspectionFindings,
      defects: classifiedDefects,
      severityAnalysis,
      recommendations: this.buildRecommendations(defects),
      evidenceSummary: {
        totalPhotos: this.countEvidenceByType(evidence, 'photo'),
        totalVideos: this.countEvidenceByType(evidence, 'video'),
        totalMeasurements: this.countEvidenceByType(evidence, 'measurement'),
        totalDiagnostics: this.countEvidenceByType(evidence, 'diagnostic'),
      },
      inspectorDetails: {
        inspectorId: inspection?.inspector_id || booking?.assigned_staff_id,
        inspectorName: booking?.assigned_engineer_name || null,
      },
      companyDetails: {
        companyName: provider?.company_name,
        address: provider?.address,
        phone: provider?.phone,
        email: provider?.email,
      },
      workflowCompletion: {
        totalStages: stages.length,
        completedStages: stages.filter(s => s.status === 'completed').length,
        inspectionDuration: this.calculateDuration(inspection),
      },
      verification: {
        logbookVerified: inspection.logbook_verified,
        timsVerified: inspection.tims_verified,
      },
      methodology: {
        totalPoints: points.length,
        pointsInspected: points.filter(p => p.condition_rating).length,
        scoringMethod: 'Weighted category scoring with defect severity adjustment',
      },
    };
  }

  buildExecutiveSummary(inspection, defects) {
    const criticalDefects = defects.filter(d => d.severity === 'critical').length;
    let summary = '';
    let recommendation = '';

    if (inspection.overall_score >= 85) {
      summary = 'This vehicle is in excellent condition with minimal defects.';
      recommendation = 'Vehicle is recommended for purchase.';
    } else if (inspection.overall_score >= 75) {
      summary = 'This vehicle is in good condition with minor issues.';
      recommendation = 'Vehicle is suitable for purchase with noted improvements.';
    } else if (inspection.overall_score >= 65) {
      summary = 'This vehicle has moderate issues that require attention.';
      recommendation = 'Vehicle purchase should be conditional on addressing critical items.';
    } else {
      summary = 'This vehicle has significant issues affecting safety and reliability.';
      recommendation = 'Extensive repairs required before vehicle is roadworthy.';
    }

    if (criticalDefects > 0) {
      summary += ` ${criticalDefects} critical safety issue(s) identified.`;
      recommendation = 'CRITICAL: Do not purchase until safety issues are resolved.';
    }

    return {
      overallAssessment: summary,
      recommendation,
      quickStats: {
        totalDefects: defects.length,
        criticalDefects,
        overallScore: inspection.overall_score,
        overallGrade: inspection.overall_grade,
      },
    };
  }

  buildVehicleOverview(inspection) {
    return {
      identification: {
        vin: inspection.vehicle_vin,
        chassisNumber: inspection.vehicle_chassis,
        registration: inspection.vehicle_registration,
      },
      specifications: {
        make: inspection.vehicle_make,
        model: inspection.vehicle_model,
        year: inspection.vehicle_year,
        colour: inspection.vehicle_colour,
      },
      technical: {
        engineCapacity: inspection.vehicle_engine_capacity,
        fuelType: inspection.vehicle_fuel_type,
        transmission: inspection.vehicle_transmission,
        odometerReading: inspection.vehicle_odometer,
      },
    };
  }

  groupPointsByCategory(points, evidence) {
    const categories = {};
    for (const point of points) {
      const category = point.category || 'other';
      if (!categories[category]) categories[category] = [];
      categories[category].push({ ...point, evidence: evidence[point.id] || [] });
    }
    return categories;
  }

  classifyDefects(defects) {
    const classified = { safety_critical: [], mechanical: [], electrical: [], cosmetic: [], maintenance: [], advisory: [] };
    for (const defect of defects) {
      const classification = defect.classification || 'maintenance';
      if (classified[classification]) classified[classification].push(defect);
    }
    return classified;
  }

  buildInspectionFindings(pointsByCategory) {
    const findings = [];
    const categoryOrder = ['exterior', 'interior', 'engine', 'transmission', 'suspension', 'steering', 'brakes', 'electrical', 'road_test', 'safety'];

    for (const category of categoryOrder) {
      const points = pointsByCategory[category];
      if (!points || points.length === 0) continue;
      const issues = points.filter(p => p.condition_rating === 'requires_attention' || p.condition_rating === 'critical');
      findings.push({
        category,
        totalPoints: points.length,
        issuesFound: issues.length,
        points: points.map(p => ({
          code: p.point_code,
          name: p.point_name,
          condition: p.condition_rating,
          notes: p.inspector_notes,
        })),
      });
    }
    return findings;
  }

  buildSeverityAnalysis(defects) {
    return {
      critical: defects.filter(d => d.severity === 'critical'),
      high: defects.filter(d => d.severity === 'high'),
      medium: defects.filter(d => d.severity === 'medium'),
      low: defects.filter(d => d.severity === 'low'),
    };
  }

  buildRecommendations(defects) {
    return {
      immediate: defects.filter(d => d.urgency === 'immediate'),
      withinWeek: defects.filter(d => d.urgency === 'within_week'),
      withinMonth: defects.filter(d => d.urgency === 'within_month'),
      whenConvenient: defects.filter(d => !d.urgency || d.urgency === 'when_convenient'),
    };
  }

  countEvidenceByType(evidenceMap, type) {
    let count = 0;
    for (const evidence of Object.values(evidenceMap)) {
      count += evidence.filter(e => e.evidence_type === type).length;
    }
    return count;
  }

  calculateDuration(inspection) {
    if (!inspection.inspection_completed_at || !inspection.inspection_started_at) return null;
    return Math.round((new Date(inspection.inspection_completed_at) - new Date(inspection.inspection_started_at)) / 60000);
  }

  generateReportNumber(inspection, version) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const shortId = inspection.id.slice(0, 4).toUpperCase();
    return `KAYAD-IR-${date}-${shortId}-V${version}`;
  }

  calculateContentHash(content) {
    return crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex');
  }

  async signReport(reportId, signatureData, userType) {
    const updates = {};
    if (userType === 'inspector') {
      updates.inspector_signature = signatureData.signature;
      updates.inspector_signed_at = new Date();
    } else if (userType === 'reviewer') {
      updates.reviewer_signature = signatureData.signature;
      updates.reviewer_signed_at = new Date();
    }
    await db.update('inspection_reports', reportId, { ...updates, updated_at: new Date() });
    if (userType === 'reviewer') {
      await this.generateVerificationCode(reportId);
    }
    return db.findById('inspection_reports', reportId);
  }

  async generateVerificationCode(reportId) {
    const verificationCode = `VRF-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    await db.update('inspection_reports', reportId, {
      verification_code: verificationCode,
      verified_at: new Date(),
      updated_at: new Date(),
    });
    return verificationCode;
  }

  async publishReport(inspectionId) {
    const report = await db.findOne('inspection_reports', { inspection_id: inspectionId });
    if (!report) throw new AppError('Report not found', 404);
    if (!report.inspector_signature) throw new AppError('Inspector signature required', 400);
    
    await db.update('inspection_reports', report.id, { status: 'published', updated_at: new Date() });
    await db.update('digital_inspections', inspectionId, { status: 'published', published_at: new Date(), updated_at: new Date() });
    return report;
  }

  async createShareLink(reportId, options = {}) {
    const shareToken = crypto.randomBytes(16).toString('base64url');
    return db.create('report_shares', {
      report_id: reportId,
      share_token: shareToken,
      access_type: options.accessType || 'view',
      expires_at: options.expiresAt,
      created_at: new Date(),
    });
  }

  async getInspectionEvidence(inspectionId) {
    const points = await db.find('inspection_points', { inspection_id: inspectionId });
    const evidenceMap = {};
    for (const point of points) {
      evidenceMap[point.id] = await db.find('inspection_evidence', { point_id: point.id });
    }
    return evidenceMap;
  }
}

export const reportGenerationService = new ReportGenerationService();
export default reportGenerationService;
