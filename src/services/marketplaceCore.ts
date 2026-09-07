import { getCars, getCarById, mapBackendCarToVehicle, type GetCarsParams } from './vehicleApi';
import { fetchActiveAuctions, fetchAuction as fetchAuctionById } from './auctionService';
import { myBids } from './bidApi';
import type { Vehicle } from '../types';

/** Canonical read model for marketplace surfaces. No mock/demo fallback is permitted. */
export async function fetchMarketplaceVehicles(params: GetCarsParams = {}): Promise<{ vehicles: Vehicle[]; total: number; pages: number }> {
  const response = await getCars(params);
  const rows = response.data || response.cars || [];
  return {
    vehicles: rows.map(mapBackendCarToVehicle),
    total: Number(response.pagination?.total ?? rows.length),
    pages: Number(response.pagination?.pages ?? response.pagination?.totalPages ?? 1),
  };
}

export async function fetchMarketplaceVehicle(id: string): Promise<Vehicle | null> {
  const car = await getCarById(id);
  return car ? mapBackendCarToVehicle(car) : null;
}

export async function fetchLiveAuctions(params: { page?: number; limit?: number } = {}) {
  return fetchActiveAuctions(params);
}

export async function fetchAuction(id: string) {
  return fetchAuctionById(id);
}

export async function fetchMyBids() {
  return myBids();
}
