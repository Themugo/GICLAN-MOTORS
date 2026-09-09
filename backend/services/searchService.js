import db from '../db/index.js';
import { cacheGet, cacheSet } from '../utils/cache.js';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const MAX_AUTOCOMPLETE = 8;
const levenshtein = (a, b) => {
  const aa = String(a).toLowerCase();
  const bb = String(b).toLowerCase();
  const row = Array.from({ length: bb.length + 1 }, (_, i) => i);
  for (let i = 1; i <= aa.length; i++) {
    let prev = row[0]; row[0] = i;
    for (let j = 1; j <= bb.length; j++) {
      const next = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (aa[i - 1] === bb[j - 1] ? 0 : 1));
      prev = next;
    }
  }
  return row[bb.length];
};

const clean = (value) => typeof value === 'string' ? value.trim() : value;
const arrayValue = (value) => Array.isArray(value) ? value : String(value || '').split(',').map(v => v.trim()).filter(Boolean);

const buildFilters = (params = {}) => {
  const filters = { status: 'available' };
  const keyword = clean(params.keyword || params.q);
  if (keyword) {
    const safe = keyword.replace(/[%_]/g, '').slice(0, 80);
    filters.$or = [
      { title: { $ilike: `%${safe}%` } },
      { brand: { $ilike: `%${safe}%` } },
      { model: { $ilike: `%${safe}%` } },
      { description: { $ilike: `%${safe}%` } },
      { vin: { $ilike: `%${safe}%` } },
      { chassisNumber: { $ilike: `%${safe}%` } },
      { registrationNumber: { $ilike: `%${safe}%` } },
      { engine: { $ilike: `%${safe}%` } },
      { driveType: { $ilike: `%${safe}%` } },
      { bodyType: { $ilike: `%${safe}%` } },
      { fuel: { $ilike: `%${safe}%` } },
      { transmission: { $ilike: `%${safe}%` } },
      { color: { $ilike: `%${safe}%` } },
      { condition: { $ilike: `%${safe}%` } },
      { locationCity: { $ilike: `%${safe}%` } },
    ];
  }
  const inFilter = (key, value) => {
    const values = arrayValue(value);
    if (values.length) filters[key] = { $in: values };
  };
  inFilter('brand', params.brand);
  inFilter('model', params.model);
  inFilter('bodyType', params.bodyType || params.body);
  inFilter('fuel', params.fuelType || params.fuel);
  inFilter('transmission', params.transmission);
  inFilter('condition', params.condition);
  if (params.city) filters.city = clean(params.city);
  if (params.dealerId) filters.dealer = params.dealerId;
  if (params.yearMin || params.yearMax) filters.year = { ...(params.yearMin ? { $gte: Number(params.yearMin) } : {}), ...(params.yearMax ? { $lte: Number(params.yearMax) } : {}) };
  if (params.minPrice || params.maxPrice) filters.price = { ...(params.minPrice ? { $gte: Number(params.minPrice) } : {}), ...(params.maxPrice ? { $lte: Number(params.maxPrice) } : {}) };
  if (params.mileageMax) filters.mileage = { $lte: Number(params.mileageMax) };
  return filters;
};

const sortMap = {
  price_asc: { field: 'price', ascending: true }, price_desc: { field: 'price', ascending: false },
  year_asc: { field: 'year', ascending: true }, year_desc: { field: 'year', ascending: false },
  mileage_asc: { field: 'mileage', ascending: true }, newest: { field: 'createdAt', ascending: false },
};

export async function searchVehicles(params = {}) {
  const page = Math.max(Number(params.page) || 1, 1);
  const limit = Math.min(Math.max(Number(params.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = (page - 1) * limit;
  const filters = buildFilters(params);
  const sort = sortMap[params.sort] || { field: 'createdAt', ascending: false };
  const result = await db.findAll('cars', { filters, orderBy: sort.field, ascending: sort.ascending, limit, offset, count: true });
  const total = result.count || 0;
  return { data: result.data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: offset + result.data.length < total } };
}

export async function getSearchSuggestions(query, limit = MAX_AUTOCOMPLETE) {
  const q = clean(query);
  if (!q || q.length < 2) return [];
  const normalized = q.toLowerCase();
  const cacheKey = `kayad:search:suggestions:v2:${normalized}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const [identities, cars] = await Promise.all([
    db.findAll('vehicle_identities', {
      filters: { $or: [
        { brand: { $ilike: `%${q.replace(/[%_]/g, '')}%` } },
        { model: { $ilike: `%${q.replace(/[%_]/g, '')}%` } },
      ] },
      select: 'brand,model,listingCount,lastSeenAt',
      orderBy: 'listingCount', ascending: false, limit: 100,
    }),
    db.findAll('cars', {
      filters: { status: 'available', $or: [
        { title: { $ilike: `%${q.replace(/[%_]/g, '')}%` } },
        { brand: { $ilike: `%${q.replace(/[%_]/g, '')}%` } },
        { model: { $ilike: `%${q.replace(/[%_]/g, '')}%` } },
        { locationCity: { $ilike: `%${q.replace(/[%_]/g, '')}%` } },
        { bodyType: { $ilike: `%${q.replace(/[%_]/g, '')}%` } },
      ] },
      select: 'brand,model,locationCity,bodyType', limit: 100,
    }),
  ]);

  const candidates = new Map();
  const add = (type, text, popularity = 0) => {
    const value = String(text || '').trim();
    if (!value) return;
    const key = `${type}:${value.toLowerCase()}`;
    const lower = value.toLowerCase();
    const prefix = lower.startsWith(normalized) ? 100 : lower.includes(normalized) ? 75 : 0;
    const distance = levenshtein(normalized, lower.slice(0, Math.min(lower.length, normalized.length + 3)));
    const typo = distance <= Math.max(1, Math.floor(normalized.length / 4)) ? 50 - distance * 8 : 0;
    if (prefix || typo) candidates.set(key, { type, text: value, score: Math.max(prefix, typo) + Math.min(Number(popularity) || 0, 20) });
  };

  for (const row of identities) {
    add('make', row.brand, row.listingCount);
    if (row.model) add('model', row.model, row.listingCount);
    if (row.brand && row.model) add('vehicle', `${row.brand} ${row.model}`, row.listingCount);
  }
  for (const row of cars) {
    add('make', row.brand); add('model', row.model); add('vehicle', [row.brand, row.model].filter(Boolean).join(' '));
    add('city', row.locationCity); add('bodyType', row.bodyType);
  }

  const suggestions = [...candidates.values()]
    .sort((a, b) => b.score - a.score || a.text.localeCompare(b.text))
    .slice(0, limit)
    .map(({ type, text }) => ({ type, text }));
  await cacheSet(cacheKey, suggestions, 300);
  return suggestions;
}
