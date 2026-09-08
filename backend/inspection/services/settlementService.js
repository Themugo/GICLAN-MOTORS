// ============================================================
// KAYAD INSPECTION MARKETPLACE - SETTLEMENT SERVICE
// ============================================================

import db from './dbAdapter.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo, logError } from '../../utils/logger.js';

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
    const booking = await db.findById('inspection_bookings', bookingId);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    if (booking.payment_status === 'fully_paid') {
      const existing = paymentData.reference
        ? await db.findOne('inspection_transactions', {
            booking_id: bookingId,
            transaction_type: 'inspection_payment',
            reference: paymentData.reference,
            status: 'completed',
          })
        : null;
      if (existing) {
        return {
          bookingId,
          grossAmount: parseFloat(booking.total_price),
          commissionAmount: 0,
          commissionRate: 0,
          taxAmount: 0,
          netAmount: parseFloat(booking.total_price),
          paymentStatus: 'fully_paid',
          idempotent: true,
        };
      }
      throw new AppError('Booking already paid', 409);
    }

    const provider = await db.findById('inspection_providers', booking.provider_id);
    const commissionRate = provider.commission_rate || 15.0;

    // Calculate amounts
    const grossAmount = parseFloat(booking.total_price);
    const commissionAmount = grossAmount * (commissionRate / 100);
    const taxAmount = 0; // Would calculate tax based on provider's tax status
    const netAmount = grossAmount - commissionAmount - taxAmount;

    // Update booking payment
    await db.update('inspection_bookings', bookingId, {
      payment_status: 'fully_paid',
      payment_method: paymentData.method,
      payment_reference: paymentData.reference,
      paid_at: new Date(),
      updated_at: new Date(),
    });

    // Create transaction record
    await db.create('inspection_transactions', {
      provider_id: booking.provider_id,
      booking_id: bookingId,
      transaction_type: 'inspection_payment',
      amount: grossAmount,
      currency: booking.currency,
      status: 'completed',
      description: `Payment for inspection ${booking.booking_reference}`,
      reference: paymentData.reference,
      created_at: new Date(),
    });

    // Create commission transaction
    await db.create('inspection_transactions', {
      provider_id: booking.provider_id,
      booking_id: bookingId,
      transaction_type: 'commission',
      amount: -commissionAmount,
      currency: booking.currency,
      status: 'pending',
      description: `KAYAD commission (${commissionRate}%) for ${booking.booking_reference}`,
      reference: `COMM-${booking.booking_reference}`,
      created_at: new Date(),
    });

    logInfo('Payment processed', { bookingId, amount: grossAmount, commission: commissionAmount });

    return {
      bookingId,
      grossAmount,
      commissionAmount,
      commissionRate,
      taxAmount,
      netAmount,
      paymentStatus: 'fully_paid',
    };
  }

  /**
   * Process refund
   */
  async processRefund(bookingId, refundData, userId) {
    const booking = await db.findById('inspection_bookings', bookingId);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    const refundAmount = parseFloat(refundData.amount);
    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      throw new AppError('Refund amount must be greater than zero', 400);
    }
    if (booking.payment_status !== 'fully_paid' && booking.payment_status !== 'deposit_paid') {
      throw new AppError('Booking has no settled payment to refund', 400);
    }

    const priorRefunds = await db.find('inspection_transactions', {
      booking_id: bookingId,
      transaction_type: 'refund',
      status: { $in: ['processing', 'completed'] },
    });
    const refundedSoFar = priorRefunds.reduce((sum, item) => sum + Math.abs(parseFloat(item.amount) || 0), 0);
    if (refundedSoFar + refundAmount > parseFloat(booking.total_price)) {
      throw new AppError('Refund amount exceeds remaining refundable balance', 400);
    }

    const provider = await db.findById('inspection_providers', booking.provider_id);
    const commissionRate = provider.commission_rate || 15.0;
    const commissionRefund = (refundAmount * commissionRate) / 100;

    // Update booking
    await db.update('inspection_bookings', bookingId, {
      payment_status: refundAmount >= parseFloat(booking.total_price) ? 'refunded' : 'partial_refund',
      updated_at: new Date(),
    });

    // Create refund transaction
    await db.create('inspection_transactions', {
      provider_id: booking.provider_id,
      booking_id: bookingId,
      transaction_type: 'refund',
      amount: -refundAmount,
      currency: booking.currency,
      status: 'processing',
      description: refundData.reason,
      reference: `REF-${Date.now()}`,
      created_at: new Date(),
    });

    // Reverse commission
    if (commissionRefund > 0) {
      await db.create('inspection_transactions', {
        provider_id: booking.provider_id,
        booking_id: bookingId,
        transaction_type: 'commission_refund',
        amount: commissionRefund,
        currency: booking.currency,
        status: 'pending',
        description: `Commission refund for ${booking.booking_reference}`,
        reference: `COMM-REF-${booking.booking_reference}`,
        created_at: new Date(),
      });
    }

    logInfo('Refund processed', { bookingId, amount: refundAmount });

    return {
      bookingId,
      refundAmount,
      commissionRefunded: commissionRefund,
    };
  }

  /**
   * Generate settlement for provider
   */
  async generateSettlement(providerId, periodStart, periodEnd) {
    const provider = await db.findById('inspection_providers', providerId);
    if (!provider) {
      throw new AppError('Provider not found', 404);
    }

    // Get paid bookings in period
    const bookings = await db.find('inspection_bookings', {
      provider_id: providerId,
      paid_at: {
        $gte: new Date(periodStart),
        $lte: new Date(periodEnd)
      },
      payment_status: { $in: ['fully_paid', 'deposit_paid'] }
    });

    if (bookings.length === 0) {
      throw new AppError('No paid bookings in this period', 400);
    }

    // Calculate totals
    let grossAmount = 0;
    let commissionAmount = 0;
    const breakdown = [];

    for (const booking of bookings) {
      const bookingGross = parseFloat(booking.total_price);
      const bookingCommission = bookingGross * ((provider.commission_rate || 15) / 100);

      grossAmount += bookingGross;
      commissionAmount += bookingCommission;

      breakdown.push({
        bookingId: booking.id,
        reference: booking.booking_reference,
        amount: bookingGross,
        commission: bookingCommission,
        paidAt: booking.paid_at,
      });
    }

    const taxAmount = 0;
    const netAmount = grossAmount - commissionAmount - taxAmount;

    // Create settlement
    const settlement = {
      provider_id: providerId,
      settlement_reference: generateSettlementReference(),
      period_start: periodStart,
      period_end: periodEnd,
      gross_amount: grossAmount,
      commission_amount: commissionAmount,
      tax_amount: taxAmount,
      net_amount: netAmount,
      currency: 'KES',
      status: 'pending',
      bookings_count: bookings.length,
      breakdown,
      created_at: new Date(),
    };

    const result = await db.create('inspection_settlements', settlement);

    logInfo('Settlement generated', { settlementId: result.id, providerId, amount: netAmount });

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
  async markSettlementPaid(settlementId, paymentData) {
    const settlement = await db.findById('inspection_settlements', settlementId);
    if (!settlement) {
      throw new AppError('Settlement not found', 404);
    }

    if (settlement.status === 'paid') {
      throw new AppError('Settlement already paid', 400);
    }

    // Update settlement
    await db.update('inspection_settlements', settlementId, {
      status: 'paid',
      payment_method: paymentData.method,
      payment_reference: paymentData.reference,
      paid_at: new Date(),
      processed_at: new Date(),
    });

    // Update transactions
    await db.updateMany('inspection_transactions',
      { settlement_id: settlementId },
      { status: 'completed' }
    );

    // Create payout transaction
    await db.create('inspection_transactions', {
      provider_id: settlement.provider_id,
      settlement_id: settlementId,
      transaction_type: 'payout',
      amount: settlement.net_amount,
      currency: settlement.currency,
      status: 'completed',
      description: `Payout for settlement ${settlement.settlement_reference}`,
      reference: paymentData.reference,
      created_at: new Date(),
    });

    logInfo('Settlement paid', { settlementId, amount: settlement.net_amount });

    return {
      settlementId,
      status: 'paid',
      paidAt: new Date(),
    };
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
