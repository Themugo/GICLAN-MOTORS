// Compatibility facade. Regional configuration is now owned by the canonical
// regionalConfiguration.service; this module intentionally contains no second
// country/currency implementation.
import regionalConfigurationService from '../../services/regionalConfiguration.service.js';

export const countryService = {
  getCountries: (filters) => regionalConfigurationService.listCountries(filters),
  getCountryByCode: (code) => regionalConfigurationService.getCountry(code),
  convertCurrency: (amount, fromCurrency, toCurrency) => regionalConfigurationService.convertCurrency(amount, fromCurrency, toCurrency),
  getCurrencyRate: (fromCurrency, toCurrency) => regionalConfigurationService.getCurrencyRate(fromCurrency, toCurrency),
};

export default countryService;
