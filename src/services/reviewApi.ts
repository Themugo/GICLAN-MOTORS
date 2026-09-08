import { httpRequest } from '../api/httpRequest';

export interface CreateReviewInput {
  dealer: string;
  carId?: string;
  rating: number;
  comment: string;
}

export const createReview = (input: CreateReviewInput) =>
  httpRequest('/reviews', { method: 'POST', body: input });

export const getDealerReviews = (dealerId: string, params: Record<string, unknown> = {}) =>
  httpRequest(`/reviews/dealer/${dealerId}`, { method: 'GET', params });

export const getMyReviews = (params: Record<string, unknown> = {}) =>
  httpRequest('/reviews/my', { method: 'GET', params });

export const deleteReview = (id: string) =>
  httpRequest(`/reviews/${id}`, { method: 'DELETE' });
