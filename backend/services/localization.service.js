import db from '../db/index.js';
import { AppError } from '../utils/AppError.js';

const normalizeLocale = (locale) => {
  const value = String(locale || '').trim().replace('_', '-');
  if (!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(value)) throw new AppError('Invalid locale', 400);
  return value;
};

class LocalizationService {
  async getTranslations(locale = 'en', namespace = 'common') {
    const normalizedLocale = normalizeLocale(locale);
    const rows = await db.findAll('localization_strings', {
      filters: { locale: normalizedLocale, namespace },
      orderBy: 'stringKey',
      ascending: true,
    });
    return Object.fromEntries(rows.map((row) => [row.stringKey, row.translation]));
  }

  async getAllNamespaces(locale = 'en') {
    const normalizedLocale = normalizeLocale(locale);
    const rows = await db.findAll('localization_strings', { filters: { locale: normalizedLocale }, select: 'namespace' });
    return [...new Set(rows.map((row) => row.namespace).filter(Boolean))].sort();
  }

  async getAllTranslations(locale = 'en') {
    const normalizedLocale = normalizeLocale(locale);
    const rows = await db.findAll('localization_strings', { filters: { locale: normalizedLocale }, orderBy: 'stringKey', ascending: true });
    return rows.reduce((groups, row) => {
      const namespace = row.namespace || 'common';
      groups[namespace] ||= {};
      groups[namespace][row.stringKey] = row.translation;
      return groups;
    }, {});
  }

  async search({ q, locale, namespace, page = 1, limit = 50 }) {
    if (!q?.trim()) throw new AppError('Search query is required', 400);
    const filters = { $or: [{ stringKey: { $ilike: `%${q.trim()}%` } }, { translation: { $ilike: `%${q.trim()}%` } }] };
    if (locale) filters.locale = normalizeLocale(locale);
    if (namespace) filters.namespace = namespace;
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const safePage = Math.max(1, Number(page) || 1);
    const result = await db.findAll('localization_strings', { filters, limit: safeLimit, offset: (safePage - 1) * safeLimit, count: true, orderBy: 'stringKey', ascending: true });
    return { data: result.data, total: result.count, page: safePage, limit: safeLimit };
  }

  async upsertTranslation({ key, namespace = 'common', locale, value, description, context }) {
    if (!key?.trim() || !value?.trim()) throw new AppError('Key and value are required', 400);
    const normalizedLocale = normalizeLocale(locale);
    const existing = await db.findOne('localization_strings', { stringKey: key.trim(), namespace, locale: normalizedLocale });
    const payload = { stringKey: key.trim(), namespace, locale: normalizedLocale, translation: value, description: description || null, context: context || null, updatedAt: new Date().toISOString() };
    return existing ? db.update('localization_strings', existing.id, payload) : db.create('localization_strings', { ...payload, isVerified: false, createdAt: new Date().toISOString() });
  }

  async update(id, input) {
    const existing = await db.findById('localization_strings', id);
    if (!existing) throw new AppError('Translation not found', 404);
    const payload = { updatedAt: new Date().toISOString() };
    if (input.value !== undefined) payload.translation = String(input.value);
    if (input.description !== undefined) payload.description = input.description;
    if (input.context !== undefined) payload.context = input.context;
    if (input.isVerified !== undefined) payload.isVerified = Boolean(input.isVerified);
    return db.update('localization_strings', id, payload);
  }

  async remove(id) {
    const existing = await db.findById('localization_strings', id);
    if (!existing) throw new AppError('Translation not found', 404);
    await db.remove('localization_strings', id);
    return existing;
  }

  async getKeyInAllLocales(key, namespace = 'common') {
    const rows = await db.findAll('localization_strings', { filters: { stringKey: key, namespace, isVerified: true }, orderBy: 'locale', ascending: true });
    return Object.fromEntries(rows.map((row) => [row.locale, { value: row.translation, context: row.context, description: row.description }]));
  }

  async getStats() {
    const rows = await db.findAll('localization_strings', { select: 'locale,namespace,isVerified' });
    const grouped = {};
    for (const row of rows) {
      grouped[row.locale] ||= { locale: row.locale, total: 0, verified: 0, namespaces: {} };
      grouped[row.locale].total += 1;
      if (row.isVerified) grouped[row.locale].verified += 1;
      const ns = row.namespace || 'common';
      grouped[row.locale].namespaces[ns] = (grouped[row.locale].namespaces[ns] || 0) + 1;
    }
    return Object.values(grouped);
  }
}

export const localizationService = new LocalizationService();
export default localizationService;
