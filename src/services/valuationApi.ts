import { request } from '../api/httpRequest';

export interface ValuationMatrixRow {
  make: string;
  model: string;
  year: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  listingsCount: number;
}

export interface VehicleValuation {
  lowPrice: number;
  avgPrice: number;
  highPrice: number;
  currentValue: number;
  wholesaleValue: number;
  dealerValue: number;
  privateSaleValue: number;
  auctionEstimate: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  confidenceScore: number;
  comparableCount: number;
  mileageAdjustment: number;
  conditionAdjustment: number;
  depreciationRate: number;
  monthlyDepreciation: number;
  futureValue12m: number;
  futureValue24m: number;
}

export async function getVehicleValuation(vehicleId: string) {
  return request<{ success: boolean; data: VehicleValuation }>(`/api/valuation/${encodeURIComponent(vehicleId)}`);
}

export async function getValuationMatrix(params: { brand?: string; model?: string; city?: string; limit?: number } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return request<{ success: boolean; data: ValuationMatrixRow[] }>(`/api/valuation/matrix${query.toString() ? `?${query}` : ''}`);
}
