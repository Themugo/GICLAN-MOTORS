-- KAYAD Regional Configuration & Localization Domain
-- Canonical country metadata/configuration plus administrator-managed FX rates.

CREATE TABLE IF NOT EXISTS countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(5) UNIQUE NOT NULL,
  country_name VARCHAR(100) NOT NULL,
  iso_code VARCHAR(3) NOT NULL,
  flag_emoji VARCHAR(10),
  flag_url VARCHAR(500),
  status VARCHAR(20) NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive','active','maintenance','suspended')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS country_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID UNIQUE REFERENCES countries(id) ON DELETE CASCADE,
  country_code VARCHAR(5) UNIQUE NOT NULL REFERENCES countries(country_code) ON DELETE CASCADE,
  currency_code VARCHAR(3) NOT NULL,
  currency_symbol VARCHAR(10) NOT NULL,
  currency_name VARCHAR(50) NOT NULL,
  currency_decimal_places INTEGER NOT NULL DEFAULT 2 CHECK (currency_decimal_places BETWEEN 0 AND 6),
  default_language VARCHAR(10) NOT NULL DEFAULT 'en',
  supported_languages JSONB NOT NULL DEFAULT '["en"]'::jsonb,
  date_format VARCHAR(20) NOT NULL DEFAULT 'DD/MM/YYYY',
  time_format VARCHAR(20) NOT NULL DEFAULT '24h',
  timezone VARCHAR(50) NOT NULL,
  phone_country_code VARCHAR(5) NOT NULL,
  phone_format VARCHAR(50),
  address_format JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS country_payment_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(5) NOT NULL REFERENCES countries(country_code) ON DELETE CASCADE,
  provider_code VARCHAR(50) NOT NULL,
  provider_name VARCHAR(200) NOT NULL,
  provider_type VARCHAR(30) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  provider_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  transaction_fee_percentage NUMERIC(8,4) NOT NULL DEFAULT 0 CHECK (transaction_fee_percentage >= 0),
  transaction_fee_fixed NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (transaction_fee_fixed >= 0),
  min_transaction_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (min_transaction_amount >= 0),
  max_transaction_amount NUMERIC(18,2),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','maintenance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_code, provider_code)
);

CREATE TABLE IF NOT EXISTS country_tax_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(5) NOT NULL REFERENCES countries(country_code) ON DELETE CASCADE,
  tax_code VARCHAR(50) NOT NULL,
  tax_name VARCHAR(200) NOT NULL,
  tax_type VARCHAR(30) NOT NULL,
  rate_percentage NUMERIC(8,4) NOT NULL DEFAULT 0 CHECK (rate_percentage >= 0),
  rate_fixed NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (rate_fixed >= 0),
  applies_to_vehicles BOOLEAN NOT NULL DEFAULT true,
  applies_to_services BOOLEAN NOT NULL DEFAULT true,
  applies_to_finance BOOLEAN NOT NULL DEFAULT false,
  applies_to_auctions BOOLEAN NOT NULL DEFAULT true,
  min_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  max_amount NUMERIC(18,2),
  collected_by VARCHAR(50),
  remittance_frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_code, tax_code)
);

CREATE TABLE IF NOT EXISTS cross_border_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_code VARCHAR(50) UNIQUE NOT NULL,
  from_country_code VARCHAR(5) NOT NULL REFERENCES countries(country_code) ON DELETE CASCADE,
  to_country_code VARCHAR(5) NOT NULL REFERENCES countries(country_code) ON DELETE CASCADE,
  allows_import BOOLEAN NOT NULL DEFAULT true,
  allows_export BOOLEAN NOT NULL DEFAULT true,
  import_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  export_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  import_duty_percentage NUMERIC(8,4) NOT NULL DEFAULT 0 CHECK (import_duty_percentage >= 0),
  export_duty_percentage NUMERIC(8,4) NOT NULL DEFAULT 0 CHECK (export_duty_percentage >= 0),
  processing_fee NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (processing_fee >= 0),
  available_transport_methods JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_transit_days INTEGER CHECK (estimated_transit_days IS NULL OR estimated_transit_days >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_country_code, to_country_code)
);

CREATE TABLE IF NOT EXISTS currency_exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate NUMERIC(24,12) NOT NULL CHECK (rate > 0),
  source VARCHAR(100) NOT NULL DEFAULT 'admin_configured',
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (from_currency <> to_currency),
  UNIQUE(from_currency, to_currency)
);

CREATE INDEX IF NOT EXISTS idx_countries_status ON countries(status);
CREATE INDEX IF NOT EXISTS idx_country_payment_country ON country_payment_providers(country_code);
CREATE INDEX IF NOT EXISTS idx_country_tax_country ON country_tax_configurations(country_code);
CREATE INDEX IF NOT EXISTS idx_cross_border_from_to ON cross_border_configurations(from_country_code, to_country_code);
CREATE INDEX IF NOT EXISTS idx_fx_active ON currency_exchange_rates(from_currency, to_currency, is_active);

ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_payment_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_tax_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_border_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_exchange_rates ENABLE ROW LEVEL SECURITY;

-- Service-role/server access is authoritative; no anonymous direct table access.
DROP POLICY IF EXISTS countries_no_public_access ON countries;
CREATE POLICY countries_no_public_access ON countries FOR ALL USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS country_config_no_public_access ON country_configurations;
CREATE POLICY country_config_no_public_access ON country_configurations FOR ALL USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS country_payment_no_public_access ON country_payment_providers;
CREATE POLICY country_payment_no_public_access ON country_payment_providers FOR ALL USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS country_tax_no_public_access ON country_tax_configurations;
CREATE POLICY country_tax_no_public_access ON country_tax_configurations FOR ALL USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS cross_border_no_public_access ON cross_border_configurations;
CREATE POLICY cross_border_no_public_access ON cross_border_configurations FOR ALL USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS fx_no_public_access ON currency_exchange_rates;
CREATE POLICY fx_no_public_access ON currency_exchange_rates FOR ALL USING (false) WITH CHECK (false);

INSERT INTO countries (country_code, country_name, iso_code, flag_emoji, status, is_primary)
VALUES
  ('KE','Kenya','KEN','🇰🇪','active',true),
  ('UG','Uganda','UGA','🇺🇬','active',false),
  ('TZ','Tanzania','TZA','🇹🇿','active',false),
  ('RW','Rwanda','RWA','🇷🇼','inactive',false),
  ('BI','Burundi','BDI','🇧🇮','inactive',false),
  ('SS','South Sudan','SSD','🇸🇸','inactive',false)
ON CONFLICT (country_code) DO NOTHING;

INSERT INTO country_configurations (country_id, country_code, currency_code, currency_symbol, currency_name, default_language, supported_languages, timezone, phone_country_code, phone_format)
SELECT id, 'KE','KES','KES','Kenyan Shilling','en','["en","sw"]'::jsonb,'Africa/Nairobi','+254','XXX XXX XXXX' FROM countries WHERE country_code='KE'
ON CONFLICT (country_code) DO NOTHING;
INSERT INTO country_configurations (country_id, country_code, currency_code, currency_symbol, currency_name, default_language, supported_languages, timezone, phone_country_code, phone_format)
SELECT id, 'UG','UGX','USh','Ugandan Shilling','en','["en"]'::jsonb,'Africa/Kampala','+256','XXX XXX XXXX' FROM countries WHERE country_code='UG'
ON CONFLICT (country_code) DO NOTHING;
INSERT INTO country_configurations (country_id, country_code, currency_code, currency_symbol, currency_name, default_language, supported_languages, timezone, phone_country_code, phone_format)
SELECT id, 'TZ','TZS','TSh','Tanzanian Shilling','en','["en","sw"]'::jsonb,'Africa/Dar_es_Salaam','+255','XXX XXX XXX' FROM countries WHERE country_code='TZ'
ON CONFLICT (country_code) DO NOTHING;
INSERT INTO country_configurations (country_id, country_code, currency_code, currency_symbol, currency_name, default_language, supported_languages, timezone, phone_country_code, phone_format)
SELECT id, 'RW','RWF','RWF','Rwandan Franc','en','["en","rw","fr"]'::jsonb,'Africa/Kigali','+250','XXX XXX XXX' FROM countries WHERE country_code='RW'
ON CONFLICT (country_code) DO NOTHING;
INSERT INTO country_configurations (country_id, country_code, currency_code, currency_symbol, currency_name, default_language, supported_languages, timezone, phone_country_code, phone_format)
SELECT id, 'BI','BIF','FBu','Burundian Franc','fr','["fr","en","rn"]'::jsonb,'Africa/Bujumbura','+257','XX XX XX XX' FROM countries WHERE country_code='BI'
ON CONFLICT (country_code) DO NOTHING;
INSERT INTO country_configurations (country_id, country_code, currency_code, currency_symbol, currency_name, default_language, supported_languages, timezone, phone_country_code, phone_format)
SELECT id, 'SS','SSP','SSP','South Sudanese Pound','en','["en"]'::jsonb,'Africa/Juba','+211','XXX XXX XXX' FROM countries WHERE country_code='SS'
ON CONFLICT (country_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS localization_strings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  string_key VARCHAR(200) NOT NULL,
  namespace VARCHAR(100) NOT NULL DEFAULT 'common',
  locale VARCHAR(10) NOT NULL,
  translation TEXT NOT NULL,
  description TEXT,
  context VARCHAR(200),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(locale, namespace, string_key)
);
CREATE INDEX IF NOT EXISTS idx_localization_locale_namespace ON localization_strings(locale, namespace);
ALTER TABLE localization_strings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS localization_no_public_access ON localization_strings;
CREATE POLICY localization_no_public_access ON localization_strings FOR ALL USING (false) WITH CHECK (false);
