import db from '../db/index.js';
import { getSupabase } from '../utils/supabase.js';

const PUBLIC_STATUSES = ['approved'];
const ADMIN_STATUSES = ['pending', 'approved', 'rejected'];

const normalizeId = (value) => String(value || '').trim();

async function enrichReviews(rows) {
  if (!rows.length) return rows;
  const userIds = [...new Set(rows.map((r) => r.reviewerId || r.user).filter(Boolean))];
  const dealerIds = [...new Set(rows.map((r) => r.dealerId || r.dealer).filter(Boolean))];
  const carIds = [...new Set(rows.map((r) => r.carId || r.car).filter(Boolean))];
  const [users, dealers, cars] = await Promise.all([
    userIds.length ? db.findAll('users', { filters: { id: { $in: userIds } }, select: 'id name email avatar' }) : [],
    dealerIds.length ? db.findAll('users', { filters: { id: { $in: dealerIds } }, select: 'id name email businessName avatar' }) : [],
    carIds.length ? db.findAll('cars', { filters: { id: { $in: carIds } }, select: 'id title brand model' }) : [],
  ]);
  const byId = (list) => new Map(list.map((x) => [String(x.id), x]));
  const userMap = byId(users); const dealerMap = byId(dealers); const carMap = byId(cars);
  return rows.map((r) => ({
    ...r,
    _id: r.id,
    user: userMap.get(String(r.reviewerId || r.user)) || null,
    reviewer: userMap.get(String(r.reviewerId || r.user)) || null,
    dealer: dealerMap.get(String(r.dealerId || r.dealer)) || null,
    car: carMap.get(String(r.carId || r.car)) || null,
  }));
}

export async function recalculateDealerRating(dealerId) {
  const rows = await db.findAll('reviews', {
    filters: { dealerId: normalizeId(dealerId), status: { $in: PUBLIC_STATUSES } },
    select: 'rating',
  });
  const total = rows.length;
  const average = total ? Math.round((rows.reduce((sum, r) => sum + Number(r.rating || 0), 0) / total) * 10) / 10 : 0;
  await db.update('users', normalizeId(dealerId), { dealerRating: average, reviewCount: total });
  return { averageRating: average, total };
}

export async function createDealerReview({ reviewerId, dealerId, carId, rating, comment }) {
  const reviewer = normalizeId(reviewerId); const dealer = normalizeId(dealerId);
  if (!reviewer || !dealer) throw Object.assign(new Error('Reviewer and dealer are required'), { statusCode: 400 });
  if (reviewer === dealer) throw Object.assign(new Error('You cannot review your own dealership'), { statusCode: 400 });
  const existing = await db.findOne('reviews', { reviewerId: reviewer, dealerId: dealer }, 'id status');
  if (existing) throw Object.assign(new Error('You have already reviewed this dealer'), { statusCode: 409 });
  const created = await db.create('reviews', {
    reviewerId: reviewer,
    dealerId: dealer,
    carId: carId ? normalizeId(carId) : null,
    rating: Number(rating),
    comment: String(comment).trim(),
    status: 'pending',
  });
  return (await enrichReviews([created]))[0];
}

export async function listDealerReviews(dealerId, { page = 1, limit = 20, includePending = false } = {}) {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const filters = { dealerId: normalizeId(dealerId) };
  if (!includePending) filters.status = { $in: PUBLIC_STATUSES };
  const result = await db.findAll('reviews', { filters, orderBy: 'createdAt', ascending: false, limit: safeLimit, offset: (safePage - 1) * safeLimit, count: true });
  const rows = await enrichReviews(result.data);
  const ratingRows = await db.findAll('reviews', { filters: { dealerId: normalizeId(dealerId), status: { $in: PUBLIC_STATUSES } }, select: 'rating' });
  const averageRating = ratingRows.length ? Math.round((ratingRows.reduce((s, r) => s + Number(r.rating || 0), 0) / ratingRows.length) * 10) / 10 : 0;
  return { reviews: rows, averageRating, total: result.count || 0, pages: Math.ceil((result.count || 0) / safeLimit), page: safePage, limit: safeLimit };
}

export async function listMyReviews(reviewerId, { page = 1, limit = 20 } = {}) {
  const safePage = Math.max(Number(page) || 1, 1); const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const result = await db.findAll('reviews', { filters: { reviewerId: normalizeId(reviewerId) }, orderBy: 'createdAt', ascending: false, limit: safeLimit, offset: (safePage - 1) * safeLimit, count: true });
  return { reviews: await enrichReviews(result.data), total: result.count || 0, pages: Math.ceil((result.count || 0) / safeLimit), page: safePage, limit: safeLimit };
}

export async function listAdminReviews({ status, dealerId, page = 1, limit = 20 } = {}) {
  const safePage = Math.max(Number(page) || 1, 1); const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const filters = {};
  if (status) filters.status = status;
  if (dealerId) filters.dealerId = normalizeId(dealerId);
  const result = await db.findAll('reviews', { filters, orderBy: 'createdAt', ascending: false, limit: safeLimit, offset: (safePage - 1) * safeLimit, count: true });
  return { reviews: await enrichReviews(result.data), total: result.count || 0, pages: Math.ceil((result.count || 0) / safeLimit), page: safePage, limit: safeLimit };
}

export async function moderateReview(reviewId, status, moderatorId) {
  if (!ADMIN_STATUSES.includes(status)) throw Object.assign(new Error('Invalid review status'), { statusCode: 400 });
  const review = await db.findById('reviews', normalizeId(reviewId));
  if (!review) throw Object.assign(new Error('Review not found'), { statusCode: 404 });
  const updated = await db.update('reviews', normalizeId(reviewId), {
    status,
    moderatedBy: moderatorId,
    moderatedAt: new Date().toISOString(),
  });
  await recalculateDealerRating(updated.dealerId);
  return (await enrichReviews([updated]))[0];
}

export async function deleteReview(reviewId, actorId, isAdmin = false) {
  const review = await db.findById('reviews', normalizeId(reviewId));
  if (!review) throw Object.assign(new Error('Review not found'), { statusCode: 404 });
  if (!isAdmin && String(review.reviewerId) !== String(actorId)) throw Object.assign(new Error('Not authorized'), { statusCode: 403 });
  const dealerId = review.dealerId;
  const { error } = await getSupabase().from('reviews').delete().eq('id', normalizeId(reviewId));
  if (error) throw error;
  await recalculateDealerRating(dealerId);
  return { id: normalizeId(reviewId), dealerId };
}

export { ADMIN_STATUSES };
