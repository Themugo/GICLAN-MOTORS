// services/ai.service.js

// =============================
// 🚗 BRAND + MODEL WEIGHTS
// =============================
const BRAND_WEIGHTS = {
  toyota: 1.2,
  mercedes: 1.6,
  bmw: 1.5,
  nissan: 1.0,
  mazda: 1.1,
  subaru: 1.05,
  volkswagen: 1.3,
  audi: 1.55,
  honda: 1.15,
};

// 🔥 Model keywords (high-impact in KE market)
const MODEL_BOOSTS = {
  prado: 2500000,
  landcruiser: 3000000,
  harrier: 1200000,
  cx5: 900000,
  xtrail: 800000,
  forester: 700000,
  demio: 300000,
  vitz: 250000,
  axio: 400000,
  premio: 500000,
};

// =============================
// 📉 REALISTIC DEPRECIATION
// =============================
const getDepreciationFactor = (year) => {
  const currentYear = new Date().getFullYear();
  const age = currentYear - year;

  if (age <= 3) return 0.85;
  if (age <= 7) return 0.65;
  if (age <= 12) return 0.45;
  return 0.3;
};

// =============================
// ⛽ ENGINE / FUEL IMPACT
// =============================
const getEngineImpact = (title) => {
  const lower = title.toLowerCase();

  if (lower.includes("diesel")) return 150000;
  if (lower.includes("hybrid")) return 300000;
  if (lower.includes("electric")) return 500000;

  return 0;
};

// =============================
// 🧠 ESTIMATE PRICE (ADVANCED)
// =============================
export const estimatePrice = ({
  title = "",
  year = 2020,
  mileage = 50000,
  condition = "average", // new | excellent | good | average | poor
}) => {
  let base = 1200000;
  const lower = title.toLowerCase();

  // =============================
  // 🏷 BRAND MULTIPLIER
  // =============================
  for (const brand in BRAND_WEIGHTS) {
    if (lower.includes(brand)) {
      base *= BRAND_WEIGHTS[brand];
      break;
    }
  }

  // =============================
  // 🚗 MODEL BOOST
  // =============================
  for (const model in MODEL_BOOSTS) {
    if (lower.includes(model)) {
      base += MODEL_BOOSTS[model];
      break;
    }
  }

  // =============================
  // 📉 DEPRECIATION
  // =============================
  base *= getDepreciationFactor(year);

  // =============================
  // 🚗 MILEAGE IMPACT
  // =============================
  const mileagePenalty = Math.floor(mileage / 10000) * 20000;
  base -= mileagePenalty;

  // =============================
  // ⛽ ENGINE TYPE
  // =============================
  base += getEngineImpact(title);

  // =============================
  // 🔧 CONDITION MULTIPLIER
  // =============================
  const conditionMap = {
    new: 1.2,
    excellent: 1.1,
    good: 1.0,
    average: 0.9,
    poor: 0.75,
  };

  base *= conditionMap[condition] || 0.9;

  // =============================
  // ⚠️ FLOOR PRICE
  // =============================
  if (base < 250000) base = 250000;

  return Math.round(base);
};

// =============================
// 🧠 DEAL ANALYSIS (IMPROVED)
// =============================
export const analyzeDeal = (inputPrice, estimatedPrice) => {
  const ratio = inputPrice / estimatedPrice;

  let confidence = 0.8;

  if (ratio < 0.65) {
    return {
      label: "🔥 Great Deal",
      score: 9,
      confidence,
      insight: "Well below expected market value",
    };
  }

  if (ratio > 1.35) {
    return {
      label: "⚠️ Overpriced",
      score: 3,
      confidence,
      insight: "Above typical market range",
    };
  }

  return {
    label: "✅ Fair Price",
    score: 7,
    confidence,
    insight: "Within expected market range",
  };
};

// =============================
// 🧠 FULL AI ANALYSIS
// =============================
export const analyzeCarPrice = ({ title, year, mileage, price, condition }) => {
  const estimated = estimatePrice({ title, year, mileage, condition });
  const deal = analyzeDeal(price, estimated);

  return {
    estimatedPrice: estimated,
    inputPrice: price,
    difference: price - estimated,
    percentageDiff: ((price - estimated) / estimated) * 100,
    deal,
  };
};
