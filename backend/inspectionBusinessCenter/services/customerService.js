// ============================================================
// KAYAD INSPECTION BUSINESS CENTER - CUSTOMER & FINANCE SERVICE
// ============================================================

import db from '../../db/index.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo } from '../../utils/logger.js';

/**
 * Customer Service - Customer relationship management
 */
class CustomerService {
  /**
   * Get all customers for provider
   */
  async getCustomers(providerId, filters = {}) {
    const query = { provider_id: providerId };

    if (filters.type) {
      query.customer_type = filters.type;
    }
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { phone: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const customers = await db.find('inspection_customers', query, {
      sort: { last_inspection_date: -1 },
      limit: filters.limit || 50,
    });

    return customers.map(c => this.formatCustomerBrief(c));
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(customerId) {
    const customer = await db.findById('inspection_customers', customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }
    return customer;
  }

  /**
   * Create or update customer
   */
  async upsertCustomer(providerId, customerData) {
    // Check if customer exists by email
    const existing = await db.findOne('inspection_customers', {
      provider_id: providerId,
      email: customerData.email,
    });

    if (existing) {
      return this.updateCustomer(existing.id, customerData);
    }

    const customer = {
      provider_id: providerId,
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
      customer_type: customerData.customerType || 'private_buyer',
      company_name: customerData.companyName,
      tax_id: customerData.taxId,
      preferred_location_type: customerData.preferredLocationType,
      notes: customerData.notes,
      total_inspections: 0,
      total_spent: 0,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    return db.create('inspection_customers', customer);
  }

  /**
   * Update customer
   */
  async updateCustomer(customerId, updates) {
    const allowedUpdates = [
      'name', 'email', 'phone', 'customer_type',
      'company_name', 'tax_id', 'preferred_location_type',
      'notes', 'is_active'
    ];

    const sanitizedUpdates = {};
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        sanitizedUpdates[key] = updates[key];
      }
    }
    sanitizedUpdates.updated_at = new Date();

    return db.update('inspection_customers', customerId, sanitizedUpdates);
  }

  /**
   * Get customer inspection history
   */
  async getCustomerHistory(customerId) {
    const customer = await this.getCustomerById(customerId);

    const bookings = await db.find('inspection_bookings', {
      customer_id: customer.user_id,
    }, { sort: { created_at: -1 } });

    const reviews = await db.find('inspection_reviews', {
      customer_id: customer.user_id,
    });

    return {
      customer: this.formatCustomerBrief(customer),
      totalInspections: bookings.length,
      totalSpent: customer.total_spent,
      lastInspection: customer.last_inspection_date,
      averageRating: customer.average_rating,
      bookings: bookings.map(b => ({
        id: b.id,
        reference: b.booking_reference,
        date: b.scheduled_date,
        status: b.status,
        vehicle: `${b.vehicle_year} ${b.vehicle_make} ${b.vehicle_model}`,
        amount: b.total_price,
        reportId: b.id, // Would get actual report ID
      })),
      reviews: reviews.map(r => ({
        id: r.id,
        rating: r.overall_rating,
        comment: r.review_text,
        date: r.created_at,
      })),
    };
  }

  /**
   * Format customer brief
   */
  formatCustomerBrief(customer) {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      customerType: customer.customer_type,
      companyName: customer.company_name,
      totalInspections: customer.total_inspections,
      totalSpent: customer.total_spent,
      lastInspectionDate: customer.last_inspection_date,
      averageRating: customer.average_rating,
      isActive: customer.is_active,
    };
  }

  /**
   * Get customer segments
   */
  async getCustomerSegments(providerId) {
    const customers = await db.find('inspection_customers', {
      provider_id: providerId,
      is_active: true
    });

    const segments = {
      private_buyer: { type: 'Private Buyers', count: 0, revenue: 0 },
      dealer: { type: 'Dealers', count: 0, revenue: 0 },
      auction: { type: 'Auction Buyers', count: 0, revenue: 0 },
      fleet: { type: 'Fleet Customers', count: 0, revenue: 0 },
      insurance: { type: 'Insurance Companies', count: 0, revenue: 0 },
      corporate: { type: 'Corporate Clients', count: 0, revenue: 0 },
    };

    customers.forEach(c => {
      const type = c.customer_type || 'other';
      if (segments[type]) {
        segments[type].count++;
        segments[type].revenue += parseFloat(c.total_spent) || 0;
      }
    });

    return Object.values(segments).filter(s => s.count > 0);
  }
}

/**
 * Finance Service - Financial management
 */
class FinanceService {
  /**
   * Get financial overview
   */
  async getFinancialOverview(providerId, period = 'monthly') {
    let startDate = new Date();
    if (period === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const bookings = await db.find('inspection_bookings', {
      provider_id: providerId,
      created_at: { $gte: startDate }
    });

    const paidBookings = bookings.filter(b => b.payment_status === 'fully_paid');
    const pendingBookings = bookings.filter(b => b.payment_status === 'pending');

    const grossRevenue = paidBookings.reduce((sum, b) => sum + parseFloat(b.total_price), 0);
    const provider = await db.findById('inspection_providers', providerId);
    const commissionRate = provider?.commission_rate || 15;
    const commissionPaid = grossRevenue * (commissionRate / 100);
    const netRevenue = grossRevenue - commissionPaid;

    // Get settlements
    const settlements = await db.find('inspection_settlements', {
      provider_id: providerId,
      created_at: { $gte: startDate }
    });

    const completedSettlements = settlements.filter(s => s.status === 'paid');
    const pendingSettlements = settlements.filter(s => s.status !== 'paid');

    return {
      period,
      summary: {
        grossRevenue,
        commissionPaid,
        commissionRate,
        netRevenue,
        pendingPayments: pendingBookings.reduce((sum, b) => sum + parseFloat(b.total_price), 0),
        completedSettlements: completedSettlements.length,
        pendingSettlements: pendingSettlements.length,
        pendingSettlementAmount: pendingSettlements.reduce((sum, s) => sum + parseFloat(s.net_amount), 0),
      },
      breakdown: {
        byInspectionType: this.breakdownByType(paidBookings),
        byPaymentStatus: {
          paid: paidBookings.length,
          pending: pendingBookings.length,
        },
      },
      settlements: pendingSettlements.map(s => ({
        id: s.id,
        reference: s.settlement_reference,
        amount: s.net_amount,
        status: s.status,
        periodStart: s.period_start,
        periodEnd: s.period_end,
      })),
    };
  }

  /**
   * Breakdown by type
   */
  breakdownByType(bookings) {
    const groups = {};
    bookings.forEach(b => {
      const type = b.inspection_type || 'other';
      if (!groups[type]) groups[type] = { count: 0, revenue: 0 };
      groups[type].count++;
      groups[type].revenue += parseFloat(b.total_price);
    });
    return groups;
  }

  /**
   * Get transactions
   */
  async getTransactions(providerId, filters = {}) {
    const query = { provider_id: providerId };

    if (filters.type) {
      query.transaction_type = filters.type;
    }
    if (filters.status) {
      query.status = filters.status;
    }

    const transactions = await db.find('inspection_transactions', query, {
      sort: { created_at: -1 },
      limit: filters.limit || 50,
    });

    return transactions.map(t => ({
      id: t.id,
      type: t.transaction_type,
      amount: t.amount,
      currency: t.currency,
      status: t.status,
      description: t.description,
      reference: t.reference,
      bookingId: t.booking_id,
      settlementId: t.settlement_id,
      createdAt: t.created_at,
    }));
  }

  /**
   * Get settlements
   */
  async getSettlements(providerId, status = null) {
    const query = { provider_id: providerId };
    if (status) {
      query.status = status;
    }

    const settlements = await db.find('inspection_settlements', query, {
      sort: { created_at: -1 },
    });

    return settlements.map(s => ({
      id: s.id,
      reference: s.settlement_reference,
      periodStart: s.period_start,
      periodEnd: s.period_end,
      grossAmount: s.gross_amount,
      commissionAmount: s.commission_amount,
      taxAmount: s.tax_amount,
      netAmount: s.net_amount,
      currency: s.currency,
      status: s.status,
      bookingsCount: s.bookings_count,
      paidAt: s.paid_at,
      createdAt: s.created_at,
    }));
  }

  /**
   * Generate settlement
   */
  async generateSettlement(providerId, periodStart, periodEnd) {
    const bookings = await db.find('inspection_bookings', {
      provider_id: providerId,
      paid_at: { $gte: new Date(periodStart), $lte: new Date(periodEnd) },
      payment_status: 'fully_paid',
    });

    if (bookings.length === 0) {
      throw new AppError('No paid bookings in this period', 400);
    }

    const grossAmount = bookings.reduce((sum, b) => sum + parseFloat(b.total_price), 0);
    const provider = await db.findById('inspection_providers', providerId);
    const commissionRate = provider?.commission_rate || 15;
    const commissionAmount = grossAmount * (commissionRate / 100);
    const netAmount = grossAmount - commissionAmount;

    const settlement = {
      provider_id: providerId,
      settlement_reference: `SET-${Date.now()}`,
      period_start: periodStart,
      period_end: periodEnd,
      gross_amount: grossAmount,
      commission_amount: commissionAmount,
      tax_amount: 0,
      net_amount: netAmount,
      currency: 'KES',
      status: 'pending',
      bookings_count: bookings.length,
      breakdown: bookings.map(b => ({
        bookingId: b.id,
        reference: b.booking_reference,
        amount: b.total_price,
        paidAt: b.paid_at,
      })),
      created_at: new Date(),
    };

    return db.create('inspection_settlements', settlement);
  }
}

export const customerService = new CustomerService();
export const financeService = new FinanceService();
export default { customerService, financeService };
