import { logError } from '../infrastructure/logging/index.js';
import { createDealerReview, deleteReview, listDealerReviews, listMyReviews } from '../services/review.service.js';

const handleError = (res, err, fallback) => {
  const status = Number(err?.statusCode) || 500;
  return res.status(status).json({ success: false, message: status === 500 ? fallback : err.message });
};

export const createReview = async (req, res) => {
  try {
    const review = await createDealerReview({
      reviewerId: req.user.id,
      dealerId: req.body.dealer,
      carId: req.body.carId,
      rating: req.body.rating,
      comment: req.body.comment,
    });
    return res.status(201).json({ success: true, message: 'Review submitted for moderation', review });
  } catch (err) {
    logError('createReview error:', err.message);
    return handleError(res, err, 'Failed to create review');
  }
};

export const getDealerReviews = async (req, res) => {
  try {
    const result = await listDealerReviews(req.params.dealerId, req.query);
    return res.json({ success: true, ...result });
  } catch (err) {
    logError('getDealerReviews error:', err.message);
    return handleError(res, err, 'Failed to fetch reviews');
  }
};

export const getMyReviews = async (req, res) => {
  try {
    const result = await listMyReviews(req.user.id, req.query);
    return res.json({ success: true, ...result });
  } catch (err) {
    logError('getMyReviews error:', err.message);
    return handleError(res, err, 'Failed to fetch reviews');
  }
};

export const deleteOwnReview = async (req, res) => {
  try {
    await deleteReview(req.params.id, req.user.id, req.user.role === 'admin' || req.user.role === 'super_admin');
    return res.json({ success: true, message: 'Review deleted' });
  } catch (err) {
    logError('deleteReview error:', err.message);
    return handleError(res, err, 'Failed to delete review');
  }
};
