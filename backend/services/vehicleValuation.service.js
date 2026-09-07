import db from '../db/index.js';

const round = (value) => Math.max(0, Math.round(Number(value || 0)));

function normalizeCondition(condition) {
  const value = String(condition || 'good').toLowerCase();
  if (['excellent', 'good', 'fair', 'poor'].includes(value)) return value;
  return 'good';
}

function conditionMultiplier(condition) {
  return { excellent: 1.08, good: 1, fair: 0.90, poor: 0.78 }[condition] || 1;
}

function calculateDepreciation(value, year) {
  const age = Math.max(0, new Date().getFullYear() - Number(year || new Date().getFullYear()));
  const annualRate = age <= 1 ? 0.18 : Math.min(0.12, 0.10 + (age * 0.005));
  return {
    depreciationRate: annualRate * 100,
    monthlyDepreciation: value * annualRate / 12,
    futureValue12m: value * (1 - annualRate),
    futureValue24m: value * Math.pow(1 - annualRate, 2),
  };
}

function buildValuation(vehicle, comparables) {
  const prices = comparables.map((row) => Number(row.price)).filter((price) => Number.isFinite(price) && price > 0);
  const base = prices.length
    ? prices.reduce((sum, price) => sum + price, 0) / prices.length
    : Number(vehicle.price || 0);
  const condition = normalizeCondition(vehicle.condition);
  const mileageValues = comparables.map((row) => Number(row.mileage)).filter((mileage) => Number.isFinite(mileage) && mileage >= 0);
  const avgMileage = mileageValues.length ? mileageValues.reduce((s, n) => s + n, 0) / mileageValues.length : null;
  const mileageDelta = avgMileage == null || vehicle.mileage == null ? 0 : ((Number(vehicle.mileage) - avgMileage) / 10000) * -0.02;
  const adjusted = base * (1 + mileageDelta) * conditionMultiplier(condition);
  const sorted = [...prices].sort((a, b) => a - b);
  const low = sorted.length ? sorted[0] : adjusted * 0.85;
  const high = sorted.length ? sorted[sorted.length - 1] : adjusted * 1.15;
  const confidenceScore = Math.min(100, 45 + Math.min(35, comparables.length * 3) + (prices.length >= 10 ? 10 : 0) + (mileageValues.length >= 5 ? 5 : 0));
  const confidenceLevel = confidenceScore >= 80 ? 'high' : confidenceScore >= 55 ? 'medium' : 'low';
  const depreciation = calculateDepreciation(adjusted, vehicle.year);

  return {
    lowPrice: round(low),
    avgPrice: round(adjusted),
    highPrice: round(high),
    currentValue: round(adjusted),
    wholesaleValue: round(adjusted * 0.85),
    dealerValue: round(adjusted * 0.92),
    privateSaleValue: round(adjusted * 1.05),
    auctionEstimate: round(adjusted * 0.78),
    confidenceLevel,
    confidenceScore,
    comparableCount: comparables.length,
    mileageAdjustment: mileageDelta * 100,
    conditionAdjustment: (conditionMultiplier(condition) - 1) * 100,
    depreciationRate: depreciation.depreciationRate,
    monthlyDepreciation: round(depreciation.monthlyDepreciation),
    futureValue12m: round(depreciation.futureValue12m),
    futureValue24m: round(depreciation.futureValue24m),
    calculationMethod: prices.length ? 'market_comparison' : 'vehicle_price_fallback',
    calculatedAt: new Date().toISOString(),
  };
}

export async function getVehicleValuation(vehicleId) {
  const vehicle = await db.findById('cars', vehicleId, 'id,brand,model,year,mileage,condition,price,city,status,approved,vin,registrationNumber');
  if (!vehicle) return null;

  const filters = {
    brand: vehicle.brand,
    model: vehicle.model,
    year: { $gte: Number(vehicle.year) - 3, $lte: Number(vehicle.year) + 1 },
    id: { $ne: vehicle.id },
    price: { $gt: 0 },
  };
  const comparables = await db.findAll('cars', {
    filters,
    select: 'id,brand,model,year,mileage,condition,price,city,status,approved,vin,registrationNumber',
    orderBy: 'createdAt',
    ascending: false,
    limit: 50,
  });

  const valuation = buildValuation(vehicle, comparables);
  const snapshot = await db.create('vehicle_valuations', {
    vehicle_id: vehicle.id,
    vin: vehicle.vin || null,
    registration_number: vehicle.registrationNumber || null,
    make: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    current_value: valuation.currentValue,
    wholesale_value: valuation.wholesaleValue,
    dealer_value: valuation.dealerValue,
    private_sale_value: valuation.privateSaleValue,
    auction_estimate: valuation.auctionEstimate,
    confidence_level: valuation.confidenceLevel,
    confidence_score: valuation.confidenceScore,
    confidence_factors: { comparableCount: valuation.comparableCount },
    comparable_count: valuation.comparableCount,
    mileage_adjustment: valuation.mileageAdjustment,
    condition_adjustment: valuation.conditionAdjustment,
    depreciation_rate: valuation.depreciationRate,
    monthly_depreciation: valuation.monthlyDepreciation,
    future_value_12m: valuation.futureValue12m,
    future_value_24m: valuation.futureValue24m,
    calculation_method: valuation.calculationMethod,
    model_version: '1.0',
    calculated_at: valuation.calculatedAt,
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  });

  return { vehicle: { id: vehicle.id, brand: vehicle.brand, model: vehicle.model, year: vehicle.year, price: vehicle.price }, ...valuation, snapshotId: snapshot.id };
}

export async function getValuationMatrix({ brand, model, city, limit = 20 } = {}) {
  const filters = { price: { $gt: 0 } };
  if (brand) filters.brand = brand;
  if (model) filters.model = model;
  if (city) filters.city = city;
  const rows = await db.findAll('cars', {
    filters,
    select: 'brand,model,year,price,city,createdAt',
    orderBy: 'createdAt',
    ascending: false,
    limit: Math.min(2000, Math.max(50, Number(limit) * 20)),
  });

  const groups = new Map();
  for (const row of rows) {
    const key = `${row.brand}::${row.model}::${row.year}`;
    const group = groups.get(key) || { make: row.brand, model: row.model, year: row.year, prices: [] };
    group.prices.push(Number(row.price));
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => {
    const prices = group.prices.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
    return {
      make: group.make,
      model: group.model,
      year: group.year,
      avgPrice: round(prices.reduce((s, n) => s + n, 0) / prices.length),
      minPrice: round(prices[0]),
      maxPrice: round(prices[prices.length - 1]),
      listingsCount: prices.length,
    };
  }).sort((a, b) => b.listingsCount - a.listingsCount).slice(0, Number(limit));
}
