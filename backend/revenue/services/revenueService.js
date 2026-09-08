// ============================================================
// KAYAD REVENUE & COMMERCIAL PLATFORM
// REVENUE SERVICE
// ============================================================

import db from '../../db/index.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo, logError } from '../../utils/logger.js';
import crypto from 'crypto';

/**
 * Revenue Service
 * Financial operating system for commercial relationships
 */
class RevenueService {

  // ============================================================
  // SUBSCRIPTION PLANS
  // ============================================================

  /**
   * Get available subscription plans
   */
  async getSubscriptionPlans(targetType = null) {
    const query = { is_active: true };
    if (targetType) query.target_type = targetType;
    return db.find('subscription_plans', query);
  }

  /**
   * Create subscription for business
   */
  async createSubscription(businessData, planId) {
    const plan = await db.findById('subscription_plans', planId);
    if (!plan) {
      throw new AppError('Plan not found', 404);
    }

    const subscriptionCode = await this.generateSubscriptionCode();
    const startDate = new Date();
    const endDate = this.calculateEndDate(startDate, plan.billing_cycle);
    const nextBillingDate = plan.billing_cycle === 'monthly'
      ? this.addMonths(startDate, 1)
      : this.addMonths(startDate, 12);

    const subscription = await db.create('business_subscriptions', {
      subscription_code: subscriptionCode,
      business_id: businessData.businessId,
      business_type: businessData.businessType,
      business_name: businessData.businessName,
      plan_id: planId,
      plan_code: plan.plan_code,
      billing_cycle: plan.billing_cycle,
      base_amount: plan.base_price,
      status: businessData.startTrial ? 'trial' : 'active',
      is_trial: businessData.startTrial || false,
      trial_ends_at: businessData.startTrial ? this.addDays(startDate, 14) : null,
      start_date: startDate,
      end_date: endDate,
      next_billing_date: nextBillingDate,
      auto_renew: true,
      current_period_usage: {},
      created_at: new Date(),
      updated_at: new Date(),
    });

    logInfo('Subscription created', { subscriptionCode, planCode: plan.plan_code });
    return subscription;
  }

  /**
   * Get business subscription
   */
  async getBusinessSubscription(businessId) {
    const subscription = await db.findOne('business_subscriptions', {
      business_id: businessId,
      status: { $in: ['active', 'trial'] },
    });

    if (!subscription) return null;

    const [plan, invoices] = await Promise.all([
      db.findById('subscription_plans', subscription.plan_id),
      db.find('invoices', { subscription_id: subscription.id }, { limit: 5, sort: { created_at: -1 } }),
    ]);

    return { ...subscription, plan, recentInvoices: invoices };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId, reason = '') {
    await db.update('business_subscriptions', subscriptionId, {
      status: 'cancelled',
      auto_renew: false,
      updated_at: new Date(),
    });

    logInfo('Subscription cancelled', { subscriptionId, reason });
    return db.findById('business_subscriptions', subscriptionId);
  }

  // ============================================================
  // INVOICES
  // ============================================================

  /**
   * Generate invoice
   */
  async generateInvoice(invoiceData) {
    const invoiceNumber = await this.generateInvoiceNumber();
    const invoiceCode = await this.generateInvoiceCode();
    const issueDate = new Date();
    const dueDate = this.addDays(issueDate, invoiceData.paymentTermsDays || 30);

    // Calculate totals
    let subtotal = 0;
    const lineItems = invoiceData.lineItems.map(item => {
      const total = item.quantity * item.unit_price;
      const taxAmount = total * (item.tax_rate || 16) / 100;
      subtotal += total;
      return { ...item, total, tax_amount: taxAmount };
    });

    const taxAmount = lineItems.reduce((sum, item) => sum + item.tax_amount, 0);
    const totalAmount = subtotal + taxAmount;

    const invoice = await db.create('invoices', {
      invoice_number: invoiceNumber,
      invoice_code: invoiceCode,
      business_id: invoiceData.businessId,
      business_name: invoiceData.businessName,
      business_email: invoiceData.businessEmail,
      business_address: invoiceData.businessAddress,
      subscription_id: invoiceData.subscriptionId,
      subscription_code: invoiceData.subscriptionCode,
      billing_period_start: invoiceData.billingPeriodStart,
      billing_period_end: invoiceData.billingPeriodEnd,
      line_items: lineItems,
      subtotal,
      tax_rate: 16,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      currency: invoiceData.currency || 'KES',
      status: 'issued',
      issue_date: issueDate,
      due_date: dueDate,
      notes: invoiceData.notes,
      terms: invoiceData.terms || 'Payment due within 30 days',
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Record revenue transaction
    await this.recordRevenue({
      revenueType: 'subscription',
      businessId: invoiceData.businessId,
      businessName: invoiceData.businessName,
      grossAmount: totalAmount,
      taxAmount,
      invoiceId: invoice.id,
      invoiceNumber,
      description: `Subscription invoice ${invoiceNumber}`,
      revenueDate: issueDate,
    });

    logInfo('Invoice generated', { invoiceNumber, totalAmount });
    return invoice;
  }

  /**
   * Get business invoices
   */
  async getBusinessInvoices(businessId, filters = {}) {
    const query = { business_id: businessId };
    if (filters.status) query.status = filters.status;

    return db.find('invoices', query, {
      sort: { created_at: -1 },
      limit: filters.limit || 50,
    });
  }

  /**
   * Mark invoice as paid
   */
  async markInvoicePaid(invoiceId, paymentData) {
    const invoice = await db.findById('invoices', invoiceId);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    await db.update('invoices', invoiceId, {
      status: 'paid',
      payment_method: paymentData.method,
      payment_reference: paymentData.reference,
      paid_at: new Date(),
      updated_at: new Date(),
    });

    logInfo('Invoice paid', { invoiceNumber: invoice.invoice_number });
    return db.findById('invoices', invoiceId);
  }

  // ============================================================
  // PAYMENTS
  // ============================================================

  /**
   * Record payment
   */
  async recordPayment(paymentData) {
    const paymentCode = await this.generatePaymentCode();

    const payment = await db.create('payments', {
      payment_code: paymentCode,
      business_id: paymentData.businessId,
      business_name: paymentData.businessName,
      invoice_id: paymentData.invoiceId,
      invoice_number: paymentData.invoiceNumber,
      amount: paymentData.amount,
      currency: paymentData.currency || 'KES',
      payment_method: paymentData.method,
      payment_reference: paymentData.reference,
      transaction_reference: paymentData.transactionReference,
      status: 'completed',
      provider: paymentData.provider,
      initiated_at: new Date(),
      completed_at: new Date(),
    });

    // Update invoice if linked
    if (paymentData.invoiceId) {
      await this.markInvoicePaid(paymentData.invoiceId, {
        method: paymentData.method,
        reference: paymentCode,
      });
    }

    logInfo('Payment recorded', { paymentCode, amount: paymentData.amount });
    return payment;
  }

  /**
   * Get business payments
   */
  async getBusinessPayments(businessId, filters = {}) {
    const query = { business_id: businessId };
    return db.find('payments', query, {
      sort: { initiated_at: -1 },
      limit: filters.limit || 50,
    });
  }

  // ============================================================
  // TRANSACTION FEES
  // ============================================================

  /**
   * Calculate listing fee
   */
  async calculateListingFee(businessId, listingType = 'standard') {
    const fee = await db.findOne('transaction_fees', {
      fee_type: 'listing',
      applies_to: listingType === 'standard' ? 'dealer' : 'private_seller',
      is_active: true,
    });

    if (!fee) {
      // Default fee structure
      return listingType === 'standard' ? 0 : 2500; // Free for dealers, KES 2,500 for private sellers
    }

    return fee.pricing_type === 'flat' ? fee.amount : 0;
  }

  /**
   * Calculate featured listing fee
   */
  async calculateFeaturedFee(durationDays = 7) {
    const fee = await db.findOne('transaction_fees', { fee_type: 'featured', is_active: true });
    if (!fee) return durationDays * 500; // Default: KES 500/day

    if (fee.pricing_type === 'flat') return fee.amount;
    if (fee.pricing_type === 'tiered') {
      const tier = fee.tiers?.find(t => durationDays >= t.min_days && durationDays <= t.max_days);
      return tier?.amount || fee.amount;
    }
    return 0;
  }

  /**
   * Calculate inspection commission
   */
  async calculateInspectionCommission(inspectionAmount, businessId) {
    const business = await db.getBusinessSubscription(businessId);
    const rate = business?.plan?.commission_rate || 10; // Default 10%

    return {
      inspectionAmount,
      commissionRate: rate,
      commissionAmount: inspectionAmount * rate / 100,
      netAmount: inspectionAmount - (inspectionAmount * rate / 100),
    };
  }

  // ============================================================
  // COMMISSIONS
  // ============================================================

  /**
   * Record commission
   */
  async recordCommission(commissionData) {
    const commissionCode = await this.generateCommissionCode();

    const commission = await db.create('commissions', {
      commission_code: commissionCode,
      source_type: commissionData.sourceType,
      source_id: commissionData.sourceId,
      business_id: commissionData.businessId,
      business_name: commissionData.businessName,
      transaction_amount: commissionData.transactionAmount,
      commission_rate: commissionData.commissionRate,
      commission_amount: commissionData.commissionAmount,
      currency: commissionData.currency || 'KES',
      status: 'calculated',
      calculated_at: new Date(),
    });

    // Record revenue
    await this.recordRevenue({
      revenueType: commissionData.sourceType === 'inspection' ? 'inspection_commission' :
                   commissionData.sourceType === 'auction' ? 'auction_fee' : 'other',
      businessId: commissionData.businessId,
      businessName: commissionData.businessName,
      grossAmount: commissionData.commissionAmount,
      description: `${commissionData.sourceType} commission`,
      revenueDate: new Date(),
    });

    logInfo('Commission recorded', { commissionCode, amount: commissionData.commissionAmount });
    return commission;
  }

  // ============================================================
  // REVENUE TRACKING
  // ============================================================

  /**
   * Record revenue transaction
   */
  async recordRevenue(revenueData) {
    const transactionCode = await this.generateTransactionCode();
    const revenuePeriod = this.getRevenuePeriod(revenueData.revenueDate);

    return db.create('revenue_transactions', {
      transaction_code: transactionCode,
      revenue_type: revenueData.revenueType,
      business_id: revenueData.businessId,
      business_name: revenueData.businessName,
      gross_amount: revenueData.grossAmount,
      discount_amount: revenueData.discountAmount || 0,
      net_amount: revenueData.netAmount || revenueData.grossAmount,
      tax_amount: revenueData.taxAmount || 0,
      currency: revenueData.currency || 'KES',
      invoice_id: revenueData.invoiceId,
      invoice_number: revenueData.invoiceNumber,
      description: revenueData.description,
      revenue_period: revenuePeriod,
      revenue_date: revenueData.revenueDate,
      recognized: true,
      recognized_at: new Date(),
      created_at: new Date(),
    });
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(period = 'monthly') {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const transactions = await db.find('revenue_transactions', {
      revenue_date: { $gte: startDate, $lte: now },
    });

    const revenueByType = {};
    let totalGross = 0;
    let totalDiscounts = 0;
    let totalNet = 0;

    transactions.forEach(t => {
      revenueByType[t.revenue_type] = (revenueByType[t.revenue_type] || 0) + t.net_amount;
      totalGross += t.gross_amount;
      totalDiscounts += t.discount_amount;
      totalNet += t.net_amount;
    });

    // Get subscriptions
    const subscriptions = await db.find('business_subscriptions', { status: 'active' });
    const mrr = subscriptions.reduce((sum, s) => sum + s.base_amount, 0);

    return {
      period,
      startDate,
      endDate: now,
      totalGrossRevenue: totalGross,
      totalDiscounts,
      totalNetRevenue: totalNet,
      revenueByType,
      activeSubscriptions: subscriptions.length,
      mrr,
      arr: mrr * 12,
    };
  }

  /**
   * Get revenue dashboard
   */
  async getRevenueDashboard() {
    const [todayAnalytics, monthAnalytics, yearAnalytics, recentTransactions, outstandingInvoices] = await Promise.all([
      this.getRevenueAnalytics('daily'),
      this.getRevenueAnalytics('monthly'),
      this.getRevenueAnalytics('yearly'),
      db.find('revenue_transactions', {}, { sort: { revenue_date: -1 }, limit: 10 }),
      db.find('invoices', { status: { $in: ['issued', 'overdue'] } }),
    ]);

    const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);

    return {
      today: todayAnalytics,
      thisMonth: monthAnalytics,
      thisYear: yearAnalytics,
      recentTransactions,
      outstandingInvoices: outstandingInvoices.length,
      totalOutstanding,
    };
  }

  // ============================================================
  // COMMERCIAL CENTER (Business Dashboard)
  // ============================================================

  /**
   * Get business commercial dashboard
   */
  async getCommercialDashboard(businessId) {
    const [subscription, invoices, payments, usage, balance] = await Promise.all([
      this.getBusinessSubscription(businessId),
      this.getBusinessInvoices(businessId, { limit: 10 }),
      this.getBusinessPayments(businessId, { limit: 10 }),
      this.getBusinessUsage(businessId),
      this.getBusinessBalance(businessId),
    ]);

    const totalPaid = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    const outstandingAmount = invoices
      .filter(i => ['issued', 'overdue'].includes(i.status))
      .reduce((sum, i) => sum + i.total_amount, 0);

    return {
      subscription,
      totalPaid,
      outstandingAmount,
      recentInvoices: invoices.slice(0, 5),
      recentPayments: payments.slice(0, 5),
      usage,
      balance,
    };
  }

  /**
   * Get business usage
   */
  async getBusinessUsage(businessId) {
    const subscription = await this.getBusinessSubscription(businessId);
    if (!subscription) return null;

    const usage = await db.find('usage_tracking', {
      business_id: businessId,
      subscription_id: subscription.id,
    });

    return {
      included: {
        listings: subscription.plan?.included_listings || 0,
        inspections: subscription.plan?.included_inspections || 0,
        auctions: subscription.plan?.included_auctions || 0,
        apiCalls: subscription.plan?.included_api_calls || 0,
      },
      used: usage.reduce((acc, u) => ({ ...acc, [u.usage_type]: u.used_units }), {}),
    };
  }

  /**
   * Get business balance
   */
  async getBusinessBalance(businessId) {
    let balance = await db.findOne('business_balances', { business_id: businessId });

    if (!balance) {
      balance = await db.create('business_balances', {
        business_id: businessId,
        business_name: '',
        business_type: '',
        available_credit: 0,
        pending_charges: 0,
        total_outstanding: 0,
        credit_limit: 50000,
        credit_used: 0,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    return balance;
  }

  // ============================================================
  // PROMOTIONS
  // ============================================================

  /**
   * Get available promotions
   */
  async getAvailablePromotions() {
    const now = new Date();
    return db.find('promotions', {
      is_active: true,
      valid_from: { $lte: now },
      $or: [
        { valid_until: { $gte: now } },
        { valid_until: null },
      ],
    });
  }

  /**
   * Apply promotion
   */
  async applyPromotion(promotionCode, businessId) {
    const promotion = await db.findOne('promotions', {
      promotion_code: promotionCode,
      is_active: true,
    });

    if (!promotion) {
      throw new AppError('Invalid promotion code', 400);
    }

    const now = new Date();
    if (now < promotion.valid_from || (promotion.valid_until && now > promotion.valid_until)) {
      throw new AppError('Promotion has expired', 400);
    }

    if (promotion.max_uses && promotion.current_uses >= promotion.max_uses) {
      throw new AppError('Promotion usage limit reached', 400);
    }

    // Increment usage
    await db.update('promotions', promotion.id, {
      current_uses: promotion.current_uses + 1,
    });

    return {
      promotion,
      discount: {
        type: promotion.discount_type,
        value: promotion.discount_value,
      },
    };
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  async generateSubscriptionCode() {
    const timestamp = Date.now().toString(36).toUpperCase();
    return `KAYAD-Sub-${timestamp.slice(-6)}`;
  }

  async generateInvoiceNumber() {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `KAYAD-INV-${yearMonth}-${random}`;
  }

  async generateInvoiceCode() {
    const timestamp = Date.now().toString(36).toUpperCase();
    return `KAYAD-INV-${timestamp.slice(-8)}`;
  }

  async generatePaymentCode() {
    const timestamp = Date.now().toString(36).toUpperCase();
    return `KAYAD-Pay-${timestamp.slice(-8)}`;
  }

  async generateCommissionCode() {
    const timestamp = Date.now().toString(36).toUpperCase();
    return `KAYAD-Com-${timestamp.slice(-8)}`;
  }

  async generateTransactionCode() {
    const timestamp = Date.now().toString(36).toUpperCase();
    return `KAYAD-Rev-${timestamp.slice(-8)}`;
  }

  calculateEndDate(startDate, billingCycle) {
    if (billingCycle === 'monthly') {
      return this.addMonths(startDate, 1);
    }
    return this.addMonths(startDate, 12);
  }

  addMonths(date, months) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  getRevenuePeriod(date) {
    const d = new Date(date);
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  /**
   * Initialize default subscription plans
   */
  async initializeDefaultPlans() {
    const plans = [
      {
        plan_code: 'dealer_starter',
        plan_name: 'Dealer Starter',
        description: 'Essential tools for small dealers',
        target_type: 'dealer',
        billing_cycle: 'monthly',
        base_price: 15000,
        included_listings: 25,
        included_inspections: 10,
        included_auctions: 5,
        commission_rate: 2,
        is_featured: false,
      },
      {
        plan_code: 'dealer_professional',
        plan_name: 'Dealer Professional',
        description: 'Complete solution for growing dealers',
        target_type: 'dealer',
        billing_cycle: 'monthly',
        base_price: 45000,
        included_listings: 100,
        included_inspections: 50,
        included_auctions: 20,
        commission_rate: 1.5,
        is_featured: true,
      },
      {
        plan_code: 'dealer_enterprise',
        plan_name: 'Dealer Enterprise',
        description: 'Unlimited growth with premium support',
        target_type: 'dealer',
        billing_cycle: 'annual',
        base_price: 450000,
        included_listings: null, // Unlimited
        included_inspections: null,
        included_auctions: null,
        commission_rate: 1,
        is_featured: false,
      },
      {
        plan_code: 'inspection_starter',
        plan_name: 'Inspection Starter',
        description: 'Start your inspection business',
        target_type: 'inspection',
        billing_cycle: 'monthly',
        base_price: 25000,
        included_listings: 0,
        included_inspections: 50,
        commission_rate: 10,
        is_featured: false,
      },
      {
        plan_code: 'inspection_professional',
        plan_name: 'Inspection Professional',
        description: 'Scale your inspection operations',
        target_type: 'inspection',
        billing_cycle: 'monthly',
        base_price: 75000,
        included_listings: 0,
        included_inspections: 200,
        commission_rate: 8,
        is_featured: true,
      },
      {
        plan_code: 'auction_basic',
        plan_name: 'Auction Basic',
        description: 'Host auctions on KAYAD',
        target_type: 'auction',
        billing_cycle: 'monthly',
        base_price: 50000,
        included_listings: 0,
        included_inspections: 0,
        included_auctions: 10,
        commission_rate: 5,
        is_featured: false,
      },
      {
        plan_code: 'developer_sandbox',
        plan_name: 'Developer Sandbox',
        description: 'Free access for testing',
        target_type: 'developer',
        billing_cycle: 'monthly',
        base_price: 0,
        included_api_calls: 1000,
        is_featured: false,
      },
      {
        plan_code: 'developer_production',
        plan_name: 'Developer Production',
        description: 'Production API access',
        target_type: 'developer',
        billing_cycle: 'monthly',
        base_price: 25000,
        included_api_calls: 10000,
        commission_rate: 0,
        is_featured: false,
      },
    ];

    for (const plan of plans) {
      const existing = await db.findOne('subscription_plans', { plan_code: plan.plan_code });
      if (!existing) {
        await db.create('subscription_plans', {
          ...plan,
          features: this.generatePlanFeatures(plan),
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
  }

  generatePlanFeatures(plan) {
    const features = [
      { feature: 'Vehicle Listings', included: plan.included_listings !== 0, limit: plan.included_listings },
      { feature: 'Inspection Bookings', included: plan.included_inspections !== 0, limit: plan.included_inspections },
      { feature: 'Auction Slots', included: plan.included_auctions !== 0, limit: plan.included_auctions },
      { feature: 'API Calls', included: plan.included_api_calls !== undefined, limit: plan.included_api_calls },
      { feature: 'Featured Listings', included: true, limit: Math.floor((plan.included_listings || 0) * 0.1) },
      { feature: 'Analytics Dashboard', included: true, limit: null },
      { feature: 'Customer Support', included: true, limit: plan.base_price >= 45000 ? 'priority' : 'standard' },
    ];
    return features;
  }
}

export const revenueService = new RevenueService();
export default revenueService;
