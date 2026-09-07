import { request } from '../api/httpRequest';

export type Country = {
  id: string;
  countryCode: string;
  countryName: string;
  isoCode: string;
  flagEmoji?: string;
  status: 'active' | 'inactive' | 'maintenance' | 'suspended';
  isPrimary: boolean;
  configuration?: {
    currencyCode: string;
    currencySymbol: string;
    currencyName: string;
    defaultLanguage: string;
    supportedLanguages: string[];
    timezone: string;
    phoneCountryCode: string;
  } | null;
  paymentProviders?: any[];
  taxes?: any[];
  crossBorder?: any[];
};

const unwrap = <T>(response: any): T => response?.data ?? response;

export async function listCountries(includeConfiguration = false): Promise<Country[]> {
  const response = await request<{ data: Country[] }>(`/countries?includeConfiguration=${includeConfiguration}`);
  return unwrap<Country[]>(response);
}

export async function getCountry(countryCode: string): Promise<Country> {
  const response = await request<{ data: Country }>(`/countries/${encodeURIComponent(countryCode)}`);
  return unwrap<Country>(response);
}

export async function getCurrencyRate(from: string, to: string) {
  const response = await request<{ data: { fromCurrency: string; toCurrency: string; rate: number; source: string; effectiveAt: string } }>(`/countries/currency-rate?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  return unwrap(response);
}

export async function convertCurrency(amount: number, fromCurrency: string, toCurrency: string) {
  const response = await request<{ data: unknown }>('/countries/currency-convert', { method: 'POST', body: { amount, fromCurrency, toCurrency } });
  return unwrap(response);
}
