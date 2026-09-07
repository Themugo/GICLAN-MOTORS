import { request, HttpRequestError } from '../api/httpRequest';

export interface LedgerApiError extends Error { kind?: 'network' | 'unauthenticated' | 'forbidden' | 'validation' | 'not_found' | 'server'; status?: number; }

async function ledgerFetch<T>(path: string): Promise<T> {
  try {
    return await request<T>(path);
  } catch (err) {
    const error = err instanceof HttpRequestError ? err : new HttpRequestError('Ledger request failed.');
    const kind = error.status === 401 ? 'unauthenticated' : error.status === 403 ? 'forbidden' : error.status === 404 ? 'not_found' : error.status === 400 ? 'validation' : error.status && error.status >= 500 ? 'server' : 'network';
    const wrapped = new Error(error.message) as LedgerApiError;
    wrapped.kind = kind;
    wrapped.status = error.status;
    throw wrapped;
  }
}

export async function getLedgerSummary() { return ledgerFetch<any>('/api/ledger/summary'); }
export async function getMyTransactions(params: { page?: number; limit?: number; type?: string; status?: string } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); });
  return ledgerFetch<any>(`/api/ledger/my${query.toString() ? `?${query}` : ''}`);
}
export async function getEscrowTransactions(escrowId: string, params: { page?: number; limit?: number } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined) query.set(key, String(value)); });
  return ledgerFetch<any>(`/api/ledger/escrow/${encodeURIComponent(escrowId)}${query.toString() ? `?${query}` : ''}`);
}
