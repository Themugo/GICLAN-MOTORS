// ============================================================
// KAYAD INSPECTION BUSINESS CENTER - REPORT REVIEW SERVICE
// ============================================================

import db from '../../db/index.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo } from '../../utils/logger.js';

/**
 * Report Review Service - Quality assurance workflow
 */
class ReportReviewService {
  /**
   * Get reports in review queue
   */
  async getReviewQueue(providerId, status = null) {
    const query = { provider_id: providerId };
    if (status) {
      query.status = status;
    }

    const reports = await db.find('inspection_reports', query, {
      sort: { created_at: -1 }
    });

    const queue = [];
    for (const report of reports) {
      const booking = await db.findById('inspection_bookings', report.booking_id);
      const currentVersion = await this.getLatestVersion(report.id);

      queue.push({
        reportId: report.id,
        reportNumber: report.report_number,
        bookingReference: booking?.booking_reference,
        customerName: booking?.customer_name,
        vehicle: booking ? `${booking.vehicle_year} ${booking.vehicle_make} ${booking.vehicle_model}` : 'Unknown',
        inspectionDate: booking?.scheduled_date,
        status: currentVersion?.status || 'draft',
        version: currentVersion?.version_number || 1,
        overallScore: report.overall_score,
        overallCondition: report.overall_condition,
        createdAt: report.created_at,
        updatedAt: report.updated_at,
        assignedReviewer: currentVersion?.reviewed_by,
      });
    }

    return queue;
  }

  /**
   * Get latest version of a report
   */
  async getLatestVersion(reportId) {
    const versions = await db.find('report_versions', { report_id: reportId }, {
      sort: { version_number: -1 },
      limit: 1
    });
    return versions[0] || null;
  }

  /**
   * Create initial report version (engineer complete)
   */
  async createReportVersion(reportId, content, engineerId) {
    const existingVersions = await db.find('report_versions', { report_id: reportId });
    const versionNumber = existingVersions.length + 1;

    const version = {
      report_id: reportId,
      version_number: versionNumber,
      status: 'engineer_complete',
      content,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db.create('report_versions', version);
    logInfo('Report version created', { reportId, versionNumber });
    return result;
  }

  /**
   * Submit report for QA review
   */
  async submitForReview(reportId, submittedBy) {
    const version = await this.getLatestVersion(reportId);
    if (!version) {
      throw new AppError('No report version found', 404);
    }

    if (version.status !== 'engineer_complete' && version.status !== 'corrections_requested') {
      throw new AppError('Report must be in engineer_complete or corrections state', 400);
    }

    await db.update('report_versions', version.id, {
      status: 'qa_review',
      updated_at: new Date(),
    });

    logInfo('Report submitted for review', { reportId, versionId: version.id });
    return this.getLatestVersion(reportId);
  }

  /**
   * Approve report
   */
  async approveReport(reportId, reviewerId, notes = null) {
    const version = await this.getLatestVersion(reportId);
    if (!version) {
      throw new AppError('No report version found', 404);
    }

    if (version.status !== 'qa_review') {
      throw new AppError('Report must be in QA review status', 400);
    }

    await db.update('report_versions', version.id, {
      status: 'approved',
      reviewed_by: reviewerId,
      reviewed_at: new Date(),
      review_notes: notes,
      approved_by: reviewerId,
      approved_at: new Date(),
      updated_at: new Date(),
    });

    // Update report status
    const report = await db.findOne('inspection_reports', { booking_id: reportId });
    if (report) {
      await db.update('inspection_reports', report.id, {
        quality_reviewed: true,
        quality_reviewer_id: reviewerId,
        quality_reviewed_at: new Date(),
      });
    }

    logInfo('Report approved', { reportId, versionId: version.id });
    return this.getLatestVersion(reportId);
  }

  /**
   * Request corrections
   */
  async requestCorrections(reportId, reviewerId, corrections) {
    const version = await this.getLatestVersion(reportId);
    if (!version) {
      throw new AppError('No report version found', 404);
    }

    if (version.status !== 'qa_review') {
      throw new AppError('Report must be in QA review status', 400);
    }

    // Create correction records
    for (const correction of corrections) {
      await db.create('report_corrections', {
        version_id: version.id,
        section: correction.section,
        issue_description: correction.issue,
        suggested_fix: correction.suggestion,
        status: 'pending',
        created_at: new Date(),
      });
    }

    await db.update('report_versions', version.id, {
      status: 'corrections_requested',
      reviewed_by: reviewerId,
      reviewed_at: new Date(),
      review_notes: corrections.map(c => c.issue).join(', '),
      updated_at: new Date(),
    });

    logInfo('Corrections requested', { reportId, versionId: version.id, correctionsCount: corrections.length });
    return this.getLatestVersion(reportId);
  }

  /**
   * Get corrections for a version
   */
  async getCorrections(versionId) {
    const corrections = await db.find('report_corrections', { version_id: versionId });
    return corrections;
  }

  /**
   * Resolve correction
   */
  async resolveCorrection(correctionId, engineerId, resolution, status = 'fixed') {
    await db.update('report_corrections', correctionId, {
      status,
      resolved_by: engineerId,
      resolved_at: new Date(),
      resolution_notes: resolution,
    });

    logInfo('Correction resolved', { correctionId, status });
  }

  /**
   * Send report to customer
   */
  async sendToCustomer(reportId, method = 'email') {
    const version = await this.getLatestVersion(reportId);
    if (!version) {
      throw new AppError('No report version found', 404);
    }

    if (version.status !== 'approved') {
      throw new AppError('Report must be approved before sending', 400);
    }

    await db.update('report_versions', version.id, {
      status: 'sent',
      sent_at: new Date(),
      sent_via: method,
      updated_at: new Date(),
    });

    // Update booking status
    const report = await db.findOne('inspection_reports', { booking_id: reportId });
    if (report) {
      const booking = await db.findById('inspection_bookings', report.booking_id);
      if (booking) {
        await db.update('inspection_bookings', booking.id, {
          status: 'customer_reviewed',
          status_changed_at: new Date(),
        });
      }
    }

    logInfo('Report sent to customer', { reportId, method });
    return this.getLatestVersion(reportId);
  }

  /**
   * Archive report
   */
  async archiveReport(reportId) {
    const version = await this.getLatestVersion(reportId);
    if (!version) {
      throw new AppError('No report version found', 404);
    }

    await db.update('report_versions', version.id, {
      status: 'archived',
      updated_at: new Date(),
    });

    logInfo('Report archived', { reportId });
  }

  /**
   * Get report details with version history
   */
  async getReportDetails(reportId) {
    const report = await db.findById('inspection_reports', reportId);
    if (!report) {
      throw new AppError('Report not found', 404);
    }

    const booking = await db.findById('inspection_bookings', report.booking_id);
    const versions = await db.find('report_versions', { report_id: reportId }, {
      sort: { version_number: -1 }
    });

    // Get corrections for each version
    for (const version of versions) {
      version.corrections = await this.getCorrections(version.id);
    }

    const provider = await db.findById('inspection_providers', booking?.provider_id);
    const engineer = await db.findById('inspection_engineers', booking?.assigned_staff_id);

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
      criticalIssues: report.critical_issues,
      recommendations: report.recommendations,
      findings: report.findings,
      photos: report.photos,
      vehicle: booking ? {
        make: booking.vehicle_make,
        model: booking.vehicle_model,
        year: booking.vehicle_year,
        registration: booking.vehicle_registration,
        vin: booking.vehicle_vin,
      } : null,
      customer: booking ? {
        name: booking.customer_name,
        email: booking.customer_email,
        phone: booking.customer_phone,
      } : null,
      provider: provider ? {
        id: provider.id,
        name: provider.company_name,
      } : null,
      engineer: engineer ? {
        id: engineer.id,
        name: `${engineer.first_name} ${engineer.last_name}`,
        role: engineer.role,
      } : null,
      versions,
      currentStatus: versions[0]?.status || 'draft',
      createdAt: report.created_at,
      pdfUrl: report.pdf_url,
    };
  }

  /**
   * Get QA metrics
   */
  async getQAMetrics(providerId, period = 'monthly') {
    let startDate = new Date();
    if (period === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const reports = await db.find('inspection_reports', {
      provider_id: providerId,
      created_at: { $gte: startDate }
    });

    const versions = await db.find('report_versions', {
      provider_id: providerId,
      created_at: { $gte: startDate }
    });

    const approved = versions.filter(v => v.status === 'approved');
    const rejected = versions.filter(v => v.status === 'corrections_requested');
    const pendingReview = versions.filter(v => v.status === 'qa_review');
    const corrections = await db.find('report_corrections', {});

    return {
      period,
      totalReports: reports.length,
      approved: approved.length,
      rejected: rejected.length,
      pendingReview: pendingReview.length,
      approvalRate: reports.length > 0
        ? Math.round((approved.length / reports.length) * 100)
        : 0,
      rejectionRate: approved.length > 0
        ? Math.round((rejected.length / approved.length) * 100)
        : 0,
      avgReviewTime: this.calculateAvgReviewTime(approved),
      correctionsTotal: corrections.length,
      correctionsPending: corrections.filter(c => c.status === 'pending').length,
      correctionsFixed: corrections.filter(c => c.status === 'fixed').length,
    };
  }

  /**
   * Calculate average review time
   */
  calculateAvgReviewTime(approvedVersions) {
    const withTimes = approvedVersions.filter(v => v.reviewed_at && v.created_at);
    if (withTimes.length === 0) return 0;

    const totalHours = withTimes.reduce((sum, v) => {
      const created = new Date(v.created_at).getTime();
      const reviewed = new Date(v.reviewed_at).getTime();
      return sum + (reviewed - created) / 3600000;
    }, 0);

    return Math.round(totalHours / withTimes.length);
  }
}

export const reportReviewService = new ReportReviewService();
export default reportReviewService;
