// ============================================================
// KAYAD VEHICLE OWNERSHIP PLATFORM
// OWNERSHIP SERVICE
// ============================================================

import db from '../../db/index.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo } from '../../utils/logger.js';

/**
 * Ownership Service
 * Lifelong digital companion for vehicle ownership
 */
class OwnershipService {

  // ============================================================
  // OWNER PROFILE
  // ============================================================

  /**
   * Get or create owner profile
   */
  async getOrCreateOwnerProfile(userId) {
    let profile = await db.findOne('owner_profiles', { user_id: userId });
    
    if (!profile) {
      profile = await db.create('owner_profiles', {
        user_id: userId,
        owner_since: new Date(),
        total_vehicles_owned: 0,
        notification_preferences: { email: true, sms: true, push: true },
        created_at: new Date(),
        updated_at: new Date(),
      });
      logInfo('Owner profile created', { userId });
    }
    
    return profile;
  }

  /**
   * Get full owner dashboard
   */
  async getOwnerDashboard(userId) {
    const profile = await this.getOrCreateOwnerProfile(userId);
    
    const [currentVehicles, soldVehicles, favouriteVehicles, recentViews, upcomingReminders, alerts, expenses] = await Promise.all([
      db.find('owner_vehicles', { owner_id: userId, ownership_type: 'current', status: 'active' }),
      db.find('owner_vehicles', { owner_id: userId, ownership_type: 'sold' }),
      db.find('owner_vehicles', { owner_id: userId, ownership_type: 'favourite' }),
      db.find('owner_vehicles', { owner_id: userId, ownership_type: 'recently_viewed' }, { limit: 10 }),
      this.getUpcomingReminders(userId),
      db.find('ownership_alerts', { status: 'unread' }, { limit: 10 }),
      this.getExpenseSummary(userId),
    ]);

    // Enrich vehicles with service data
    const enrichedVehicles = await Promise.all(
      currentVehicles.map(async (v) => {
        const [services, reminders, value] = await Promise.all([
          this.getVehicleServices(v.id),
          this.getVehicleReminders(v.id),
          db.findOne('value_tracking', { owner_vehicle_id: v.id }, { sort: { calculated_at: -1 } }),
        ]);
        return { ...v, services, reminders, currentValue: value };
      })
    );

    return {
      profile,
      currentVehicles: enrichedVehicles,
      soldVehicles,
      favouriteVehicles,
      recentViews,
      upcomingReminders,
      alerts,
      expenseSummary: expenses,
      totalVehiclesOwned: profile.total_vehicles_owned,
    };
  }

  // ============================================================
  // MY GARAGE
  // ============================================================

  /**
   * Add vehicle to garage
   */
  async addVehicleToGarage(userId, vehicleData) {
    // Check if vehicle already exists in owner's garage
    const existing = await db.findOne('owner_vehicles', {
      owner_id: userId,
      vin: vehicleData.vin,
      status: 'active',
    });

    if (existing) {
      return existing;
    }

    const vehicle = await db.create('owner_vehicles', {
      owner_id: userId,
      passport_id: vehicleData.passportId,
      vin: vehicleData.vin,
      make: vehicleData.make,
      model: vehicleData.model,
      year: vehicleData.year,
      registration_number: vehicleData.registrationNumber,
      colour: vehicleData.colour,
      ownership_type: vehicleData.ownershipType || 'current',
      purchase_date: vehicleData.purchaseDate,
      purchase_price: vehicleData.purchasePrice,
      purchase_mileage: vehicleData.purchaseMileage,
      current_mileage: vehicleData.purchaseMileage,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Update owner profile
    await db.update('owner_profiles', { user_id: userId }, {
      total_vehicles_owned: db.raw('total_vehicles_owned + 1'),
      updated_at: new Date(),
    });

    // Create default reminders
    await this.createDefaultReminders(vehicle.id, vehicleData);

    logInfo('Vehicle added to garage', { userId, vehicleId: vehicle.id });
    return vehicle;
  }

  /**
   * Create default reminders for vehicle
   */
  async createDefaultReminders(vehicleId, vehicleData) {
    const reminders = [
      {
        reminder_type: 'routine_service',
        title: 'Routine Service Due',
        description: 'Schedule your next routine service',
        due_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        is_recurring: true,
        recurrence_interval: '3months',
        notify_days_before: 14,
      },
      {
        reminder_type: 'insurance_renewal',
        title: 'Insurance Renewal',
        description: 'Your insurance policy is due for renewal',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        is_recurring: true,
        recurrence_interval: 'yearly',
        notify_days_before: 30,
      },
      {
        reminder_type: 'inspection_renewal',
        title: 'Roadworthiness Inspection',
        description: 'Your inspection certificate is due for renewal',
        due_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        is_recurring: true,
        recurrence_interval: 'yearly',
        notify_days_before: 14,
      },
    ];

    for (const reminder of reminders) {
      await db.create('ownership_reminders', {
        owner_vehicle_id: vehicleId,
        ...reminder,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
  }

  /**
   * Get vehicle details with full history
   */
  async getVehicleDetails(vehicleId) {
    const vehicle = await db.findById('owner_vehicles', vehicleId);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    const [services, reminders, documents, alerts, expenses, valueHistory] = await Promise.all([
      this.getVehicleServices(vehicleId),
      this.getVehicleReminders(vehicleId),
      db.find('ownership_documents', { owner_vehicle_id: vehicleId, status: 'active' }),
      db.find('ownership_alerts', { owner_vehicle_id: vehicleId }),
      this.getVehicleExpenses(vehicleId),
      db.find('value_tracking', { owner_vehicle_id: vehicleId }, { sort: { calculated_at: -1 } }),
    ]);

    return {
      vehicle,
      services,
      reminders,
      documents,
      alerts,
      expenses,
      valueHistory,
    };
  }

  // ============================================================
  // SERVICE RECORDS
  // ============================================================

  /**
   * Add service record
   */
  async addServiceRecord(vehicleId, serviceData) {
    const vehicle = await db.findById('owner_vehicles', vehicleId);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    const service = await db.create('ownership_service_records', {
      owner_vehicle_id: vehicleId,
      service_date: serviceData.serviceDate,
      service_type: serviceData.serviceType,
      service_title: serviceData.serviceTitle,
      service_description: serviceData.description,
      workshop_name: serviceData.workshopName,
      workshop_verified: serviceData.workshopVerified || false,
      mileage_at_service: serviceData.mileageAtService || vehicle.current_mileage,
      service_cost: serviceData.serviceCost,
      invoice_number: serviceData.invoiceNumber,
      invoice_url: serviceData.invoiceUrl,
      documents: serviceData.documents || [],
      photos: serviceData.photos || [],
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Update vehicle mileage if higher
    if (serviceData.mileageAtService && serviceData.mileageAtService > (vehicle.current_mileage || 0)) {
      await db.update('owner_vehicles', vehicleId, {
        current_mileage: serviceData.mileageAtService,
        updated_at: new Date(),
      });
    }

    logInfo('Service record added', { vehicleId, serviceId: service.id });
    return service;
  }

  /**
   * Get vehicle services
   */
  async getVehicleServices(vehicleId) {
    return db.find('ownership_service_records', { owner_vehicle_id: vehicleId }, {
      sort: { service_date: -1 },
    });
  }

  // ============================================================
  // REMINDERS
  // ============================================================

  /**
   * Get upcoming reminders for owner
   */
  async getUpcomingReminders(userId) {
    const vehicles = await db.find('owner_vehicles', { 
      owner_id: userId, 
      ownership_type: 'current',
      status: 'active' 
    });

    const vehicleIds = vehicles.map(v => v.id);
    const reminders = [];

    for (const vehicleId of vehicleIds) {
      const vehicleReminders = await db.find('ownership_reminders', {
        owner_vehicle_id: vehicleId,
        status: 'pending',
        due_date: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, // Next 30 days
      });
      const vehicle = vehicles.find(v => v.id === vehicleId);
      reminders.push(...vehicleReminders.map(r => ({ ...r, vehicle })));
    }

    return reminders.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  }

  /**
   * Get vehicle reminders
   */
  async getVehicleReminders(vehicleId) {
    return db.find('ownership_reminders', { owner_vehicle_id: vehicleId }, {
      sort: { due_date: 1 },
    });
  }

  /**
   * Complete reminder
   */
  async completeReminder(reminderId, serviceRecordId) {
    const reminder = await db.findById('ownership_reminders', reminderId);
    if (!reminder) {
      throw new AppError('Reminder not found', 404);
    }

    const updates = {
      status: 'completed',
      completed_at: new Date(),
      completed_service_record_id: serviceRecordId,
      updated_at: new Date(),
    };

    // If recurring, create next reminder
    if (reminder.is_recurring) {
      const intervals = {
        'monthly': 30,
        'quarterly': 90,
        '6months': 180,
        'yearly': 365,
      };
      const days = intervals[reminder.recurrence_interval] || 90;
      const nextDue = new Date(reminder.due_date);
      nextDue.setDate(nextDue.getDate() + days);

      await db.create('ownership_reminders', {
        owner_vehicle_id: reminder.owner_vehicle_id,
        reminder_type: reminder.reminder_type,
        title: reminder.title,
        description: reminder.description,
        due_date: nextDue,
        is_recurring: true,
        recurrence_interval: reminder.recurrence_interval,
        notify_days_before: reminder.notify_days_before,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    await db.update('ownership_reminders', reminderId, updates);
    return db.findById('ownership_reminders', reminderId);
  }

  // ============================================================
  // EXPENSES
  // ============================================================

  /**
   * Add expense
   */
  async addExpense(vehicleId, expenseData) {
    return db.create('ownership_expenses', {
      owner_vehicle_id: vehicleId,
      expense_date: expenseData.expenseDate,
      expense_type: expenseData.expenseType,
      description: expenseData.description,
      amount: expenseData.amount,
      category: expenseData.category,
      receipt_url: expenseData.receiptUrl,
      is_recurring: expenseData.isRecurring || false,
      recurring_interval: expenseData.recurringInterval,
      created_at: new Date(),
    });
  }

  /**
   * Get vehicle expenses
   */
  async getVehicleExpenses(vehicleId, options = {}) {
    const query = { owner_vehicle_id: vehicleId };
    if (options.startDate && options.endDate) {
      query.expense_date = { $gte: new Date(options.startDate), $lte: new Date(options.endDate) };
    }
    return db.find('ownership_expenses', query, { sort: { expense_date: -1 } });
  }

  /**
   * Get expense summary for owner
   */
  async getExpenseSummary(userId) {
    const vehicles = await db.find('owner_vehicles', { owner_id: userId, status: 'active' });
    const vehicleIds = vehicles.map(v => v.id);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [monthlyExpenses, yearlyExpenses, byCategory] = await Promise.all([
      this.getExpensesTotal(vehicleIds, startOfMonth, now),
      this.getExpensesTotal(vehicleIds, startOfYear, now),
      this.getExpensesByCategory(vehicleIds, startOfYear, now),
    ]);

    return {
      monthlyTotal: monthlyExpenses,
      yearlyTotal: yearlyExpenses,
      byCategory,
      currency: 'KES',
    };
  }

  async getExpensesTotal(vehicleIds, startDate, endDate) {
    // Simplified - would calculate from database
    return 0;
  }

  async getExpensesByCategory(vehicleIds, startDate, endDate) {
    // Simplified - would aggregate from database
    return {
      fuel: 0,
      maintenance: 0,
      insurance: 0,
      finance: 0,
      taxes: 0,
      other: 0,
    };
  }

  // ============================================================
  // DOCUMENTS
  // ============================================================

  /**
   * Add document
   */
  async addDocument(vehicleId, documentData) {
    return db.create('ownership_documents', {
      owner_vehicle_id: vehicleId,
      document_type: documentData.documentType,
      title: documentData.title,
      description: documentData.description,
      file_name: documentData.fileName,
      file_type: documentData.fileType,
      file_url: documentData.fileUrl,
      file_size: documentData.fileSize,
      issue_date: documentData.issueDate,
      expiry_date: documentData.expiryDate,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Get vehicle documents
   */
  async getVehicleDocuments(vehicleId) {
    return db.find('ownership_documents', { owner_vehicle_id: vehicleId, status: 'active' }, {
      sort: { created_at: -1 },
    });
  }

  // ============================================================
  // VALUE TRACKING
  // ============================================================

  /**
   * Update vehicle value
   */
  async updateVehicleValue(vehicleId, valueData) {
    return db.create('value_tracking', {
      owner_vehicle_id: vehicleId,
      market_value: valueData.marketValue,
      wholesale_value: valueData.wholesaleValue,
      retail_value: valueData.retailValue,
      depreciation_from_purchase: valueData.depreciationFromPurchase,
      depreciation_pct: valueData.depreciationPct,
      comparable_count: valueData.comparableCount,
      demand_score: valueData.demandScore,
      similar_listings_count: valueData.similarListingsCount,
      avg_price_similar: valueData.avgPriceSimilar,
      best_time_to_sell: valueData.bestTimeToSell,
      sell_now_estimate: valueData.sellNowEstimate,
      calculated_at: new Date(),
    });
  }

  /**
   * Get value history
   */
  async getValueHistory(vehicleId) {
    return db.find('value_tracking', { owner_vehicle_id: vehicleId }, {
      sort: { calculated_at: -1 },
    });
  }

  // ============================================================
  // SELL VEHICLE
  // ============================================================

  /**
   * Mark vehicle as sold
   */
  async markVehicleSold(vehicleId, saleData) {
    const vehicle = await db.findById('owner_vehicles', vehicleId);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    await db.update('owner_vehicles', vehicleId, {
      ownership_type: 'sold',
      sale_date: saleData.saleDate,
      sale_price: saleData.salePrice,
      status: 'active', // Keep for historical records
      updated_at: new Date(),
    });

    // Archive reminders
    await db.update('ownership_reminders', { owner_vehicle_id: vehicleId }, {
      status: 'cancelled',
      updated_at: new Date(),
    });

    logInfo('Vehicle marked as sold', { vehicleId, salePrice: saleData.salePrice });
    return db.findById('owner_vehicles', vehicleId);
  }

  /**
   * Generate marketplace listing draft
   */
  async generateListingDraft(vehicleId) {
    const vehicle = await db.findById('owner_vehicles', vehicleId);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    const [services, valueData] = await Promise.all([
      this.getVehicleServices(vehicleId),
      db.findOne('value_tracking', { owner_vehicle_id: vehicleId }, { sort: { calculated_at: -1 } }),
    ]);

    return {
      vehicle: {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        vin: vehicle.vin,
        colour: vehicle.colour,
        registration: vehicle.registration_number,
        mileage: vehicle.current_mileage,
      },
      suggestedPrice: valueData?.sell_now_estimate || valueData?.market_value,
      recentServices: services.slice(0, 5),
      vehicleHistory: {
        totalServices: services.length,
        lastServiceDate: services[0]?.service_date,
        lastServiceMileage: services[0]?.mileage_at_service,
      },
    };
  }

  // ============================================================
  // TRAVEL LOG
  // ============================================================

  /**
   * Add trip
   */
  async addTrip(vehicleId, tripData) {
    return db.create('travel_logs', {
      owner_vehicle_id: vehicleId,
      trip_date: tripData.tripDate,
      odometer_start: tripData.odometerStart,
      odometer_end: tripData.odometerEnd,
      distance_km: tripData.distanceKm,
      fuel_litres: tripData.fuelLitres,
      fuel_cost: tripData.fuelCost,
      fuel_efficiency: tripData.fuelEfficiency,
      origin: tripData.origin,
      destination: tripData.destination,
      route_notes: tripData.routeNotes,
      purpose: tripData.purpose,
      created_at: new Date(),
    });
  }

  /**
   * Get travel history
   */
  async getTravelHistory(vehicleId, options = {}) {
    return db.find('travel_logs', { owner_vehicle_id: vehicleId }, {
      sort: { trip_date: -1 },
      limit: options.limit || 50,
    });
  }

  // ============================================================
  // ALERTS
  // ============================================================

  /**
   * Get vehicle alerts
   */
  async getVehicleAlerts(vehicleId) {
    return db.find('ownership_alerts', { owner_vehicle_id: vehicleId }, {
      sort: { created_at: -1 },
    });
  }

  /**
   * Create alert
   */
  async createAlert(vehicleId, alertData) {
    return db.create('ownership_alerts', {
      owner_vehicle_id: vehicleId,
      alert_type: alertData.alertType,
      title: alertData.title,
      message: alertData.message,
      severity: alertData.severity || 'info',
      action_url: alertData.actionUrl,
      action_label: alertData.actionLabel,
      status: 'unread',
      created_at: new Date(),
    });
  }

  /**
   * Dismiss alert
   */
  async dismissAlert(alertId) {
    await db.update('ownership_alerts', alertId, {
      status: 'dismissed',
      read_at: new Date(),
    });
    return { success: true };
  }
}

export const ownershipService = new OwnershipService();
export default ownershipService;
