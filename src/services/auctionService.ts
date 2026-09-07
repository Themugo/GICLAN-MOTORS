import { request, HttpRequestError } from '../api/httpRequest';

/** Canonical auction transport + lifecycle API. All auction UIs use this
 * module so endpoint contracts do not drift between marketplace, dealer,
 * admin, and live-auction surfaces. */
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

export interface AuctionBid {
  id?: string;
  _id?: string;
  amount: number;
  status?: string;
  user?: Record<string, unknown> | string;
  carId?: string | Record<string, unknown>;
  createdAt?: string;
  bidderTag?: string;
}

async function auctionRequest<T>(path: string, options?: { method?: string; body?: unknown }): Promise<T> {
  return request<T>(path, options);
}

const queryString = (params: Record<string, unknown>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
};

export async function fetchList(params: AuctionListParams = {}) {
  return auctionRequest<{ auctions: Auction[]; pagination?: Record<string, unknown> }>(`/api/auctions${queryString(params)}`);
}

export async function fetchAuction(id: string) {
  if (!id) throw new HttpRequestError('Auction ID is required.');
  const response = await auctionRequest<{ auction: Auction }>(`/api/auctions/${encodeURIComponent(id)}`);
  return response.auction;
}

export async function fetchActiveAuctions(params: { page?: number; limit?: number } = {}) {
  return auctionRequest<{ auctions: Auction[]; pagination?: Record<string, unknown> }>(`/api/auctions/active${queryString(params)}`);
}

export async function fetchMyAuctions(params: { page?: number; limit?: number; status?: 'active' | 'live' | 'ended' } = {}) {
  return auctionRequest<{ auctions: Auction[]; pagination?: Record<string, unknown> }>(`/api/auctions/my${queryString(params)}`);
}

export async function fetchAuctionBids(carId: string) {
  return auctionRequest<{ bids: AuctionBid[] }>(`/api/bids/${encodeURIComponent(carId)}/bids`);
}

export async function fetchAdminAuctionBids(carId: string) {
  return auctionRequest<{ bids: AuctionBid[] }>(`/api/auction-admin/${encodeURIComponent(carId)}/bids`);
}

export async function startAuction(carId: string, body: { durationMs: number; startingBid: number; reservePrice?: number | null; reserveMode?: string }) {
  return auctionRequest<{ success: boolean; message?: string; endTime?: string; result?: Record<string, unknown> }>(`/api/auction-admin/${encodeURIComponent(carId)}/start`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function endAuction(carId: string) {
  return auctionRequest<{ success: boolean; result?: Record<string, unknown> }>(`/api/auction-admin/${encodeURIComponent(carId)}/end`, { method: 'POST', body: JSON.stringify({}) });
}

export async function extendAuction(carId: string, extraMs: number) {
  return auctionRequest<{ success: boolean; newEndTime?: string; result?: Record<string, unknown> }>(`/api/auction-admin/${encodeURIComponent(carId)}/extend`, {
    method: 'POST',
    body: JSON.stringify({ extraMs }),
  });
}

export async function setAuctionWinner(carId: string, bidId: string) {
  return auctionRequest<{ success: boolean; message?: string; result?: Record<string, unknown> }>(`/api/auction-admin/${encodeURIComponent(carId)}/set-winner`, {
    method: 'POST',
    body: JSON.stringify({ bidId }),
  });
}

export async function startDealerAuction(carId: string, body: { durationMs: number; startingBid: number; reservePrice?: number | null; reserveMode?: string }) {
  return auctionRequest<{ success: boolean; message?: string; endTime?: string; result?: Record<string, unknown> }>(`/api/dealer/cars/${encodeURIComponent(carId)}/auction/start`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function endDealerAuction(carId: string) {
  return auctionRequest<{ success: boolean; result?: Record<string, unknown> }>(`/api/dealer/cars/${encodeURIComponent(carId)}/auction/end`, { method: 'POST', body: JSON.stringify({}) });
}

export async function extendDealerAuction(carId: string, hours: number) {
  return auctionRequest<{ success: boolean; newEndTime?: string; extensionCount?: number; result?: Record<string, unknown> }>(`/api/dealer/cars/${encodeURIComponent(carId)}/auction/extend`, {
    method: 'POST',
    body: JSON.stringify({ hours }),
  });
}

export default {
  fetchList,
  fetchAuction,
  fetchActiveAuctions,
  fetchMyAuctions,
  fetchAuctionBids,
  fetchAdminAuctionBids,
  startAuction,
  endAuction,
  extendAuction,
  setAuctionWinner,
  startDealerAuction,
  endDealerAuction,
  extendDealerAuction,
};
