// ============================================================
// KAYAD DIGITAL VEHICLE PASSPORT™ - PASSPORT SERVICE
// ============================================================

import db from '../../db/index.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo } from '../../utils/logger.js';
import crypto from 'crypto';

/**
 * Vehicle Passport Service
 * Manages permanent digital vehicle identities
 */
class VehiclePassportService {
  /**
   * Create or retrieve vehicle passport
   */
  async getOrCreatePassport(vehicleData) {
    const { vin, chassisNumber, registrationNumber, make, model } = vehicleData;

    // Check if passport exists
    let passport = await this.findPassport(vin, chassisNumber, registrationNumber);
    
    if (passport) {
      // Update if new data provided
      if (this.hasNewData(passport, vehicleData)) {
        passport = await db.update('vehicle_passports', passport.id, {
          ...this.sanitizeVehicleData(vehicleData),
          updated_at: new Date(),
        });
        await this.logAudit(passport.id, 'updated', { source: 'api', data: vehicleData });
      }
      return passport;
    }

    // Create new passport
    passport = await db.create('vehicle_passports', {
      passport_number: this.generatePassportNumber(),
      vin: vin || null,
      chassis_number: chassisNumber || null,
      registration_number: registrationNumber || null,
      make: make || 'Unknown',
      model: model || 'Unknown',
      ...this.sanitizeVehicleData(vehicleData),
      status: 'active',
      badges: [],
      trust_score: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await this.logAudit(passport.id, 'created', { source: 'api' });
    logInfo('Vehicle passport created', { passportId: passport.id, vin });

    return passport;
  }

  /**
   * Find existing passport
   */
  async findPassport(vin, chassisNumber, registrationNumber) {
    if (vin) {
      const byVin = await db.findOne('vehicle_passports', { vin });
      if (byVin) return byVin;
    }
    if (chassisNumber) {
      const byChassis = await db.findOne('vehicle_passports', { chassis_number: chassisNumber });
      if (byChassis) return byChassis;
    }
    if (registrationNumber) {
      const byReg = await db.findOne('vehicle_passports', { registration_number: registrationNumber });
      if (byReg) return byReg;
    }
    return null;
  }

  /**
   * Check if passport needs update
   */
  hasNewData(passport, data) {
    const fields = ['trim', 'year', 'colour', 'engine_capacity', 'fuel_type', 'transmission', 'body_type'];
    return fields.some(f => data[f] && data[f] !== passport[f]);
  }

  /**
   * Sanitize vehicle data for database
   */
  sanitizeVehicleData(data) {
    return {
      trim: data.trim || null,
      year: data.year || null,
      body_type: data.bodyType || data.body_type || null,
      colour: data.colour || null,
      country_of_origin: data.countryOrigin || data.country_of_origin || null,
      engine_capacity: data.engineCapacity || data.engine_capacity || null,
      fuel_type: data.fuelType || data.fuel_type || null,
      transmission: data.transmission || null,
      drive_type: data.driveType || data.drive_type || null,
      vehicle_category: data.vehicleCategory || data.vehicle_category || null,
    };
  }

  /**
   * Generate unique passport number
   */
  generatePassportNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `KAYAD-VP-${timestamp.slice(-6)}${random}`;
  }

  /**
   * Get full passport with all history
   */
  async getFullPassport(passportId) {
    const passport = await db.findById('vehicle_passports', passportId);
    if (!passport) {
      throw new AppError('Passport not found', 404);
    }

    const [timeline, ownership, inspections, services, accidents, auctions, finances, marketplace, documents] = await Promise.all([
      this.getTimeline(passportId),
      this.getOwnershipHistory(passportId),
      this.getInspectionHistory(passportId),
      this.getServiceHistory(passportId),
      this.getAccidentHistory(passportId),
      this.getAuctionHistory(passportId),
      this.getFinanceHistory(passportId),
      this.getMarketplaceHistory(passportId),
      this.getDocuments(passportId),
    ]);

    // Calculate scores
    const scores = await this.calculateTrustScores(passportId, {
      inspections,
      ownership,
      services,
      documents,
    });

    // Get badges
    const badges = await this.getBadges(passportId);

    return {
      ...passport,
      ...scores,
      badges,
      timeline,
      ownership,
      inspections,
      services,
      accidents,
      auctions,
      finances,
      marketplace,
      documents,
    };
  }

  /**
   * Get public passport view (QR code friendly)
   */
  async getPublicPassport(passportId) {
    const passport = await db.findById('vehicle_passports', passportId);
    if (!passport) {
      throw new AppError('Passport not found', 404);
    }

    const [timeline, inspections, badges, documents] = await Promise.all([
      this.getPublicTimeline(passportId),
      this.getInspectionHistory(passportId),
      this.getBadges(passportId),
      this.getPublicDocuments(passportId),
    ]);

    // Get latest scores
    const latestInspection = inspections[0];
    const latestOwnership = (await this.getOwnershipHistory(passportId)).find(o => o.is_current);

    return {
      passportId: passport.id,
      passportNumber: passport.passport_number,
      status: passport.status,
      vehicle: {
        make: passport.make,
        model: passport.model,
        year: passport.year,
        vin: this.maskVin(passport.vin),
        registration: passport.registration_number,
      },
      latestInspection: latestInspection ? {
        date: latestInspection.inspection_date,
        grade: latestInspection.overall_grade,
        score: latestInspection.overall_score,
        provider: latestInspection.provider_name,
      } : null,
      ownership: latestOwnership ? {
        type: latestOwnership.ownership_type,
        verified: latestOwnership.is_verified,
      } : null,
      trustScore: passport.trust_score,
      badges: badges.map(b => ({ code: b.badge_code, name: b.badge_name })),
      timelineSummary: timeline.slice(0, 10),
      documentCount: documents.length,
      createdAt: passport.created_at,
    };
  }

  /**
   * Mask VIN for public display
   */
  maskVin(vin) {
    if (!vin) return 'Not Available';
    if (vin.length < 8) return vin;
    return `${vin.slice(0, 3)}...${vin.slice(-4)}`;
  }

  /**
   * Add timeline event
   */
  async addTimelineEvent(passportId, eventData) {
    const passport = await db.findById('vehicle_passports', passportId);
    if (!passport) {
      throw new AppError('Passport not found', 404);
    }

    const event = await db.create('vehicle_timeline', {
      passport_id: passportId,
      event_type: eventData.eventType,
      event_category: eventData.eventCategory,
      event_title: eventData.eventTitle,
      event_description: eventData.eventDescription,
      event_date: eventData.eventDate,
      event_time: eventData.eventTime,
      is_verified: eventData.verified || false,
      verified_source: eventData.verifiedSource,
      reference_number: eventData.referenceNumber,
      evidence_urls: eventData.evidenceUrls || [],
      related_inspection_id: eventData.inspectionId,
      related_auction_id: eventData.auctionId,
      related_listing_id: eventData.listingId,
      related_service_id: eventData.serviceId,
      performed_by: eventData.performedBy,
      performed_by_name: eventData.performedByName,
      created_at: new Date(),
    });

    await this.logAudit(passportId, 'event_added', { eventType: eventData.eventType, eventId: event.id });
    await this.updateTrustScore(passportId);

    logInfo('Timeline event added', { passportId, eventType: eventData.eventType });
    return event;
  }

  /**
   * Get timeline
   */
  async getTimeline(passportId) {
    return db.find('vehicle_timeline', { passport_id: passportId }, { sort: { event_date: -1 } });
  }

  /**
   * Get public timeline (limited events)
   */
  async getPublicTimeline(passportId) {
    const events = await db.find('vehicle_timeline', { passport_id: passportId }, { sort: { event_date: -1 } });
    return events.map(e => ({
      id: e.id,
      eventType: e.event_type,
      eventTitle: e.event_title,
      eventDate: e.event_date,
      isVerified: e.is_verified,
      verifiedSource: e.verified_source,
    }));
  }

  /**
   * Get ownership history
   */
  async getOwnershipHistory(passportId) {
    const history = await db.find('ownership_history', { passport_id: passportId }, { sort: { ownership_number: -1 } });
    return history.map(h => ({
      id: h.id,
      ownershipNumber: h.ownership_number,
      ownershipStart: h.ownership_start,
      ownershipEnd: h.ownership_end,
      ownershipType: h.ownership_type,
      ownerDisplayName: h.owner_display_name,
      isCurrent: h.is_current,
      isVerified: h.is_verified,
      transferMethod: h.transfer_method,
    }));
  }

  /**
   * Get inspection history
   */
  async getInspectionHistory(passportId) {
    const history = await db.find('inspection_history', { passport_id: passportId }, { sort: { inspection_date: -1 } });
    return history.map(i => ({
      id: i.id,
      inspectionId: i.inspection_id,
      inspectionDate: i.inspection_date,
      inspectionType: i.inspection_type,
      providerId: i.provider_id,
      providerName: i.provider_name,
      overallScore: i.overall_score,
      overallGrade: i.overall_grade,
      mechanicalScore: i.mechanical_score,
      safetyScore: i.safety_score,
      bodyScore: i.body_score,
      interiorScore: i.interior_score,
      electricalScore: i.electrical_score,
      criticalDefects: i.critical_defects,
      majorDefects: i.major_defects,
      minorDefects: i.minor_defects,
      reportVerificationCode: i.report_verification_code,
    }));
  }

  /**
   * Get service history
   */
  async getServiceHistory(passportId) {
    const history = await db.find('service_history', { passport_id: passportId }, { sort: { service_date: -1 } });
    return history.map(s => ({
      id: s.id,
      serviceDate: s.service_date,
      serviceType: s.service_type,
      serviceTitle: s.service_title,
      workshopName: s.workshop_name,
      workshopVerified: s.workshop_verified,
      mileageAtService: s.mileage_at_service,
      serviceCost: s.service_cost,
      currency: s.currency,
      invoiceNumber: s.invoice_number,
      isVerified: s.is_verified,
    }));
  }

  /**
   * Get accident history
   */
  async getAccidentHistory(passportId) {
    return db.find('accident_history', { passport_id: passportId }, { sort: { accident_date: -1 } });
  }

  /**
   * Get auction history
   */
  async getAuctionHistory(passportId) {
    const history = await db.find('auction_history', { passport_id: passportId }, { sort: { auction_date: -1 } });
    return history.map(a => ({
      id: a.id,
      auctionDate: a.auction_date,
      auctionOrganizer: a.auction_organizer,
      organizerVerified: a.organizer_verified,
      auctionType: a.auction_type,
      lotNumber: a.lot_number,
      reserveMet: a.reserve_met,
      sold: a.sold,
      sellingPrice: a.selling_price,
      currency: a.currency,
      winningBidderDisplay: a.winning_bidder_display,
      inspectionId: a.inspection_id,
      isVerified: a.is_verified,
    }));
  }

  /**
   * Get finance history
   */
  async getFinanceHistory(passportId) {
    return db.find('finance_history', { passport_id: passportId }, { sort: { event_date: -1 } });
  }

  /**
   * Get marketplace history
   */
  async getMarketplaceHistory(passportId) {
    return db.find('marketplace_history', { passport_id: passportId }, { sort: { event_date: -1 } });
  }

  /**
   * Get documents
   */
  async getDocuments(passportId) {
    return db.find('vehicle_documents', { passport_id: passportId }, { sort: { created_at: -1 } });
  }

  /**
   * Get public documents only
   */
  async getPublicDocuments(passportId) {
    return db.find('vehicle_documents', { 
      passport_id: passportId, 
      visibility: 'public' 
    }, { sort: { created_at: -1 } });
  }

  /**
   * Calculate trust scores
   */
  async calculateTrustScores(passportId, data) {
    const { inspections, ownership, services, documents } = data;

    // Inspection score (40% weight)
    const inspectionScore = inspections.length > 0
      ? Math.min(100, inspections.reduce((sum, i) => sum + (i.overall_score || 0), 0) / inspections.length)
      : 0;

    // Maintenance score (20% weight)
    const maintenanceScore = services.length > 0
      ? Math.min(100, services.length * 10)
      : 0;

    // Ownership score (20% weight)
    const ownershipScore = ownership.length > 0
      ? Math.min(100, ownership.filter(o => o.is_verified).length * 33)
      : 0;

    // Documentation score (20% weight)
    const documentationScore = documents.length > 0
      ? Math.min(100, documents.filter(d => d.is_verified).length * 20)
      : 0;

    // Overall trust score
    const trustScore = (
      inspectionScore * 0.4 +
      maintenanceScore * 0.2 +
      ownershipScore * 0.2 +
      documentationScore * 0.2
    );

    return {
      inspection_score: Math.round(inspectionScore),
      maintenance_score: Math.round(maintenanceScore),
      ownership_score: Math.round(ownershipScore),
      documentation_score: Math.round(documentationScore),
      trust_score: Math.round(trustScore),
    };
  }

  /**
   * Update trust score
   */
  async updateTrustScore(passportId) {
    const [inspections, ownership, services, documents] = await Promise.all([
      this.getInspectionHistory(passportId),
      this.getOwnershipHistory(passportId),
      this.getServiceHistory(passportId),
      this.getDocuments(passportId),
    ]);

    const scores = await this.calculateTrustScores(passportId, { inspections, ownership, services, documents });
    
    await db.update('vehicle_passports', passportId, {
      ...scores,
      updated_at: new Date(),
    });

    // Update badges
    await this.updateBadges(passportId, { inspections, ownership, services, documents });

    return scores;
  }

  /**
   * Get badges
   */
  async getBadges(passportId) {
    return db.find('verification_badges', { passport_id: passportId, is_active: true });
  }

  /**
   * Update badges based on criteria
   */
  async updateBadges(passportId, data) {
    const { inspections, ownership, services, documents } = data;
    
    const badgeCriteria = [
      { 
        code: 'verified_identity', 
        name: 'Verified Identity',
        condition: (d) => d.inspections?.some(i => i.overall_score >= 80) 
      },
      { 
        code: 'verified_ownership', 
        name: 'Verified Ownership',
        condition: (d) => d.ownership?.some(o => o.is_verified)
      },
      { 
        code: 'verified_inspection', 
        name: 'Verified Inspection',
        condition: (d) => d.inspections?.length >= 1
      },
      { 
        code: 'verified_service', 
        name: 'Verified Service',
        condition: (d) => d.services?.some(s => s.is_verified)
      },
      { 
        code: 'verified_documentation', 
        name: 'Verified Documentation',
        condition: (d) => d.documents?.some(d => d.is_verified)
      },
    ];

    for (const badge of badgeCriteria) {
      const existing = await db.findOne('verification_badges', { 
        passport_id: passportId, 
        badge_code: badge.code 
      });

      const qualifies = badge.condition(data);

      if (qualifies && !existing) {
        await db.create('verification_badges', {
          passport_id: passportId,
          badge_code: badge.code,
          badge_name: badge.name,
          awarded_at: new Date(),
          is_active: true,
          criteria_met: badge,
        });
        logInfo('Badge awarded', { passportId, badge: badge.code });
      }
    }
  }

  /**
   * Log audit event
   */
  async logAudit(passportId, actionType, details) {
    await db.create('passport_audit_log', {
      passport_id: passportId,
      action_type: actionType,
      action_description: this.getActionDescription(actionType),
      performed_by_type: 'system',
      previous_state: details.previousState,
      new_state: details.newState,
      checksum: crypto.createHash('sha256').update(JSON.stringify(details)).digest('hex'),
      created_at: new Date(),
    });
  }

  /**
   * Get action description
   */
  getActionDescription(actionType) {
    const descriptions = {
      created: 'Passport created',
      updated: 'Passport updated',
      event_added: 'Timeline event added',
      badge_awarded: 'Badge awarded',
      score_updated: 'Trust score updated',
    };
    return descriptions[actionType] || actionType;
  }

  /**
   * Search passports
   */
  async searchPassports(query, options = {}) {
    const searchQuery = {};
    
    if (query.vin) searchQuery.vin = { $regex: query.vin, $options: 'i' };
    if (query.registration) searchQuery.registration_number = { $regex: query.registration, $options: 'i' };
    if (query.make) searchQuery.make = { $regex: query.make, $options: 'i' };
    if (query.model) searchQuery.model = { $regex: query.model, $options: 'i' };

    return db.find('vehicle_passports', searchQuery, {
      sort: { created_at: -1 },
      limit: options.limit || 20,
    });
  }
}

export const vehiclePassportService = new VehiclePassportService();
export default vehiclePassportService;
