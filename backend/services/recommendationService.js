import { aiDecisionService } from '../ai/services/aiDecisionService.js';

// Compatibility facade: recommendation business logic lives in the canonical
// explainable AI decision-support service.
export const getPersonalizedRecommendations = async (userId, limit = 10) => {
  const result = await aiDecisionService.recommendVehiclesForUser(userId, limit);
  if (!result) return null;
  return {
    userId: result.userId,
    generatedAt: result.generatedAt,
    engine: result.engine,
    recommendedCars: result.recommendations,
    recommendedAuctions: [],
    recommendedDealers: [],
    signals: result.signals,
  };
};
