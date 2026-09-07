import asyncHandler from '../middleware/asyncHandler.js';
import regionalConfigurationService from '../services/regionalConfiguration.service.js';

export const listCountries = asyncHandler(async (req, res) => {
  const data = await regionalConfigurationService.listCountries({ status: req.query.status, includeConfiguration: req.query.includeConfiguration === 'true' });
  res.json({ success: true, data });
});

export const getCountry = asyncHandler(async (req, res) => {
  const data = await regionalConfigurationService.getCountry(req.params.countryCode);
  res.json({ success: true, data });
});

export const getCurrencyRate = asyncHandler(async (req, res) => {
  const data = await regionalConfigurationService.getCurrencyRate(req.query.from, req.query.to);
  res.json({ success: true, data });
});

export const convertCurrency = asyncHandler(async (req, res) => {
  const data = await regionalConfigurationService.convertCurrency(req.body.amount, req.body.fromCurrency, req.body.toCurrency);
  res.json({ success: true, data });
});

export const listCurrencyRates = asyncHandler(async (_req, res) => {
  const data = await regionalConfigurationService.listCurrencyRates();
  res.json({ success: true, data });
});

export const upsertCurrencyRate = asyncHandler(async (req, res) => {
  const data = await regionalConfigurationService.upsertCurrencyRate(req.body, req.user?.id);
  res.json({ success: true, data });
});

export const updateCountryStatus = asyncHandler(async (req, res) => {
  const data = await regionalConfigurationService.updateCountryStatus(req.params.countryCode, req.body.status, req.user?.id);
  res.json({ success: true, data });
});
