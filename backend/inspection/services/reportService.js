// ============================================================
// KAYAD INSPECTION MARKETPLACE - REPORT SERVICE
// ============================================================

import db from './dbAdapter.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo, logError } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate report number
 */
const generateReportNumber = () => {
  const prefix = 'KAYAD-IR';
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${year}-${random}`;
};

/**
 * Inspection Categories with 150-point checklist
 */
const INSPECTION_CATEGORIES = {
  engine: {
    name: 'Engine',
    points: 20,
    items: [
      'Oil level and condition',
      'Oil leaks',
      'Coolant level',
      'Coolant condition',
      'Coolant leaks',
      'Belts condition',
      'Hoses condition',
      'Engine noises',
      'Engine performance',
      'Engine temperature',
      'Exhaust smoke color',
      'Exhaust emissions',
      'Turbo (if applicable)',
      'Catalytic converter',
      'Muffler condition',
      'Engine mounts',
      'Timing belt/chain',
      'Water pump',
      'Starter motor',
      'Alternator',
    ]
  },
  transmission: {
    name: 'Transmission',
    points: 15,
    items: [
      'Fluid level',
      'Fluid condition',
      'Leak detection',
      'Clutch operation (manual)',
      'Gear shifts',
      'Shifter mechanism',
      'Transmission mounts',
      'Driveshaft condition',
      'CV joints',
      'Universal joints',
      'Differential',
      'Transfer case (4WD)',
      'Torque converter (auto)',
      'Shift quality',
      'Neutral engagement',
    ]
  },
  suspension: {
    name: 'Suspension',
    points: 12,
    items: [
      'Front struts/shocks',
      'Rear struts/shocks',
      'Spring condition',
      'Control arms',
      'Ball joints',
      'Tie rod ends',
      'Sway bar links',
      'Steering rack',
      'Power steering',
      'Steering column',
      'Wheel bearings',
      'Alignment',
    ]
  },
  brakes: {
    name: 'Brakes',
    points: 12,
    items: [
      'Front brake pads',
      'Rear brake pads',
      'Front rotors',
      'Rear rotors',
      'Brake lines',
      'Brake hoses',
      'Brake fluid level',
      'Brake fluid condition',
      'ABS system',
      'Parking brake',
      'Master cylinder',
      'Brake assistance',
    ]
  },
  electrical: {
    name: 'Electrical',
    points: 15,
    items: [
      'Battery condition',
      'Battery terminals',
      'Charging system',
      'Starting system',
      'Headlights',
      'Tail lights',
      'Brake lights',
      'Turn signals',
      'Hazard lights',
      'Interior lights',
      'Horn',
      'Wipers/washers',
      'Dashboard instruments',
      'Warning lights',
      'OBD-II scan',
    ]
  },
  interior: {
    name: 'Interior',
    points: 15,
    items: [
      'Seat condition',
      'Seat belts',
      'Airbags',
      'Dashboard',
      'Steering wheel',
      'Floor mats',
      'Carpet condition',
      'Headliner',
      'Door panels',
      'Windows operation',
      'Sunroof/moonroof',
      'Climate control',
      'Audio system',
      'Navigation system',
      'Instrument cluster',
    ]
  },
  exterior: {
    name: 'Exterior',
    points: 15,
    items: [
      'Front bumper',
      'Rear bumper',
      'Hood',
      'Trunk/tailgate',
      'Door latches',
      'Mirrors',
      'Windshield',
      'Rear windshield',
      'Side windows',
      'Convertible top',
      'Grille',
      'Antenna',
      'Roof rails',
      'Running boards',
      'Body trim',
    ]
  },
  body: {
    name: 'Body Structure',
    points: 12,
    items: [
      'Frame/unibody',
      'Rust damage',
      'Accident damage',
      'Panel gaps',
      'Door alignment',
      'Hood alignment',
      'Trunk alignment',
      'Bumper alignment',
      'Structural integrity',
      'Floor pan condition',
      'Firewall condition',
      'Pillars condition',
    ]
  },
  paint: {
    name: 'Paint & Finish',
    points: 10,
    items: [
      'Paint condition',
      'Clear coat',
      'Faded areas',
      'Scratches',
      'Chips',
      'Peeling',
      'Blistering',
      'Touch-up repairs',
      'Paint mismatch',
      'Aftermarket paint',
    ]
  },
  tyres: {
    name: 'Tyres & Wheels',
    points: 8,
    items: [
      'Front tyre condition',
      'Rear tyre condition',
      'Spare tyre',
      'Wheel condition',
      'Wheel alignment marks',
      'Tire pressure',
      'Tyre tread depth',
      'Tyre age',
    ]
  },
  undercarriage: {
    name: 'Undercarriage',
    points: 8,
    items: [
      'Exhaust system',
      'Fuel lines',
      'Brake lines',
      'Transmission pan',
      'Differential housing',
      'CV boots',
      'Shocks/leakage',
      'Frame condition',
    ]
  },
  road_test: {
    name: 'Road Test',
    points: 8,
    items: [
      'Engine performance',
      'Transmission operation',
      'Steering response',
      'Braking performance',
      'Suspension comfort',
      'Noise/vibrations',
      'AC/heating',
      'Overall driveability',
    ]
  }
};

/**
 * Report Service - Handles inspection reports
 */
class ReportService {
  /**
   * Create a new inspection report
   */
  async createReport(bookingId, reportData, inspectorId, providerId = null) {
    const booking = await db.findById('inspection_bookings', bookingId);
    if (providerId && String(booking?.provider_id) !== String(providerId)) {
      throw new AppError('Booking does not belong to this provider', 403);
    }
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    if (booking.status !== 'inspection_complete') {
      throw new AppError('Inspection must be complete before generating report', 400);
    }

    // Calculate overall score
    const scores = {
      engine: reportData.engineScore || 0,
      transmission: reportData.transmissionScore || 0,
      suspension: reportData.suspensionScore || 0,
      brakes: reportData.brakesScore || 0,
      electrical: reportData.electricalScore || 0,
      interior: reportData.interiorScore || 0,
      exterior: reportData.exteriorScore || 0,
      body: reportData.bodyScore || 0,
      paint: reportData.paintScore || 0,
      tyres: reportData.tyresScore || 0,
      undercarriage: reportData.undercarriageScore || 0,
      road_test: reportData.roadTestScore || 0,
    };

    const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0);
    const categoriesCount = Object.values(scores).filter(s => s > 0).length;
    const overallScore = categoriesCount > 0 ? Math.round(totalScore / categoriesCount) : 0;

    // Determine overall condition
    let overallCondition;
    if (overallScore >= 90) overallCondition = 'excellent';
    else if (overallScore >= 75) overallCondition = 'good';
    else if (overallScore >= 60) overallCondition = 'fair';
    else if (overallScore >= 40) overallCondition = 'poor';
    else overallCondition = 'bad';

    // Generate critical issues
    const criticalIssues = [];
    if (reportData.findings) {
      for (const finding of reportData.findings) {
        if (finding.severity === 'critical' || finding.status === 'fail') {
          criticalIssues.push({
            category: finding.category,
            item: finding.itemName,
            description: finding.conditionNotes,
          });
        }
      }
    }

    const report = {
      booking_id: bookingId,
      report_number: generateReportNumber(),
      overall_score: overallScore,
      overall_condition: overallCondition,
      engine_score: reportData.engineScore,
      transmission_score: reportData.transmissionScore,
      suspension_score: reportData.suspensionScore,
      brakes_score: reportData.brakesScore,
      electrical_score: reportData.electricalScore,
      interior_score: reportData.interiorScore,
      exterior_score: reportData.exteriorScore,
      body_score: reportData.bodyScore,
      paint_score: reportData.paintScore,
      tyres_score: reportData.tyresScore,
      undercarriage_score: reportData.undercarriageScore,
      road_test_score: reportData.roadTestScore,
      findings: reportData.findings || [],
      critical_issues: criticalIssues,
      recommendations: reportData.recommendations || [],
      executive_summary: reportData.executiveSummary,
      detailed_findings: reportData.detailedFindings,
      technician_notes: reportData.technicianNotes,
      road_test_performed: reportData.roadTestPerformed || false,
      road_test_notes: reportData.roadTestNotes,
      road_test_distance_km: reportData.roadTestDistance,
      diagnostic_codes: reportData.diagnosticCodes || [],
      obd_scan_performed: reportData.obdScanPerformed || false,
      photos: reportData.photos || [],
      quality_reviewed: false,
      share_token: uuidv4(),
      share_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db.create('inspection_reports', report);

    // Update booking status
    await db.update('inspection_bookings', bookingId, {
      status: 'report_generated',
      status_changed_at: new Date(),
      updated_at: new Date(),
    });

    logInfo('Inspection report created', { reportId: result.id, bookingId });
    return result;
  }

  /**
   * Get report by ID
   */
  async getReportById(reportId) {
    const report = await db.findById('inspection_reports', reportId);
    if (!report) {
      throw new AppError('Report not found', 404);
    }
    return report;
  }

  /**
   * Get report by booking ID
   */
  async getReportByBookingId(bookingId) {
    const report = await db.findOne('inspection_reports', { booking_id: bookingId });
    if (!report) {
      throw new AppError('Report not found', 404);
    }
    return report;
  }

  /**
   * Get report by share token
   */
  async getReportByShareToken(token) {
    const report = await db.findOne('inspection_reports', { 
      share_token: token,
      share_expires_at: { $gt: new Date() }
    });
    
    if (!report) {
      throw new AppError('Report not found or link expired', 404);
    }
    
    return report;
  }

  /**
   * Get full report details
   */
  async getReportDetails(reportId, access = {}) {
    const report = await this.getReportById(reportId);
    const booking = await db.findById('inspection_bookings', report.booking_id);
    if (!booking) throw new AppError('Booking for report not found', 404);

    const isAdmin = ['admin', 'superadmin'].includes(access.role);
    const isCustomer = access.userId && String(booking.customer_id) === String(access.userId);
    const isProvider = access.providerId && String(booking.provider_id) === String(access.providerId);
    if (!isAdmin && !isCustomer && !isProvider) {
      throw new AppError('You do not have access to this report', 403);
    }
    const provider = await db.findById('inspection_providers', booking.provider_id);
    const inspector = await db.findById('inspection_staff', booking.assigned_staff_id);
    const pkg = booking.package_id ? await db.findById('inspection_packages', booking.package_id) : null;

    // Get checklist items
    const checklistItems = await db.find('inspection_checklist_items', { report_id: reportId });

    return {
      id: report.id,
      reportNumber: report.report_number,
      overallScore: report.overall_score,
      overallCondition: report.overall_condition,
      categoryScores: {
        engine: report.engine_score,
        transmission: report.transmission_score,
        suspension: report.suspension_score,
        brakes: report.brakes_score,
        electrical: report.electrical_score,
        interior: report.interior_score,
        exterior: report.exterior_score,
        body: report.body_score,
        paint: report.paint_score,
        tyres: report.tyres_score,
        undercarriage: report.undercarriage_score,
        roadTest: report.road_test_score,
      },
      vehicle: {
        make: booking.vehicle_make,
        model: booking.vehicle_model,
        year: booking.vehicle_year,
        registration: booking.vehicle_registration,
        vin: booking.vehicle_vin,
      },
      provider: {
        id: provider.id,
        name: provider.company_name,
        logo: provider.logo_url,
      },
      inspector: inspector ? {
        id: inspector.id,
        name: `${inspector.first_name} ${inspector.last_name}`,
        role: inspector.role,
      } : null,
      package: pkg ? {
        id: pkg.id,
        name: pkg.name,
        type: pkg.inspection_type,
      } : null,
      inspectionDate: booking.scheduled_date,
      inspectionLocation: {
        county: booking.inspection_county,
        town: booking.inspection_town,
        address: booking.inspection_address,
      },
      executiveSummary: report.executive_summary,
      criticalIssues: report.critical_issues,
      recommendations: report.recommendations,
      findings: report.findings,
      checklistItems: this.groupChecklistByCategory(checklistItems),
      photos: report.photos,
      roadTest: {
        performed: report.road_test_performed,
        notes: report.road_test_notes,
        distance: report.road_test_distance_km,
      },
      diagnostics: {
        obdScanPerformed: report.obd_scan_performed,
        codes: report.diagnostic_codes,
      },
      quality: {
        reviewed: report.quality_reviewed,
        reviewerId: report.quality_reviewer_id,
        reviewedAt: report.quality_reviewed_at,
        score: report.quality_score,
      },
      share: {
        token: report.share_token,
        expiresAt: report.share_expires_at,
      },
      createdAt: report.created_at,
      pdfUrl: report.pdf_url,
    };
  }

  /**
   * Group checklist items by category
   */
  groupChecklistByCategory(items) {
    const grouped = {};
    
    for (const category of Object.keys(INSPECTION_CATEGORIES)) {
      grouped[category] = {
        name: INSPECTION_CATEGORIES[category].name,
        score: 0,
        items: INSPECTION_CATEGORIES[category].items.map((itemName, index) => {
          const item = items.find(i => i.category === category && i.item_number === index + 1);
          return {
            name: itemName,
            status: item?.status || 'not_inspected',
            notes: item?.condition_notes,
            severity: item?.severity,
            photos: item?.photos || [],
          };
        }),
      };

      // Calculate category score
      const inspectedItems = grouped[category].items.filter(i => i.status !== 'not_inspected');
      if (inspectedItems.length > 0) {
        const passedItems = inspectedItems.filter(i => i.status === 'pass').length;
        grouped[category].score = Math.round((passedItems / inspectedItems.length) * 100);
      }
    }

    return grouped;
  }

  /**
   * Add checklist item to report
   */
  async addChecklistItem(reportId, itemData) {
    const item = {
      report_id: reportId,
      category: itemData.category,
      item_number: itemData.itemNumber,
      item_name: itemData.itemName,
      status: itemData.status,
      condition_notes: itemData.conditionNotes,
      severity: itemData.severity,
      photos: itemData.photos || [],
      created_at: new Date(),
    };

    return db.create('inspection_checklist_items', item);
  }

  /**
   * Update checklist item
   */
  async updateChecklistItem(itemId, updates) {
    return db.update('inspection_checklist_items', itemId, updates);
  }

  /**
   * Generate PDF report
   */
  async generatePDF(reportId, access = {}) {
    const report = await this.getReportDetails(reportId, access);

    // In production, this would use PDFKit or similar
    // For now, return a placeholder
    const pdfUrl = `/api/inspection/reports/${reportId}/pdf`;

    await db.update('inspection_reports', reportId, {
      pdf_url: pdfUrl,
      pdf_generated_at: new Date(),
      updated_at: new Date(),
    });

    return { pdfUrl };
  }

  /**
   * Share report
   */
  async shareReport(reportId, shareWith, access = {}) {
    const report = await this.getReportById(reportId);
    const booking = await db.findById('inspection_bookings', report.booking_id);
    const isAdmin = ['admin', 'superadmin'].includes(access.role);
    const isCustomer = access.userId && String(booking?.customer_id) === String(access.userId);
    const isProvider = access.providerId && String(booking?.provider_id) === String(access.providerId);
    if (!isAdmin && !isCustomer && !isProvider) throw new AppError('You do not have access to this report', 403);

    // Extend expiry if needed
    let shareToken = report.share_token;
    let expiresAt = report.share_expires_at;

    if (!shareToken || !expiresAt || new Date(expiresAt) <= new Date()) {
      shareToken = uuidv4();
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    await db.update('inspection_reports', reportId, {
      share_token: shareToken,
      share_expires_at: expiresAt,
      is_shared: true,
      updated_at: new Date(),
    });

    return {
      shareUrl: `${process.env.FRONTEND_URL}/inspection-reports/${shareToken}`,
      expiresAt,
    };
  }

  /**
   * Revoke share
   */
  async revokeShare(reportId, access = {}) {
    const report = await this.getReportById(reportId);
    const booking = await db.findById('inspection_bookings', report.booking_id);
    const isAdmin = ['admin', 'superadmin'].includes(access.role);
    const isCustomer = access.userId && String(booking?.customer_id) === String(access.userId);
    const isProvider = access.providerId && String(booking?.provider_id) === String(access.providerId);
    if (!isAdmin && !isCustomer && !isProvider) throw new AppError('You do not have access to this report', 403);

    await db.update('inspection_reports', reportId, {
      share_token: null,
      share_expires_at: null,
      is_shared: false,
      updated_at: new Date(),
    });
  }

  /**
   * Get inspection categories
   */
  getInspectionCategories() {
    return INSPECTION_CATEGORIES;
  }

  /**
   * Quality review report
   */
  async qualityReview(reportId, auditorId, reviewData) {
    const report = await this.getReportById(reportId);

    // Create audit record
    await db.create('inspection_quality_audits', {
      report_id: reportId,
      auditor_id: auditorId,
      audit_score: reviewData.auditScore,
      findings: reviewData.findings,
      checklist_accuracy: reviewData.checklistAccuracy,
      photo_quality: reviewData.photoQuality,
      report_completeness: reviewData.reportCompleteness,
      passed: reviewData.passed,
      notes: reviewData.notes,
      created_at: new Date(),
    });

    // Update report
    await db.update('inspection_reports', reportId, {
      quality_reviewed: true,
      quality_reviewer_id: auditorId,
      quality_reviewed_at: new Date(),
      quality_score: reviewData.auditScore,
      updated_at: new Date(),
    });

    return this.getReportById(reportId);
  }
}

export const reportService = new ReportService();
export default reportService;
