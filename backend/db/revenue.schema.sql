-- ============================================================
// KAYAD REVENUE & COMMERCIAL PLATFORM - DATABASE SCHEMA
// Financial operating system for commercial relationships
// ============================================================

-- ============================================================
// SUBSCRIPTION PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Plan
  plan_code VARCHAR(50) UNIQUE NOT NULL,
  plan_name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Target
  target_type VARCHAR(30) NOT NULL, -- 'dealer', 'inspection', 'auction', 'private_seller', 'bank', 'insurance', 'enterprise', 'developer'

  -- Billing
  billing_cycle VARCHAR(20) NOT NULL, -- 'monthly', 'annual'
  base_price DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',

  -- Features
  features JSONB DEFAULT '[]', -- [{feature, included, limit}]

  -- Usage Limits
  included_listings INTEGER,
  included_inspections INTEGER,
  included_auctions INTEGER,
  included_api_calls INTEGER DEFAULT 0,

  -- Commission Rates
  commission_rate DECIMAL(5, 2) DEFAULT 0, -- Percentage

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_plan_target ON subscription_plans(target_type);
CREATE INDEX idx_plan_active ON subscription_plans(is_active);

-- ============================================================
// BUSINESS SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS business_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Subscription
  subscription_code VARCHAR(50) UNIQUE NOT NULL, -- KAYAD-Sub-XXXXXXXX

  -- Business
  business_id UUID NOT NULL,
  business_type VARCHAR(30) NOT NULL,
  business_name VARCHAR(200) NOT NULL,

  -- Plan
  plan_id UUID REFERENCES subscription_plans(id),
  plan_code VARCHAR(50) NOT NULL,

  -- Billing
  billing_cycle VARCHAR(20) NOT NULL, -- 'monthly', 'annual'
  base_amount DECIMAL(12, 2) NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'cancelled', 'expired', 'trial'

  -- Trial
  is_trial BOOLEAN DEFAULT false,
  trial_ends_at TIMESTAMP,

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  next_billing_date DATE,

  -- Payment
  auto_renew BOOLEAN DEFAULT true,
  payment_method VARCHAR(30),

  -- Usage Tracking
  current_period_usage JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_subscription_business ON business_subscriptions(business_id);
  INDEX idx_subscription_status ON business_subscriptions(status);
  INDEX idx_subscription_next_billing ON business_subscriptions(next_billing_date);
);

-- ============================================================
// TRANSACTION FEES
-- ============================================================
CREATE TABLE IF NOT EXISTS transaction_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Fee
  fee_code VARCHAR(50) UNIQUE NOT NULL,
  fee_name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Type
  fee_type VARCHAR(30) NOT NULL, -- 'listing', 'featured', 'advertising', 'lead', 'inspection_commission', 'auction_hosting', 'api_usage'

  -- Pricing
  pricing_type VARCHAR(20) NOT NULL, -- 'flat', 'percentage', 'tiered'
  amount DECIMAL(12, 2),
  percentage DECIMAL(5, 2),

  -- Tiers (for tiered pricing)
  tiers JSONB DEFAULT '[]', -- [{min_usage, max_usage, amount, percentage}]

  -- Scope
  applies_to VARCHAR(30), -- 'dealer', 'private_seller', 'inspection', 'auction'

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Invoice
  invoice_number VARCHAR(50) UNIQUE NOT NULL, -- KAYAD-INV-YYYYMM-XXXX
  invoice_code VARCHAR(50) UNIQUE NOT NULL,

  -- Business
  business_id UUID NOT NULL,
  business_name VARCHAR(200) NOT NULL,
  business_email VARCHAR(200) NOT NULL,
  business_address TEXT,

  -- Subscription (if applicable)
  subscription_id UUID REFERENCES business_subscriptions(id),
  subscription_code VARCHAR(50),

  -- Billing Period
  billing_period_start DATE,
  billing_period_end DATE,

  -- Line Items
  line_items JSONB DEFAULT '[]', -- [{description, quantity, unit_price, total, tax_rate, tax_amount}]
  subtotal DECIMAL(12, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) DEFAULT 16, -- Kenya VAT rate
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'issued', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'refunded'

  -- Payment
  payment_method VARCHAR(30),
  payment_reference VARCHAR(100),
  paid_at TIMESTAMP,

  -- Due Date
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,

  -- Notes
  notes TEXT,
  terms TEXT,

  -- Credit Note
  is_credit_note BOOLEAN DEFAULT false,
  original_invoice_id UUID,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_invoice_business ON invoices(business_id);
  INDEX idx_invoice_status ON invoices(status);
  INDEX idx_invoice_due ON invoices(due_date);
);

-- ============================================================
// PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Payment
  payment_code VARCHAR(50) UNIQUE NOT NULL, -- KAYAD-Pay-XXXXXXXX

  -- Business
  business_id UUID NOT NULL,
  business_name VARCHAR(200) NOT NULL,

  -- Invoice
  invoice_id UUID REFERENCES invoices(id),
  invoice_number VARCHAR(50),

  -- Amount
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',

  -- Method
  payment_method VARCHAR(30) NOT NULL, -- 'mpesa', 'bank_transfer', 'card', 'corporate_account', 'invoice_settlement'

  -- Reference
  payment_reference VARCHAR(100),
  transaction_reference VARCHAR(100),

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'refunded'

  -- Processing
  provider VARCHAR(50), -- 'mpesa', 'stripe', 'paypal'
  provider_reference VARCHAR(100),

  -- Timestamps
  initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,

  INDEX idx_payment_business ON payments(business_id);
  INDEX idx_payment_invoice ON payments(invoice_id);
  INDEX idx_payment_status ON payments(status);
);

-- ============================================================
// COMMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Commission
  commission_code VARCHAR(50) UNIQUE NOT NULL,

  -- Source Transaction
  source_type VARCHAR(30) NOT NULL, -- 'listing', 'inspection', 'auction', 'advertising', 'featured'
  source_id UUID NOT NULL,

  -- Business
  business_id UUID NOT NULL,
  business_name VARCHAR(200) NOT NULL,

  -- Calculation
  transaction_amount DECIMAL(12, 2) NOT NULL,
  commission_rate DECIMAL(5, 2) NOT NULL,
  commission_amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'calculated', 'invoiced', 'paid'

  -- Invoice
  invoice_id UUID REFERENCES invoices(id),

  -- Calculation Date
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_commission_source ON commissions(source_type, source_id);
  INDEX idx_commission_business ON commissions(business_id);
  INDEX idx_commission_status ON commissions(status);
);

-- ============================================================
// REVENUE TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS revenue_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Transaction
  transaction_code VARCHAR(50) UNIQUE NOT NULL,

  -- Type
  revenue_type VARCHAR(30) NOT NULL, -- 'subscription', 'listing_fee', 'featured_listing', 'advertising', 'inspection_commission', 'auction_fee', 'api_usage', 'enterprise', 'other'

  -- Business
  business_id UUID,
  business_name VARCHAR(200),

  -- Amount
  gross_amount DECIMAL(12, 2) NOT NULL,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  net_amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',

  -- Tax
  tax_amount DECIMAL(12, 2) DEFAULT 0,

  -- Reference
  invoice_id UUID REFERENCES invoices(id),
  invoice_number VARCHAR(50),

  -- Description
  description TEXT,

  -- Period
  revenue_period VARCHAR(20), -- 'January 2024'
  revenue_date DATE NOT NULL,

  -- Recognition
  recognized BOOLEAN DEFAULT true,
  recognized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_revenue_type ON revenue_transactions(revenue_type);
  INDEX idx_revenue_period ON revenue_transactions(revenue_period);
  INDEX idx_revenue_date ON revenue_transactions(revenue_date DESC);
);

-- ============================================================
// PROMOTIONS & DISCOUNTS
-- ============================================================
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Promotion
  promotion_code VARCHAR(50) UNIQUE NOT NULL,
  promotion_name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Type
  promotion_type VARCHAR(30) NOT NULL, -- 'discount_code', 'referral_credit', 'seasonal', 'upgrade_bonus', 'trial_extension'

  -- Discount
  discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed_amount', 'free_trial'
  discount_value DECIMAL(12, 2),

  -- Scope
  applies_to VARCHAR(30), -- 'subscription', 'listing', 'inspection', 'auction', 'all'
  target_business_types JSONB DEFAULT '[]',

  -- Limits
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from DATE NOT NULL,
  valid_until DATE,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// BUSINESS BALANCES
-- ============================================================
CREATE TABLE IF NOT EXISTS business_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Business
  business_id UUID NOT NULL UNIQUE,
  business_name VARCHAR(200) NOT NULL,
  business_type VARCHAR(30) NOT NULL,

  -- Balances
  available_credit DECIMAL(12, 2) DEFAULT 0,
  pending_charges DECIMAL(12, 2) DEFAULT 0,
  total_outstanding DECIMAL(12, 2) DEFAULT 0,

  -- Credit Limit
  credit_limit DECIMAL(12, 2),
  credit_used DECIMAL(12, 2) DEFAULT 0,

  -- Payment Terms
  payment_terms_days INTEGER DEFAULT 30,

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended', 'blocked'

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// USAGE TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Business
  business_id UUID NOT NULL,
  subscription_id UUID REFERENCES business_subscriptions(id),

  -- Usage Type
  usage_type VARCHAR(30) NOT NULL, -- 'listings', 'inspections', 'auctions', 'api_calls', 'featured_listings'

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Usage
  included_units INTEGER,
  used_units INTEGER DEFAULT 0,
  overage_units INTEGER DEFAULT 0,
  overage_rate DECIMAL(12, 2),
  overage_amount DECIMAL(12, 2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(business_id, subscription_id, usage_type, period_start)
);

-- ============================================================
// PAYMENT METHODS
-- ============================================================
CREATE TABLE IF NOT EXISTS business_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Business
  business_id UUID NOT NULL,

  -- Method
  method_type VARCHAR(30) NOT NULL, -- 'mpesa', 'bank_transfer', 'card', 'corporate_account'

  -- Details
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,

  -- M-Pesa
  mpesa_account VARCHAR(20),

  -- Bank
  bank_name VARCHAR(100),
  bank_account_name VARCHAR(200),
  bank_account_number VARCHAR(50),
  bank_branch VARCHAR(100),

  -- Card (tokenized)
  card_last_four VARCHAR(4),
  card_brand VARCHAR(20),
  card_token VARCHAR(100),

  -- Corporate Account
  corporate_account_id VARCHAR(50),

  -- Status
  status VARCHAR(20) DEFAULT 'active',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_payment_method_business ON business_payment_methods(business_id);
);

-- ============================================================
// REVENUE ANALYTICS
-- ============================================================
CREATE TABLE IF NOT EXISTS revenue_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Period
  period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Revenue by Type
  revenue_by_type JSONB DEFAULT '{}', -- {subscription: 0, listing: 0, ...}

  -- Totals
  total_gross_revenue DECIMAL(14, 2) DEFAULT 0,
  total_discounts DECIMAL(14, 2) DEFAULT 0,
  total_net_revenue DECIMAL(14, 2) DEFAULT 0,
  total_tax DECIMAL(14, 2) DEFAULT 0,

  -- Subscriptions
  new_subscriptions INTEGER DEFAULT 0,
  cancelled_subscriptions INTEGER DEFAULT 0,
  active_subscriptions INTEGER DEFAULT 0,
  mrr DECIMAL(14, 2) DEFAULT 0, -- Monthly Recurring Revenue
  arr DECIMAL(14, 2) DEFAULT 0, -- Annual Recurring Revenue

  -- Transactions
  total_transactions INTEGER DEFAULT 0,
  avg_transaction_value DECIMAL(12, 2) DEFAULT 0,

  -- Outstanding
  total_outstanding DECIMAL(14, 2) DEFAULT 0,
  overdue_amount DECIMAL(14, 2) DEFAULT 0,

  -- Calculated
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(period_type, period_start)
);
