import { request, HttpRequestError } from '../api/httpRequest';
/**
 * Real backend ad-slot API client - a real, backend-persisted
 * advertisement management system, deliberately different from this
 * project's existing home-page admin customization (which is
 * intentionally localStorage-only, presentation-only page layout).
 * A paid advertiser's content needs to be visible to every real
 * visitor, not just the admin's own browser - so this one is genuinely
 * backend-persisted, following the exact fetch-client pattern already
 * established in escrowApi.ts/supportApi.ts.
 */


export type AdPlacement = 'top_ticker' | 'left_rail' | 'right_rail' | 'mid_grid' | 'sidebar';

export interface AdSlot {
  id: string;
  placement: AdPlacement;
  title: string;
  tagline?: string;
  priceTag?: string;
  buttonText?: string;
  buttonUrl?: string;
  backgroundColor: string;
  textColor: string;
  opacity: number;
  isVisible: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdSlotInput {
  placement: AdPlacement;
  title: string;
  tagline?: string;
  priceTag?: string;
  buttonText?: string;
  buttonUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  opacity?: number;
  sortOrder?: number;
}

export type AdApiErrorKind = 'network' | 'unauthenticated' | 'forbidden' | 'validation' | 'not_found' | 'server';

export class AdApiError extends Error {
  kind: AdApiErrorKind;
  status?: number;
  constructor(message: string, kind: AdApiErrorKind, status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

async function adFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await request<T>(path, { method: options.method, body: options.body, headers: options.headers as Record<string, string> });
  } catch (err) {
    const error = err instanceof HttpRequestError ? err : new HttpRequestError('Request failed.');
    const kind: AdApiErrorKind = error.status === 401 ? 'unauthenticated' : error.status === 403 ? 'forbidden' : error.status === 404 ? 'not_found' : error.status === 400 ? 'validation' : 'server';
    throw new AdApiError(error.message, kind, error.status);
  }
}

/** GET /api/ads - public, only currently-visible ad slots. No auth
 * required (every real visitor sees these, signed in or not). */
export async function getVisibleAdSlots(placement?: AdPlacement): Promise<AdSlot[]> {
  const query = placement ? `?placement=${placement}` : '';
  const body = await adFetch<{ data: AdSlot[] }>(`/api/ads${query}`);
  return body.data || [];
}

/** GET /api/ads/all - admin-only, every slot including hidden ones. */
export async function getAllAdSlots(): Promise<AdSlot[]> {
  const body = await adFetch<{ data: AdSlot[] }>('/api/ads/all');
  return body.data || [];
}

/** POST /api/ads - admin-only, create a new ad slot. */
export async function createAdSlot(input: AdSlotInput): Promise<AdSlot> {
  const body = await adFetch<{ data: AdSlot }>('/api/ads', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return body.data;
}

/** PUT /api/ads/:id - admin-only, update any field(s) of an existing
 * ad slot (title, tagline, colors, opacity, visibility, order). */
export async function updateAdSlot(id: string, updates: Partial<AdSlotInput & { isVisible: boolean }>): Promise<AdSlot> {
  const body = await adFetch<{ data: AdSlot }>(`/api/ads/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return body.data;
}

/** DELETE /api/ads/:id - admin-only, permanently remove an ad slot. */
export async function deleteAdSlot(id: string): Promise<void> {
  await adFetch<{ success: boolean }>(`/api/ads/${id}`, { method: 'DELETE' });
}


/** Record a real delivery event. Best-effort from the public UI; reporting never blocks rendering. */
export async function recordAdEvent(id: string, type: 'impression' | 'click'): Promise<void> {
  await adFetch<{ success: boolean }>(`/api/ads/${id}/events`, {
    method: 'POST',
    body: JSON.stringify({ type }),
  });
}

export interface AdStat {
  id: string; title: string; placement: AdPlacement; status: string; isVisible: boolean;
  impressions: number; clicks: number; ctr: number;
}

export async function getAdStats(): Promise<AdStat[]> {
  const body = await adFetch<{ data: AdStat[] }>('/api/ads/stats');
  return body.data || [];
}
