// ============================================================
// KAYAD ENTERPRISE IDENTITY & ACCESS MANAGEMENT
// IDENTITY SERVICE
// ============================================================

import db from '../../db/index.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo, logError } from '../../utils/logger.js';
import crypto from 'crypto';

/**
 * Identity Service
 * Security backbone for KAYAD ecosystem
 */
class IdentityService {

  // ============================================================
  // USER MANAGEMENT
  // ============================================================

  /**
   * Create user
   */
  async createUser(userData) {
    const userCode = await this.generateUserCode();
    const passwordHash = await this.hashPassword(userData.password);

    const user = await db.create('users', {
      user_code: userCode,
      email: userData.email.toLowerCase(),
      phone: userData.phone,
      password_hash: passwordHash,
      first_name: userData.firstName,
      last_name: userData.lastName,
      identity_type: userData.identityType,
      organization_id: userData.organizationId,
      department: userData.department,
      job_title: userData.jobTitle,
      status: userData.status || 'pending',
      email_verified: false,
      failed_login_attempts: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await this.logSecurityEvent('user_created', user.id, {
      identityType: userData.identityType,
      organizationId: userData.organizationId,
    });

    logInfo('User created', { userCode, identityType: userData.identityType });
    return user;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    const user = await db.findById('users', userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    return db.findOne('users', { email: email.toLowerCase() });
  }

  /**
   * Update user
   */
  async updateUser(userId, updateData) {
    await db.update('users', userId, {
      ...updateData,
      updated_at: new Date(),
    });
    return this.getUserById(userId);
  }

  // ============================================================
  // AUTHENTICATION
  // ============================================================

  /**
   * Authenticate user
   */
  async authenticate(email, password, context = {}) {
    const user = await this.getUserByEmail(email);

    if (!user) {
      await this.logAuthAttempt(null, email, 'login', false, 'user_not_found', context);
      throw new AppError('Invalid credentials', 401);
    }

    // Check account status
    if (user.status === 'locked') {
      await this.logAuthAttempt(user.id, email, 'login', false, 'account_locked', context);
      throw new AppError('Account is locked', 403);
    }

    if (user.status === 'terminated') {
      await this.logAuthAttempt(user.id, email, 'login', false, 'account_terminated', context);
      throw new AppError('Account has been terminated', 403);
    }

    // Verify password
    const passwordValid = await this.verifyPassword(password, user.password_hash);

    if (!passwordValid) {
      await this.handleFailedLogin(user);
      await this.logAuthAttempt(user.id, email, 'login', false, 'invalid_password', context);
      throw new AppError('Invalid credentials', 401);
    }

    // Reset failed attempts
    await db.update('users', user.id, {
      failed_login_attempts: 0,
      updated_at: new Date(),
    });

    // Create session
    const session = await this.createSession(user, context);

    await this.logAuthAttempt(user.id, email, 'login', true, null, context);

    return {
      user,
      session,
      requiresMFA: await this.userRequiresMFA(user),
    };
  }

  /**
   * Handle failed login
   */
  async handleFailedLogin(user) {
    const attempts = user.failed_login_attempts + 1;
    const lockoutThreshold = 5;

    const updates = {
      failed_login_attempts: attempts,
      updated_at: new Date(),
    };

    if (attempts >= lockoutThreshold) {
      updates.status = 'locked';
      updates.locked_at = new Date();
      updates.lockout_reason = 'Too many failed login attempts';
    }

    await db.update('users', user.id, updates);
  }

  /**
   * Create session
   */
  async createSession(user, context = {}) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const accessToken = crypto.randomBytes(48).toString('base64url');
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const session = await db.create('user_sessions', {
      session_id: sessionId,
      user_id: user.id,
      device_type: context.deviceType || 'web',
      device_name: context.deviceName,
      device_fingerprint: context.deviceFingerprint,
      user_agent: context.userAgent,
      ip_address: context.ipAddress,
      country: context.country,
      city: context.city,
      access_token_hash: await this.hashToken(accessToken),
      token_expires_at: tokenExpiresAt,
      is_active: true,
      is_trusted: context.isTrusted || false,
      last_activity_at: new Date(),
      login_at: new Date(),
    });

    return {
      sessionId,
      accessToken,
      expiresAt: tokenExpiresAt,
    };
  }

  /**
   * Validate session
   */
  async validateSession(sessionId, token) {
    const session = await db.findOne('user_sessions', {
      session_id: sessionId,
      is_active: true,
    });

    if (!session) {
      throw new AppError('Invalid session', 401);
    }

    const tokenHash = await this.hashToken(token);
    if (session.access_token_hash !== tokenHash) {
      throw new AppError('Invalid token', 401);
    }

    if (new Date() > new Date(session.token_expires_at)) {
      await this.terminateSession(sessionId);
      throw new AppError('Session expired', 401);
    }

    // Update activity
    await db.update('user_sessions', session.id, {
      last_activity_at: new Date(),
    });

    return session;
  }

  /**
   * Terminate session
   */
  async terminateSession(sessionId) {
    await db.update('user_sessions', { session_id: sessionId }, {
      is_active: false,
      logout_at: new Date(),
    });
  }

  // ============================================================
  // MFA
  // ============================================================

  /**
   * Check if user requires MFA
   */
  async userRequiresMFA(user) {
    const mfaMethods = await db.find('mfa_methods', {
      user_id: user.id,
      is_active: true,
    });
    return mfaMethods.length > 0;
  }

  /**
   * Enable MFA
   */
  async enableMFA(userId, mfaData) {
    const method = await db.create('mfa_methods', {
      user_id: userId,
      method_type: mfaData.methodType,
      identifier: mfaData.identifier,
      totp_secret_encrypted: mfaData.secret,
      is_active: true,
      is_primary: mfaData.isPrimary || false,
      created_at: new Date(),
    });

    await this.logSecurityEvent('mfa_enabled', userId, {
      methodType: mfaData.methodType,
    });

    // Generate recovery codes
    const recoveryCodes = this.generateRecoveryCodes();
    await db.update('mfa_methods', method.id, {
      recovery_codes_hash: await this.hashRecoveryCodes(recoveryCodes),
    });

    logInfo('MFA enabled', { userId, methodType: mfaData.methodType });

    return {
      method,
      recoveryCodes,
    };
  }

  /**
   * Verify MFA code
   */
  async verifyMFACode(userId, code, methodType) {
    const method = await db.findOne('mfa_methods', {
      user_id: userId,
      method_type: methodType,
      is_active: true,
    });

    if (!method) {
      throw new AppError('MFA method not configured', 400);
    }

    // In production, implement actual TOTP/SMS verification
    const isValid = true; // Placeholder

    if (!isValid) {
      await this.logSecurityEvent('mfa_failed', userId, { methodType });
      throw new AppError('Invalid MFA code', 401);
    }

    await this.logSecurityEvent('mfa_success', userId, { methodType });
    return true;
  }

  /**
   * Generate recovery codes
   */
  generateRecoveryCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  // ============================================================
  // AUTHORIZATION
  // ============================================================

  /**
   * Get user permissions
   */
  async getUserPermissions(userId) {
    const userRoles = await db.find('user_roles', {
      user_id: userId,
      is_active: true,
    });

    const permissions = new Set();

    for (const userRole of userRoles) {
      const role = await db.findById('roles', userRole.role_id);
      if (role) {
        role.permissions.forEach(p => permissions.add(p));
      }
    }

    return Array.from(permissions);
  }

  /**
   * Check permission
   */
  async hasPermission(userId, permission) {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permission);
  }

  /**
   * Assign role to user
   */
  async assignRole(userId, roleId, organizationId, grantedBy) {
    const userRole = await db.create('user_roles', {
      user_id: userId,
      organization_id: organizationId,
      role_id: roleId,
      role_scope: organizationId ? 'organization' : 'system',
      is_active: true,
      granted_by: grantedBy,
      granted_at: new Date(),
    });

    await this.logSecurityEvent('role_assigned', userId, {
      roleId,
      organizationId,
      grantedBy,
    });

    logInfo('Role assigned', { userId, roleId });
    return userRole;
  }

  /**
   * Revoke role from user
   */
  async revokeRole(userId, roleId, organizationId) {
    await db.update('user_roles', {
      user_id: userId,
      role_id: roleId,
      organization_id: organizationId,
    }, {
      is_active: false,
    });

    await this.logSecurityEvent('role_revoked', userId, { roleId, organizationId });
    return { success: true };
  }

  // ============================================================
  // SESSION MANAGEMENT
  // ============================================================

  /**
   * Get user sessions
   */
  async getUserSessions(userId) {
    return db.find('user_sessions', {
      user_id: userId,
      is_active: true,
    }, {
      sort: { last_activity_at: -1 },
    });
  }

  /**
   * Revoke session
   */
  async revokeSession(sessionId, userId) {
    const session = await db.findOne('user_sessions', { session_id: sessionId });

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    if (session.user_id !== userId) {
      throw new AppError('Unauthorized', 403);
    }

    await this.terminateSession(sessionId);

    await this.logSecurityEvent('session_revoked', userId, { sessionId });

    return { success: true };
  }

  /**
   * Revoke all sessions
   */
  async revokeAllSessions(userId, exceptSessionId = null) {
    const query = { user_id: userId, is_active: true };
    if (exceptSessionId) {
      query.session_id = { $ne: exceptSessionId };
    }

    await db.update('user_sessions', query, {
      is_active: false,
      logout_at: new Date(),
    });

    await this.logSecurityEvent('all_sessions_revoked', userId);

    return { success: true };
  }

  // ============================================================
  // SECURITY AUDIT
  // ============================================================

  /**
   * Log authentication attempt
   */
  async logAuthAttempt(userId, email, attemptType, success, failureReason, context = {}) {
    const riskScore = await this.calculateRiskScore(context);

    await db.create('auth_attempts', {
      user_id: userId,
      email,
      attempt_type: attemptType,
      success,
      failure_reason: failureReason,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      device_fingerprint: context.deviceFingerprint,
      country: context.country,
      city: context.city,
      risk_score: riskScore.score,
      risk_factors: riskScore.factors,
      created_at: new Date(),
    });
  }

  /**
   * Log security event
   */
  async logSecurityEvent(eventType, userId, eventData = {}) {
    const user = userId ? await this.getUserById(userId) : null;

    await db.create('security_audit_log', {
      event_type: eventType,
      user_id: userId,
      user_email: user?.email,
      user_type: user?.identity_type,
      event_data: eventData,
      success: true,
      created_at: new Date(),
    });
  }

  /**
   * Calculate risk score
   */
  async calculateRiskScore(context) {
    let score = 0;
    const factors = [];

    // Check for known suspicious IP
    // Check for new device
    // Check for unusual location
    // Check for multiple failures

    return { score, factors };
  }

  // ============================================================
  // ROLES & PERMISSIONS
  // ============================================================

  /**
   * Create role
   */
  async createRole(roleData) {
    const role = await db.create('roles', {
      role_code: roleData.roleCode,
      role_name: roleData.roleName,
      description: roleData.description,
      scope: roleData.scope || 'organization',
      organization_id: roleData.organizationId,
      permissions: roleData.permissions || [],
      is_active: true,
      is_system: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    logInfo('Role created', { roleCode: roleData.roleCode });
    return role;
  }

  /**
   * Get organization roles
   */
  async getOrganizationRoles(organizationId) {
    return db.find('roles', {
      organization_id: organizationId,
      is_active: true,
    });
  }

  /**
   * Initialize system permissions
   */
  async initializeSystemPermissions() {
    const permissions = [
      { permission_code: 'vehicles.view', permission_name: 'View Vehicles', category: 'marketplace', risk_level: 'low' },
      { permission_code: 'vehicles.create', permission_name: 'Create Vehicles', category: 'marketplace', risk_level: 'medium' },
      { permission_code: 'vehicles.edit', permission_name: 'Edit Vehicles', category: 'marketplace', risk_level: 'medium' },
      { permission_code: 'vehicles.delete', permission_name: 'Delete Vehicles', category: 'marketplace', risk_level: 'high' },
      { permission_code: 'dealer.view', permission_name: 'View Dealer Dashboard', category: 'dealer', risk_level: 'low' },
      { permission_code: 'dealer.manage', permission_name: 'Manage Dealer', category: 'dealer', risk_level: 'high' },
      { permission_code: 'auctions.view', permission_name: 'View Auctions', category: 'auction', risk_level: 'low' },
      { permission_code: 'auctions.manage', permission_name: 'Manage Auctions', category: 'auction', risk_level: 'high' },
      { permission_code: 'inspection.view', permission_name: 'View Inspections', category: 'inspection', risk_level: 'low' },
      { permission_code: 'inspection.create', permission_name: 'Create Inspections', category: 'inspection', risk_level: 'medium' },
      { permission_code: 'inspection.approve', permission_name: 'Approve Inspections', category: 'inspection', risk_level: 'high' },
      { permission_code: 'finance.view', permission_name: 'View Financial Data', category: 'finance', risk_level: 'medium' },
      { permission_code: 'finance.manage', permission_name: 'Manage Finances', category: 'finance', risk_level: 'critical' },
      { permission_code: 'compliance.view', permission_name: 'View Compliance', category: 'compliance', risk_level: 'medium' },
      { permission_code: 'compliance.manage', permission_name: 'Manage Compliance', category: 'compliance', risk_level: 'critical' },
      { permission_code: 'admin.users', permission_name: 'Manage Users', category: 'admin', risk_level: 'critical' },
      { permission_code: 'admin.roles', permission_name: 'Manage Roles', category: 'admin', risk_level: 'critical' },
      { permission_code: 'admin.system', permission_name: 'System Administration', category: 'admin', risk_level: 'critical' },
    ];

    for (const perm of permissions) {
      const existing = await db.findOne('permissions', { permission_code: perm.permission_code });
      if (!existing) {
        await db.create('permissions', {
          ...perm,
          created_at: new Date(),
        });
      }
    }
  }

  /**
   * Initialize system roles
   */
  async initializeSystemRoles() {
    const roles = [
      {
        role_code: 'admin',
        role_name: 'Administrator',
        description: 'Full system access',
        scope: 'system',
        permissions: ['admin.users', 'admin.roles', 'admin.system'],
      },
      {
        role_code: 'dealer_owner',
        role_name: 'Dealer Owner',
        description: 'Full dealer management access',
        scope: 'system',
        permissions: ['vehicles.view', 'vehicles.create', 'vehicles.edit', 'dealer.view', 'dealer.manage'],
      },
      {
        role_code: 'dealer_staff',
        role_name: 'Dealer Staff',
        description: 'Limited dealer access',
        scope: 'system',
        permissions: ['vehicles.view', 'vehicles.create', 'dealer.view'],
      },
      {
        role_code: 'inspector',
        role_name: 'Inspector',
        description: 'Inspection management',
        scope: 'system',
        permissions: ['inspection.view', 'inspection.create'],
      },
      {
        role_code: 'inspection_approver',
        role_name: 'Inspection Approver',
        description: 'Approve inspection reports',
        scope: 'system',
        permissions: ['inspection.view', 'inspection.approve'],
      },
    ];

    for (const role of roles) {
      const existing = await db.findOne('roles', { role_code: role.role_code, scope: 'system' });
      if (!existing) {
        await db.create('roles', {
          ...role,
          is_active: true,
          is_system: true,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
  }

  // ============================================================
  // SECURITY DASHBOARD
  // ============================================================

  /**
   * Get security dashboard
   */
  async getSecurityDashboard() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [failedLogins, successfulLogins, lockedAccounts, recentAlerts] = await Promise.all([
      db.find('auth_attempts', {
        success: false,
        created_at: { $gte: oneDayAgo },
      }),
      db.find('auth_attempts', {
        success: true,
        created_at: { $gte: oneDayAgo },
      }),
      db.find('users', { status: 'locked' }),
      db.find('security_audit_log', {
        event_type: { $in: ['account_locked', 'suspicious_activity', 'permission_change'] },
        created_at: { $gte: oneWeekAgo },
      }, { limit: 10 }),
    ]);

    return {
      last24Hours: {
        failedLogins: failedLogins.length,
        successfulLogins: successfulLogins.length,
        lockedAccounts: lockedAccounts.length,
        suspiciousAttempts: failedLogins.filter(a => a.risk_score > 70).length,
      },
      activeMFA: await this.getMFAStats(),
      recentAlerts,
      topRiskFactors: this.analyzeRiskFactors(failedLogins),
    };
  }

  /**
   * Get MFA statistics
   */
  async getMFAStats() {
    const totalUsers = await db.find('users', { status: 'active' });
    const mfaEnabled = await db.find('mfa_methods', { is_active: true });

    return {
      totalEnabled: new Set(mfaEnabled.map(m => m.user_id)).size,
      totalUsers: totalUsers.length,
      percentage: totalUsers.length > 0
        ? Math.round(new Set(mfaEnabled.map(m => m.user_id)).size / totalUsers.length * 100)
        : 0,
    };
  }

  /**
   * Analyze risk factors
   */
  analyzeRiskFactors(failedLogins) {
    const byIp = {};
    const byCountry = {};

    failedLogins.forEach(login => {
      if (login.ip_address) byIp[login.ip_address] = (byIp[login.ip_address] || 0) + 1;
      if (login.country) byCountry[login.country] = (byCountry[login.country] || 0) + 1;
    });

    return {
      topOffendingIPs: Object.entries(byIp).sort((a, b) => b[1] - a[1]).slice(0, 5),
      topOffendingCountries: Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  async generateUserCode() {
    const timestamp = Date.now().toString(36).toUpperCase();
    return `KAYAD-User-${timestamp.slice(-8)}`;
  }

  async hashPassword(password) {
    // In production, use bcrypt or argon2
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  async verifyPassword(password, hash) {
    const passwordHash = await this.hashPassword(password);
    return crypto.timingSafeEqual(Buffer.from(passwordHash), Buffer.from(hash));
  }

  async hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async hashRecoveryCodes(codes) {
    return codes.map(code => crypto.createHash('sha256').update(code).digest('hex'));
  }
}

export const identityService = new IdentityService();
export default identityService;
