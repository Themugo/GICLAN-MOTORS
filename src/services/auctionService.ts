import { request, HttpRequestError } from '../api/httpRequest';

/**
 * Canonical public auction transport.
 * Auctions are represented by the backend's auction read model; callers do
 * not need to know which HTTP client implements the transport.
 */
export interface Auction {
  id: string;
  carId: string;
  status: 'draft' | 'active' | 'ended';
  startingBid: number;
  highestBid: number;
  startTime: string | null;
  endTime: string | null;
  bidIncrement: number;
  reservePrice?: number | null;
  highestBidderId?: string | null;
  bidCount: number;
  allowBid: boolean;
  allowBuy: boolean;
  car?: Record<string, unknown>;
}

export interface AuctionListParams {
  page?: number;
  limit?: number;
  status?: 'active' | 'live' | 'ended';
  search?: string;
}

async function auctionRequest<T>(path: string, options?: { method?: string; body?: unknown }): Promise<T> {
  return request<T>(path, options);
}

export async function fetchList(params: AuctionListParams = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  return auctionRequest<{ auctions: Auction[]; pagination?: Record<string, unknown> }>(`/api/auctions${query.toString() ? `?${query}` : ''}`);
}

export async function fetchAuction(id: string) {
  if (!id) throw new HttpRequestError('Auction ID is required.');
  return auctionRequest<Auction>(`/api/auctions/${encodeURIComponent(id)}`);
}

export async function fetchActiveAuctions(params: { page?: number; limit?: number } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  return auctionRequest<{ auctions: Auction[]; pagination?: Record<string, unknown> }>(`/api/auctions/active${query.toString() ? `?${query}` : ''}`);
}

export async function fetchMyAuctions(params: { page?: number; limit?: number } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  return auctionRequest<{ auctions: Auction[]; pagination?: Record<string, unknown> }>(`/api/auctions/my${query.toString() ? `?${query}` : ''}`);
}

export default { fetchList, fetchAuction, fetchActiveAuctions, fetchMyAuctions };
