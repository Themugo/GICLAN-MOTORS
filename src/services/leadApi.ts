import { httpRequest } from "../api/httpRequest";

export interface LeadListParams {
  stage?: string;
  source?: string;
  isHot?: boolean;
  vehicle?: string;
  archived?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

const request = async <T>(path: string, options?: Parameters<typeof httpRequest>[1]) => {
  const response = await httpRequest<T>(path, options);
  return (response as any)?.data ?? response;
};

const withParams = (path: string, params: Record<string, unknown> = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const encoded = query.toString();
  return encoded ? `${path}?${encoded}` : path;
};

export const leadApi = {
  async list(params: LeadListParams = {}) {
    return request<{ leads: any[]; count: number; pagination: any }>(withParams("/api/leads", params), {
      method: "GET",
    });
  },
  async get(leadId: string) {
    return request<{ lead: any }>(`/api/leads/${leadId}`, { method: "GET" });
  },
  async updateStage(leadId: string, stage: string) {
    return request<{ lead: any }>(`/api/leads/${leadId}/stage`, {
      method: "PUT",
      body: { stage },
    });
  },
  async archive(leadId: string) {
    return request<{ lead: any }>(`/api/leads/${leadId}/archive`, { method: "PUT" });
  },
  async toggleHot(leadId: string) {
    return request<{ lead: any }>(`/api/leads/${leadId}/hot`, { method: "PUT" });
  },
  async addNote(leadId: string, note: string) {
    return request<{ lead: any }>(`/api/leads/${leadId}/notes`, { method: "POST", body: { note } });
  },
  async timeline(leadId: string) {
    return request<{ timeline: any[] }>(`/api/leads/${leadId}/timeline`, { method: "GET" });
  },
  async pipeline() {
    return request<{ pipeline: any[] }>("/api/leads/pipeline/view", { method: "GET" });
  },
  async analytics(params?: { startDate?: string; endDate?: string }) {
    return request<{ analytics: any }>(withParams("/api/leads/analytics/summary", params || {}), { method: "GET" });
  },
};

export default leadApi;
