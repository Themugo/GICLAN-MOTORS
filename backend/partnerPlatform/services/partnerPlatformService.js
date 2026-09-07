// ============================================================
// KAYAD ENTERPRISE PARTNER PLATFORM
// PARTNER PLATFORM SERVICE
// ============================================================

import db from '../../db/index.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo, logError } from '../../utils/logger.js';
import crypto from 'crypto';

/**
 * Partner Platform Service
 * Partner integration infrastructure for KAYAD
 */
class PartnerPlatformService {

  // ============================================================
  // PARTNER MANAGEMENT
  // ============================================================

  /**
   * Register new partner organization
   */
  async registerPartner(partnerData) {
    const organizationCode = await this.generatePartnerCode();

    const partner = await db.create('partner_organizations', {
      organization_code: organizationCode,
      organization_name: partnerData.organizationName,
      partner_type: partnerData.partnerType,
      primary_contact_name: partnerData.primaryContactName,
      primary_contact_email: partnerData.primaryContactEmail,
      primary_contact_phone: partnerData.primaryContactPhone,
      technical_contact_name: partnerData.technicalContactName,
      technical_contact_email: partnerData.technicalContactEmail,
      country: partnerData.country,
      city: partnerData.city,
      address: partnerData.address,
      website: partnerData.website,
      registration_number: partnerData.registrationNumber,
      tax_id: partnerData.taxId,
      verification_status: 'pending',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });

    logInfo('Partner registered', { organizationCode, partnerType: partnerData.partnerType });
    return partner;
  }

  /**
   * Get partner details
   */
  async getPartner(partnerId) {
    const partner = await db.findById('partner_organizations', partnerId);
    if (!partner) {
      throw new AppError('Partner not found', 404);
    }

    const [applications, documents, permissions, tickets] = await Promise.all([
      db.find('partner_applications', { partner_id: partnerId }),
      db.find('partner_documents', { partner_id: partnerId }),
      this.getPartnerPermissions(partnerId),
      db.find('partner_tickets', { partner_id: partnerId, status: { $in: ['open', 'in_progress'] } }),
    ]);

    return {
      ...partner,
      applications,
      documents,
      activePermissions: permissions,
      openTickets: tickets.length,
    };
  }

  /**
   * Search partners
   */
  async searchPartners(filters = {}) {
    const query = { status: 'active' };

    if (filters.partnerType) query.partner_type = filters.partnerType;
    if (filters.country) query.country = filters.country;
    if (filters.verificationStatus) query.verification_status = filters.verificationStatus;

    return db.find('partner_organizations', query, {
      sort: { created_at: -1 },
      limit: filters.limit || 50,
    });
  }

  // ============================================================
  // APPLICATION MANAGEMENT
  // ============================================================

  /**
   * Create application
   */
  async createApplication(partnerId, applicationData) {
    const applicationCode = await this.generateApplicationCode();

    const application = await db.create('partner_applications', {
      application_code: applicationCode,
      partner_id: partnerId,
      application_name: applicationData.applicationName,
      application_description: applicationData.description,
      application_website: applicationData.website,
      use_case: applicationData.useCase,
      expected_volume: applicationData.expectedVolume,
      onboarding_step: 'register',
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    });

    logInfo('Application created', { applicationCode });
    return application;
  }

  /**
   * Get application details
   */
  async getApplication(applicationId) {
    const application = await db.findById('partner_applications', applicationId);
    if (!application) {
      throw new AppError('Application not found', 404);
    }

    const [credentials, webhooks, analytics] = await Promise.all([
      db.find('api_credentials', { application_id: applicationId }),
      db.find('webhook_configs', { application_id: applicationId }),
      this.getApplicationAnalytics(applicationId),
    ]);

    return {
      ...application,
      credentials,
      webhooks,
      analytics,
    };
  }

  // ============================================================
  // API CREDENTIALS
  // ============================================================

  /**
   * Generate API credentials
   */
  async generateCredentials(applicationId, environment = 'sandbox') {
    const application = await db.findById('partner_applications', applicationId);
    if (!application) {
      throw new AppError('Application not found', 404);
    }

    // Check existing credentials
    const existing = await db.findOne('api_credentials', {
      application_id: applicationId,
      environment,
      status: 'active',
    });

    if (existing) {
      throw new AppError('Active credentials already exist for this environment', 400);
    }

    const credentialCode = await this.generateCredentialCode();
    const apiKey = `kayad_${environment}_${crypto.randomBytes(16).toString('hex')}`;
    const apiSecret = crypto.randomBytes(32).toString('hex');
    const apiSecretHash = await this.hashSecret(apiSecret);

    const credential = await db.create('api_credentials', {
      credential_code: credentialCode,
      application_id: applicationId,
      api_key: apiKey,
      api_secret_hash: apiSecretHash,
      credential_type: 'api_key',
      environment,
      permissions: application.use_case?.includes('read') ? ['read_listings', 'read_passport'] : [],
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Return plain secret only once
    logInfo('API credentials generated', { credentialCode, environment });
    return {
      ...credential,
      api_secret_plaintext: apiSecret, // Only returned once
    };
  }

  /**
   * Generate OAuth credentials
   */
  async generateOAuthCredentials(applicationId) {
    const oauthClientId = `kayad_oauth_${crypto.randomBytes(8).toString('hex')}`;
    const oauthClientSecret = crypto.randomBytes(32).toString('hex');
    const oauthClientSecretHash = await this.hashSecret(oauthClientSecret);

    const credential = await db.create('api_credentials', {
      credential_code: await this.generateCredentialCode(),
      application_id: applicationId,
      api_key: oauthClientId,
      api_secret_hash: oauthClientSecretHash,
      credential_type: 'oauth',
      environment: 'production',
      permissions: [],
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });

    logInfo('OAuth credentials generated', { oauthClientId });
    return {
      ...credential,
      oauth_client_secret_plaintext: oauthClientSecret, // Only returned once
    };
  }

  /**
   * Revoke credentials
   */
  async revokeCredentials(credentialId) {
    await db.update('api_credentials', credentialId, {
      status: 'revoked',
      updated_at: new Date(),
    });
    logInfo('Credentials revoked', { credentialId });
    return { success: true };
  }

  /**
   * Update permissions
   */
  async updatePermissions(credentialId, permissions) {
    await db.update('api_credentials', credentialId, {
      permissions,
      updated_at: new Date(),
    });
    return db.findById('api_credentials', credentialId);
  }

  /**
   * Validate API request
   */
  async validateApiRequest(apiKey, requestedEndpoint) {
    const credential = await db.findOne('api_credentials', { 
      api_key: apiKey, 
      status: 'active' 
    });

    if (!credential) {
      throw new AppError('Invalid API key', 401);
    }

    // Check endpoint permissions
    const endpoint = await db.findOne('api_endpoints', { endpoint_code: requestedEndpoint });
    if (endpoint && !endpoint.is_public) {
      const hasPermission = credential.permissions.some(p => 
        endpoint.required_permissions.includes(p)
      );
      if (!hasPermission) {
        throw new AppError('Insufficient permissions', 403);
      }
    }

    // Update last used
    await db.update('api_credentials', credential.id, {
      last_used_at: new Date(),
    });

    // Log usage
    await this.logApiUsage(credential, requestedEndpoint);

    return credential;
  }

  // ============================================================
  // WEBHOOK MANAGEMENT
  // ============================================================

  /**
   * Create webhook configuration
   */
  async createWebhook(applicationId, webhookData) {
    const configCode = await this.generateWebhookCode();
    const secretKey = crypto.randomBytes(32).toString('hex');

    const webhook = await db.create('webhook_configs', {
      config_code: configCode,
      application_id: applicationId,
      webhook_url: webhookData.webhookUrl,
      webhook_name: webhookData.webhookName,
      subscribed_events: webhookData.subscribedEvents || [],
      secret_key: secretKey,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });

    logInfo('Webhook created', { configCode, url: webhookData.webhookUrl });
    return {
      ...webhook,
      secret_key_plaintext: secretKey, // Only returned once
    };
  }

  /**
   * Update webhook
   */
  async updateWebhook(webhookId, updateData) {
    await db.update('webhook_configs', webhookId, {
      ...updateData,
      updated_at: new Date(),
    });
    return db.findById('webhook_configs', webhookId);
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId) {
    await db.update('webhook_configs', webhookId, { status: 'paused' });
    return { success: true };
  }

  /**
   * Trigger webhook event
   */
  async triggerWebhook(eventType, eventData) {
    // Find all webhooks subscribed to this event
    const webhooks = await db.find('webhook_configs', { status: 'active' });
    const subscribedWebhooks = webhooks.filter(w => 
      w.subscribed_events.includes(eventType) || w.subscribed_events.includes('*')
    );

    for (const webhook of subscribedWebhooks) {
      await this.deliverWebhook(webhook, eventType, eventData);
    }

    return { delivered: subscribedWebhooks.length };
  }

  /**
   * Deliver webhook
   */
  async deliverWebhook(webhook, eventType, eventData) {
    const deliveryCode = `KAYAD-WD-${Date.now().toString(36).toUpperCase()}`;
    const payload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data: eventData,
    };

    // Sign payload
    const signature = this.signWebhookPayload(JSON.stringify(payload), webhook.secret_key);

    try {
      // In production, make HTTP request to webhook URL
      const delivery = await db.create('webhook_deliveries', {
        delivery_code: deliveryCode,
        webhook_id: webhook.id,
        event_type: eventType,
        event_id: eventData.id,
        event_data: eventData,
        request_payload: payload,
        status: 'pending',
        created_at: new Date(),
      });

      // Update webhook stats
      await db.update('webhook_configs', webhook.id, {
        delivery_attempts: webhook.delivery_attempts + 1,
        last_delivery_at: new Date(),
        last_delivery_status: 'delivered',
      });

      logInfo('Webhook delivered', { deliveryCode, eventType });
      return delivery;
    } catch (error) {
      logError('Webhook delivery failed', { webhookId: webhook.id, error: error.message });
      
      await db.update('webhook_configs', webhook.id, {
        failure_count: webhook.failure_count + 1,
        last_delivery_status: 'failed',
      });

      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature, secret) {
    const expectedSignature = this.signWebhookPayload(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Sign webhook payload
   */
  signWebhookPayload(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  // ============================================================
  // ANALYTICS
  // ============================================================

  /**
   * Log API usage
   */
  async logApiUsage(credential, endpoint) {
    const application = await db.findById('partner_applications', credential.application_id);

    await db.create('api_usage_logs', {
      request_id: crypto.randomUUID(),
      credential_id: credential.id,
      partner_id: application?.partner_id,
      application_id: credential.application_id,
      method: 'GET',
      endpoint,
      request_timestamp: new Date(),
    });
  }

  /**
   * Get application analytics
   */
  async getApplicationAnalytics(applicationId, period = 'daily') {
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

    const logs = await db.find('api_usage_logs', {
      application_id: applicationId,
      request_timestamp: { $gte: startDate },
    });

    const totalRequests = logs.length;
    const successfulRequests = logs.filter(l => l.status_code >= 200 && l.status_code < 400).length;
    const failedRequests = logs.filter(l => l.status_code >= 400).length;
    const avgResponseTime = logs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / (totalRequests || 1);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests * 100).toFixed(2) : 0,
      avgResponseTime: Math.round(avgResponseTime),
      period,
    };
  }

  // ============================================================
  // SUPPORT TICKETS
  // ============================================================

  /**
   * Create support ticket
   */
  async createTicket(partnerId, ticketData) {
    const ticketCode = await this.generateTicketCode();

    const ticket = await db.create('partner_tickets', {
      ticket_code: ticketCode,
      partner_id: partnerId,
      application_id: ticketData.applicationId,
      contact_name: ticketData.contactName,
      contact_email: ticketData.contactEmail,
      ticket_type: ticketData.ticketType,
      subject: ticketData.subject,
      description: ticketData.description,
      priority: ticketData.priority || 'normal',
      status: 'open',
      created_at: new Date(),
      updated_at: new Date(),
    });

    logInfo('Support ticket created', { ticketCode, ticketType: ticketData.ticketType });
    return ticket;
  }

  /**
   * Get partner tickets
   */
  async getPartnerTickets(partnerId, filters = {}) {
    const query = { partner_id: partnerId };
    if (filters.status) query.status = filters.status;

    return db.find('partner_tickets', query, {
      sort: { created_at: -1 },
    });
  }

  // ============================================================
  // ONBOARDING WORKFLOW
  // ============================================================

  /**
   * Get onboarding steps
   */
  async getOnboardingSteps(applicationId) {
    const application = await db.findById('partner_applications', applicationId);
    if (!application) {
      throw new AppError('Application not found', 404);
    }

    const steps = [
      { step: 'register', label: 'Register Application', status: 'completed' },
      { step: 'verify_business', label: 'Business Verification', status: 'pending' },
      { step: 'technical_contact', label: 'Technical Contact', status: 'pending' },
      { step: 'security_review', label: 'Security Review', status: 'pending' },
      { step: 'agreement', label: 'Sign Agreements', status: 'pending' },
      { step: 'api_approval', label: 'API Approval', status: 'pending' },
      { step: 'sandbox', label: 'Sandbox Access', status: 'pending' },
      { step: 'production', label: 'Production Access', status: 'pending' },
    ];

    const currentIndex = steps.findIndex(s => s.step === application.onboarding_step);
    steps.forEach((step, index) => {
      if (index < currentIndex) step.status = 'completed';
      if (index === currentIndex) step.status = 'active';
    });

    return steps;
  }

  /**
   * Complete onboarding step
   */
  async completeOnboardingStep(applicationId, step, data = {}) {
    const application = await db.findById('partner_applications', applicationId);
    if (!application) {
      throw new AppError('Application not found', 404);
    }

    const stepIndex = ['register', 'verify_business', 'technical_contact', 'security_review', 'agreement', 'api_approval', 'sandbox', 'production'];
    const currentIndex = stepIndex.indexOf(application.onboarding_step);
    const targetIndex = stepIndex.indexOf(step);

    if (targetIndex !== currentIndex + 1) {
      throw new AppError('Invalid step transition', 400);
    }

    const updates = {
      onboarding_step: step,
      updated_at: new Date(),
    };

    // Handle step-specific actions
    if (step === 'agreement') {
      updates.data_processing_agreement_signed = true;
      updates.api_agreement_signed = true;
      updates.agreements_signed_at = new Date();
    }

    if (step === 'sandbox') {
      // Generate sandbox credentials
      await this.generateCredentials(applicationId, 'sandbox');
    }

    if (step === 'production') {
      // Update to approved status
      updates.status = 'approved';
      await this.generateCredentials(applicationId, 'production');
    }

    await db.update('partner_applications', applicationId, updates);
    logInfo('Onboarding step completed', { applicationId, step });

    return this.getApplication(applicationId);
  }

  // ============================================================
  // AVAILABLE API ENDPOINTS
  // ============================================================

  /**
   * Get available API endpoints
   */
  async getAvailableEndpoints() {
    return db.find('api_endpoints', { is_active: true });
  }

  /**
   * Initialize default endpoints
   */
  async initializeDefaultEndpoints() {
    const endpoints = [
      { endpoint_code: 'listings', endpoint_name: 'Vehicle Listings', base_path: '/api/v1/listings', required_permissions: ['read_listings'] },
      { endpoint_code: 'passport', endpoint_name: 'Vehicle Passport', base_path: '/api/v1/passport', required_permissions: ['read_passport'] },
      { endpoint_code: 'inspection', endpoint_name: 'Inspection Reports', base_path: '/api/v1/inspection', required_permissions: ['read_inspection'] },
      { endpoint_code: 'auction', endpoint_name: 'Auction Events', base_path: '/api/v1/auction', required_permissions: ['read_auction'] },
      { endpoint_code: 'valuation', endpoint_name: 'Vehicle Valuation', base_path: '/api/v1/valuation', required_permissions: ['read_valuation'] },
      { endpoint_code: 'trust', endpoint_name: 'Trust Verification', base_path: '/api/v1/trust', required_permissions: ['read_trust'] },
      { endpoint_code: 'analytics', endpoint_name: 'Analytics', base_path: '/api/v1/analytics', required_permissions: ['read_analytics'] },
      { endpoint_code: 'dealer', endpoint_name: 'Dealer Information', base_path: '/api/v1/dealer', required_permissions: ['read_dealer'] },
    ];

    for (const endpoint of endpoints) {
      const existing = await db.findOne('api_endpoints', { endpoint_code: endpoint.endpoint_code });
      if (!existing) {
        await db.create('api_endpoints', {
          ...endpoint,
          api_version: 'v1',
          allowed_methods: ['GET'],
          rate_limit_per_minute: 60,
          rate_limit_per_day: 10000,
          is_public: false,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
  }

  // ============================================================
  // AVAILABLE PERMISSIONS
  // ============================================================

  /**
   * Get available permissions
   */
  async getAvailablePermissions() {
    return db.find('partner_permissions', {});
  }

  /**
   * Initialize default permissions
   */
  async initializeDefaultPermissions() {
    const permissions = [
      { permission_code: 'read_listings', permission_name: 'Read Vehicle Listings', category: 'marketplace', risk_level: 'low' },
      { permission_code: 'write_listings', permission_name: 'Create/Update Listings', category: 'marketplace', risk_level: 'medium' },
      { permission_code: 'read_passport', permission_name: 'Read Vehicle Passport', category: 'passport', risk_level: 'low' },
      { permission_code: 'read_inspection', permission_name: 'Read Inspection Reports', category: 'inspection', risk_level: 'low' },
      { permission_code: 'write_inspection', permission_name: 'Submit Inspection Reports', category: 'inspection', risk_level: 'high' },
      { permission_code: 'read_auction', permission_name: 'Read Auction Events', category: 'auction', risk_level: 'low' },
      { permission_code: 'write_auction', permission_name: 'Create/Manage Auctions', category: 'auction', risk_level: 'high' },
      { permission_code: 'read_valuation', permission_name: 'Read Vehicle Valuations', category: 'valuation', risk_level: 'low' },
      { permission_code: 'read_trust', permission_name: 'Read Trust Scores', category: 'trust', risk_level: 'low' },
      { permission_code: 'read_analytics', permission_name: 'Read Analytics', category: 'analytics', risk_level: 'low' },
      { permission_code: 'financial', permission_name: 'Financial Operations', category: 'finance', risk_level: 'high' },
      { permission_code: 'admin', permission_name: 'Administrative Access', category: 'admin', risk_level: 'high' },
    ];

    for (const permission of permissions) {
      const existing = await db.findOne('partner_permissions', { permission_code: permission.permission_code });
      if (!existing) {
        await db.create('partner_permissions', {
          ...permission,
          created_at: new Date(),
        });
      }
    }
  }

  /**
   * Get partner permissions
   */
  async getPartnerPermissions(partnerId) {
    const applications = await db.find('partner_applications', { partner_id: partnerId });
    const allPermissions = [];

    for (const app of applications) {
      const credentials = await db.find('api_credentials', { application_id: app.id });
      credentials.forEach(c => {
        allPermissions.push(...c.permissions);
      });
    }

    return [...new Set(allPermissions)];
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  /**
   * Generate partner code
   */
  async generatePartnerCode() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `KAYAD-PART-${timestamp.slice(-6)}${random}`;
  }

  /**
   * Generate application code
   */
  async generateApplicationCode() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `KAYAD-App-${timestamp.slice(-6)}${random}`;
  }

  /**
   * Generate credential code
   */
  async generateCredentialCode() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `KAYAD-Key-${timestamp.slice(-6)}${random}`;
  }

  /**
   * Generate webhook code
   */
  async generateWebhookCode() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `KAYAD-Webhook-${timestamp.slice(-6)}${random}`;
  }

  /**
   * Generate ticket code
   */
  async generateTicketCode() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `KAYAD-Support-${timestamp.slice(-6)}${random}`;
  }

  /**
   * Hash secret
   */
  async hashSecret(secret) {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  /**
   * Get partner dashboard
   */
  async getPartnerDashboard(partnerId) {
    const [partner, applications, tickets] = await Promise.all([
      this.getPartner(partnerId),
      db.find('partner_applications', { partner_id: partnerId }),
      this.getPartnerTickets(partnerId),
    ]);

    const activeApplications = applications.filter(a => a.status === 'approved');

    // Aggregate analytics across applications
    let totalRequests = 0;
    let totalWebhooks = 0;
    let avgResponseTime = 0;

    for (const app of activeApplications) {
      const analytics = await this.getApplicationAnalytics(app.id);
      totalRequests += analytics.totalRequests;
      avgResponseTime += analytics.avgResponseTime;
    }

    return {
      partner,
      activeApplications: activeApplications.length,
      pendingApplications: applications.filter(a => a.status === 'pending').length,
      openTickets: tickets.filter(t => t.status === 'open').length,
      totalApiRequests: totalRequests,
      avgResponseTime: activeApplications.length > 0 ? Math.round(avgResponseTime / activeApplications.length) : 0,
      platformHealth: 'operational',
    };
  }
}

export const partnerPlatformService = new PartnerPlatformService();
export default partnerPlatformService;
