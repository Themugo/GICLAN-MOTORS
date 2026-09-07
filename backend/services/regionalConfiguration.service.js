import db from '../db/index.js';
import { AppError } from '../utils/AppError.js';

const SUPPORTED_COUNTRIES = [
  { countryCode: 'KE', countryName: 'Kenya', isoCode: 'KEN', flagEmoji: '🇰🇪', status: 'active', isPrimary: true },
  { countryCode: 'UG', countryName: 'Uganda', isoCode: 'UGA', flagEmoji: '🇺🇬', status: 'active', isPrimary: false },
  { countryCode: 'TZ', countryName: 'Tanzania', isoCode: 'TZA', flagEmoji: '🇹🇿', status: 'active', isPrimary: false },
  { countryCode: 'RW', countryName: 'Rwanda', isoCode: 'RWA', flagEmoji: '🇷🇼', status: 'inactive', isPrimary: false },
  { countryCode: 'BI', countryName: 'Burundi', isoCode: 'BDI', flagEmoji: '🇧🇮', status: 'inactive', isPrimary: false },
  { countryCode: 'SS', countryName: 'South Sudan', isoCode: 'SSD', flagEmoji: '🇸🇸', status: 'inactive', isPrimary: false },
];

const assertCountryCode = (value) => {
  const code = String(value || '').trim().toUpperCase();
  if (!/^[A-Z]{2,5}$/.test(code)) throw new AppError('Invalid country code', 400);
  return code;
};

class RegionalConfigurationService {
  async listCountries({ status, includeConfiguration = false } = {}) {
    const filters = {};
    if (status) filters.status = status;
    const countries = await db.findAll('countries', { filters, orderBy: 'countryName', ascending: true });
    if (!includeConfiguration) return countries;
    return Promise.all(countries.map((country) => this.getCountry(country.countryCode)));
  }

  async getCountry(countryCode) {
    const code = assertCountryCode(countryCode);
    const country = await db.findOne('countries', { countryCode: code });
    if (!country) throw new AppError('Country not found', 404);
    const [configuration, paymentProviders, taxes, crossBorder] = await Promise.all([
      db.findOne('country_configurations', { countryCode: code }),
      db.findAll('country_payment_providers', { filters: { countryCode: code, status: 'active', isEnabled: true }, orderBy: 'isPrimary', ascending: false }),
      db.findAll('country_tax_configurations', { filters: { countryCode: code, isActive: true }, orderBy: 'taxName', ascending: true }),
      db.findAll('cross_border_configurations', { filters: { $or: [{ fromCountryCode: code }, { toCountryCode: code }], isActive: true } }),
    ]);
    return { ...country, configuration, paymentProviders, taxes, crossBorder };
  }

  async getCurrencyRate(fromCurrency, toCurrency) {
    const from = String(fromCurrency || '').trim().toUpperCase();
    const to = String(toCurrency || '').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) throw new AppError('Invalid currency code', 400);
    if (from === to) return { fromCurrency: from, toCurrency: to, rate: 1, source: 'identity', effectiveAt: new Date().toISOString() };
    const direct = await db.findOne('currency_exchange_rates', { fromCurrency: from, toCurrency: to, isActive: true });
    if (direct) return { fromCurrency: from, toCurrency: to, rate: Number(direct.rate), source: direct.source, effectiveAt: direct.effectiveAt };
    const inverse = await db.findOne('currency_exchange_rates', { fromCurrency: to, toCurrency: from, isActive: true });
    if (inverse && Number(inverse.rate) > 0) return { fromCurrency: from, toCurrency: to, rate: 1 / Number(inverse.rate), source: `${inverse.source}:inverse`, effectiveAt: inverse.effectiveAt };
    throw new AppError(`No active exchange rate configured for ${from}/${to}`, 404);
  }

  async convertCurrency(amount, fromCurrency, toCurrency) {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) throw new AppError('Amount must be a non-negative number', 400);
    const quote = await this.getCurrencyRate(fromCurrency, toCurrency);
    return { original: numericAmount, originalCurrency: quote.fromCurrency, converted: numericAmount * quote.rate, targetCurrency: quote.toCurrency, rate: quote.rate, source: quote.source, timestamp: quote.effectiveAt };
  }

  async upsertCurrencyRate(input, actorId) {
    const fromCurrency = String(input.fromCurrency || '').trim().toUpperCase();
    const toCurrency = String(input.toCurrency || '').trim().toUpperCase();
    const rate = Number(input.rate);
    if (!/^[A-Z]{3}$/.test(fromCurrency) || !/^[A-Z]{3}$/.test(toCurrency) || fromCurrency === toCurrency) throw new AppError('Valid distinct currency codes are required', 400);
    if (!Number.isFinite(rate) || rate <= 0) throw new AppError('Exchange rate must be greater than zero', 400);
    const existing = await db.findOne('currency_exchange_rates', { fromCurrency, toCurrency });
    const payload = { rate, source: input.source || 'admin_configured', effectiveAt: input.effectiveAt || new Date().toISOString(), isActive: input.isActive !== false, updatedBy: actorId, updatedAt: new Date().toISOString() };
    return existing ? db.update('currency_exchange_rates', existing.id, payload) : db.create('currency_exchange_rates', { fromCurrency, toCurrency, ...payload, createdBy: actorId, createdAt: new Date().toISOString() });
  }

  async listCurrencyRates() {
    return db.findAll('currency_exchange_rates', { filters: { isActive: true }, orderBy: 'updatedAt', ascending: false });
  }

  async updateCountryStatus(countryCode, status, actorId) {
    const code = assertCountryCode(countryCode);
    const allowed = ['active', 'inactive', 'maintenance', 'suspended'];
    if (!allowed.includes(status)) throw new AppError('Invalid country status', 400);
    const country = await db.findOne('countries', { countryCode: code });
    if (!country) throw new AppError('Country not found', 404);
    if (status === 'active' && country.isPrimary === false) {
      // Activation is intentionally independent of primary-country designation.
    }
    return db.update('countries', country.id, { status, updatedAt: new Date().toISOString() });
  }

  async seedDefaults() {
    for (const country of SUPPORTED_COUNTRIES) {
      const existing = await db.findOne('countries', { countryCode: country.countryCode });
      if (!existing) await db.create('countries', { ...country, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    return this.listCountries();
  }
}

export const regionalConfigurationService = new RegionalConfigurationService();
export default regionalConfigurationService;
