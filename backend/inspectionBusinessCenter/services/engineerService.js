// ============================================================
// KAYAD INSPECTION BUSINESS CENTER - ENGINEER SERVICE
// ============================================================

import db from '../../db/index.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo, logError } from '../../utils/logger.js';

/**
 * Engineer Service - Manage inspection engineers/staff
 */
class EngineerService {
  /**
   * Create engineer
   */
  async createEngineer(providerId, engineerData) {
    const engineer = {
      provider_id: providerId,
      user_id: engineerData.userId,
      first_name: engineerData.firstName,
      last_name: engineerData.lastName,
      email: engineerData.email,
      phone: engineerData.phone,
      photo_url: engineerData.photoUrl,
      role: engineerData.role,
      skills: engineerData.skills || [],
      vehicle_types: engineerData.vehicleTypes || ['cars', 'suvs'],
      certifications: engineerData.certifications || [],
      years_experience: engineerData.yearsExperience || 0,
      home_county: engineerData.homeCounty,
      home_town: engineerData.homeTown,
      home_latitude: engineerData.homeLatitude,
      home_longitude: engineerData.homeLongitude,
      working_hours: engineerData.workingHours,
      is_active: true,
      is_available: true,
      inspection_count: 0,
      average_rating: 0,
      total_reviews: 0,
      avg_inspection_time_minutes: 60,
      on_time_rate: 100,
      quality_score: 100,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db.create('inspection_engineers', engineer);
    logInfo('Engineer created', { engineerId: result.id, providerId });
    return result;
  }

  /**
   * Get engineer by ID
   */
  async getEngineerById(engineerId) {
    const engineer = await db.findById('inspection_engineers', engineerId);
    if (!engineer) {
      throw new AppError('Engineer not found', 404);
    }
    return engineer;
  }

  /**
   * Get all engineers for provider
   */
  async getEngineers(providerId, filters = {}) {
    const query = { provider_id: providerId, is_active: true };

    if (filters.role) {
      query.role = filters.role;
    }
    if (filters.isAvailable !== undefined) {
      query.is_available = filters.isAvailable;
    }

    const engineers = await db.find('inspection_engineers', query, {
      sort: { first_name: 1 },
    });

    return engineers.map(e => this.formatEngineerBrief(e));
  }

  /**
   * Update engineer
   */
  async updateEngineer(engineerId, updates) {
    const allowedUpdates = [
      'first_name', 'last_name', 'email', 'phone', 'photo_url',
      'role', 'skills', 'vehicle_types', 'certifications',
      'years_experience', 'home_county', 'home_town',
      'home_latitude', 'home_longitude', 'working_hours',
      'is_available', 'is_active'
    ];

    const sanitizedUpdates = {};
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        sanitizedUpdates[key] = updates[key];
      }
    }
    sanitizedUpdates.updated_at = new Date();

    const result = await db.update('inspection_engineers', engineerId, sanitizedUpdates);
    logInfo('Engineer updated', { engineerId });
    return result;
  }

  /**
   * Set engineer availability
   */
  async setAvailability(engineerId, isAvailable) {
    return this.updateEngineer(engineerId, { is_available: isAvailable });
  }

  /**
   * Get engineer performance metrics
   */
  async getEngineerPerformance(engineerId, period = 'monthly') {
    const engineer = await this.getEngineerById(engineerId);

    let startDate = new Date();
    if (period === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    // Get completed inspections
    const inspections = await db.find('inspection_bookings', {
      assigned_staff_id: engineerId,
      status: 'closed',
      completed_at: { $gte: startDate }
    });

    // Calculate metrics
    const totalInspections = inspections.length;
    const totalRevenue = inspections
      .filter(i => i.payment_status === 'fully_paid')
      .reduce((sum, i) => sum + parseFloat(i.total_price), 0);

    // Get reviews
    const reviews = await db.find('inspection_reviews', {
      provider_id: engineer.provider_id,
    });

    // Get scheduled jobs
    const today = new Date().toISOString().split('T')[0];
    const scheduledJobs = await db.find('inspection_bookings', {
      assigned_staff_id: engineerId,
      scheduled_date: { $gte: today },
      status: { $nin: ['cancelled', 'closed'] }
    });

    return {
      engineer: {
        id: engineer.id,
        name: `${engineer.first_name} ${engineer.last_name}`,
        role: engineer.role,
        photoUrl: engineer.photo_url,
      },
      period,
      metrics: {
        totalInspections,
        totalRevenue,
        averageRating: engineer.average_rating,
        onTimeRate: engineer.on_time_rate,
        qualityScore: engineer.quality_score,
        avgInspectionTime: engineer.avg_inspection_time_minutes,
        yearsExperience: engineer.years_experience,
      },
      scheduledJobs: scheduledJobs.length,
      utilizationRate: this.calculateUtilization(engineerId, startDate),
    };
  }

  /**
   * Calculate utilization rate
   */
  async calculateUtilization(engineerId, startDate) {
    const days = Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const workHoursPerDay = 8;
    const totalAvailableHours = days * workHoursPerDay;

    const inspections = await db.find('inspection_bookings', {
      assigned_staff_id: engineerId,
      scheduled_date: { $gte: startDate.toISOString().split('T')[0] }
    });

    const totalJobHours = inspections.reduce((sum, i) => sum + 1, 0) * 1.5; // Assume 1.5 hours avg per inspection

    return totalAvailableHours > 0
      ? Math.round((totalJobHours / totalAvailableHours) * 100)
      : 0;
  }

  /**
   * Get engineer schedule
   */
  async getEngineerSchedule(engineerId, startDate, endDate) {
    const schedules = await db.find('engineer_schedules', {
      engineer_id: engineerId,
      date: { $gte: startDate, $lte: endDate }
    }, { sort: { date: 1, start_time: 1 } });

    const bookings = await db.find('inspection_bookings', {
      assigned_staff_id: engineerId,
      scheduled_date: { $gte: startDate, $lte: endDate }
    });

    return {
      engineerId,
      startDate,
      endDate,
      schedules: schedules.map(s => ({
        id: s.id,
        date: s.date,
        startTime: s.start_time,
        endTime: s.end_time,
        status: s.status,
        bookingId: s.booking_id,
        locationName: s.location_name,
        notes: s.notes,
      })),
      bookings: bookings.map(b => ({
        id: b.id,
        reference: b.booking_reference,
        date: b.scheduled_date,
        time: b.scheduled_time,
        status: b.status,
        vehicle: `${b.vehicle_year} ${b.vehicle_make} ${b.vehicle_model}`,
        location: `${b.inspection_town}, ${b.inspection_county}`,
      })),
    };
  }

  /**
   * Get available engineers for assignment
   */
  async getAvailableEngineers(providerId, bookingId) {
    const booking = await db.findById('inspection_bookings', bookingId);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    const engineers = await db.find('inspection_engineers', {
      provider_id: providerId,
      is_active: true,
      is_available: true,
    });

    // Filter by skills and vehicle types
    const qualified = engineers.filter(e => {
      const vehicleTypes = e.vehicle_types || [];
      return vehicleTypes.includes(booking.vehicle_type) || vehicleTypes.includes('cars');
    });

    // Score and rank by suitability
    const scored = qualified.map(e => ({
      ...this.formatEngineerBrief(e),
      score: this.calculateSuitabilityScore(e, booking),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored;
  }

  /**
   * Calculate suitability score for assignment
   */
  calculateSuitabilityScore(engineer, booking) {
    let score = 100;

    // Distance (lower is better)
    if (engineer.home_latitude && booking.inspection_latitude) {
      const distance = this.calculateDistance(
        engineer.home_latitude, engineer.home_longitude,
        booking.inspection_latitude, booking.inspection_longitude
      );
      if (distance > 50) score -= 20;
      if (distance > 100) score -= 20;
    }

    // Current workload
    const today = new Date().toISOString().split('T')[0];
    const todayJobs = 0; // Would query database
    if (todayJobs >= 4) score -= 30;
    else if (todayJobs >= 2) score -= 15;

    // Availability
    if (!engineer.is_available) score -= 50;

    // Role experience
    if (engineer.role === 'lead_engineer') score += 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate distance between two points (Haversine)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; // km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Format engineer brief
   */
  formatEngineerBrief(engineer) {
    return {
      id: engineer.id,
      name: `${engineer.first_name} ${engineer.last_name}`,
      firstName: engineer.first_name,
      lastName: engineer.last_name,
      email: engineer.email,
      phone: engineer.phone,
      photoUrl: engineer.photo_url,
      role: engineer.role,
      skills: engineer.skills,
      vehicleTypes: engineer.vehicle_types,
      certifications: engineer.certifications,
      yearsExperience: engineer.years_experience,
      inspectionCount: engineer.inspection_count,
      averageRating: engineer.average_rating,
      isAvailable: engineer.is_available,
      location: {
        county: engineer.home_county,
        town: engineer.home_town,
        latitude: engineer.home_latitude,
        longitude: engineer.home_longitude,
      },
      performance: {
        onTimeRate: engineer.on_time_rate,
        qualityScore: engineer.quality_score,
        avgInspectionTime: engineer.avg_inspection_time_minutes,
      },
    };
  }

  /**
   * Add engineer certification
   */
  async addCertification(engineerId, certification) {
    const engineer = await this.getEngineerById(engineerId);
    const certs = engineer.certifications || [];
    certs.push({
      ...certification,
      addedAt: new Date(),
    });

    return this.updateEngineer(engineerId, { certifications: certs });
  }

  /**
   * Get team overview
   */
  async getTeamOverview(providerId) {
    const engineers = await db.find('inspection_engineers', {
      provider_id: providerId,
      is_active: true
    });

    const today = new Date().toISOString().split('T')[0];
    const todayJobs = await db.find('inspection_bookings', {
      provider_id: providerId,
      scheduled_date: today,
      status: { $nin: ['cancelled'] }
    });

    return {
      totalEngineers: engineers.length,
      available: engineers.filter(e => e.is_available).length,
      busy: todayJobs.filter(j => j.assigned_staff_id).length,
      unassigned: todayJobs.filter(j => !j.assigned_staff_id).length,
      byRole: this.groupByRole(engineers),
      todayAssignments: todayJobs.map(j => ({
        bookingId: j.id,
        reference: j.booking_reference,
        engineerId: j.assigned_staff_id,
        engineerName: engineers.find(e => e.id === j.assigned_staff_id)
          ? `${engineers.find(e => e.id === j.assigned_staff_id).first_name} ${engineers.find(e => e.id === j.assigned_staff_id).last_name}`
          : 'Unassigned',
        status: j.status,
        time: j.scheduled_time,
      })),
    };
  }

  /**
   * Group engineers by role
   */
  groupByRole(engineers) {
    const roles = {};
    engineers.forEach(e => {
      if (!roles[e.role]) {
        roles[e.role] = { role: e.role, count: 0, available: 0 };
      }
      roles[e.role].count++;
      if (e.is_available) roles[e.role].available++;
    });
    return Object.values(roles);
  }
}

export const engineerService = new EngineerService();
export default engineerService;
