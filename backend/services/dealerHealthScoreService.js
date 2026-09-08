// backend/services/dealerHealthScoreService.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Dealer Health Score service
// Calculates comprehensive trust and reputation scores for dealers
// ─────────────────────────────────────────────────────────────

import { logInfo, logError, logWarn } from "../utils/logger.js";
import { findAll, findById, findOne, create, update, upsert } from "../db/index.js";

// =============================
// 📊 CALCULATE HEALTH SCORE
// =============================

export const calculateHealthScore = async (dealerId) => {
  try {
    const dealer = await findOne("dealers", { user: dealerId });
    if (!dealer) {
      throw new Error("Dealer not found");
    }

    // Calculate all factor scores
    const verificationScore = await calculateVerificationScore(dealerId);
    const accountAgeScore = await calculateAccountAgeScore(dealerId);
    const transactionScore = await calculateTransactionScore(dealerId);
    const escrowScore = await calculateEscrowScore(dealerId);
    const reviewScore = await calculateReviewScore(dealerId);
    const fraudScore = await calculateFraudScore(dealerId);
    const responseScore = await calculateResponseScore(dealerId);
    const listingQualityScore = await calculateListingQualityScore(dealerId);
    const auctionScore = await calculateAuctionScore(dealerId);

    // Calculate overall score
    const overallScore =
      verificationScore * 0.15 +
      accountAgeScore * 0.1 +
      transactionScore * 0.2 +
      escrowScore * 0.15 +
      reviewScore * 0.15 +
      fraudScore * 0.15 +
      responseScore * 0.1 +
      listingQualityScore * 0.1 +
      auctionScore * 0.1;

    // Clamp score to 0-100 range
    const clampedScore = Math.max(0, Math.min(100, overallScore));

    // Determine score category
    const scoreCategory = DealerHealthScore.determineScoreCategory(clampedScore);

    // Get previous score for trend calculation
    const previousRecord = await findOne("dealer_health_scores", { dealer: dealerId });
    const previousScore = previousRecord?.healthScore || 0;
    const scoreChange = clampedScore - previousScore;
    const trend = scoreChange > 0 ? "up" : scoreChange < 0 ? "down" : "stable";

    // Update or create health score record
    const existingScore = await findOne("dealer_health_scores", { dealer: dealerId });
    const scoreData = {
      dealer: dealerId,
      healthScore: clampedScore,
      scoreCategory,
      verificationScore,
      accountAgeScore,
      transactionScore,
      escrowScore,
      reviewScore,
      fraudScore,
      responseScore,
      listingQualityScore,
      auctionScore,
      verificationDetails: verificationScore.details,
      accountAgeDetails: accountAgeScore.details,
      transactionDetails: transactionScore.details,
      escrowDetails: escrowScore.details,
      reviewDetails: reviewScore.details,
      fraudDetails: fraudScore.details,
      responseDetails: responseScore.details,
      listingQualityDetails: listingQualityScore.details,
        auctionDetails: auctionScore.details,
        lastCalculatedAt: new Date().toISOString(),
        lastRecalculatedAt: new Date().toISOString(),
        previousScore,
        scoreChange,
        trend,
      };

    let healthScore;
    if (existingScore) {
      healthScore = await update("dealer_health_scores", existingScore.id, scoreData);
    } else {
      healthScore = await create("dealer_health_scores", scoreData);
    }

    logInfo("Health score calculated", { dealerId, healthScore: clampedScore, scoreCategory });

    return {
      healthScore: clampedScore,
      scoreCategory,
      verificationScore,
      accountAgeScore,
      transactionScore,
      escrowScore,
      reviewScore,
      fraudScore,
      responseScore,
      listingQualityScore,
      auctionScore,
      trend,
      scoreChange,
    };
  } catch (err) {
    logError("Failed to calculate health score", err, { dealerId });
    throw err;
  }
};

// =============================
// ✅ CALCULATE VERIFICATION SCORE
// =============================

export const calculateVerificationScore = async (dealerId) => {
  try {
    const verification = await findOne("dealer_verifications", {user: dealerId});

    if (!verification) {
      return { score: 0, details: { completeness: 0 } };
    }

    let score = 0;
    const details = {
      governmentIdVerified: false,
      kraPinVerified: false,
      businessRegistrationVerified: false,
      physicalAddressVerified: false,
      phoneVerified: false,
      completeness: 0,
    };

    // Government ID (20 points)
    if (verification.documents.governmentId?.verified) {
      score += 20;
      details.governmentIdVerified = true;
    }

    // KRA PIN (20 points)
    if (verification.documents.kraPin?.verified) {
      score += 20;
      details.kraPinVerified = true;
    }

    // Business Registration (20 points)
    if (verification.documents.businessRegistration?.verified) {
      score += 20;
      details.businessRegistrationVerified = true;
    }

    // Physical Address (20 points)
    if (verification.documents.physicalAddress?.verified) {
      score += 20;
      details.physicalAddressVerified = true;
    }

    // Phone Verification (20 points)
    if (verification.documents.phoneVerification?.verified) {
      score += 20;
      details.phoneVerified = true;
    }

    details.completeness = score;

    return { score, details };
  } catch (err) {
    logError("Failed to calculate verification score", err, { dealerId });
    return { score: 0, details: { completeness: 0 } };
  }
};

// =============================
// 📅 CALCULATE ACCOUNT AGE SCORE
// =============================

export const calculateAccountAgeScore = async (dealerId) => {
  try {
    const user = await findById("users", dealerId);

    if (!user) {
      return { score: 0, details: { accountAgeDays: 0 } };
    }

    const accountCreatedAt = user.createdAt || new Date();
    const accountAgeDays = Math.floor((Date.now() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

    let score = 0;

    if (accountAgeDays < 30) {
      score = 0;
    } else if (accountAgeDays < 90) {
      score = 25;
    } else if (accountAgeDays < 180) {
      score = 50;
    } else if (accountAgeDays < 365) {
      score = 75;
    } else {
      score = 100;
    }

    const details = {
      accountCreatedAt,
      accountAgeDays,
      score,
    };

    return { score, details };
  } catch (err) {
    logError("Failed to calculate account age score", err, { dealerId });
    return { score: 0, details: { accountAgeDays: 0 } };
  }
};

// =============================
// 💰 CALCULATE TRANSACTION SCORE
// =============================

export const calculateTransactionScore = async (dealerId) => {
  try {
    const transactions = await findAll("transactions", { filters: { user: dealerId, status: { $ne: "pending" } } });

    if (transactions.length === 0) {
      return { score: 50, details: { totalTransactions: 0, successRate: 100 } };
    }

    const totalTransactions = transactions.length;
    const successfulTransactions = transactions.filter((t) => t.status === "success").length;
    const failedTransactions = transactions.filter((t) => t.status === "failed").length;
    const successRate = (successfulTransactions / totalTransactions) * 100;
    const totalRevenue = transactions
      .filter((t) => t.status === "success")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Volume score (logarithmic scale)
    let volumeScore = 0;
    if (totalRevenue > 0) {
      volumeScore = Math.min(100, Math.log10(totalRevenue + 1) * 10);
    }

    // Consistency score (based on transaction frequency)
    const consistencyScore = Math.min(100, totalTransactions * 2);

    // Overall transaction score
    const score = successRate * 0.5 + volumeScore * 0.3 + consistencyScore * 0.2;

    const details = {
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      successRate,
      totalRevenue,
      volumeScore,
      consistencyScore,
    };

    return { score, details };
  } catch (err) {
    logError("Failed to calculate transaction score", err, { dealerId });
    return { score: 50, details: { totalTransactions: 0, successRate: 100 } };
  }
};

// =============================
// 🔒 CALCULATE ESCROW SCORE
// =============================

export const calculateEscrowScore = async (dealerId) => {
  try {
    const escrows = await findAll("escrows", { filters: { seller: dealerId } });

    if (escrows.length === 0) {
      return { score: 75, details: { totalEscrows: 0, completionRate: 100 } };
    }

    const totalEscrows = escrows.length;
    const releasedEscrows = escrows.filter((e) => e.status === "released").length;
    const disputedEscrows = escrows.filter((e) => e.status === "disputed").length;
    const refundedEscrows = escrows.filter((e) => e.status === "refunded").length;
    const autoReleasedEscrows = escrows.filter((e) => e.autoReleased).length;

    const completionRate = totalEscrows > 0 ? (releasedEscrows / totalEscrows) * 100 : 100;
    const disputeRate = totalEscrows > 0 ? (disputedEscrows / totalEscrows) * 100 : 0;
    const autoReleaseRate = totalEscrows > 0 ? (autoReleasedEscrows / totalEscrows) * 100 : 0;

    // Overall escrow score
    const score = completionRate * 0.6 - disputeRate * 0.3 + autoReleaseRate * 0.1;

    const details = {
      totalEscrows,
      releasedEscrows,
      disputedEscrows,
      refundedEscrows,
      completionRate,
      disputeRate,
      autoReleaseRate,
    };

    return { score, details };
  } catch (err) {
    logError("Failed to calculate escrow score", err, { dealerId });
    return { score: 75, details: { totalEscrows: 0, completionRate: 100 } };
  }
};

// =============================
// ⭐ CALCULATE REVIEW SCORE
// =============================

export const calculateReviewScore = async (dealerId) => {
  try {
    const reviews = await findAll("reviews", { filters: {dealer: dealerId, isApproved: true} });

    if (reviews.length === 0) {
      return { score: 70, details: { totalReviews: 0, averageRating: 0 } };
    }

    const totalReviews = reviews.length;
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
    const verifiedReviews = reviews.filter((r) => r.isVerified).length;

    // Rating score (normalized to 0-100)
    const ratingScore = (averageRating / 5) * 100;

    // Volume score (logarithmic scale)
    const volumeScore = Math.min(100, Math.log10(totalReviews + 1) * 20);

    // Verified bonus
    const verifiedBonus = totalReviews > 0 ? (verifiedReviews / totalReviews) * 20 : 0;

    // Overall review score
    const score = ratingScore * 0.6 + volumeScore * 0.2 + verifiedBonus * 0.2;

    const details = {
      totalReviews,
      averageRating,
      verifiedReviews,
      ratingScore,
      volumeScore,
      verifiedBonus,
    };

    return { score, details };
  } catch (err) {
    logError("Failed to calculate review score", err, { dealerId });
    return { score: 70, details: { totalReviews: 0, averageRating: 0 } };
  }
};

// =============================
// 🚨 CALCULATE FRAUD SCORE
// =============================

export const calculateFraudScore = async (dealerId) => {
  try {
    const fraudFlags = await findAll("fraud_detections", { filters: { target: dealerId, status: { $ne: "dismissed" } } });

    if (fraudFlags.length === 0) {
      return { score: 0, details: { totalFlags: 0 } };
    }

    const totalFlags = fraudFlags.length;
    const criticalFlags = fraudFlags.filter((f) => f.severity === "critical").length;
    const highFlags = fraudFlags.filter((f) => f.severity === "high").length;
    const mediumFlags = fraudFlags.filter((f) => f.severity === "medium").length;
    const lowFlags = fraudFlags.filter((f) => f.severity === "low").length;
    const confirmedFraud = fraudFlags.filter((f) => f.status === "confirmed").length;

    // Calculate fraud score (negative)
    let score = 0;
    score -= criticalFlags * 50;
    score -= highFlags * 30;
    score -= mediumFlags * 15;
    score -= lowFlags * 5;
    score -= confirmedFraud * 100;

    // Clamp to -100
    score = Math.max(-100, score);

    const details = {
      totalFlags,
      criticalFlags,
      highFlags,
      mediumFlags,
      lowFlags,
      confirmedFraud,
      dismissedFraud: fraudFlags.filter((f) => f.status === "dismissed").length,
      score,
    };

    return { score, details };
  } catch (err) {
    logError("Failed to calculate fraud score", err, { dealerId });
    return { score: 0, details: { totalFlags: 0 } };
  }
};

// =============================
// ⏱️ CALCULATE RESPONSE SCORE
// =============================

export const calculateResponseScore = async (dealerId) => {
  try {
    // Get messages where dealer is the recipient
    const chats = await findAll("chats", { filters: {participants: dealerId} });

    if (chats.length === 0) {
      return { score: 70, details: { averageResponseTime: 0 } };
    }

    // Calculate average response time (simplified)
    // In production, you would track actual response times
    const averageResponseTime = 30; // Default 30 minutes
    let score = 0;

    if (averageResponseTime < 15) {
      score = 100;
    } else if (averageResponseTime < 30) {
      score = 75;
    } else if (averageResponseTime < 60) {
      score = 50;
    } else if (averageResponseTime < 120) {
      score = 25;
    } else {
      score = 0;
    }

    const details = {
      messageResponseTime: averageResponseTime,
      bidResponseTime: averageResponseTime,
      supportResponseTime: averageResponseTime,
      averageResponseTime,
      score,
    };

    return { score, details };
  } catch (err) {
    logError("Failed to calculate response score", err, { dealerId });
    return { score: 70, details: { averageResponseTime: 0 } };
  }
};

// =============================
// 🚗 CALCULATE LISTING QUALITY SCORE
// =============================

export const calculateListingQualityScore = async (dealerId) => {
  try {
    const cars = await findAll("cars", { filters: { dealer: dealerId } });

    if (cars.length === 0) {
      return { score: 70, details: { totalListings: 0 } };
    }

    const totalListings = cars.length;
    const flaggedListings = cars.filter((c) => c.isFlagged).length;

    // Calculate average image count
    const averageImageCount = cars.reduce((sum, c) => sum + (c.images?.length || 0), 0) / totalListings;

    // Calculate average description length
    const averageDescriptionLength = cars.reduce((sum, c) => sum + (c.description?.length || 0), 0) / totalListings;

    // Calculate specs completeness
    const specFields = ["brand", "model", "year", "fuel", "transmission", "mileage", "bodyType", "color", "condition"];
    let totalSpecFields = 0;
    let filledSpecFields = 0;

    cars.forEach((car) => {
      specFields.forEach((field) => {
        totalSpecFields++;
        if (car[field]) filledSpecFields++;
      });
    });

    const specsCompleteness = totalSpecFields > 0 ? (filledSpecFields / totalSpecFields) * 100 : 0;

    // Image score
    const imageScore = Math.min(100, averageImageCount * 10);

    // Description score
    const descriptionScore = Math.min(100, averageDescriptionLength / 5);

    // Specs score
    const specsScore = specsCompleteness;

    // Flag penalty
    const flagPenalty = totalListings > 0 ? (flaggedListings / totalListings) * 50 : 0;

    // Overall listing quality score
    const score = imageScore * 0.3 + descriptionScore * 0.3 + specsScore * 0.3 - flagPenalty;

    const details = {
      totalListings,
      averageImageCount,
      averageDescriptionLength,
      specsCompleteness,
      flaggedListings,
      score,
    };

    return { score, details };
  } catch (err) {
    logError("Failed to calculate listing quality score", err, { dealerId });
    return { score: 70, details: { totalListings: 0 } };
  }
};

// =============================
// 🏆 CALCULATE AUCTION SCORE
// =============================

export const calculateAuctionScore = async (dealerId) => {
  try {
    const cars = await findAll("cars", { filters: { dealer: dealerId, auctionStatus: { $ne: "none" }, deletedAt: null } });
    const auctionIds = cars.map((c) => c.id);

    if (auctionIds.length === 0) {
      return { score: 70, details: { totalAuctions: 0 } };
    }

    const auctions = cars;

    if (auctions.length === 0) {
      return { score: 70, details: { totalAuctions: 0 } };
    }

    const totalAuctions = auctions.length;
    const completedAuctions = auctions.filter((a) => a.auctionStatus === "ended").length;
    const totalWinners = auctions.filter((a) => a.winner?.user || a.highestBidderId).length;
    const paidWinners = auctions.filter((a) => a.paymentStatus === "paid" || a.isPaid === true).length;

    const completionRate = totalAuctions > 0 ? (completedAuctions / totalAuctions) * 100 : 100;
    const paymentRate = totalWinners > 0 ? (paidWinners / totalWinners) * 100 : 100;
    const averageBidsPerAuction = totalAuctions > 0
      ? auctions.reduce((sum, a) => sum + Number(a.bidsCount || 0), 0) / totalAuctions
      : 0;

    // Overall auction score
    const score = completionRate * 0.4 + paymentRate * 0.3 + Math.min(100, averageBidsPerAuction * 5) * 0.3;

    const details = {
      totalAuctions,
      completedAuctions,
      totalWinners,
      paidWinners,
      completionRate,
      paymentRate,
      averageBidsPerAuction,
      score,
    };

    return { score, details };
  } catch (err) {
    logError("Failed to calculate auction score", err, { dealerId });
    return { score: 70, details: { totalAuctions: 0 } };
  }
};

// =============================
// 🔄 RECALCULATE ALL SCORES
// =============================

export const recalculateAllScores = async () => {
  try {
    const dealers = await findAll("dealers", { filters: { approved: true }, select: "user" });

    logInfo("Starting health score recalculation", { totalDealers: dealers.length });

    let successCount = 0;
    let failureCount = 0;

    for (const dealer of dealers) {
      try {
        await calculateHealthScore(dealer.user);
        successCount++;
      } catch (err) {
        logError("Failed to calculate health score for dealer", err, { dealerId: dealer.user });
        failureCount++;
      }
    }

    logInfo("Health score recalculation completed", { successCount, failureCount });

    return { successCount, failureCount, total: dealers.length };
  } catch (err) {
    logError("Failed to recalculate all scores", err);
    throw err;
  }
};

// =============================
// 🏆 GET TOP DEALERS
// =============================

export const getTopDealers = async (category = null, limit = 10) => {
  try {
    return await DealerHealthScore.getTopDealers(category, limit);
  } catch (err) {
    logError("Failed to get top dealers", err);
    throw err;
  }
};

// =============================
// 📊 GET DEALER RANK
// =============================

export const getDealerRank = async (dealerId) => {
  try {
    return await DealerHealthScore.getDealerRank(dealerId);
  } catch (err) {
    logError("Failed to get dealer rank", err);
    throw err;
  }
};

export default {
  calculateHealthScore,
  calculateVerificationScore,
  calculateAccountAgeScore,
  calculateTransactionScore,
  calculateEscrowScore,
  calculateReviewScore,
  calculateFraudScore,
  calculateResponseScore,
  calculateListingQualityScore,
  calculateAuctionScore,
  recalculateAllScores,
  getTopDealers,
  getDealerRank,
};
