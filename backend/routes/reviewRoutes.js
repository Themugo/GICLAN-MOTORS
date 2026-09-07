import express from 'express';
import { protect } from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { validate, validateQuery, reviewListQuerySchema } from '../middleware/validate.js';
import { reviewLimiter } from '../middleware/rateLimiter.js';
import { createReviewSchema } from '../validation/platform.schema.js';
import { createReview, getDealerReviews, getMyReviews, deleteOwnReview } from '../controllers/reviewController.js';

const router = express.Router();
router.post('/', protect, reviewLimiter, validate(createReviewSchema), asyncHandler(createReview));
router.get('/my', protect, validateQuery(reviewListQuerySchema), asyncHandler(getMyReviews));
router.get('/dealer/:dealerId', validateQuery(reviewListQuerySchema), asyncHandler(getDealerReviews));
router.delete('/:id', protect, asyncHandler(deleteOwnReview));
export default router;
