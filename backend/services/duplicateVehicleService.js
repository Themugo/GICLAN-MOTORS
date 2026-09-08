// backend/services/duplicateVehicleService.js - Production Hardened v3.0
// ─────────────────────────────────────────────────────────────
// Duplicate vehicle detection service
// Detects duplicate listings using VIN, chassis, registration, phone, and dealer similarity
// Non-blocking approach - flags suspicious listings for admin review
// ─────────────────────────────────────────────────────────────

import { logInfo, logWarn, logError } from "../utils/logger.js";
import { findAll, findById, create, update } from "../db/index.js";

// =============================
// 🔍 DETECT DUPLICATES
// =============================
export const detectDuplicates = async (carData, dealerId) => {
  try {
    const detectionResults = {
      hasDuplicates: false,
      matches: [],
      matchType: null,
      matchScore: 0,
      detectionCriteria: {},
    };

    // Check exact matches (highest priority)
    if (carData.vin) {
      const vinMatches = await checkByVIN(carData.vin, dealerId);
      if (vinMatches.length > 0) {
        detectionResults.hasDuplicates = true;
        detectionResults.matches.push(...vinMatches);
        detectionResults.matchType = "exact_match";
        detectionResults.matchScore = 100;
        detectionResults.detectionCriteria.vin = carData.vin;
        detectionResults.detectionMethod = "vin";
        return detectionResults;
      }
    }

    if (carData.chassisNumber) {
      const chassisMatches = await checkByChassis(carData.chassisNumber, dealerId);
      if (chassisMatches.length > 0) {
        detectionResults.hasDuplicates = true;
        detectionResults.matches.push(...chassisMatches);
        detectionResults.matchType = "exact_match";
        detectionResults.matchScore = 100;
        detectionResults.detectionCriteria.chassisNumber = carData.chassisNumber;
        detectionResults.detectionMethod = "chassis";
        return detectionResults;
      }
    }

    if (carData.registrationNumber) {
      const regMatches = await checkByRegistration(carData.registrationNumber, dealerId);
      if (regMatches.length > 0) {
        detectionResults.hasDuplicates = true;
        detectionResults.matches.push(...regMatches);
        detectionResults.matchType = "exact_match";
        detectionResults.matchScore = 100;
        detectionResults.detectionCriteria.registrationNumber = carData.registrationNumber;
        detectionResults.detectionMethod = "registration";
        return detectionResults;
      }
    }

    // Check partial matches (lower priority)
    const dealer = await findById("users", dealerId, "phone");
    if (dealer?.phone) {
      const phoneMatches = await checkByPhone(dealer.phone, dealerId);
      if (phoneMatches.length > 0) {
        detectionResults.hasDuplicates = true;
        detectionResults.matches.push(...phoneMatches);
        detectionResults.matchType = "partial_match";
        detectionResults.matchScore = 60;
        detectionResults.detectionCriteria.sellerPhone = dealer.phone;
        detectionResults.detectionMethod = "phone";
      }
    }

    // Check dealer similarity
    const dealerMatches = await checkByDealer(dealerId, carData, 0.7);
    if (dealerMatches.length > 0) {
      detectionResults.hasDuplicates = true;
      detectionResults.matches.push(...dealerMatches);
      if (!detectionResults.matchType) {
        detectionResults.matchType = "potential_duplicate";
        detectionResults.matchScore = 40;
        detectionResults.detectionCriteria.dealerAccount = dealerId;
        detectionResults.detectionMethod = "dealer_similarity";
      }
    }

    // Calculate combined score if multiple detection methods
    if (detectionResults.matches.length > 0 && detectionResults.matchScore < 100) {
      detectionResults.matchScore = Math.min(90, detectionResults.matchScore + detectionResults.matches.length * 10);
      detectionResults.detectionMethod = "combined";
    }

    return detectionResults;
  } catch (err) {
    logError("Duplicate detection error", err);
    return {
      hasDuplicates: false,
      matches: [],
      matchType: null,
      matchScore: 0,
      detectionCriteria: {},
    };
  }
};

// =============================
// 🔍 CHECK BY VIN
// =============================
export const checkByVIN = async (vin, excludeDealerId = null) => {
  try {
    const normalizedVIN = vin.toUpperCase().replace(/[^A-Z0-9]/g, "");

    const query = { vin: { $regex: normalizedVIN, $options: "i" } };
    if (excludeDealerId) {
      query.dealer = { $ne: excludeDealerId };
    }

    const matches = await findAll("cars", { filters: query, select: "id,title,brand,model,year,dealer,vin,status,isFlaggedDuplicate" });

    return matches;
  } catch (err) {
    logError("Check by VIN error", err);
    return [];
  }
};

// =============================
// 🔍 CHECK BY CHASSIS
// =============================
export const checkByChassis = async (chassisNumber, excludeDealerId = null) => {
  try {
    const normalizedChassis = chassisNumber.toUpperCase().replace(/[^A-Z0-9]/g, "");

    const query = { chassisNumber: { $regex: normalizedChassis, $options: "i" } };
    if (excludeDealerId) {
      query.dealer = { $ne: excludeDealerId };
    }

    const matches = await findAll("cars", { filters: query, select: "id,title,brand,model,year,dealer,chassisNumber,status,isFlaggedDuplicate" });

    return matches;
  } catch (err) {
    logError("Check by chassis error", err);
    return [];
  }
};

// =============================
// 🔍 CHECK BY REGISTRATION
// =============================
export const checkByRegistration = async (registrationNumber, excludeDealerId = null) => {
  try {
    const normalizedReg = registrationNumber.toUpperCase().replace(/[^A-Z0-9]/g, "");

    const query = { registrationNumber: { $regex: normalizedReg, $options: "i" } };
    if (excludeDealerId) {
      query.dealer = { $ne: excludeDealerId };
    }

    const matches = await findAll("cars", { filters: query, select: "id,title,brand,model,year,dealer,registrationNumber,status,isFlaggedDuplicate" });

    return matches;
  } catch (err) {
    logError("Check by registration error", err);
    return [];
  }
};

// =============================
// 🔍 CHECK BY PHONE
// =============================
export const checkByPhone = async (phone, excludeDealerId = null) => {
  try {
    const normalizedPhone = phone.replace(/[^0-9]/g, "");

    const dealers = await findAll("users", { filters: {
      phone: { $regex: normalizedPhone, $options: "i" },
      _id: { $ne: excludeDealerId },
    }, select: "_id" });

    const dealerIds = dealers.map((d) => d.id);

    if (dealerIds.length === 0) return [];

    const matches = await findAll("cars", { filters: {
      dealer: { $in: dealerIds },
      status: "available",
    } })
      .select("_id title brand model year dealer status isFlaggedDuplicate")
      .limit(20)
      ;

    return matches;
  } catch (err) {
    logError("Check by phone error", err);
    return [];
  }
};

// =============================
// 🔍 CHECK BY DEALER SIMILARITY
// =============================
export const checkByDealer = async (dealerId, carData, similarityThreshold = 0.7) => {
  try {
    // Find recent listings from same dealer
    const recentListings = await findAll("cars", {
      filters: {
        dealer: dealerId,
        status: "available",
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }, // Last 90 days
      }
    })
      .select("_id title brand model year price mileage color status")
      .limit(50)
      ;

    const similarListings = [];

    for (const listing of recentListings) {
      const similarity = calculateSimilarity(carData, listing);
      if (similarity >= similarityThreshold) {
        similarListings.push({
          ...listing,
          similarity,
        });
      }
    }

    return similarListings.sort((a, b) => b.similarity - a.similarity);
  } catch (err) {
    logError("Check by dealer error", err);
    return [];
  }
};

// =============================
// 📊 CALCULATE SIMILARITY
// =============================
export const calculateSimilarity = (car1, car2) => {
  let score = 0;
  let factors = 0;

  // Brand match (high weight)
  if (car1.brand && car2.brand && car1.brand.toLowerCase() === car2.brand.toLowerCase()) {
    score += 30;
  }
  factors += 30;

  // Model match (high weight)
  if (car1.model && car2.model && car1.model.toLowerCase() === car2.model.toLowerCase()) {
    score += 25;
  }
  factors += 25;

  // Year match (medium weight)
  if (car1.year && car2.year && Math.abs(car1.year - car2.year) <= 2) {
    score += 20;
  }
  factors += 20;

  // Price similarity (medium weight)
  if (car1.price && car2.price) {
    const priceDiff = Math.abs(car1.price - car2.price) / Math.max(car1.price, car2.price);
    if (priceDiff <= 0.1) {
      score += 15;
    } else if (priceDiff <= 0.2) {
      score += 10;
    } else if (priceDiff <= 0.3) {
      score += 5;
    }
  }
  factors += 15;

  // Mileage similarity (low weight)
  if (car1.mileage && car2.mileage) {
    const mileageDiff = Math.abs(car1.mileage - car2.mileage) / Math.max(car1.mileage, car2.mileage);
    if (mileageDiff <= 0.1) {
      score += 10;
    }
  }
  factors += 10;

  return factors > 0 ? score / factors : 0;
};

// =============================
// 🚩 FLAG DUPLICATE
// =============================
export const flagDuplicate = async (carId, detectionData, dealerId) => {
  try {
    const car = await findById("cars", carId);
    if (!car) {
      logWarn("Car not found for duplicate flagging", { carId });
      return null;
    }

    // Create duplicate log
    const duplicateLog = await create("duplicate_vehicle_logs", {car: carId, dealer: dealerId, detectionCriteria: detectionData.detectionCriteria, matchType: detectionData.matchType, matchScore: detectionData.matchScore, matchedCars: detectionData.matches.map((m) => m.id), matchDetails: { matches: detectionData.matches, detectionMethod: detectionData.detectionMethod, }, status: "flagged", detectionMethod: detectionData.detectionMethod, similarityThreshold: 0.7, originalFraudScore: car.fraudScore, originalTrustScore: car.trustScore,});

    // Update car with duplicate flags
    car.isFlaggedDuplicate = true;
    car.duplicateStatus = "flagged";
    car.duplicateLog = duplicateLog.id;
    car.duplicateListings = detectionData.matches.map((m) => m.id);

    // Update fraud and trust scores
    const fraudImpact = Math.min(30, detectionData.matchScore * 0.3);
    const trustImpact = Math.min(20, detectionData.matchScore * 0.2);

    car.fraudScore = Math.min(100, car.fraudScore + fraudImpact);
    car.trustScore = Math.max(0, car.trustScore - trustImpact);

    duplicateLog.fraudScoreImpact = fraudImpact;
    duplicateLog.trustScoreImpact = -trustImpact;

    await update("cars", carId, {
      isFlaggedDuplicate: true,
      duplicateStatus: "flagged",
      duplicateLog: duplicateLog.id,
      duplicateListings: detectionData.matches.map((m) => m.id),
      fraudScore: car.fraudScore,
      trustScore: car.trustScore,
    });
    await update("duplicate_vehicle_logs", duplicateLog.id, {
      fraudScoreImpact: fraudImpact,
      trustScoreImpact: -trustImpact,
    });

    logInfo("Car flagged as duplicate", {
      carId,
      dealerId,
      matchType: detectionData.matchType,
      matchScore: detectionData.matchScore,
    });

    return duplicateLog;
  } catch (err) {
    logError("Flag duplicate error", err);
    return null;
  }
};

// =============================
// 📝 LOG DETECTION
// =============================
export const logDetection = async (carId, detectionData, dealerId) => {
  try {
    const duplicateLog = await create("duplicate_vehicle_logs", {car: carId, dealer: dealerId, detectionCriteria: detectionData.detectionCriteria, matchType: detectionData.matchType, matchScore: detectionData.matchScore, matchedCars: detectionData.matches.map((m) => m.id), matchDetails: { matches: detectionData.matches, detectionMethod: detectionData.detectionMethod, }, status: "flagged", detectionMethod: detectionData.detectionMethod, similarityThreshold: 0.7,});

    logInfo("Duplicate detection logged", {
      carId,
      dealerId,
      matchType: detectionData.matchType,
    });

    return duplicateLog;
  } catch (err) {
    logError("Log detection error", err);
    return null;
  }
};

// =============================
// 💰 UPDATE FRAUD SCORE
// =============================
export const updateFraudScore = async (carId, impact) => {
  try {
    const car = await findById("cars", carId);
    if (!car) {
      logWarn("Car not found for fraud score update", { carId });
      return null;
    }

    car.fraudScore = Math.min(100, Math.max(0, car.fraudScore + impact.fraudScore));
    car.trustScore = Math.min(100, Math.max(0, car.trustScore + impact.trustScore));

    await car.save();

    logInfo("Fraud score updated", {
      carId,
      fraudScore: car.fraudScore,
      trustScore: car.trustScore,
    });

    return car;
  } catch (err) {
    logError("Update fraud score error", err);
    return null;
  }
};

// =============================
// 🔄 RESTORE SCORES (False Positive)
// =============================
export const restoreScores = async (carId, duplicateLogId) => {
  try {
    const car = await findById("cars", carId);
    const duplicateLog = await DuplicateVehicleLog.findById(duplicateLogId);

    if (!car || !duplicateLog) {
      logWarn("Car or duplicate log not found for score restoration", { carId, duplicateLogId });
      return null;
    }

    // Restore original scores
    car.fraudScore = duplicateLog.originalFraudScore;
    car.trustScore = duplicateLog.originalTrustScore;

    // Clear duplicate flags
    car.isFlaggedDuplicate = false;
    car.duplicateStatus = "false_positive";

    await car.save();

    logInfo("Scores restored for false positive", {
      carId,
      originalFraudScore: duplicateLog.originalFraudScore,
      originalTrustScore: duplicateLog.originalTrustScore,
    });

    return car;
  } catch (err) {
    logError("Restore scores error", err);
    return null;
  }
};
