import { request } from '../api/httpRequest';

export interface OwnershipVehicle {
  id: string;
  passport_id?: string | null;
  vin: string;
  make: string;
  model: string;
  year?: number | null;
  registration_number?: string | null;
  colour?: string | null;
  ownership_type: string;
  current_mileage?: number | null;
  purchase_price?: number | null;
  sale_price?: number | null;
  status: string;
  services?: unknown[];
  reminders?: unknown[];
  documents?: unknown[];
  alerts?: unknown[];
  expenses?: unknown[];
  valueHistory?: unknown[];
  currentValue?: unknown;
}

export interface OwnershipDashboard {
  profile: Record<string, unknown>;
  currentVehicles: OwnershipVehicle[];
  soldVehicles: OwnershipVehicle[];
  upcomingReminders: unknown[];
  expenseSummary: { monthlyTotal: number; yearlyTotal: number; byCategory: Record<string, number>; currency: string };
}

interface ApiEnvelope<T> { success: boolean; data: T; message?: string }

export async function getOwnershipDashboard(): Promise<OwnershipDashboard> {
  const res = await request<ApiEnvelope<OwnershipDashboard>>('/api/ownership/dashboard');
  return res.data;
}

export async function addOwnershipVehicle(input: Record<string, unknown>): Promise<OwnershipVehicle> {
  const res = await request<ApiEnvelope<OwnershipVehicle>>('/api/ownership/vehicles', { method: 'POST', body: input });
  return res.data;
}

export async function getOwnershipVehicle(id: string): Promise<OwnershipVehicle> {
  const res = await request<ApiEnvelope<OwnershipVehicle>>(`/api/ownership/vehicles/${id}`);
  return res.data;
}

export async function completeOwnershipReminder(id: string, serviceRecordId?: string): Promise<unknown> {
  const res = await request<ApiEnvelope<unknown>>(`/api/ownership/reminders/${id}/complete`, { method: 'PATCH', body: { serviceRecordId } });
  return res.data;
}

export async function getPublicVehiclePassport(passportId: string): Promise<Record<string, unknown>> {
  const res = await request<ApiEnvelope<Record<string, unknown>>>(`/api/ownership/passports/${passportId}/public`);
  return res.data;
}

export async function getPublicVehiclePassportByVin(vin: string): Promise<Record<string, unknown>> {
  const res = await request<ApiEnvelope<Record<string, unknown>>>(`/api/ownership/passports/vin/${encodeURIComponent(vin)}`);
  return res.data;
}
