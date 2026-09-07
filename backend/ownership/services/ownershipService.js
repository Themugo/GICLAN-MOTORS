import db from '../../db/index.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo } from '../../utils/logger.js';

const ACTIVE_OWNERSHIP = 'current';

class OwnershipService {
  async getOrCreateOwnerProfile(userId) {
    if (!userId) throw new AppError('User is required', 400);
    const existing = await db.findOne('owner_profiles', { user_id: userId });
    if (existing) return existing;
    return db.create('owner_profiles', {
      user_id: userId,
      owner_since: new Date().toISOString().slice(0, 10),
      total_vehicles_owned: 0,
      notification_preferences: { email: true, sms: true, push: true },
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  async getOwnerDashboard(userId) {
    const profile = await this.getOrCreateOwnerProfile(userId);
    const currentVehicles = await db.findAll('owner_vehicles', {
      filters: { owner_id: userId, ownership_type: ACTIVE_OWNERSHIP, status: 'active' },
      orderBy: 'created_at',
      ascending: false,
    });
    const soldVehicles = await db.findAll('owner_vehicles', {
      filters: { owner_id: userId, ownership_type: 'sold' }, orderBy: 'sale_date', ascending: false,
    });
    const upcomingReminders = await this.getUpcomingReminders(userId);
    const expenseSummary = await this.getExpenseSummary(userId);
    const enriched = await Promise.all(currentVehicles.map((vehicle) => this.enrichVehicle(vehicle)));
    return { profile, currentVehicles: enriched, soldVehicles, upcomingReminders, expenseSummary };
  }

  async enrichVehicle(vehicle) {
    const [services, reminders, documents, alerts, expenses, valueHistory] = await Promise.all([
      this.getVehicleServices(vehicle.id),
      this.getVehicleReminders(vehicle.id),
      this.getVehicleDocuments(vehicle.id),
      this.getVehicleAlerts(vehicle.id),
      this.getVehicleExpenses(vehicle.id),
      this.getValueHistory(vehicle.id),
    ]);
    return { ...vehicle, services, reminders, documents, alerts, expenses, valueHistory, currentValue: valueHistory[0] || null };
  }

  async getVehicleForOwner(userId, vehicleId) {
    const vehicle = await db.findOne('owner_vehicles', { id: vehicleId, owner_id: userId });
    if (!vehicle) throw new AppError('Vehicle not found', 404);
    return vehicle;
  }

  async addVehicleToGarage(userId, vehicleData) {
    if (!vehicleData?.vin || !vehicleData?.make || !vehicleData?.model) {
      throw new AppError('VIN, make and model are required', 400);
    }
    const existing = await db.findOne('owner_vehicles', { owner_id: userId, vin: vehicleData.vin, status: 'active' });
    if (existing) return existing;
    const vehicle = await db.create('owner_vehicles', {
      owner_id: userId,
      passport_id: vehicleData.passportId || null,
      vin: vehicleData.vin,
      make: vehicleData.make,
      model: vehicleData.model,
      year: vehicleData.year || null,
      registration_number: vehicleData.registrationNumber || null,
      colour: vehicleData.colour || null,
      ownership_type: 'current',
      purchase_date: vehicleData.purchaseDate || null,
      purchase_price: vehicleData.purchasePrice ?? null,
      purchase_mileage: vehicleData.purchaseMileage ?? null,
      current_mileage: vehicleData.purchaseMileage ?? null,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });
    await this.syncOwnerCount(userId);
    logInfo('Vehicle added to garage', { userId, vehicleId: vehicle.id });
    return vehicle;
  }

  async syncOwnerCount(userId) {
    const count = await db.count('owner_vehicles', { owner_id: userId, ownership_type: 'current', status: 'active' });
    const profile = await db.findOne('owner_profiles', { user_id: userId });
    if (profile) await db.update('owner_profiles', profile.id, { total_vehicles_owned: count, updated_at: new Date() });
  }

  async addServiceRecord(userId, vehicleId, data) {
    const vehicle = await this.getVehicleForOwner(userId, vehicleId);
    if (!data?.serviceDate || !data?.serviceType || !data?.serviceTitle) throw new AppError('Service date, type and title are required', 400);
    const service = await db.create('ownership_service_records', {
      owner_vehicle_id: vehicle.id, service_date: data.serviceDate, service_type: data.serviceType,
      service_title: data.serviceTitle, service_description: data.description || null,
      workshop_name: data.workshopName || null, workshop_verified: Boolean(data.workshopVerified),
      mileage_at_service: data.mileageAtService ?? vehicle.current_mileage ?? null,
      service_cost: data.serviceCost ?? null, invoice_number: data.invoiceNumber || null,
      invoice_url: data.invoiceUrl || null, documents: data.documents || [], photos: data.photos || [],
      created_at: new Date(), updated_at: new Date(),
    });
    if (Number(data.mileageAtService) > Number(vehicle.current_mileage || 0)) {
      await db.update('owner_vehicles', vehicle.id, { current_mileage: data.mileageAtService, updated_at: new Date() });
    }
    return service;
  }

  async getVehicleServices(vehicleId) { return db.findAll('ownership_service_records', { filters: { owner_vehicle_id: vehicleId }, orderBy: 'service_date', ascending: false }); }
  async getVehicleReminders(vehicleId) { return db.findAll('ownership_reminders', { filters: { owner_vehicle_id: vehicleId }, orderBy: 'due_date', ascending: true }); }
  async getVehicleDocuments(vehicleId) { return db.findAll('ownership_documents', { filters: { owner_vehicle_id: vehicleId, status: 'active' }, orderBy: 'created_at', ascending: false }); }
  async getVehicleAlerts(vehicleId) { return db.findAll('ownership_alerts', { filters: { owner_vehicle_id: vehicleId }, orderBy: 'created_at', ascending: false }); }
  async getValueHistory(vehicleId) { return db.findAll('value_tracking', { filters: { owner_vehicle_id: vehicleId }, orderBy: 'calculated_at', ascending: false }); }
  async getVehicleExpenses(vehicleId, options = {}) {
    const filters = { owner_vehicle_id: vehicleId };
    if (options.startDate) filters.expense_date = { ...(filters.expense_date || {}), $gte: options.startDate };
    if (options.endDate) filters.expense_date = { ...(filters.expense_date || {}), $lte: options.endDate };
    return db.findAll('ownership_expenses', { filters, orderBy: 'expense_date', ascending: false });
  }

  async getUpcomingReminders(userId) {
    const vehicles = await db.findAll('owner_vehicles', { filters: { owner_id: userId, ownership_type: ACTIVE_OWNERSHIP, status: 'active' } });
    const cutoff = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const result = [];
    for (const vehicle of vehicles) {
      const reminders = await db.findAll('ownership_reminders', { filters: { owner_vehicle_id: vehicle.id, status: 'pending', due_date: { $lte: cutoff } }, orderBy: 'due_date', ascending: true });
      result.push(...reminders.map((r) => ({ ...r, vehicle })));
    }
    return result;
  }

  async completeReminder(userId, reminderId, serviceRecordId = null) {
    const reminder = await db.findById('ownership_reminders', reminderId);
    if (!reminder) throw new AppError('Reminder not found', 404);
    await this.getVehicleForOwner(userId, reminder.owner_vehicle_id);
    const updated = await db.update('ownership_reminders', reminder.id, {
      status: 'completed', completed_at: new Date(), completed_service_record_id: serviceRecordId, updated_at: new Date(),
    });
    if (reminder.is_recurring) {
      const days = { monthly: 30, quarterly: 90, '6months': 180, yearly: 365 }[reminder.recurrence_interval] || 90;
      const nextDue = new Date(reminder.due_date); nextDue.setDate(nextDue.getDate() + days);
      await db.create('ownership_reminders', { owner_vehicle_id: reminder.owner_vehicle_id, reminder_type: reminder.reminder_type, title: reminder.title, description: reminder.description, due_date: nextDue, is_recurring: true, recurrence_interval: reminder.recurrence_interval, notify_days_before: reminder.notify_days_before, status: 'pending', created_at: new Date(), updated_at: new Date() });
    }
    return updated;
  }

  async addExpense(userId, vehicleId, data) {
    await this.getVehicleForOwner(userId, vehicleId);
    if (!data?.expenseDate || !data?.expenseType || Number(data.amount) <= 0) throw new AppError('Expense date, type and positive amount are required', 400);
    return db.create('ownership_expenses', { owner_vehicle_id: vehicleId, expense_date: data.expenseDate, expense_type: data.expenseType, description: data.description || null, amount: data.amount, category: data.category || 'other', receipt_url: data.receiptUrl || null, is_recurring: Boolean(data.isRecurring), recurring_interval: data.recurringInterval || null, created_at: new Date() });
  }

  async getExpenseSummary(userId) {
    const vehicles = await db.findAll('owner_vehicles', { filters: { owner_id: userId, status: 'active' }, select: 'id' });
    const ids = vehicles.map(v => v.id); if (!ids.length) return { monthlyTotal: 0, yearlyTotal: 0, byCategory: {}, currency: 'KES' };
    const expenses = await db.findAll('ownership_expenses', { filters: { owner_vehicle_id: { $in: ids } }, orderBy: 'expense_date', ascending: false });
    const now = new Date(); const monthStart = new Date(now.getFullYear(), now.getMonth(), 1); const yearStart = new Date(now.getFullYear(), 0, 1);
    let monthlyTotal = 0, yearlyTotal = 0; const byCategory = {};
    for (const e of expenses) { const amount = Number(e.amount) || 0; const date = new Date(e.expense_date); if (date >= yearStart && date <= now) { yearlyTotal += amount; byCategory[e.category || 'other'] = (byCategory[e.category || 'other'] || 0) + amount; } if (date >= monthStart && date <= now) monthlyTotal += amount; }
    return { monthlyTotal, yearlyTotal, byCategory, currency: 'KES' };
  }

  async addDocument(userId, vehicleId, data) { await this.getVehicleForOwner(userId, vehicleId); if (!data?.documentType || !data?.title) throw new AppError('Document type and title are required', 400); return db.create('ownership_documents', { owner_vehicle_id: vehicleId, document_type: data.documentType, title: data.title, description: data.description || null, file_name: data.fileName || null, file_type: data.fileType || null, file_url: data.fileUrl || null, file_size: data.fileSize || null, issue_date: data.issueDate || null, expiry_date: data.expiryDate || null, status: 'active', created_at: new Date(), updated_at: new Date() }); }

  async addTrip(userId, vehicleId, data) { await this.getVehicleForOwner(userId, vehicleId); const start = Number(data.odometerStart); const end = Number(data.odometerEnd); if (!data?.tripDate || !Number.isFinite(start) || !Number.isFinite(end) || end < start) throw new AppError('Trip date and valid odometer values are required', 400); const distance = data.distanceKm ?? end - start; return db.create('travel_logs', { owner_vehicle_id: vehicleId, trip_date: data.tripDate, odometer_start: start, odometer_end: end, distance_km: distance, fuel_litres: data.fuelLitres || null, fuel_cost: data.fuelCost || null, fuel_efficiency: data.fuelLitres ? Number(distance) / Number(data.fuelLitres) : null, origin: data.origin || null, destination: data.destination || null, route_notes: data.routeNotes || null, purpose: data.purpose || 'personal', created_at: new Date() }); }

  async markVehicleSold(userId, vehicleId, saleData) { const vehicle = await this.getVehicleForOwner(userId, vehicleId); if (vehicle.ownership_type === 'sold') throw new AppError('Vehicle is already sold', 409); const updated = await db.update('owner_vehicles', vehicle.id, { ownership_type: 'sold', sale_date: saleData.saleDate, sale_price: saleData.salePrice, status: 'active', updated_at: new Date() }); const reminders = await db.findAll('ownership_reminders', { filters: { owner_vehicle_id: vehicle.id, status: 'pending' } }); for (const reminder of reminders) await db.update('ownership_reminders', reminder.id, { status: 'cancelled', updated_at: new Date() }); await this.syncOwnerCount(userId); return updated; }

  async getVehicleDetails(userId, vehicleId) { const vehicle = await this.getVehicleForOwner(userId, vehicleId); return this.enrichVehicle(vehicle); }
  async createAlert(userId, vehicleId, data) { await this.getVehicleForOwner(userId, vehicleId); return db.create('ownership_alerts', { owner_vehicle_id: vehicleId, alert_type: data.alertType, title: data.title, message: data.message, severity: data.severity || 'info', action_url: data.actionUrl || null, action_label: data.actionLabel || null, status: 'unread', created_at: new Date() }); }
}

export const ownershipService = new OwnershipService();
export default ownershipService;
