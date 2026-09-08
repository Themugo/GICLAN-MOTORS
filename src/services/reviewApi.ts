import { httpRequest } from "../api/httpRequest";

export interface CreateReviewInput {
  dealer: string;
  carId?: string;
  rating: number;
  comment: string;
}

export interface ReviewRecord {
  id?: string;
  _id?: string;
  dealer?: string;
  carId?: string;
  rating: number;
  comment: string;
  status?: string;
  createdAt?: string;
}

const request = async <T>(path: string, options?: Parameters<typeof httpRequest>[1]) => {
  const response = await httpRequest<T>(path, options);
  return response;
};

export async function createReview(input: CreateReviewInput) {
  return request<{ success: boolean; message: string; review: ReviewRecord }>("/api/reviews", {
    method: "POST",
    body: input,
  });
}

export async function getMyReviews() {
  return request<{ success: boolean; reviews: ReviewRecord[]; pagination?: Record<string, unknown> }>("/api/reviews/my", {
    method: "GET",
  });
}

export async function getDealerReviews(dealerId: string) {
  return request<{ success: boolean; reviews: ReviewRecord[]; pagination?: Record<string, unknown> }>(`/api/reviews/dealer/${encodeURIComponent(dealerId)}`, {
    method: "GET",
  });
}

export async function deleteReview(id: string) {
  return request<{ success: boolean; message: string }>(`/api/reviews/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export const reviewApi = { createReview, getMyReviews, getDealerReviews, deleteReview };
export default reviewApi;
