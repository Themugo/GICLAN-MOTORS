import { findAll, findById } from '../../db/index.js';

const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(n)));

const normalize = (value) => String(value || '').trim().toLowerCase();

const safeNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * Explainable KAYAD decision-support engine.
 *
 * This is intentionally not presented as a trained ML model. It scores live
 * marketplace records using explicit, auditable rules and returns the data
 * signals behind every recommendation.
 */
class AIDecisionService {
  async recommendVehiclesForUser(userId, limit = 10) {
    const user = await findById('users', userId, 'id,name');
    if (!user) return null;

    const [events, favorites, inventory] = await Promise.all([
      findAll('events', { filters: { user: userId }, orderBy: 'createdAt', ascending: false, limit: 100, select: 'eventType,targetId,data,createdAt' }),
      findAll('favorites', { filters: { user: userId }, limit: 100, select: 'carId' }).catch(() => []),
      findAll('cars', { filters: { status: 'available' }, orderBy: 'createdAt', ascending: false, limit: 100 }),
    ]);

    const viewed = new Set(events.filter(e => e.eventType === 'car_viewed').map(e => String(e.targetId)).filter(Boolean));
    const saved = new Set([
      ...events.filter(e => e.eventType === 'car_favorited').map(e => String(e.targetId)),
      ...favorites.map(e => String(e.carId)).filter(Boolean),
    ]);

    const searches = events.filter(e => e.eventType === 'search_performed').slice(0, 30);
    const preferences = this.extractSearchPreferences(searches);

    const scored = inventory.map(car => this.scoreVehicle(car, { viewed, saved, preferences }));
    scored.sort((a, b) => b.score - a.score);

    return {
      userId,
      generatedAt: new Date().toISOString(),
      engine: 'kayad-explainable-recommender-v1',
      methodology: 'Live marketplace inventory + user activity + explicit rule scoring',
      recommendations: scored.slice(0, Math.max(1, Math.min(20, limit))),
      signals: {
        viewedVehicleCount: viewed.size,
        savedVehicleCount: saved.size,
        searchCount: searches.length,
        preferenceCoverage: preferences.coverage,
      },
    };
  }

  async explainVehicle(vehicleId, userId = null) {
    const vehicle = await findById('cars', vehicleId);
    if (!vehicle) return null;

    let context = { viewed: new Set(), saved: new Set(), preferences: this.emptyPreferences() };
    if (userId) {
      const events = await findAll('events', { filters: { user: userId }, orderBy: 'createdAt', ascending: false, limit: 100, select: 'eventType,targetId,data,createdAt' });
      context = {
        viewed: new Set(events.filter(e => e.eventType === 'car_viewed').map(e => String(e.targetId)).filter(Boolean)),
        saved: new Set(events.filter(e => e.eventType === 'car_favorited').map(e => String(e.targetId)).filter(Boolean)),
        preferences: this.extractSearchPreferences(events.filter(e => e.eventType === 'search_performed').slice(0, 30)),
      };
    }

    return this.scoreVehicle(vehicle, context, true);
  }

  async marketSignals({ make, city, minYear, maxYear } = {}) {
    const filters = { status: 'available' };
    if (make) filters.make = make;
    if (city) filters.city = city;
    if (minYear != null) filters.year = { ...(filters.year || {}), $gte: Number(minYear) };
    if (maxYear != null) filters.year = { ...(filters.year || {}), $lte: Number(maxYear) };

    const cars = await findAll('cars', { filters, limit: 200 });
    const prices = cars.map(c => safeNumber(c.price)).filter(n => n != null && n > 0).sort((a, b) => a - b);
    const median = prices.length ? prices[Math.floor(prices.length / 2)] : null;
    const average = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;

    const byMake = {};
    for (const car of cars) {
      const key = car.make || 'Unknown';
      byMake[key] = (byMake[key] || 0) + 1;
    }

    return {
      generatedAt: new Date().toISOString(),
      engine: 'kayad-market-signals-v1',
      sampleSize: cars.length,
      pricing: { average: average ? Math.round(average) : null, median },
      inventoryByMake: Object.entries(byMake).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, count]) => ({ name, count })),
      limitations: cars.length < 10 ? ['Small live-inventory sample; confidence is reduced.'] : [],
    };
  }

  extractSearchPreferences(events) {
    const p = this.emptyPreferences();
    for (const event of events) {
      const data = typeof event.data === 'string' ? (() => { try { return JSON.parse(event.data); } catch { return {}; } })() : (event.data || {});
      if (data.make) p.makes.add(normalize(data.make));
      if (data.model) p.models.add(normalize(data.model));
      if (data.city || data.location) p.cities.add(normalize(data.city || data.location));
      if (safeNumber(data.minPrice) != null) p.minPrice = Math.max(p.minPrice || 0, Number(data.minPrice));
      if (safeNumber(data.maxPrice) != null) p.maxPrice = Math.min(p.maxPrice || Infinity, Number(data.maxPrice));
      if (safeNumber(data.year) != null) p.minYear = Math.max(p.minYear || 0, Number(data.year));
    }
    const total = p.makes.size + p.models.size + p.cities.size + (p.minPrice ? 1 : 0) + (Number.isFinite(p.maxPrice) ? 1 : 0) + (p.minYear ? 1 : 0);
    p.coverage = clamp(total * 15);
    return p;
  }

  emptyPreferences() {
    return { makes: new Set(), models: new Set(), cities: new Set(), minPrice: 0, maxPrice: Infinity, minYear: 0, coverage: 0 };
  }

  scoreVehicle(car, context, detailed = false) {
    const make = normalize(car.make);
    const model = normalize(car.model);
    const city = normalize(car.city);
    const price = safeNumber(car.price);
    const year = safeNumber(car.year);
    const mileage = safeNumber(car.mileage);
    let score = 45;
    const factors = [];

    if (context.saved.has(String(car.id))) { score += 30; factors.push({ signal: 'saved', weight: 30, reason: 'You previously saved this vehicle.' }); }
    else if (context.viewed.has(String(car.id))) { score += 18; factors.push({ signal: 'viewed', weight: 18, reason: 'You previously viewed this vehicle.' }); }
    if (context.preferences.makes.has(make)) { score += 15; factors.push({ signal: 'make_match', weight: 15, reason: `Matches your interest in ${car.make}.` }); }
    if (context.preferences.models.has(model)) { score += 18; factors.push({ signal: 'model_match', weight: 18, reason: `Matches your interest in ${car.model}.` }); }
    if (context.preferences.cities.has(city)) { score += 8; factors.push({ signal: 'city_match', weight: 8, reason: `Matches your searched location ${car.city}.` }); }
    if (price != null && price >= context.preferences.minPrice && price <= context.preferences.maxPrice) { score += 10; factors.push({ signal: 'price_match', weight: 10, reason: 'Fits the observed search price range.' }); }
    if (year != null && context.preferences.minYear && year >= context.preferences.minYear) { score += 8; factors.push({ signal: 'year_match', weight: 8, reason: 'Meets the minimum year seen in your searches.' }); }
    if (year != null) score += year >= 2020 ? 5 : year >= 2017 ? 2 : 0;
    if (mileage != null && mileage <= 100000) score += 4;

    const confidence = clamp(50 + context.preferences.coverage * 0.4 + (factors.length * 5) - (context.preferences.coverage < 15 ? 15 : 0));
    const result = {
      vehicle: { id: car.id, make: car.make, model: car.model, year: car.year, price: car.price, city: car.city, mileage: car.mileage },
      score: clamp(score),
      confidence,
      reason: factors[0]?.reason || 'Selected from current available inventory using transparent marketplace signals.',
      factors,
    };
    return detailed ? { ...result, methodology: 'Deterministic weighted rules; no autonomous purchasing or financial decision is made.' } : result;
  }
}

export const aiDecisionService = new AIDecisionService();
export default aiDecisionService;
