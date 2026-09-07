import express from 'express';
import { protect } from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { aiDecisionService } from '../ai/services/aiDecisionService.js';

const router = express.Router();
router.use(protect);

router.get('/recommendations', asyncHandler(async (req, res) => {
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10));
  const result = await aiDecisionService.recommendVehiclesForUser(req.user.id, limit);
  if (!result) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, data: result });
}));

router.get('/vehicles/:vehicleId/explain', asyncHandler(async (req, res) => {
  const result = await aiDecisionService.explainVehicle(req.params.vehicleId, req.user.id);
  if (!result) return res.status(404).json({ success: false, message: 'Vehicle not found' });
  res.json({ success: true, data: result });
}));

router.get('/market-signals', asyncHandler(async (req, res) => {
  const result = await aiDecisionService.marketSignals(req.query);
  res.json({ success: true, data: result });
}));

export default router;
