import { request, HttpRequestError, type HttpRequestOptions } from '../api/httpRequest';

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'cancelled' | 'released' | 'refunded' | 'not_found';
export type PaymentType = 'bid' | 'auction_win' | 'buy' | 'listing' | 'subscription' | 'escrow' | 'package_upgrade' | string;

export interface BackendPayment {
  id: string;
  user: string;
  car?: string | null;
  amount: number;
  type: PaymentType;
  phone?: string;
  status: PaymentStatus;
  mpesaReceipt?: string | null;
  checkoutRequestId?: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt?: string | null;
  processed?: boolean;
  metadata?: Record<string, unknown>;
  platformFee?: number;
  dealerAmount?: number;
  mode?: string;
  referenceId?: string;
  referenceModel?: string;
  carDetails?: { title?: string; brand?: string; model?: string; year?: number } | null;
}

export interface PaymentListResponse {
  payments: BackendPayment[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface PaymentStatusResponse {
  status: PaymentStatus;
  payment?: BackendPayment;
}

export interface PaymentInitiationResponse {
  success: boolean;
  mode?: string;
  checkoutID?: string;
  checkoutRequestID?: string;
  payment?: BackendPayment;
  escrowId?: string;
  fundingAccount?: { id: string; accountName: string; accountType: 'bank'; bankName: string; accountNumber: string; branch?: string | null; currency: string; notes?: string | null } | null;
  fundingMethods?: string[];
  mpesaEligible?: boolean;
  message?: string;
}

export type PaymentApiErrorKind = 'network' | 'unauthenticated' | 'forbidden' | 'validation' | 'not_found' | 'server';

export class PaymentApiError extends Error {
  constructor(message: string, public kind: PaymentApiErrorKind, public status?: number) {
    super(message);
    this.name = 'PaymentApiError';
  }
}

async function paymentFetch<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
  try {
    return await request<T>(path, options);
  } catch (err) {
    const error = err instanceof HttpRequestError ? err : new HttpRequestError('Payment request failed.');
    const kind: PaymentApiErrorKind = error.status === 401 ? 'unauthenticated'
      : error.status === 403 ? 'forbidden'
      : error.status === 404 ? 'not_found'
      : error.status === 400 ? 'validation'
      : error.status && error.status >= 500 ? 'server' : 'network';
    throw new PaymentApiError(error.message, kind, error.status);
  }
}

export async function initiatePayment(body: { phone: string; amount: number; carId?: string; type: PaymentType }): Promise<PaymentInitiationResponse> {
  return paymentFetch<PaymentInitiationResponse>('/api/payments/initiate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getPaymentStatus(checkoutRequestId: string): Promise<PaymentStatusResponse> {
  return paymentFetch<PaymentStatusResponse>(`/api/payments/status/${encodeURIComponent(checkoutRequestId)}`);
}

export async function getMyPayments(params: { page?: number; limit?: number; status?: string; type?: string } = {}): Promise<PaymentListResponse> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); });
  const body = await paymentFetch<PaymentListResponse>(`/api/payments/my${query.toString() ? `?${query}` : ''}`);
  return body;
}

export async function getPaymentByCheckout(checkoutRequestId: string): Promise<BackendPayment> {
  const body = await paymentFetch<{ payment?: BackendPayment; data?: BackendPayment }>(`/api/payments/checkout/${encodeURIComponent(checkoutRequestId)}`);
  const payment = body.payment || body.data;
  if (!payment) throw new PaymentApiError('Payment record not found.', 'not_found', 404);
  return payment;
}

export async function getPaymentById(id: string): Promise<BackendPayment> {
  const body = await paymentFetch<{ payment?: BackendPayment; data?: BackendPayment }>(`/api/payments/${encodeURIComponent(id)}`);
  const payment = body.payment || body.data;
  if (!payment) throw new PaymentApiError('Payment record not found.', 'not_found', 404);
  return payment;
}

export async function getAllPayments(params: { page?: number; limit?: number; status?: string; type?: string } = {}): Promise<PaymentListResponse> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); });
  return paymentFetch<PaymentListResponse>(`/api/payments${query.toString() ? `?${query}` : ''}`);
}
