// ============================================================
// KAYAD INSPECTION MARKETPLACE - SETTLEMENT SERVICE
// ============================================================

import db from './dbAdapter.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo } from '../../utils/logger.js';
import { getSupabase } from '../../utils/supabase.js';
import { recordInspectionPayment, recordInspectionRefund, recordInspectionPayout } from '../../services/ledgerService.js';

/**
 * Generate settlement reference
 */
const generateSettlementReference = () => {
  const prefix = 'KAYAD-SET';
  const month = new Date().toISOString().slice(0, 7).replace('-', '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${month}-${random}`;
};

/**
 * Settlement Service - Handles provider payments
 */
class SettlementService {
  /**
   * Get provider commission rate
   */
  async getProviderCommission(providerId) {
    const provider = await db.findById('inspection_providers', providerId);
    if (!provider) {
      throw new AppError('Provider not found', 404);
    }
    return provider.commission_rate || 15.0;
  }

  /**
   * Process payment for booking
   */
  async processPayment(bookingId, paymentData) {
    const { data, error } = await getSupabase().rpc('kayad_process_inspection_payment_atomic', {
      p_booking_id: bookingId, p_payment_method: paymentData.method || null,
      p_payment_reference: paymentData.reference || null, p_user_id: null,
    });
    if (error) throw new AppError(error.message || 'Inspection payment failed', 400);
    return data;
  }

  /**
   * Process refund
   */
  async processRefund(bookingId, refundData, userId) {
    const { data, error } = await getSupabase().rpc('kayad_process_inspection_refund_atomic', {
      p_booking_id: bookingId, p_amount: Number(refundData.amount),
      p_reason: String(refundData.reason || 'Inspection refund'), p_user_id: userId || null,
    });
    if (error) throw new AppError(error.message || 'Inspection refund failed', 400);
    return data;
  }

  /**
   * Generate settlement for provider
   */
  async generateSettlement(providerId, periodStart, periodEnd) {
    const provider = await db.findById('inspection_providers', providerId);
    if (!provider) throw new AppError('Provider not found', 404);
    const start = new Date(periodStart); const end = new Date(periodEnd);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) throw new AppError('Invalid settlement period', 400);
    const bookings = await db.find('inspection_bookings', { provider_id: providerId, paid_at: { $gte: start, $lte: end }, payment_status: 'fully_paid', status: 'closed' });
    if (!bookings.length) throw new AppError('No eligible completed paid bookings in this period', 400);
    const existing = await db.find('inspection_settlements', { provider_id: providerId, period_start: start, period_end: end, status: { $in: ['pending', 'processing', 'paid'] } });
    if (existing.length) return existing[0];
    const commissionRate = Number(provider.commission_rate || 15);
    let grossAmount = 0, commissionAmount = 0;
    const breakdown = [];
    for (const booking of bookings) {
      const gross = Number(booking.total_price); const commission = Math.round(gross * commissionRate) / 100;
      grossAmount += gross; commissionAmount += commission;
      breakdown.push({ bookingId: booking.id, reference: booking.booking_reference, amount: gross, commission, paidAt: booking.paid_at });
    }
    const result = await db.create('inspection_settlements', { provider_id: providerId, settlement_reference: generateSettlementReference(), period_start: start, period_end: end, gross_amount: grossAmount, commission_amount: commissionAmount, tax_amount: 0, net_amount: grossAmount - commissionAmount, currency: 'KES', status: 'pending', bookings_count: bookings.length, breakdown, created_at: new Date(), updated_at: new Date() });
    await db.updateMany('inspection_transactions', { provider_id: providerId, booking_id: { $in: bookings.map(b => b.id) }, transaction_type: 'commission', settlement_id: null }, { settlement_id: result.id });
    return result;
  }

  /**
   * Get provider transactions
   */
  async getProviderTransactions(providerId, filters = {}) {
    const query = { provider_id: providerId };

    if (filters.type) {
      query.transaction_type = filters.type;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.fromDate) {
      query.created_at = { $gte: new Date(filters.fromDate) };
    }

    if (filters.toDate) {
      query.created_at = { ...query.created_at, $lte: new Date(filters.toDate) };
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    const skip = (page - 1) * limit;

    const transactions = await db.find('inspection_transactions', query, {
      sort: { created_at: -1 },
      skip,
      limit,
    });

    const total = await db.count('inspection_transactions', query);

    return {
      items: transactions.map(t => ({
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
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get provider settlements
   */
  async getProviderSettlements(providerId, filters = {}) {
    const query = { provider_id: providerId };

    if (filters.status) {
      query.status = filters.status;
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
   * Mark settlement as paid
   */
  async markSettlementPaid(settlementId, paymentData, userId = null) {
    const { data, error } = await getSupabase().rpc('kayad_mark_inspection_settlement_paid_atomic', {
      p_settlement_id: settlementId, p_payment_method: paymentData.method || null,
      p_payment_reference: paymentData.reference || null, p_user_id: userId || null,
    });
    if (error) throw new AppError(error.message || 'Settlement payout failed', 409);
    return data;
  }

  /**
   * Get earnings summary
   */
  async getEarningsSummary(providerId, period = 'monthly') {
    let startDate = new Date();
    
    if (period === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'yearly') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const provider = await db.findById('inspection_providers', providerId);
    const commissionRate = provider.commission_rate || 15;

    // Get all transactions in period
    const transactions = await db.find('inspection_transactions', {
      provider_id: providerId,
      created_at: { $gte: startDate }
    });

    let totalEarnings = 0;
    let totalCommission = 0;
    let totalPaid = 0;
    let totalPending = 0;

    for (const t of transactions) {
      if (t.transaction_type === 'inspection_payment') {
        totalEarnings += parseFloat(t.amount);
      } else if (t.transaction_type === 'commission') {
        totalCommission += Math.abs(parseFloat(t.amount));
      } else if (t.transaction_type === 'payout' && t.status === 'completed') {
        totalPaid += parseFloat(t.amount);
      } else if (t.transaction_type === 'refund') {
        totalEarnings -= Math.abs(parseFloat(t.amount));
      }
    }

    // Calculate net earnings (earnings - commission)
    const netEarnings = totalEarnings - totalCommission;
    
    // Pending = net earnings - paid
    const settlements = await db.find('inspection_settlements', {
      provider_id: providerId,
      status: 'pending'
    });
    totalPending = settlements.reduce((sum, s) => sum + parseFloat(s.net_amount), 0);

    return {
      period,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalCommission: Math.round(totalCommission * 100) / 100,
      netEarnings: Math.round(netEarnings * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalPending: Math.round(totalPending * 100) / 100,
      commissionRate,
      currency: 'KES',
    };
  }
}

export const settlementService = new SettlementService();
export default settlementService;
