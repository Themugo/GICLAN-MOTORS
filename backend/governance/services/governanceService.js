// ============================================================
// KAYAD TRUST, COMPLIANCE & GOVERNANCE CENTER
// GOVERNANCE SERVICE
// ============================================================

import db from '../../db/index.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo, logError } from '../../utils/logger.js';
import crypto from 'crypto';

/**
 * Governance Service
 * Manages trust, compliance, and governance for the KAYAD ecosystem
 */
class GovernanceService {
  // ============================================================
  // ENTITY MANAGEMENT
  // ============================================================

  /**
   * Register entity in governance system
   */
  async registerEntity(userId, entityType, companyName) {
    const existing = await db.findOne('entity_registry', { user_id: userId });
    if (existing) {
      return existing;
    }

    const entity = await db.create('entity_registry', {
      entity_type: entityType,
      user_id: userId,
      company_name: companyName,
      verification_level: 'basic',
      trust_score: 50,
      trust_level: 'new',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });

    await this.logAudit({
      actionType: 'entity_registered',
      actionCategory: 'account',
      entityType: 'entity',
      entityId: entity.id,
      actorId: userId,
      actorType: 'user',
      newState: entity,
    });

    logInfo('Entity registered', { entityId: entity.id, entityType });
    return entity;
  }

  /**
   * Get entity governance profile
   */
  async getEntityProfile(entityId) {
    const entity = await db.findById('entity_registry', entityId);
    if (!entity) {
      throw new AppError('Entity not found', 404);
    }

    const [verification, certifications, recentDisputes, trustHistory, complianceAlerts] = await Promise.all([
      db.findOne('verification_applications', { entity_id: entityId }),
      db.find('certifications', { entity_id: entityId, status: 'active' }),
      db.find('dispute_cases', {
        $or: [{ complainant_id: entityId }, { respondent_id: entityId }]
      }, { limit: 5, sort: { created_at: -1 } }),
      db.find('trust_score_history', { entity_id: entityId }, { limit: 10, sort: { calculated_at: -1 } }),
      db.find('compliance_alerts', { entity_id: entityId, status: 'open' }),
    ]);

    return {
      ...entity,
      verification,
      certifications,
      recentDisputes,
      trustHistory,
      complianceAlerts,
    };
  }

  // ============================================================
  // TRUST SCORE MANAGEMENT
  // ============================================================

  /**
   * Update trust score based on event
   */
  async updateTrustScore(entityId, changeType, details = {}) {
    const entity = await db.findById('entity_registry', entityId);
    if (!entity) {
      throw new AppError('Entity not found', 404);
    }

    const previousScore = entity.trust_score;
    let newScore = previousScore;
    const breakdown = {};

    // Calculate score change based on type
    switch (changeType) {
      case 'transaction_complete':
        newScore = Math.min(100, previousScore + 2);
        breakdown.transaction = 2;
        await this.updateEntityMetrics(entityId, 'transactions');
        break;

      case 'review_received':
        if (details.rating) {
          const ratingChange = (details.rating - 3) * 5; // +10 for 5-star, -10 for 1-star
          newScore = Math.min(100, Math.max(0, previousScore + ratingChange));
          breakdown.review = ratingChange;
        }
        break;

      case 'complaint_filed':
        newScore = Math.max(0, previousScore - 10);
        breakdown.complaint = -10;
        await this.incrementViolation(entityId);
        break;

      case 'dispute_lost':
        newScore = Math.max(0, previousScore - 15);
        breakdown.dispute = -15;
        break;

      case 'verification_upgrade':
        const levelBonuses = {
          verified_individual: 10,
          verified_private_seller: 15,
          verified_dealer: 25,
          verified_inspector: 25,
          verified_auction: 25,
        };
        const bonus = levelBonuses[details.newLevel] || 0;
        newScore = Math.min(100, previousScore + bonus);
        breakdown.verification = bonus;
        break;

      case 'violation':
        newScore = Math.max(0, previousScore - (details.severity === 'high' ? 20 : details.severity === 'medium' ? 10 : 5));
        breakdown.violation = -(details.severity === 'high' ? 20 : details.severity === 'medium' ? 10 : 5);
        await this.incrementViolation(entityId);
        break;

      case 'period_adjustment':
        // Monthly decay for inactive accounts
        if (details.inactiveDays > 90) {
          newScore = Math.max(0, previousScore - 5);
          breakdown.inactivity = -5;
        }
        break;
    }

    // Update entity score
    const trustLevel = this.calculateTrustLevel(newScore);
    await db.update('entity_registry', entityId, {
      trust_score: newScore,
      trust_level: trustLevel,
      updated_at: new Date(),
    });

    // Log history
    await db.create('trust_score_history', {
      entity_id: entityId,
      previous_score: previousScore,
      new_score: newScore,
      score_breakdown: breakdown,
      change_type: changeType,
      change_description: details.description,
      related_transaction_id: details.transactionId,
      related_review_id: details.reviewId,
      related_dispute_id: details.disputeId,
      calculated_at: new Date(),
    });

    // Create compliance alert if significant drop
    if (previousScore - newScore > 15) {
      await this.createComplianceAlert({
        entityId,
        alertType: 'trust_score_change',
        severity: newScore < 30 ? 'high' : 'warning',
        title: 'Significant Trust Score Change',
        description: `Trust score dropped from ${previousScore} to ${newScore}`,
        details: { previousScore, newScore, changeType },
      });
    }

    logInfo('Trust score updated', { entityId, previousScore, newScore, changeType });
    return { previousScore, newScore, trustLevel };
  }

  /**
   * Calculate trust level from score
   */
  calculateTrustLevel(score) {
    if (score >= 95) return 'trusted';
    if (score >= 85) return 'platinum';
    if (score >= 75) return 'gold';
    if (score >= 60) return 'silver';
    if (score >= 40) return 'bronze';
    return 'new';
  }

  /**
   * Update entity metrics
   */
  async updateEntityMetrics(entityId, metric) {
    const updates = { updated_at: new Date() };
    switch (metric) {
      case 'transactions':
        updates.total_transactions = db.raw('total_transactions + 1');
        updates.successful_transactions = db.raw('successful_transactions + 1');
        break;
      case 'review':
        updates.total_reviews = db.raw('total_reviews + 1');
        break;
      case 'complaint':
        updates.complaint_count = db.raw('complaint_count + 1');
        break;
      case 'dispute':
        updates.dispute_count = db.raw('dispute_count + 1');
        break;
    }
    await db.update('entity_registry', entityId, updates);
  }

  /**
   * Increment violation counter
   */
  async incrementViolation(entityId) {
    await db.update('entity_registry', entityId, {
      violation_count: db.raw('violation_count + 1'),
      last_violation_at: new Date(),
      compliance_score: db.raw('GREATEST(0, compliance_score - 5)'),
      updated_at: new Date(),
    });
  }

  // ============================================================
  // DISPUTE RESOLUTION
  // ============================================================

  /**
   * Create dispute case
   */
  async createDispute(disputeData) {
    const caseNumber = await this.generateCaseNumber('D');

    const dispute = await db.create('dispute_cases', {
      case_number: caseNumber,
      dispute_type: disputeData.disputeType,
      complainant_id: disputeData.complainantId,
      respondent_id: disputeData.respondentId,
      subject: disputeData.subject,
      description: disputeData.description,
      related_listing_id: disputeData.listingId,
      related_transaction_id: disputeData.transactionId,
      related_inspection_id: disputeData.inspectionId,
      priority: disputeData.priority || 'normal',
      status: 'submitted',
      disputed_amount: disputeData.disputedAmount,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create timeline event
    await this.addDisputeTimeline(dispute.id, {
      eventType: 'created',
      eventDescription: `Dispute case ${caseNumber} created`,
      actorId: disputeData.complainantId,
      actorName: disputeData.complainantName,
    });

    // Update entity complaint count
    await this.updateEntityMetrics(disputeData.complainantId, 'complaint');

    logInfo('Dispute created', { caseNumber, disputeType: disputeData.disputeType });
    return dispute;
  }

  /**
   * Get dispute with full details
   */
  async getDispute(disputeId) {
    const dispute = await db.findById('dispute_cases', disputeId);
    if (!dispute) {
      throw new AppError('Dispute not found', 404);
    }

    const [evidence, timeline, complainant, respondent] = await Promise.all([
      db.find('dispute_evidence', { dispute_id: disputeId }),
      db.find('dispute_timeline', { dispute_id: disputeId }, { sort: { created_at: 1 } }),
      db.findById('entity_registry', dispute.complainant_id),
      db.findById('entity_registry', dispute.respondent_id),
    ]);

    return {
      ...dispute,
      evidence,
      timeline,
      complainant,
      respondent,
    };
  }

  /**
   * Add evidence to dispute
   */
  async addDisputeEvidence(disputeId, evidenceData) {
    const dispute = await db.findById('dispute_cases', disputeId);
    if (!dispute) {
      throw new AppError('Dispute not found', 404);
    }

    const evidence = await db.create('dispute_evidence', {
      dispute_id: disputeId,
      evidence_type: evidenceData.type,
      title: evidenceData.title,
      description: evidenceData.description,
      file_url: evidenceData.fileUrl,
      submitted_by: evidenceData.submittedBy,
      submitter_role: evidenceData.submitterRole,
      created_at: new Date(),
    });

    await this.addDisputeTimeline(disputeId, {
      eventType: 'evidence_submitted',
      eventDescription: `Evidence "${evidenceData.title}" submitted`,
      actorId: evidenceData.submittedBy,
    });

    // Update dispute status if needed
    if (dispute.status === 'evidence_requested') {
      await db.update('dispute_cases', disputeId, { status: 'investigation' });
    }

    return evidence;
  }

  /**
   * Update dispute status
   */
  async updateDisputeStatus(disputeId, newStatus, officerId, officerName, notes) {
    const dispute = await db.findById('dispute_cases', disputeId);
    if (!dispute) {
      throw new AppError('Dispute not found', 404);
    }

    await db.update('dispute_cases', disputeId, {
      status: newStatus,
      assigned_officer_id: officerId,
      assigned_officer_name: officerName,
      assigned_at: new Date(),
      updated_at: new Date(),
    });

    await this.addDisputeTimeline(disputeId, {
      eventType: 'status_changed',
      eventDescription: `Status changed to ${newStatus}`,
      previousStatus: dispute.status,
      newStatus,
      actorId: officerId,
      actorName: officerName,
    });

    if (notes) {
      await db.update('dispute_cases', disputeId, { review_notes: notes });
    }

    return db.findById('dispute_cases', disputeId);
  }

  /**
   * Resolve dispute
   */
  async resolveDispute(disputeId, decision, resolution) {
    const dispute = await db.findById('dispute_cases', disputeId);
    if (!dispute) {
      throw new AppError('Dispute not found', 404);
    }

    await db.update('dispute_cases', disputeId, {
      status: 'resolved',
      decision: decision.decision,
      decision_reason: decision.reason,
      decided_by: decision.decidedBy,
      decided_at: new Date(),
      resolution_type: resolution.type,
      resolution_details: resolution.details,
      awarded_amount: resolution.awardedAmount,
      appeal_available: true,
      appeal_deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      updated_at: new Date(),
    });

    await this.addDisputeTimeline(disputeId, {
      eventType: 'resolved',
      eventDescription: `Dispute resolved with decision: ${decision.decision}`,
      actorId: decision.decidedBy,
    });

    // Update trust scores
    if (resolution.type === 'accepted') {
      await this.updateTrustScore(dispute.respondent_id, 'dispute_lost');
    }

    logInfo('Dispute resolved', { caseNumber: dispute.case_number });
    return db.findById('dispute_cases', disputeId);
  }

  /**
   * Add dispute timeline event
   */
  async addDisputeTimeline(disputeId, event) {
    await db.create('dispute_timeline', {
      dispute_id: disputeId,
      event_type: event.eventType,
      event_description: event.eventDescription,
      previous_status: event.previousStatus,
      new_status: event.newStatus,
      actor_id: event.actorId,
      actor_name: event.actorName,
      created_at: new Date(),
    });
  }

  // ============================================================
  // FRAUD REPORTING
  // ============================================================

  /**
   * Submit fraud report
   */
  async submitFraudReport(reportData) {
    const reportNumber = await this.generateCaseNumber('F');

    const report = await db.create('fraud_reports', {
      report_number: reportNumber,
      report_type: reportData.reportType,
      reporter_id: reportData.reporterId,
      reporter_email: reportData.reporterEmail,
      reporter_anonymous: reportData.anonymous || false,
      subject_entity_id: reportData.subjectEntityId,
      subject_vin: reportData.subjectVin,
      subject_listing_id: reportData.subjectListingId,
      title: reportData.title,
      description: reportData.description,
      evidence: reportData.evidence || [],
      priority: reportData.priority || 'normal',
      status: 'submitted',
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create compliance alert for high-priority reports
    if (reportData.priority === 'high' || reportData.priority === 'urgent') {
      await this.createComplianceAlert({
        entityId: reportData.subjectEntityId,
        alertType: 'suspicious_activity',
        severity: 'high',
        title: 'Fraud Report Filed',
        description: `${reportNumber}: ${reportData.title}`,
        details: { reportId: report.id },
      });
    }

    logInfo('Fraud report submitted', { reportNumber, reportType: reportData.reportType });
    return report;
  }

  /**
   * Get fraud report details
   */
  async getFraudReport(reportId) {
    return db.findById('fraud_reports', reportId);
  }

  // ============================================================
  // VERIFICATION MANAGEMENT
  // ============================================================

  /**
   * Submit verification application
   */
  async submitVerificationApplication(entityId, applicationData) {
    const entity = await db.findById('entity_registry', entityId);
    if (!entity) {
      throw new AppError('Entity not found', 404);
    }

    // Build checklist based on verification level
    const checklist = this.buildVerificationChecklist(applicationData.requestedLevel);

    const application = await db.create('verification_applications', {
      entity_id: entityId,
      requested_level: applicationData.requestedLevel,
      current_level: entity.verification_level,
      checklist,
      id_type: applicationData.idType,
      id_number: applicationData.idNumber,
      id_front_url: applicationData.idFrontUrl,
      id_back_url: applicationData.idBackUrl,
      business_registration_number: applicationData.businessRegNumber,
      kra_pin: applicationData.kraPin,
      physical_address: applicationData.physicalAddress,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    });

    await this.logAudit({
      actionType: 'verification_submitted',
      actionCategory: 'verification',
      entityType: 'entity',
      entityId,
      actorId: entity.user_id,
      newState: { applicationId: application.id, level: applicationData.requestedLevel },
    });

    logInfo('Verification application submitted', { entityId, level: applicationData.requestedLevel });
    return application;
  }

  /**
   * Build verification checklist
   */
  buildVerificationChecklist(level) {
    const baseChecklist = [
      { item: 'Identity Document', required: true, status: 'pending' },
      { item: 'Address Verification', required: true, status: 'pending' },
    ];

    const levelSpecific = {
      verified_private_seller: [
        { item: 'ID Card Upload', required: true, status: 'pending' },
        { item: 'Phone Verification', required: true, status: 'pending' },
      ],
      verified_dealer: [
        { item: 'Business Registration', required: true, status: 'pending' },
        { item: 'KRA PIN', required: true, status: 'pending' },
        { item: 'Trade License', required: true, status: 'pending' },
        { item: 'Physical Premises', required: true, status: 'pending' },
        { item: 'Bank Account', required: true, status: 'pending' },
      ],
      verified_inspector: [
        { item: 'Business Registration', required: true, status: 'pending' },
        { item: 'NEMA Certification', required: true, status: 'pending' },
        { item: 'Inspector Training Certificate', required: true, status: 'pending' },
        { item: 'Professional Indemnity Insurance', required: true, status: 'pending' },
      ],
    };

    return [...baseChecklist, ...(levelSpecific[level] || [])];
  }

  /**
   * Review verification application
   */
  async reviewVerificationApplication(applicationId, reviewData) {
    const application = await db.findById('verification_applications', applicationId);
    if (!application) {
      throw new AppError('Application not found', 404);
    }

    let newStatus;
    switch (reviewData.decision) {
      case 'approve':
        newStatus = 'approved';
        // Update entity verification level
        await db.update('entity_registry', application.entity_id, {
          verification_level: application.requested_level,
          verified_at: new Date(),
          updated_at: new Date(),
        });
        // Update trust score
        await this.updateTrustScore(application.entity_id, 'verification_upgrade', {
          newLevel: application.requested_level,
        });
        break;
      case 'reject':
        newStatus = 'rejected';
        break;
      case 'request_docs':
        newStatus = 'documents_received';
        break;
      default:
        newStatus = 'under_review';
    }

    await db.update('verification_applications', applicationId, {
      status: newStatus,
      reviewed_by: reviewData.reviewedBy,
      reviewed_at: new Date(),
      review_notes: reviewData.notes,
      verified_at: newStatus === 'approved' ? new Date() : null,
      expires_at: newStatus === 'approved' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null, // 1 year
      updated_at: new Date(),
    });

    await this.logAudit({
      actionType: 'verification_reviewed',
      actionCategory: 'verification',
      entityType: 'entity',
      entityId: application.entity_id,
      actorId: reviewData.reviewedBy,
      newState: { applicationId, decision: reviewData.decision },
    });

    return db.findById('verification_applications', applicationId);
  }

  // ============================================================
  // COMPLIANCE MONITORING
  // ============================================================

  /**
   * Create compliance alert
   */
  async createComplianceAlert(alertData) {
    return db.create('compliance_alerts', {
      alert_type: alertData.alertType,
      severity: alertData.severity,
      entity_id: alertData.entityId,
      title: alertData.title,
      description: alertData.description,
      details: alertData.details || {},
      related_document_id: alertData.documentId,
      related_certification_id: alertData.certificationId,
      related_dispute_id: alertData.disputeId,
      status: 'open',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Get compliance dashboard
   */
  async getComplianceDashboard() {
    const [openAlerts, criticalAlerts, byType, expiringCerts, activeDisputes] = await Promise.all([
      db.find('compliance_alerts', { status: 'open' }, { limit: 50 }),
      db.find('compliance_alerts', { status: 'open', severity: { $in: ['high', 'critical'] } }),
      this.aggregateAlertsByType(),
      this.getExpiringCertifications(),
      db.find('dispute_cases', { status: { $in: ['submitted', 'under_review', 'investigation'] } }),
    ]);

    return {
      summary: {
        openAlerts: openAlerts.length,
        criticalAlerts: criticalAlerts.length,
        activeDisputes: activeDisputes.length,
        expiringCertificates: expiringCerts.length,
      },
      alertsByType: byType,
      expiringCertificates: expiringCerts,
      recentAlerts: openAlerts.slice(0, 10),
      activeDisputes: activeDisputes.slice(0, 10),
    };
  }

  /**
   * Aggregate alerts by type
   */
  async aggregateAlertsByType() {
    const alerts = await db.find('compliance_alerts', { status: 'open' });
    const byType = {};
    alerts.forEach(a => {
      byType[a.alert_type] = (byType[a.alert_type] || 0) + 1;
    });
    return byType;
  }

  /**
   * Get expiring certifications
   */
  async getExpiringCertifications() {
    const now = new Date();
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return db.find('certifications', {
      status: 'active',
      expires_at: { $gte: now, $lte: in30Days },
    });
  }

  // ============================================================
  // IMMUTABLE AUDIT LOG
  // ============================================================

  /**
   * Log audit event (immutable)
   */
  async logAudit(auditData) {
    // Get previous checksum for chain integrity
    const lastLog = await db.find('governance_audit_log', {}, {
      sort: { created_at: -1 },
      limit: 1
    });
    const previousChecksum = lastLog[0]?.checksum || null;

    // Calculate checksum
    const dataString = JSON.stringify(auditData);
    const checksum = crypto.createHash('sha256')
      .update(dataString + (previousChecksum || ''))
      .digest('hex');

    await db.create('governance_audit_log', {
      action_type: auditData.actionType,
      action_category: auditData.actionCategory,
      entity_type: auditData.entityType,
      entity_id: auditData.entityId,
      actor_id: auditData.actorId,
      actor_type: auditData.actorType || 'system',
      actor_name: auditData.actorName,
      ip_address: auditData.ipAddress,
      user_agent: auditData.userAgent,
      session_id: auditData.sessionId,
      previous_state: auditData.previousState,
      new_state: auditData.newState,
      changed_fields: auditData.changedFields || [],
      source: auditData.source || 'system',
      source_details: auditData.sourceDetails,
      checksum,
      previous_checksum: previousChecksum,
      created_at: new Date(),
    });
  }

  /**
   * Get audit log for entity
   */
  async getAuditLog(entityType, entityId, options = {}) {
    const query = { entity_type: entityType, entity_id: entityId };

    if (options.actionType) {
      query.action_type = options.actionType;
    }

    if (options.startDate && options.endDate) {
      query.created_at = { $gte: new Date(options.startDate), $lte: new Date(options.endDate) };
    }

    return db.find('governance_audit_log', query, {
      sort: { created_at: -1 },
      limit: options.limit || 100,
    });
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  /**
   * Generate case number
   */
  async generateCaseNumber(prefix) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `KAYAD-${prefix}-${timestamp.slice(-4)}${random}`;
  }

  /**
   * Get governance analytics
   */
  async getGovernanceAnalytics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [entities, verifications, disputes, fraudReports, trustDistribution] = await Promise.all([
      db.find('entity_registry', { status: 'active' }),
      db.find('verification_applications', { created_at: { $gte: thirtyDaysAgo } }),
      db.find('dispute_cases', { created_at: { $gte: thirtyDaysAgo } }),
      db.find('fraud_reports', { created_at: { $gte: thirtyDaysAgo } }),
      this.aggregateTrustDistribution(),
    ]);

    const approvedVerifications = verifications.filter(v => v.status === 'approved').length;
    const resolvedDisputes = disputes.filter(d => d.status === 'resolved').length;

    return {
      totalEntities: entities.length,
      verificationRate: verifications.length > 0
        ? Math.round((approvedVerifications / verifications.length) * 100)
        : 0,
      disputeResolutionRate: disputes.length > 0
        ? Math.round((resolvedDisputes / disputes.length) * 100)
        : 0,
      avgResolutionTimeDays: this.calculateAvgResolutionTime(disputes.filter(d => d.status === 'resolved')),
      trustDistribution,
      fraudReports: fraudReports.length,
      activeDisputes: disputes.filter(d => ['submitted', 'under_review', 'investigation'].includes(d.status)).length,
      platformIntegrityScore: this.calculateIntegrityScore(entities),
    };
  }

  /**
   * Aggregate trust distribution
   */
  async aggregateTrustDistribution() {
    const entities = await db.find('entity_registry', { status: 'active' });
    const distribution = {
      trusted: 0,
      platinum: 0,
      gold: 0,
      silver: 0,
      bronze: 0,
      new: 0,
    };
    entities.forEach(e => {
      distribution[e.trust_level] = (distribution[e.trust_level] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Calculate average resolution time
   */
  calculateAvgResolutionTime(resolvedDisputes) {
    if (resolvedDisputes.length === 0) return 0;
    const totalDays = resolvedDisputes.reduce((sum, d) => {
      const created = new Date(d.created_at);
      const resolved = new Date(d.decided_at);
      return sum + (resolved - created) / (1000 * 60 * 60 * 24);
    }, 0);
    return Math.round(totalDays / resolvedDisputes.length);
  }

  /**
   * Calculate platform integrity score
   */
  calculateIntegrityScore(entities) {
    if (entities.length === 0) return 0;

    const avgTrust = entities.reduce((sum, e) => sum + e.trust_score, 0) / entities.length;
    const verifiedCount = entities.filter(e => e.verification_level !== 'basic').length;
    const violationRate = entities.reduce((sum, e) => sum + e.violation_count, 0) / entities.length;

    return Math.round(
      (avgTrust * 0.5) +
      ((verifiedCount / entities.length) * 100 * 0.3) +
      (Math.max(0, 100 - violationRate * 10) * 0.2)
    );
  }
}

export const governanceService = new GovernanceService();
export default governanceService;
