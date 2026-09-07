import express from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { cacheResponse } from '../middleware/cacheMiddleware.js';
import { getVehicleValuation, getValuationMatrix } from '../services/vehicleValuation.service.js';

const router = express.Router();

router.get('/matrix', cacheResponse(300), asyncHandler(async (req, res) => {
  const data = await getValuationMatrix({
    brand: req.query.brand,
    model: req.query.model,
    city: req.query.city,
    limit: req.query.limit,
  });
  res.json({ success: true, data });
}));

router.get('/:vehicleId', cacheResponse(600), asyncHandler(async (req, res) => {
  const data = await getVehicleValuation(req.params.vehicleId);
  if (!data) return res.status(404).json({ success: false, message: 'Vehicle not found' });
  res.json({ success: true, data });
}));

export default router;
