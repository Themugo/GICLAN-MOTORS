import { request, HttpRequestError } from '../api/httpRequest';
/**
 * Real backend support-ticket API client.
 *
 * Follows the exact pattern established in authApi.ts/vehicleApi.ts/
 * favoriteApi.ts/inspectionApi.ts: typed error class with a `kind`
 * field, `credentials: 'include'` on every request (the real backend
 * requires auth for every /api/support endpoint - confirmed via
 * `protect` middleware on every route in backend/routes/supportRoutes.js).
 *
 * This is the canonical frontend transport for both customer and
 * support-agent ticket operations.
 */


export interface SupportTicket {
  id: string;
  ticketNumber?: string;
  category?: string;
  priority?: string;
  subject: string;
  description: string;
  status: string;
  createdAt?: string;
  sla?: {
    firstResponseTarget?: string;
    resolutionTarget?: string;
  };
}

export interface CreateTicketPayload {
  category: string;
  priority?: string;
  subject: string;
  description: string;
  relatedCar?: string;
  relatedEscrow?: string;
  relatedPayment?: string;
}

export type SupportApiErrorKind = 'network' | 'unauthenticated' | 'not_found' | 'server' | 'unknown';

export class SupportApiError extends Error {
  kind: SupportApiErrorKind;
  status?: number;
  constructor(message: string, kind: SupportApiErrorKind, status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

async function supportFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await request<T>(path, { method: options.method, body: options.body, headers: options.headers as Record<string, string> });
  } catch (err) {
    const error = err instanceof HttpRequestError ? err : new HttpRequestError('Request failed.');
    const kind: SupportApiErrorKind = error.status === 401 ? 'unauthenticated' : error.status === 404 ? 'not_found' : 'server';
    throw new SupportApiError(error.message, kind, error.status);
  }
}

/** POST /api/support - create a real support ticket. Requires
 * authentication (the backend's own protect middleware applies to
 * this entire route file, confirmed directly). */
export async function createSupportTicket(
  payload: CreateTicketPayload
): Promise<{ success: boolean; ticket: SupportTicket }> {
  return supportFetch('/api/support', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** GET /api/support/my-tickets - the caller's own tickets. */
export async function getMySupportTickets(): Promise<{ success: boolean; tickets: SupportTicket[] }> {
  return supportFetch('/api/support/my-tickets', { method: 'GET' });
}

export interface SupportTicketListParams { status?: string; priority?: string; category?: string; assignedTo?: string; search?: string; page?: number; limit?: number; }

export async function getSupportTicket(id: string): Promise<{ success: boolean; ticket: SupportTicket }> {
  return supportFetch(`/api/support/${id}`, { method: 'GET' });
}

export async function addSupportTicketMessage(id: string, payload: { content: string; isInternal?: boolean; attachments?: unknown[] }): Promise<{ success: boolean; ticket: SupportTicket }> {
  return supportFetch(`/api/support/${id}/messages`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateSupportTicketStatus(id: string, payload: { status: string; assignedTo?: string | null; escalatedTo?: string | null; priority?: string; resolutionNotes?: string }): Promise<{ success: boolean; ticket: SupportTicket }> {
  return supportFetch(`/api/admin/support-tickets/${id}/status`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function assignSupportTicket(id: string, assignedTo: string | null): Promise<{ success: boolean; ticket: SupportTicket }> {
  return supportFetch(`/api/admin/support-tickets/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ assignedTo }) });
}

export async function addAdminSupportTicketMessage(id: string, payload: { content: string; isInternal?: boolean }): Promise<{ success: boolean; ticket: SupportTicket }> {
  return supportFetch(`/api/admin/support-tickets/${id}/messages`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function getAdminSupportTickets(params: SupportTicketListParams = {}): Promise<{ success: boolean; tickets: SupportTicket[]; pagination?: { page: number; limit: number; total: number; pages: number } }> {
  const query = new URLSearchParams(); Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') query.set(k, String(v)); });
  return supportFetch(`/api/admin/support-tickets${query.toString() ? `?${query}` : ''}`, { method: 'GET' });
}

export async function getSupportTicketStats(): Promise<{ success: boolean; stats?: unknown; total?: number; resolvedToday?: number }> {
  return supportFetch('/api/admin/support-tickets/stats', { method: 'GET' });
}
