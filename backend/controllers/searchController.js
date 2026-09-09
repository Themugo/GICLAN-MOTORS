import { searchVehicles, getSearchSuggestions } from '../services/searchService.js';
import { trackSearch } from '../services/searchInsightsService.js';

export async function search(req, res) {
  const result = await searchVehicles(req.query);
  try { await trackSearch({ searchTerm: req.query.keyword || req.query.q || '', filters: req.query, userId: req.user?.id, userRole: req.user?.role, ipAddress: req.ip, userAgent: req.get('user-agent'), searchType: 'quick_search', category: 'listings', resultCount: result.data.length }); } catch { /* analytics failure must not break search */ }
  res.json({ success: true, ...result });
}

export async function autocomplete(req, res) {
  const suggestions = await getSearchSuggestions(req.query.q, Math.min(Number(req.query.limit) || 8, 8));
  res.json({ success: true, data: suggestions });
}
