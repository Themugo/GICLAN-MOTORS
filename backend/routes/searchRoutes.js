import express from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { optionalAuth } from '../middleware/auth.js';
import { search, autocomplete, facets } from '../controllers/searchController.js';

const router = express.Router();
router.get('/', optionalAuth, asyncHandler(search));
router.get('/facets', optionalAuth, asyncHandler(facets));
router.get('/autocomplete', optionalAuth, asyncHandler(autocomplete));
export default router;
