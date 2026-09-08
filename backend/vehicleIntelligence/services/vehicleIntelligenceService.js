// ============================================================
// KAYAD VEHICLE INTELLIGENCE NETWORK
// INTELLIGENCE SERVICE
// ============================================================

import db from '../../db/index.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo, logError } from '../../utils/logger.js';

/**
 * Vehicle Intelligence Service
 * Generates actionable insights from verified ecosystem data
 */
class VehicleIntelligenceService {
  // ============================================================
  // VEHICLE VALUATION ENGINE
  // ============================================================

  /**
   * Calculate vehicle valuation
   */
  async calculateValuation(vehicleData) {
    const { vin, make, model, year, mileage, condition, region } = vehicleData;

    // Get comparable sales data
    const comparables = await this.getComparableSales(make, model, year, region);

    if (comparables.length === 0) {
      return this.generateFallbackValuation(make, model, year, mileage);
    }

    // Calculate base value from comparables
    const baseValue = this.calculateBaseValue(comparables);

    // Apply adjustments
    const adjustments = this.calculateAdjustments({
      mileage,
      condition,
      comparables,
      region
    });

    // Calculate confidence
    const confidence = this.calculateValuationConfidence(comparables, vehicleData);

    // Calculate depreciation
    const depreciation = this.calculateDepreciation(baseValue, year);

    // Generate all valuation types
    const valuations = {
      current_value: baseValue,
      wholesale_value: baseValue * 0.85,
      dealer_value: baseValue * 0.92,
      private_sale_value: baseValue * 1.05,
      auction_estimate: baseValue * 0.78,
      confidence_level: confidence.level,
      confidence_factors: confidence.factors,
      comparable_count: comparables.length,
      mileage_adjustment: adjustments.mileage,
      condition_adjustment: adjustments.condition,
      depreciation_rate: depreciation.rate,
      monthly_depreciation: depreciation.monthly,
      future_value_12m: depreciation.future12m,
      future_value_24m: depreciation.future24m,
      calculation_method: 'market_comparison',
      calculated_at: new Date(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    // Store valuation
    const result = await db.create('vehicle_valuations', {
      vin,
      make,
      model,
      year,
      ...valuations,
    });

    logInfo('Valuation calculated', { vin, currentValue: valuations.current_value });
    return result;
  }

  /**
   * Get comparable sales
   */
  async getComparableSales(make, model, year, region, limit = 50) {
    const yearRange = 3; // +/- 3 years
    const query = {
      make,
      model,
      year: { $gte: year - yearRange, $lte: year + yearRange },
      price_type: { $in: ['sale', 'listing'] },
    };
    if (region) query.region = region;

    const sales = await db.find('vehicle_price_history', query, {
      sort: { recorded_at: -1 },
      limit
    });

    return sales;
  }

  /**
   * Calculate base value from comparables
   */
  calculateBaseValue(comparables) {
    const prices = comparables.map(c => parseFloat(c.price));

    // Use weighted average (recent sales have more weight)
    const now = Date.now();
    let weightedSum = 0;
    let totalWeight = 0;

    comparables.forEach((sale, index) => {
      const daysOld = (now - new Date(sale.recorded_at).getTime()) / (1000 * 60 * 60 * 24);
      const weight = Math.max(0.3, 1 - (daysOld / 365)); // Min 30% weight, decay over year
      weightedSum += prices[index] * weight;
      totalWeight += weight;
    });

    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Calculate value adjustments
   */
  calculateAdjustments({ mileage, condition, comparables, region }) {
    const adjustments = { mileage: 0, condition: 0 };

    // Mileage adjustment (per 10,000km)
    if (mileage && comparables.length > 0) {
      const avgMileage = comparables.reduce((sum, c) => sum + (c.mileage || 0), 0) / comparables.length;
      const mileageDiff = mileage - avgMileage;
      adjustments.mileage = Math.round((mileageDiff / 10000) * -0.02 * 100); // -2% per 10k km difference
    }

    // Condition adjustment
    const conditionMultipliers = {
      excellent: 1.15,
      good: 1.0,
      fair: 0.9,
      poor: 0.75,
    };
    adjustments.condition = ((conditionMultipliers[condition] || 1) - 1) * 100;

    return adjustments;
  }

  /**
   * Calculate valuation confidence
   */
  calculateValuationConfidence(comparables, vehicleData) {
    const factors = {};
    let score = 50; // Base score

    // Data volume factor
    if (comparables.length >= 20) {
      score += 30;
      factors.dataVolume = 'high';
    } else if (comparables.length >= 10) {
      score += 20;
      factors.dataVolume = 'medium';
    } else if (comparables.length >= 5) {
      score += 10;
      factors.dataVolume = 'low';
    } else {
      factors.dataVolume = 'insufficient';
    }

    // Data recency factor
    const recentCount = comparables.filter(c => {
      const daysOld = (Date.now() - new Date(c.recorded_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysOld <= 30;
    }).length;

    if (recentCount >= 10) {
      score += 10;
      factors.dataRecency = 'excellent';
    } else if (recentCount >= 5) {
      score += 5;
      factors.dataRecency = 'good';
    } else {
      factors.dataRecency = 'outdated';
    }

    // Vehicle data completeness
    if (vehicleData.vin && vehicleData.mileage && vehicleData.condition) {
      score += 10;
      factors.dataCompleteness = 'complete';
    }

    return {
      level: score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low',
      score: Math.min(100, score),
      factors,
    };
  }

  /**
   * Calculate depreciation
   */
  calculateDepreciation(baseValue, year) {
    const age = new Date().getFullYear() - year;

    // Typical depreciation curve: steep first year, then gradual
    let accumulatedDepreciation = 0;
    const monthlyRate = 0.015 + (0.005 * Math.max(0, age - 1)); // Increases with age

    for (let i = 0; i < age; i++) {
      accumulatedDepreciation += (baseValue * (1 - accumulatedDepreciation)) * (i === 0 ? 0.20 : monthlyRate * 12);
    }

    const rate = Math.round((accumulatedDepreciation / baseValue) * 100);
    const currentValue = baseValue * (1 - accumulatedDepreciation / baseValue);
    const monthly = baseValue * monthlyRate * 0.01;

    return {
      rate,
      monthly: Math.round(monthly),
      accumulated: Math.round(accumulatedDepreciation),
      future12m: Math.round(currentValue * (1 - monthlyRate * 12)),
      future24m: Math.round(currentValue * (1 - monthlyRate * 24)),
    };
  }

  /**
   * Generate fallback valuation when no comparables exist
   */
  generateFallbackValuation(make, model, year, mileage) {
    // Use average pricing data for the make/model
    const avgPrice = this.getAveragePriceForMakeModel(make, model);
    const age = new Date().getFullYear() - year;
    const depreciatedValue = avgPrice * Math.pow(0.85, Math.min(age, 10));

    return {
      current_value: Math.round(depreciatedValue),
      wholesale_value: Math.round(depreciatedValue * 0.85),
      dealer_value: Math.round(depreciatedValue * 0.92),
      private_sale_value: Math.round(depreciatedValue * 1.05),
      auction_estimate: Math.round(depreciatedValue * 0.78),
      confidence_level: 'low',
      confidence_factors: { reason: 'No recent comparables available' },
      comparable_count: 0,
      calculation_method: 'market_estimate',
      calculated_at: new Date(),
    };
  }

  /**
   * Get average price for make/model (from historical data)
   */
  getAveragePriceForMakeModel(make, model) {
    // Default values - would be calculated from historical data
    const priceEstimates = {
      'Toyota': { 'Corolla': 2800000, 'Land Cruiser': 8500000, 'Hilux': 3500000 },
      'Mercedes-Benz': { 'C-Class': 4500000, 'E-Class': 6000000 },
    };

    return priceEstimates[make]?.[model] || 2000000; // Default 2M KES
  }

  // ============================================================
  // FRAUD DETECTION ENGINE
  // ============================================================

  /**
   * Detect suspicious patterns
   */
  async detectFraudPatterns(entityData) {
    const alerts = [];

    // Check mileage inconsistencies
    const mileageAlert = await this.checkMileageConsistency(entityData.vin, entityData.reportedMileage);
    if (mileageAlert) alerts.push(mileageAlert);

    // Check duplicate listings
    const duplicateAlert = await this.checkDuplicateListings(entityData);
    if (duplicateAlert) alerts.push(duplicateAlert);

    // Check VIN anomalies
    const vinAlert = await this.checkVinAnomalies(entityData.vin, entityData);
    if (vinAlert) alerts.push(vinAlert);

    // Check price manipulation
    const priceAlert = await this.checkPriceManipulation(entityData);
    if (priceAlert) alerts.push(priceAlert);

    // Store alerts
    for (const alert of alerts) {
      await this.createFraudAlert(alert);
    }

    return alerts;
  }

  /**
   * Check mileage consistency
   */
  async checkMileageConsistency(vin, currentMileage) {
    if (!vin) return null;

    // Get historical mileage records
    const inspections = await db.find('inspection_history', { vin });
    const services = await db.find('service_history', { vin });

    const records = [
      ...inspections.map(i => ({ date: i.inspection_date, mileage: i.mileage })),
      ...services.map(s => ({ date: s.service_date, mileage: s.mileage })),
    ].filter(r => r.mileage);

    if (records.length === 0) return null;

    // Sort by date
    records.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Check for decreases or abnormal increases
    const latestRecord = records[records.length - 1];
    const mileageDiff = currentMileage - (latestRecord.mileage || 0);
    const daysSince = (Date.now() - new Date(latestRecord.date).getTime()) / (1000 * 60 * 60 * 24);
    const expectedIncrease = daysSince * 50; // ~50km/day average

    if (mileageDiff < -1000) {
      return {
        alert_type: 'mileage_inconsistency',
        alert_severity: 'high',
        confidence_score: 85,
        title: 'Mileage Decrease Detected',
        description: `Odometer shows ${Math.abs(mileageDiff).toLocaleString()} km less than last recorded ${Math.round(daysSince)} days ago. Expected ~${Math.round(expectedIncrease).toLocaleString()} km increase.`,
        related_vin: vin,
        evidence: {
          previous_mileage: latestRecord.mileage,
          current_mileage: currentMileage,
          previous_date: latestRecord.date,
          discrepancy: mileageDiff,
        },
      };
    }

    if (mileageDiff > expectedIncrease * 3 && daysSince < 30) {
      return {
        alert_type: 'mileage_inconsistency',
        alert_severity: 'medium',
        confidence_score: 70,
        title: 'Abnormal Mileage Increase',
        description: `${mileageDiff.toLocaleString()} km increase in ${Math.round(daysSince)} days (avg ${Math.round(mileageDiff/daysSince)} km/day). Expected max ~${Math.round(expectedIncrease * 1.5).toLocaleString()} km.`,
        related_vin: vin,
        evidence: {
          previous_mileage: latestRecord.mileage,
          current_mileage: currentMileage,
          previous_date: latestRecord.date,
          daily_average: Math.round(mileageDiff/daysSince),
        },
      };
    }

    return null;
  }

  /**
   * Check for duplicate listings
   */
  async checkDuplicateListings(entityData) {
    const { vin, registration_number, listing_id } = entityData;

    const query = { $or: [] };
    if (vin) query.$or.push({ vin, listing_id: { $ne: listing_id } });
    if (registration_number) query.$or.push({ registration_number, listing_id: { $ne: listing_id } });

    if (query.$or.length === 0) return null;

    const duplicates = await db.find('marketplace_history', query);

    if (duplicates.length > 0) {
      return {
        alert_type: 'duplicate_listing',
        alert_severity: duplicates.length > 2 ? 'high' : 'medium',
        confidence_score: 90,
        title: 'Duplicate Vehicle Listing',
        description: `Vehicle appears to be listed ${duplicates.length + 1} times on marketplace.`,
        related_vin: vin,
        related_listing_id: listing_id,
        evidence: {
          duplicate_ids: duplicates.map(d => d.id),
          listings_found: duplicates.length + 1,
        },
      };
    }

    return null;
  }

  /**
   * Check VIN validation
   */
  async checkVinAnomalies(vin, entityData) {
    if (!vin || vin.length !== 17) return null;

    // Check VIN structure (basic validation)
    const invalidChars = vin.replace(/[A-HJ-NPR-Z0-9]/gi, '');
    if (invalidChars.length > 0) {
      return {
        alert_type: 'vin_anomaly',
        alert_severity: 'high',
        confidence_score: 95,
        title: 'Invalid VIN Format',
        description: 'VIN contains invalid characters.',
        related_vin: vin,
        evidence: { invalid_characters: invalidChars.split('') },
      };
    }

    // Check if VIN matches vehicle characteristics
    const yearCode = vin.charAt(9);
    const expectedYear = this.decodeVinYear(yearCode);
    if (expectedYear && entityData.year && Math.abs(expectedYear - entityData.year) > 1) {
      return {
        alert_type: 'vin_anomaly',
        alert_severity: 'medium',
        confidence_score: 75,
        title: 'VIN/Year Mismatch',
        description: `VIN year code suggests ${expectedYear}, but declared as ${entityData.year}.`,
        related_vin: vin,
        evidence: { vin_year_code: yearCode, expected_year: expectedYear, declared_year: entityData.year },
      };
    }

    return null;
  }

  /**
   * Decode VIN year code (position 9)
   */
  decodeVinYear(yearCode) {
    const yearMap = {
      'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014,
      'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019,
      'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024,
      'S': 2025, 'T': 2026, 'V': 2027, 'W': 2028, 'X': 2029,
      'Y': 2030,
    };
    return yearMap[yearCode.toUpperCase()] || null;
  }

  /**
   * Check for price manipulation
   */
  async checkPriceManipulation(entityData) {
    const { vin, make, model, year, price } = entityData;
    if (!price) return null;

    // Get market average
    const comparables = await this.getComparableSales(make, model, year, null, 20);
    if (comparables.length < 3) return null;

    const avgPrice = comparables.reduce((sum, c) => sum + parseFloat(c.price), 0) / comparables.length;
    const priceDiff = ((price - avgPrice) / avgPrice) * 100;

    if (priceDiff > 100) {
      return {
        alert_type: 'price_manipulation',
        alert_severity: 'low',
        confidence_score: 60,
        title: 'Suspiciously High Price',
        description: `Listed at ${Math.round(priceDiff)}% above market average (KES ${price.toLocaleString()} vs avg KES ${Math.round(avgPrice).toLocaleString()}).`,
        related_vin: vin,
        evidence: { listed_price: price, market_average: avgPrice, difference_pct: Math.round(priceDiff) },
      };
    }

    if (priceDiff < -50) {
      return {
        alert_type: 'price_manipulation',
        alert_severity: 'medium',
        confidence_score: 75,
        title: 'Suspiciously Low Price',
        description: `Listed at ${Math.abs(Math.round(priceDiff))}% below market average. May indicate issues or manipulation.`,
        related_vin: vin,
        evidence: { listed_price: price, market_average: avgPrice, difference_pct: Math.round(priceDiff) },
      };
    }

    return null;
  }

  /**
   * Create fraud alert
   */
  async createFraudAlert(alertData) {
    return db.create('fraud_alerts', {
      ...alertData,
      status: 'open',
      created_by: 'system',
      detection_method: 'pattern_analysis',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Get fraud alerts
   */
  async getFraudAlerts(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.severity) query.alert_severity = filters.severity;
    if (filters.vin) query.related_vin = filters.vin;

    return db.find('fraud_alerts', query, { sort: { created_at: -1 } });
  }

  // ============================================================
  // MARKET ANALYTICS
  // ============================================================

  /**
   * Get market overview
   */
  async getMarketOverview(region = 'national') {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get recent price data
    const recentSales = await db.find('vehicle_price_history', {
      recorded_at: { $gte: thirtyDaysAgo },
      ...(region !== 'national' && { region }),
    });

    // Get trends
    const [currentMonth, lastMonth] = await Promise.all([
      this.getMonthlyStats(now.getMonth() + 1, now.getFullYear(), region),
      this.getMonthlyStats(now.getMonth(), now.getFullYear(), region),
    ]);

    // Calculate change
    const priceChange = lastMonth.avgPrice > 0
      ? ((currentMonth.avgPrice - lastMonth.avgPrice) / lastMonth.avgPrice) * 100
      : 0;

    return {
      activeListings: currentMonth.listings,
      avgListingPrice: currentMonth.avgPrice,
      totalSales: currentMonth.sales,
      avgSalePrice: currentMonth.avgSalePrice,
      priceChange30d: Math.round(priceChange * 10) / 10,
      avgDaysOnMarket: currentMonth.avgDaysOnMarket,
      topMakes: await this.getTopMakes(region),
      topModels: await this.getTopModels(region),
      demandIndex: this.calculateDemandIndex(currentMonth),
      supplyIndex: this.calculateSupplyIndex(currentMonth),
      marketBalance: this.calculateMarketBalance(currentMonth),
    };
  }

  /**
   * Get monthly statistics
   */
  async getMonthlyStats(month, year, region) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const sales = await db.find('vehicle_price_history', {
      recorded_at: { $gte: startDate, $lte: endDate },
      price_type: 'sale',
      ...(region !== 'national' && { region }),
    });

    const listings = await db.find('vehicle_price_history', {
      recorded_at: { $gte: startDate, $lte: endDate },
      price_type: 'listing',
      ...(region !== 'national' && { region }),
    });

    const prices = sales.map(s => parseFloat(s.price));

    return {
      sales: sales.length,
      listings: listings.length,
      avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      avgSalePrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      medianPrice: prices.length > 0 ? this.median(prices) : 0,
      avgDaysOnMarket: 45, // Would calculate from listing duration data
    };
  }

  /**
   * Get top makes
   */
  async getTopMakes(region, limit = 5) {
    // Aggregate by make
    const allData = await db.find('vehicle_price_history', {
      recorded_at: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });

    const makeCounts = {};
    allData.forEach(d => {
      makeCounts[d.make] = (makeCounts[d.make] || 0) + 1;
    });

    return Object.entries(makeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([make, count]) => ({ make, count }));
  }

  /**
   * Get top models
   */
  async getTopModels(region, limit = 5) {
    const allData = await db.find('vehicle_price_history', {
      recorded_at: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });

    const modelCounts = {};
    allData.forEach(d => {
      const key = `${d.make} ${d.model}`;
      modelCounts[key] = (modelCounts[key] || 0) + 1;
    });

    return Object.entries(modelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([model, count]) => ({ model, count }));
  }

  /**
   * Calculate demand index (0-100)
   */
  calculateDemandIndex(stats) {
    // Simple placeholder - would use more sophisticated calculation
    const viewsPerListing = (stats.listings || 0) > 0 ? (stats.sales || 0) / stats.listings : 0;
    return Math.min(100, Math.round(viewsPerListing * 100));
  }

  /**
   * Calculate supply index
   */
  calculateSupplyIndex(stats) {
    // More listings = higher supply = lower index
    const normalizedSupply = Math.min(100, (stats.listings || 0) / 10);
    return Math.round(normalizedSupply);
  }

  /**
   * Calculate market balance
   */
  calculateMarketBalance(stats) {
    const demand = this.calculateDemandIndex(stats);
    const supply = this.calculateSupplyIndex(stats);

    if (supply < 50 && demand > 50) return 'seller_market';
    if (supply > 70 && demand < 30) return 'buyer_market';
    return 'balanced';
  }

  /**
   * Calculate median
   */
  median(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // ============================================================
  // VEHICLE HEALTH ANALYTICS
  // ============================================================

  /**
   * Get vehicle reliability report
   */
  async getVehicleReliabilityReport(make, model, yearFrom, yearTo) {
    const inspections = await db.find('inspection_history', {
      make,
      model,
      year: { $gte: yearFrom || 2015, $lte: yearTo || 2024 },
    });

    if (inspections.length === 0) {
      return {
        available: false,
        message: 'Insufficient data for reliability analysis',
      };
    }

    // Calculate failure rates
    const criticalFailures = inspections.filter(i => i.critical_defects > 0).length;
    const majorFailures = inspections.filter(i => i.major_defects > 0).length;
    const avgScore = inspections.reduce((sum, i) => sum + (i.overall_score || 0), 0) / inspections.length;

    // Group common issues by category
    const issues = {
      engine: inspections.filter(i => i.mechanical_score < 70).length,
      transmission: inspections.filter(i => i.transmission_score < 70).length,
      suspension: inspections.filter(i => i.suspension_score < 70).length,
      electrical: inspections.filter(i => i.electrical_score < 70).length,
      body: inspections.filter(i => i.body_score < 70).length,
    };

    const reliabilityScore = Math.max(0, 100 - (criticalFailures / inspections.length) * 100 - (majorFailures / inspections.length) * 50);

    return {
      available: true,
      totalInspections: inspections.length,
      reliabilityScore: Math.round(reliabilityScore),
      failureRate: Math.round((criticalFailures / inspections.length) * 100),
      avgConditionScore: Math.round(avgScore),
      issueBreakdown: {
        engineIssues: issues.engine,
        transmissionIssues: issues.transmission,
        suspensionIssues: issues.suspension,
        electricalIssues: issues.electrical,
        bodyIssues: issues.body,
      },
      recommendation: this.generateReliabilityRecommendation(reliabilityScore),
      calculatedAt: new Date(),
    };
  }

  /**
   * Generate reliability recommendation
   */
  generateReliabilityRecommendation(score) {
    if (score >= 85) return { level: 'excellent', text: 'Highly reliable vehicle with low defect rates' };
    if (score >= 70) return { level: 'good', text: 'Reliable vehicle with occasional minor issues' };
    if (score >= 50) return { level: 'moderate', text: 'Average reliability. Budget for potential repairs' };
    return { level: 'concerning', text: 'Higher than average defect rate. Thorough inspection recommended' };
  }

  // ============================================================
  // DEALER ANALYTICS
  // ============================================================

  /**
   * Get dealer performance metrics
   */
  async getDealerAnalytics(dealerId, periodType = 'monthly') {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [listings, sales, reviews] = await Promise.all([
      db.find('marketplace_history', { dealer_id: dealerId, listing_date: { $gte: periodStart } }),
      db.find('marketplace_history', { dealer_id: dealerId, sold_date: { $gte: periodStart } }),
      db.find('dealer_reviews', { dealer_id: dealerId }),
    ]);

    const analytics = {
      activeListings: listings.filter(l => !l.removed).length,
      newListings: listings.length,
      salesCount: sales.length,
      sellThroughRate: listings.length > 0 ? Math.round((sales.length / listings.length) * 100) : 0,
      avgDaysToSell: this.calculateAvgDaysToSell(sales),
      avgPriceVsMarket: await this.calculatePriceVsMarket(dealerId),
      customerRating: reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0,
      totalReviews: reviews.length,
      inquiryRate: this.calculateInquiryRate(listings),
    };

    return analytics;
  }

  /**
   * Calculate average days to sell
   */
  calculateAvgDaysToSell(sales) {
    if (sales.length === 0) return 0;
    const totalDays = sales.reduce((sum, s) => {
      const listed = new Date(s.listing_date);
      const sold = new Date(s.sold_date);
      return sum + Math.max(0, (sold - listed) / (1000 * 60 * 60 * 24));
    }, 0);
    return Math.round(totalDays / sales.length);
  }

  /**
   * Calculate price vs market
   */
  async calculatePriceVsMarket(dealerId) {
    // Would compare dealer's average prices to market averages
    return 0; // Placeholder
  }

  /**
   * Calculate inquiry rate
   */
  calculateInquiryRate(listings) {
    if (listings.length === 0) return 0;
    const totalViews = listings.reduce((sum, l) => sum + (l.view_count || 0), 0);
    return Math.round((totalViews / listings.length) * 10) / 10;
  }
}

export const vehicleIntelligenceService = new VehicleIntelligenceService();
export default vehicleIntelligenceService;
