// backend/services/listingQualityService.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Listing Quality service
// Calculates and manages listing quality scores
// ─────────────────────────────────────────────────────────────

import { logInfo, logError, logWarn } from "../utils/logger.js";
import { findAll, aggregate } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";

// =============================
// 📊 CALCULATE LISTING QUALITY
// =============================

export const calculateListingQuality = async (carId) => {
  try {
    const quality = await ListingQuality.calculateForCar(carId);
    logInfo("Listing quality calculated", { carId, score: quality.overallScore });
    return quality;
  } catch (err) {
    logError("Failed to calculate listing quality", err);
    throw err;
  }
};

// =============================
// 🔄 RECALCULATE LISTING QUALITY
// =============================

export const recalculateListingQuality = async (carId) => {
  try {
    const quality = await ListingQuality.calculateForCar(carId);
    logInfo("Listing quality recalculated", { carId, score: quality.overallScore });
    return quality;
  } catch (err) {
    logError("Failed to recalculate listing quality", err);
    throw err;
  }
};

// =============================
// 🔍 GET LISTING QUALITY
// =============================

export const getListingQuality = async (carId) => {
  try {
    const quality = await ListingQuality.getByCar(carId);
    if (!quality) {
      // If no quality record exists, calculate it
      return await calculateListingQuality(carId);
    }
    return quality;
  } catch (err) {
    logError("Failed to get listing quality", err);
    throw err;
  }
};

// =============================
// 📊 GET DEALER QUALITY STATS
// =============================

export const getDealerQualityStats = async (dealerId) => {
  try {
    const qualities = await ListingQuality.getByDealer(dealerId);

    if (qualities.length === 0) {
      return {
        dealerId,
        totalListings: 0,
        averageScore: 0,
        ratingDistribution: {},
        recommendations: [],
      };
    }

    const totalListings = qualities.length;
    const averageScore = qualities.reduce((sum, q) => sum + q.overallScore, 0) / totalListings;

    const ratingDistribution = {
      Excellent: qualities.filter((q) => q.rating === "Excellent").length,
      Good: qualities.filter((q) => q.rating === "Good").length,
      Average: qualities.filter((q) => q.rating === "Average").length,
      Poor: qualities.filter((q) => q.rating === "Poor").length,
    };

    // Aggregate recommendations
    const allRecommendations = qualities.flatMap((q) => q.recommendations);
    const recommendationCounts = {};

    allRecommendations.forEach((rec) => {
      const key = `${rec.category}-${rec.message}`;
      if (!recommendationCounts[key]) {
        recommendationCounts[key] = {
          category: rec.category,
          message: rec.message,
          action: rec.action,
          count: 0,
          priority: rec.priority,
        };
      }
      recommendationCounts[key].count++;
    });

    const topRecommendations = Object.values(recommendationCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      dealerId,
      totalListings,
      averageScore: Math.round(averageScore),
      ratingDistribution,
      topRecommendations,
    };
  } catch (err) {
    logError("Failed to get dealer quality stats", err);
    throw err;
  }
};

// =============================
// 📊 GET PLATFORM QUALITY STATS
// =============================

export const getPlatformQualityStats = async () => {
  try {
    const distribution = await ListingQuality.getQualityDistribution();

    const stats = await aggregate("listing_quality", [{
        $group: {
          _id: null,
          totalListings: { $sum: 1 },
          averageScore: { $avg: "$overallScore" },
          medianScore: { $avg: "$overallScore" },
          minScore: { $min: "$overallScore" },
          maxScore: { $max: "$overallScore" },
        },
      },]);

    const platformStats = stats[0] || {
      totalListings: 0,
      averageScore: 0,
      medianScore: 0,
      minScore: 0,
      maxScore: 0,
    };

    return {
      ...platformStats,
      ratingDistribution: distribution,
    };
  } catch (err) {
    logError("Failed to get platform quality stats", err);
    throw err;
  }
};

// =============================
// 📈 GET QUALITY TRENDS
// =============================

export const getQualityTrends = async (period = 30) => {
  try {
    const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

    const trends = await aggregate("listing_quality", [{
        $match: {
          lastCalculatedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$lastCalculatedAt" } },
            rating: "$rating",
          },
          count: { $sum: 1 },
          avgScore: { $avg: "$overallScore" },
        },
      },
      {
        $sort: { "_id.date": 1 },
      },]);

    return trends;
  } catch (err) {
    logError("Failed to get quality trends", err);
    throw err;
  }
};

// =============================
// 🚨 GET LOW QUALITY LISTINGS
// =============================

export const getLowQualityListings = async (threshold = 50, limit = 20) => {
  try {
    const lowQuality = await ListingQuality.getLowQuality(threshold);

    return lowQuality.slice(0, limit).map((quality) => ({
      carId: quality.car.id,
      carTitle: quality.car.title,
      overallScore: quality.overallScore,
      rating: quality.rating,
      dealer: quality.dealer,
      recommendations: quality.recommendations,
      lastCalculatedAt: quality.lastCalculatedAt,
    }));
  } catch (err) {
    logError("Failed to get low quality listings", err);
    throw err;
  }
};

// =============================
// 📋 GENERATE QUALITY REPORT
// =============================

export const generateQualityReport = async (dealerId) => {
  try {
    const stats = await getDealerQualityStats(dealerId);
    const qualities = await ListingQuality.getByDealer(dealerId);

    // Calculate improvement opportunities
    const improvementAreas = {};
    qualities.forEach((quality) => {
      quality.recommendations.forEach((rec) => {
        if (!improvementAreas[rec.category]) {
          improvementAreas[rec.category] = {
            category: rec.category,
            count: 0,
            priority: rec.priority,
            recommendations: [],
          };
        }
        improvementAreas[rec.category].count++;
        if (!improvementAreas[rec.category].recommendations.includes(rec.message)) {
          improvementAreas[rec.category].recommendations.push(rec.message);
        }
      });
    });

    const sortedImprovementAreas = Object.values(improvementAreas).sort((a, b) => b.count - a.count);

    return {
      ...stats,
      improvementAreas: sortedImprovementAreas,
      generatedAt: new Date(),
    };
  } catch (err) {
    logError("Failed to generate quality report", err);
    throw err;
  }
};

// =============================
// 🔄 BULK RECALCULATE DEALER QUALITY
// =============================

export const bulkRecalculateDealerQuality = async (dealerId) => {
  try {
    const cars = await findAll("cars", { filters: { dealer: dealerId, status: "available" } });

    const results = [];
    for (const car of cars) {
      try {
        const quality = await recalculateListingQuality(car.id);
        results.push({
          carId: car.id,
          success: true,
          score: quality.overallScore,
        });
      } catch (err) {
        results.push({
          carId: car.id,
          success: false,
          error: err.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    logInfo("Bulk dealer quality recalculation completed", {
      dealerId,
      total: cars.length,
      success: successCount,
    });

    return {
      dealerId,
      totalListings: cars.length,
      successCount,
      failureCount: cars.length - successCount,
      results,
    };
  } catch (err) {
    logError("Failed to bulk recalculate dealer quality", err);
    throw err;
  }
};

// =============================
// 📊 GET QUALITY BENCHMARKS
// =============================

export const getQualityBenchmarks = async () => {
  try {
    const platformStats = await getPlatformQualityStats();

    return {
      platformAverage: platformStats.averageScore,
      platformMedian: platformStats.medianScore,
      excellentThreshold: 90,
      goodThreshold: 70,
      averageThreshold: 50,
      poorThreshold: 0,
      ratingDistribution: platformStats.ratingDistribution,
    };
  } catch (err) {
    logError("Failed to get quality benchmarks", err);
    throw err;
  }
};

export default {
  calculateListingQuality,
  recalculateListingQuality,
  getListingQuality,
  getDealerQualityStats,
  getPlatformQualityStats,
  getQualityTrends,
  getLowQualityListings,
  generateQualityReport,
  bulkRecalculateDealerQuality,
  getQualityBenchmarks,
};
