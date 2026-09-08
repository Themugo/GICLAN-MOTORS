// ============================================================
// KAYAD OPERATIONS COMMAND CENTER
// OPERATIONS SERVICE
// ============================================================

import db from '../../db/index.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo, logError } from '../../utils/logger.js';
import crypto from 'crypto';

/**
 * Operations Service
 * Operational heartbeat for KAYAD ecosystem
 */
class OperationsService {

  // ============================================================
  // SERVICE HEALTH
  // ============================================================

  /**
   * Get all service health
   */
  async getServiceHealth() {
    const services = await db.find('service_health', { is_active: true });

    const byCategory = {};
    services.forEach(service => {
      if (!byCategory[service.service_category]) {
        byCategory[service.service_category] = [];
      }
      byCategory[service.service_category].push(service);
    });

    return {
      services,
      byCategory,
      overallHealth: this.calculateOverallHealth(services),
    };
  }

  /**
   * Calculate overall platform health
   */
  calculateOverallHealth(services) {
    if (services.length === 0) return { status: 'unknown', score: 0 };

    const statusWeights = {
      healthy: 100,
      warning: 75,
      degraded: 50,
      critical: 25,
      maintenance: 0,
    };

    const totalWeight = services.reduce((sum, s) => sum + (statusWeights[s.health_status] || 50), 0);
    const avgScore = totalWeight / services.length;

    if (avgScore >= 95) return { status: 'healthy', score: avgScore };
    if (avgScore >= 80) return { status: 'good', score: avgScore };
    if (avgScore >= 60) return { status: 'warning', score: avgScore };
    if (avgScore >= 40) return { status: 'degraded', score: avgScore };
    return { status: 'critical', score: avgScore };
  }

  /**
   * Update service health
   */
  async updateServiceHealth(serviceCode, healthData) {
    const service = await db.findOne('service_health', { service_code: serviceCode });
    if (!service) {
      throw new AppError('Service not found', 404);
    }

    await db.update('service_health', service.id, {
      health_status: healthData.status || service.health_status,
      response_time_ms: healthData.responseTimeMs,
      error_rate: healthData.errorRate,
      requests_per_minute: healthData.requestsPerMinute,
      last_check_at: new Date(),
      updated_at: new Date(),
    });

    // Check if status changed to critical
    if (healthData.status === 'critical' && service.health_status !== 'critical') {
      await this.createAlert({
        alertType: 'infrastructure',
        severity: 'critical',
        title: `Service Critical: ${service.service_name}`,
        description: `Service ${service.service_name} is reporting critical status`,
        sourceService: serviceCode,
        relatedEntityType: 'service',
        relatedEntityId: service.id,
      });
    }

    return db.findById('service_health', service.id);
  }

  /**
   * Initialize default services
   */
  async initializeDefaultServices() {
    const services = [
      { service_code: 'marketplace', service_name: 'Marketplace', service_category: 'marketplace' },
      { service_code: 'dealer_network', service_name: 'Dealer Network', service_category: 'dealer' },
      { service_code: 'auction_network', service_name: 'Auction Network', service_category: 'auction' },
      { service_code: 'inspection_marketplace', service_name: 'Inspection Marketplace', service_category: 'inspection' },
      { service_code: 'inspection_companies', service_name: 'Inspection Companies', service_category: 'inspection' },
      { service_code: 'escrow', service_name: 'Escrow Platform', service_category: 'finance' },
      { service_code: 'vehicle_passport', service_name: 'Vehicle Passport', service_category: 'trust' },
      { service_code: 'vehicle_intelligence', service_name: 'Vehicle Intelligence', service_category: 'trust' },
      { service_code: 'finance_marketplace', service_name: 'Finance Marketplace', service_category: 'finance' },
      { service_code: 'communications', service_name: 'Communications Hub', service_category: 'communications' },
      { service_code: 'partner_api', service_name: 'Partner APIs', service_category: 'infrastructure' },
      { service_code: 'notifications', service_name: 'Notification Services', service_category: 'communications' },
      { service_code: 'search', service_name: 'Search Engine', service_category: 'infrastructure' },
      { service_code: 'media', service_name: 'Media Engine', service_category: 'infrastructure' },
      { service_code: 'authentication', service_name: 'Authentication', service_category: 'infrastructure' },
      { service_code: 'documents', service_name: 'Document Services', service_category: 'infrastructure' },
      { service_code: 'payments', service_name: 'Payments', service_category: 'finance' },
    ];

    for (const service of services) {
      const existing = await db.findOne('service_health', { service_code: service.service_code });
      if (!existing) {
        await db.create('service_health', {
          ...service,
          health_status: 'healthy',
          uptime_percentage: 100,
          response_time_ms: 0,
          error_rate: 0,
          requests_per_minute: 0,
          last_check_at: new Date(),
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
  }

  // ============================================================
  // INCIDENTS
  // ============================================================

  /**
   * Create incident
   */
  async createIncident(incidentData) {
    const incidentCode = await this.generateIncidentCode();

    const incident = await db.create('incidents', {
      incident_code: incidentCode,
      severity: incidentData.severity,
      incident_type: incidentData.type,
      title: incidentData.title,
      description: incidentData.description,
      affected_service_code: incidentData.serviceCode,
      affected_service_name: incidentData.serviceName,
      impact_scope: incidentData.impactScope || 'platform',
      users_affected: incidentData.usersAffected || 0,
      revenue_impact: incidentData.revenueImpact || 0,
      owner_id: incidentData.ownerId,
      owner_name: incidentData.ownerName,
      owner_team: incidentData.ownerTeam,
      status: 'open',
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create timeline event
    await this.addIncidentTimeline(incident.id, {
      eventType: 'created',
      eventDescription: `Incident ${incidentCode} created`,
      actorId: incidentData.ownerId,
      actorName: incidentData.ownerName,
    });

    logInfo('Incident created', { incidentCode, severity: incidentData.severity });
    return incident;
  }

  /**
   * Get active incidents
   */
  async getActiveIncidents(filters = {}) {
    const query = { status: { $nin: ['resolved', 'closed'] } };

    if (filters.severity) query.severity = filters.severity;
    if (filters.serviceCode) query.affected_service_code = filters.serviceCode;
    if (filters.type) query.incident_type = filters.type;

    return db.find('incidents', query, {
      sort: {
        severity: 1,
        created_at: -1
      },
    });
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(incidentId, status, actorData, notes = '') {
    const incident = await db.findById('incidents', incidentId);
    if (!incident) {
      throw new AppError('Incident not found', 404);
    }

    const updates = {
      status,
      updated_at: new Date(),
    };

    if (status === 'resolved') {
      updates.resolved_at = new Date();
      updates.resolution_time_minutes = Math.round(
        (new Date() - new Date(incident.created_at)) / (1000 * 60)
      );
    }

    await db.update('incidents', incidentId, updates);

    // Add timeline
    await this.addIncidentTimeline(incidentId, {
      eventType: 'status_changed',
      eventDescription: notes || `Status changed to ${status}`,
      previousStatus: incident.status,
      newStatus: status,
      actorId: actorData.actorId,
      actorName: actorData.actorName,
    });

    logInfo('Incident updated', { incidentCode: incident.incident_code, status });
    return db.findById('incidents', incidentId);
  }

  /**
   * Add incident timeline event
   */
  async addIncidentTimeline(incidentId, eventData) {
    await db.create('incident_timeline', {
      incident_id: incidentId,
      event_type: eventData.eventType,
      event_description: eventData.eventDescription,
      previous_status: eventData.previousStatus,
      new_status: eventData.newStatus,
      actor_id: eventData.actorId,
      actor_name: eventData.actorName,
      created_at: new Date(),
    });
  }

  // ============================================================
  // ALERTS
  // ============================================================

  /**
   * Create alert
   */
  async createAlert(alertData) {
    const alertCode = await this.generateAlertCode();

    const alert = await db.create('operational_alerts', {
      alert_code: alertCode,
      alert_type: alertData.alertType,
      severity: alertData.severity || 'warning',
      title: alertData.title,
      description: alertData.description,
      source_service: alertData.sourceService,
      metric_value: alertData.metricValue,
      threshold_value: alertData.thresholdValue,
      related_incident_id: alertData.relatedIncidentId,
      related_entity_type: alertData.relatedEntityType,
      related_entity_id: alertData.relatedEntityId,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });

    logInfo('Alert created', { alertCode, type: alertData.alertType });
    return alert;
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(filters = {}) {
    const query = { status: { $in: ['active', 'acknowledged', 'investigating'] } };

    if (filters.severity) query.severity = filters.severity;
    if (filters.type) query.alert_type = filters.type;

    return db.find('operational_alerts', query, {
      sort: { severity: 1, created_at: -1 },
    });
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId, userId, userName) {
    await db.update('operational_alerts', alertId, {
      status: 'acknowledged',
      assigned_to: userId,
      assigned_to_name: userName,
      updated_at: new Date(),
    });
    return db.findById('operational_alerts', alertId);
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId, resolutionNotes) {
    await db.update('operational_alerts', alertId, {
      status: 'resolved',
      resolution_notes: resolutionNotes,
      resolved_at: new Date(),
      updated_at: new Date(),
    });
    return db.findById('operational_alerts', alertId);
  }

  // ============================================================
  // LIVE METRICS
  // ============================================================

  /**
   * Record metric
   */
  async recordMetric(metricData) {
    return db.create('live_metrics', {
      metric_code: metricData.code,
      metric_name: metricData.name,
      metric_category: metricData.category,
      metric_value: metricData.value,
      metric_unit: metricData.unit,
      previous_value: metricData.previousValue,
      change_percentage: metricData.changePercentage,
      period_type: metricData.periodType,
      period_start: metricData.periodStart,
      source_service: metricData.sourceService,
      recorded_at: new Date(),
    });
  }

  /**
   * Get live metrics
   */
  async getLiveMetrics() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const metrics = await db.find('live_metrics', {
      recorded_at: { $gte: oneHourAgo },
    }, {
      sort: { recorded_at: -1 },
    });

    // Group by metric code and get latest
    const latestMetrics = {};
    metrics.forEach(m => {
      if (!latestMetrics[m.metric_code]) {
        latestMetrics[m.metric_code] = m;
      }
    });

    return Object.values(latestMetrics);
  }

  // ============================================================
  // PLATFORM STATISTICS
  // ============================================================

  /**
   * Get platform overview
   */
  async getPlatformOverview() {
    const [services, activeIncidents, activeAlerts, latestStats] = await Promise.all([
      this.getServiceHealth(),
      this.getActiveIncidents(),
      this.getActiveAlerts(),
      this.getLatestStatistics(),
    ]);

    const criticalIncidents = activeIncidents.filter(i => i.severity === 'critical');
    const highAlerts = activeAlerts.filter(a => a.severity === 'high' || a.severity === 'critical');

    return {
      platformHealth: services.overallHealth,
      serviceCount: services.services.length,
      healthyServices: services.services.filter(s => s.health_status === 'healthy').length,
      activeIncidents: activeIncidents.length,
      criticalIncidents: criticalIncidents.length,
      activeAlerts: activeAlerts.length,
      highAlerts: highAlerts.length,
      statistics: latestStats,
      requiresAttention: criticalIncidents.length > 0 || highAlerts.length > 0,
    };
  }

  /**
   * Get latest statistics
   */
  async getLatestStatistics() {
    const stats = await db.find('platform_statistics', {}, {
      sort: { period_end: -1 },
      limit: 1,
    });
    return stats[0] || this.getDefaultStatistics();
  }

  /**
   * Get default statistics
   */
  getDefaultStatistics() {
    return {
      total_users: 0,
      active_users: 0,
      new_registrations: 0,
      users_online: 0,
      active_listings: 0,
      new_listings: 0,
      vehicles_sold: 0,
      active_auctions: 0,
      inspections_completed: 0,
      support_tickets: 0,
    };
  }

  // ============================================================
  // BUSINESS HEALTH
  // ============================================================

  /**
   * Get business health scores
   */
  async getBusinessHealthScores(filters = {}) {
    const query = {};
    if (filters.businessType) query.business_type = filters.businessType;
    if (filters.minScore) query.health_score = { $gte: filters.minScore };

    return db.find('business_health_scores', query, {
      sort: { health_score: 1 },
      limit: filters.limit || 100,
    });
  }

  /**
   * Calculate business health
   */
  async calculateBusinessHealth(businessId, businessType, businessName) {
    // Get business metrics
    const transactions = await this.getBusinessTransactions(businessId);
    const disputes = await this.getBusinessDisputes(businessId);
    const complaints = await this.getBusinessComplaints(businessId);

    // Calculate scores
    const satisfactionScore = this.calculateSatisfactionScore(transactions, complaints);
    const reliabilityScore = this.calculateReliabilityScore(transactions, disputes);
    const performanceScore = this.calculatePerformanceScore(transactions);

    const healthScore = (satisfactionScore * 0.4 + reliabilityScore * 0.4 + performanceScore * 0.2);

    return {
      healthScore,
      healthLevel: this.getHealthLevel(healthScore),
      satisfactionScore,
      reliabilityScore,
      performanceScore,
      totalTransactions: transactions.total,
      successfulTransactions: transactions.successful,
      disputeCount: disputes.count,
      complaintCount: complaints.count,
    };
  }

  calculateSatisfactionScore(transactions, complaints) {
    if (transactions.total === 0) return 100;
    const complaintRate = complaints.count / transactions.total;
    return Math.max(0, 100 - (complaintRate * 1000));
  }

  calculateReliabilityScore(transactions, disputes) {
    if (transactions.total === 0) return 100;
    const disputeRate = disputes.count / transactions.total;
    return Math.max(0, 100 - (disputeRate * 500));
  }

  calculatePerformanceScore(transactions) {
    if (transactions.total === 0) return 100;
    const successRate = (transactions.successful / transactions.total) * 100;
    return successRate;
  }

  getHealthLevel(score) {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'healthy';
    if (score >= 50) return 'warning';
    return 'at_risk';
  }

  async getBusinessTransactions(businessId) {
    return { total: 0, successful: 0 };
  }

  async getBusinessDisputes(businessId) {
    return { count: 0 };
  }

  async getBusinessComplaints(businessId) {
    return { count: 0 };
  }

  // ============================================================
  // COMMAND CENTER DASHBOARD
  // ============================================================

  /**
   * Get command center data
   */
  async getCommandCenterData() {
    const [overview, services, incidents, alerts, metrics] = await Promise.all([
      this.getPlatformOverview(),
      this.getServiceHealth(),
      this.getActiveIncidents(),
      this.getActiveAlerts(),
      this.getLiveMetrics(),
    ]);

    return {
      overview,
      services,
      incidents: incidents.slice(0, 10),
      alerts: alerts.slice(0, 10),
      liveMetrics: metrics,
      timestamp: new Date(),
    };
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  async generateIncidentCode() {
    const timestamp = Date.now().toString(36).toUpperCase();
    return `KAYAD-INC-${timestamp.slice(-8)}`;
  }

  async generateAlertCode() {
    const timestamp = Date.now().toString(36).toUpperCase();
    return `KAYAD-ALERT-${timestamp.slice(-8)}`;
  }

  // ============================================================
  // OPERATIONS NOTES
  // ============================================================

  /**
   * Create operations note
   */
  async createNote(noteData) {
    return db.create('operations_notes', {
      note_type: noteData.type,
      title: noteData.title,
      content: noteData.content,
      related_incident_id: noteData.incidentId,
      related_service: noteData.service,
      author_id: noteData.authorId,
      author_name: noteData.authorName,
      author_team: noteData.authorTeam,
      is_pinned: noteData.isPinned || false,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Get operations notes
   */
  async getNotes(filters = {}) {
    const query = { is_archived: false };
    if (filters.type) query.note_type = filters.type;
    if (filters.incidentId) query.related_incident_id = filters.incidentId;

    const notes = await db.find('operations_notes', query, {
      sort: { is_pinned: -1, created_at: -1 },
    });

    return notes;
  }

  // ============================================================
  // REGIONAL METRICS
  // ============================================================

  /**
   * Get regional metrics
   */
  async getRegionalMetrics() {
    return db.find('regional_metrics', {}, {
      sort: { region_name: 1 },
    });
  }

  // ============================================================
  // REPORTING
  // ============================================================

  /**
   * Generate operations report
   */
  async generateOperationsReport(period = 'daily') {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'hourly':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'daily':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const [incidents, alerts, stats] = await Promise.all([
      db.find('incidents', {
        created_at: { $gte: startDate }
      }),
      db.find('operational_alerts', {
        created_at: { $gte: startDate }
      }),
      this.getPlatformOverview(),
    ]);

    const resolvedIncidents = incidents.filter(i => i.status === 'resolved');
    const avgResolutionTime = resolvedIncidents.length > 0
      ? resolvedIncidents.reduce((sum, i) => sum + (i.resolution_time_minutes || 0), 0) / resolvedIncidents.length
      : 0;

    return {
      period,
      startDate,
      endDate: now,
      summary: {
        totalIncidents: incidents.length,
        criticalIncidents: incidents.filter(i => i.severity === 'critical').length,
        resolvedIncidents: resolvedIncidents.length,
        avgResolutionTimeMinutes: Math.round(avgResolutionTime),
        totalAlerts: alerts.length,
        platformHealth: stats.platformHealth,
      },
      incidents,
      alerts,
      services: stats.services,
    };
  }
}

export const operationsService = new OperationsService();
export default operationsService;
