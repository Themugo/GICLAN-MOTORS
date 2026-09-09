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

export default { fetchList, fetchAuction, fetchActiveAuctions, fetchMyAuctions, startDealerAuction, extendDealerAuction, setAuctionWinner, fetchAuctionBids };

export async function startDealerAuction(carId: string, body: { durationMs: number; startingBid: number; reservePrice?: number | null; reserveMode?: string }) { return auctionRequest(`/api/dealer/cars/${encodeURIComponent(carId)}/auction/start`, { method: 'POST', body: JSON.stringify(body) }); }
export async function extendDealerAuction(carId: string, hours: number) { return auctionRequest(`/api/dealer/cars/${encodeURIComponent(carId)}/auction/extend`, { method: 'POST', body: JSON.stringify({ hours }) }); }
export async function setAuctionWinner(carId: string, bidId: string) { return auctionRequest(`/api/auction-admin/${encodeURIComponent(carId)}/set-winner`, { method: 'POST', body: JSON.stringify({ bidId }) }); }
export async function fetchAuctionBids(carId: string) { return auctionRequest<{ bids: unknown[] }>(`/api/auction-admin/${encodeURIComponent(carId)}/bids`); }
