import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { listCountries, getCountry, getCurrencyRate, convertCurrency, listCurrencyRates, upsertCurrencyRate, updateCountryStatus } from '../controllers/regionalConfigurationController.js';

const router = express.Router();
router.get('/', asyncHandler(listCountries));
router.get('/currency-rate', asyncHandler(getCurrencyRate));
router.post('/currency-convert', protect, asyncHandler(convertCurrency));
router.get('/currency-rates', protect, adminOnly, asyncHandler(listCurrencyRates));
router.put('/currency-rates', protect, adminOnly, asyncHandler(upsertCurrencyRate));
router.get('/:countryCode', asyncHandler(getCountry));
router.patch('/:countryCode/status', protect, adminOnly, asyncHandler(updateCountryStatus));
export default router;
