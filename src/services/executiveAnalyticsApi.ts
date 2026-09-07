import { request } from '../api/httpRequest';

export interface ExecutiveAnalytics {
  periodDays: number;
  totals: { users: number; dealers: number; vehicles: number; bids: number };
  gmv: { total: number; today: number; yesterday: number; growthPercent: number };
  revenue: { total: number; feeRate: number; averageOrderValue: number };
  activity: { activeUsers: number; activeEscrows: number; soldVehicles: number; activeListings: number };
  conversion: { views: number; leads: number; sales: number; viewToLeadPercent: number; leadToSalePercent: number; viewToSalePercent: number };
  retention: { returningUsers: number; ratePercent: number };
  generatedAt: string;
}

export async function getExecutiveAnalytics(days = 30): Promise<ExecutiveAnalytics> {
  const response = await request<{ success: boolean; dashboard: ExecutiveAnalytics }>(`/api/executive-analytics/dashboard?days=${days}`);
  return response.dashboard;
}

export async function getSalesAnalytics(days = 30) {
  const response = await request<{ success: boolean; dashboard: unknown }>(`/api/v1/analytics/sales?days=${days}`);
  return response.dashboard;
}
