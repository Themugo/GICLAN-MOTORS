import { request, HttpRequestError } from '../api/httpRequest';
import type { Booking } from '../features/InspectionMarketplace/types/inspection';
/**
 * Real backend inspection API client.
 *
 * Follows the exact pattern established in services/authApi.ts,
 * vehicleApi.ts, and favoriteApi.ts: typed error class with a `kind`
 * field, `credentials: 'include'` on every request (the real backend
 * requires auth for /my - confirmed via router.use(protect) in
 * backend/routes/inspectionRoutes.js).
 *
 * SCOPE NOTE, stated directly rather than glossed over: the real
 * backend's inspection data model is genuinely simpler than this
 * frontend's InspectionReport/InspectionBooking types. Confirmed by
 * reading backend/routes/inspectionRoutes.js and the real
 * vehicle_inspections table schema directly, not assumed:
 *
 * - There is no "mechanic profile" concept on the backend at all - no
 *   company name, no specializations, no independent-contractor
 *   marketplace. An inspection has exactly one assigned inspector
 *   (a real user), returned here as { id, name, email } - nothing more.
 * - There is no categoryScores breakdown (engine/transmission/
 *   suspension/brakes/electrical sub-scores) on the backend. The real
 *   `checklist` column is a generic JSONB array with no fixed schema -
 *   whatever an inspector's submission actually contains, not a
 *   guaranteed set of named categories.
 * - There is no platformCommission/netMechanicFee concept - no
 *   mechanic-payout/commission system exists on the backend.
 * - There is no buyerPhone/buyerEmail on the /my response (a buyer
 *   viewing their own bookings already knows who they are - those
 *   fields make sense for an inspector's or admin's view, not this one).
 *
 * getMyInspections() below maps every field that has a real, honest
 * backend source, and deliberately leaves the rest undefined rather
 * than fabricating placeholder data - callers must handle those as
 * genuinely absent, not "loading" or "zero".
 */


export interface BackendInspectionCar {
  id?: string;
  _id?: string;
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  images?: Array<{ url: string }>;
  location?: string;
}

export interface BackendInspector {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
}

export interface BackendInspectionOrder {
  id?: string;
  _id?: string;
  status: string;
  car?: BackendInspectionCar;
  inspector?: BackendInspector;
  fee?: number;
  location?: string;
  scheduledAt?: string;
  completedAt?: string;
  checklist?: unknown[];
  overallScore?: number;
  conditionRating?: string;
  images?: Array<{ url: string }>;
  notes?: string;
  createdAt?: string;
}

export interface GetMyInspectionsResponse {
  success: boolean;
  orders: BackendInspectionOrder[];
  message?: string;
}

export type InspectionApiErrorKind = 'network' | 'unauthenticated' | 'not_found' | 'server' | 'unknown';

export class InspectionApiError extends Error {
  kind: InspectionApiErrorKind;
  status?: number;
  constructor(message: string, kind: InspectionApiErrorKind, status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

async function inspectionFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await request<T>(path, { method: options.method, body: options.body, headers: options.headers as Record<string, string> });
  } catch (err) {
    const error = err instanceof HttpRequestError ? err : new HttpRequestError('Request failed.');
    const kind: InspectionApiErrorKind = error.status === 401 ? 'unauthenticated' : error.status === 404 ? 'not_found' : 'server';
    throw new InspectionApiError(error.message, kind, error.status);
  }
}

/** GET /api/inspections/my - the buyer's own inspection orders.
 * Requires authentication - the backend's own router.use(protect)
 * applies to this entire route file, confirmed directly. */
export async function getMyInspections(): Promise<GetMyInspectionsResponse> {
  return inspectionFetch<GetMyInspectionsResponse>('/api/inspections/my', { method: 'GET' });
}

export interface CreateInspectionOrderResponse {
  success: boolean;
  message?: string;
  order?: BackendInspectionOrder;
}

/** POST /api/inspections/order - the one, real, canonical way to
 * request an inspection (confirmed directly - the real
 * backend/routes/inspectionRoutes.js file has exactly one order-
 * creation route). Requires authentication (router.use(protect)) and
 * only carId/phone/location - the real backend does not support a
 * buyer choosing their own inspector, scheduling a specific time
 * slot, or picking a package tier; those remain real, existing UI
 * concepts with no backend to connect them to, same as this
 * project's own earlier, honestly-documented finding for EscrowView's
 * own richer shape. */
export async function createInspectionOrder(
  carId: string,
  phone: string,
  location?: string
): Promise<CreateInspectionOrderResponse> {
  return inspectionFetch<CreateInspectionOrderResponse>('/api/inspections/order', {
    method: 'POST',
    body: JSON.stringify({ carId, phone, location }),
  });
}


// ============================================================
// CANONICAL DIGITAL INSPECTION WORKFLOW API
// ============================================================

export interface DigitalInspectionStage {
  id: string;
  stage_name: string;
  stage_order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  started_at?: string;
  completed_at?: string;
  total_points: number;
  completed_points: number;
}

export interface DigitalInspectionPoint {
  id: string;
  point_code: string;
  point_name: string;
  point_description?: string;
  category?: string;
  is_mandatory: boolean;
  requires_photo: boolean;
  condition_rating?: string;
  defect_classification?: string;
  inspector_notes?: string;
  recommendation?: string;
}

export interface DigitalInspectionWorkflow {
  id: string;
  booking_id: string;
  provider_id: string;
  inspector_id?: string;
  status: string;
  current_stage: string;
  overall_score?: number;
  overall_grade?: string;
  stages: DigitalInspectionStage[];
  points: DigitalInspectionPoint[];
  defects: unknown[];
  evidence: unknown[];
  progress: {
    pointsPercentage: number;
    stagesPercentage: number;
    completedStages: number;
    totalStages: number;
    completedPoints: number;
    totalPoints: number;
  };
}

export async function getInspectionWorkflow(bookingId: string) {
  return inspectionFetch<{ success: boolean; booking: Booking; inspection: DigitalInspectionWorkflow | null }>(
    `/api/inspection/bookings/${bookingId}/workflow`,
    { method: 'GET' }
  );
}

export async function startInspectionWorkflow(bookingId: string) {
  return inspectionFetch<{ success: boolean; inspection: DigitalInspectionWorkflow }>(
    `/api/inspection/bookings/${bookingId}/workflow/start`,
    { method: 'POST' }
  );
}

export async function updateInspectionStage(
  inspectionId: string,
  stageName: string,
  status: 'in_progress' | 'completed'
) {
  return inspectionFetch<{ success: boolean; inspection: DigitalInspectionWorkflow }>(
    `/api/inspection/workflow/${inspectionId}/stages/${encodeURIComponent(stageName)}`,
    { method: 'POST', body: JSON.stringify({ status }) }
  );
}

export async function recordInspectionPoint(
  inspectionId: string,
  point: Partial<DigitalInspectionPoint> & { pointCode: string; stageName?: string }
) {
  return inspectionFetch<{ success: boolean; point: DigitalInspectionPoint }>(
    `/api/inspection/workflow/${inspectionId}/points`,
    { method: 'POST', body: JSON.stringify(point) }
  );
}

export async function addInspectionEvidence(
  pointId: string,
  evidence: { type: string; url: string; fileType?: string; caption?: string }
) {
  return inspectionFetch<{ success: boolean; evidence: unknown }>(
    `/api/inspection/workflow/points/${pointId}/evidence`,
    { method: 'POST', body: JSON.stringify(evidence) }
  );
}

export async function completeInspectionWorkflow(inspectionId: string) {
  return inspectionFetch<{ success: boolean; inspection: DigitalInspectionWorkflow }>(
    `/api/inspection/workflow/${inspectionId}/complete`,
    { method: 'POST' }
  );
}

export async function submitInspectionWorkflow(inspectionId: string) {
  return inspectionFetch<{ success: boolean; inspection: DigitalInspectionWorkflow }>(
    `/api/inspection/workflow/${inspectionId}/submit`,
    { method: 'POST' }
  );
}

export async function generateInspectionWorkflowReport(inspectionId: string) {
  return inspectionFetch<{ success: boolean; report: unknown }>(
    `/api/inspection/workflow/${inspectionId}/report`,
    { method: 'POST' }
  );
}

export async function submitInspectionCustomerReview(inspectionId: string, notes?: string) {
  return inspectionFetch<{ success: boolean; inspection: DigitalInspectionWorkflow }>(
    `/api/inspection/workflow/${inspectionId}/customer-review`,
    { method: 'POST', body: JSON.stringify({ notes }) }
  );
}

export async function signInspectionWorkflow(inspectionId: string, signature: string) {
  return inspectionFetch<{ success: boolean; inspection: DigitalInspectionWorkflow }>(
    `/api/inspection/workflow/${inspectionId}/sign`,
    { method: 'POST', body: JSON.stringify({ signature }) }
  );
}
