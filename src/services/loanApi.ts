import { request, HttpRequestError } from '../api/httpRequest';
/**
 * Real backend loan-application client - a buyer submits a real
 * application, sees their own real applications and status, and an
 * admin can review/update status. Following the same fetch-client
 * pattern already established elsewhere in this project.
 */


export type LoanStatus = 'submitted' | 'under_review' | 'approved' | 'declined' | 'withdrawn';

export interface LoanApplication {
  id: string;
  applicant: string;
  car?: { id: string; title: string } | null;
  vehiclePrice: number;
  depositAmount?: number;
  loanAmount: number;
  termMonths?: number;
  monthlyIncome?: number;
  employmentStatus?: string;
  status: LoanStatus;
  reviewerNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoanApplicationInput {
  car?: string;
  vehiclePrice: number;
  depositAmount?: number;
  loanAmount: number;
  termMonths?: number;
  monthlyIncome?: number;
  employmentStatus?: string;
}

export type LoanApiErrorKind = 'network' | 'unauthenticated' | 'forbidden' | 'validation' | 'not_found' | 'server';

export class LoanApiError extends Error {
  kind: LoanApiErrorKind;
  status?: number;
  constructor(message: string, kind: LoanApiErrorKind, status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

async function loanFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await request<T>(path, { method: options.method, body: options.body, headers: options.headers as Record<string, string> });
  } catch (err) {
    const error = err instanceof HttpRequestError ? err : new HttpRequestError('Request failed.');
    const kind: LoanApiErrorKind = error.status === 401 ? 'unauthenticated' : error.status === 403 ? 'forbidden' : error.status === 404 ? 'not_found' : error.status === 400 ? 'validation' : 'server';
    throw new LoanApiError(error.message, kind, error.status);
  }
}

/** POST /api/loans - submit a real loan application. */
export async function createLoanApplication(input: LoanApplicationInput): Promise<LoanApplication> {
  const body = await loanFetch<{ data: LoanApplication }>('/api/loans', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return body.data;
}

/** GET /api/loans/my - the real, signed-in applicant's own applications. */
export async function getMyLoanApplications(): Promise<LoanApplication[]> {
  const body = await loanFetch<{ data: LoanApplication[] }>('/api/loans/my');
  return body.data || [];
}
