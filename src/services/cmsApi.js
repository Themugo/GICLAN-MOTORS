import { api } from '../api/httpClient';

// Add auth token if available

// ============================================
// PAGES
// ============================================

export const getPages = (params = {}) => api.get('/cms/pages', { params });
export const getPageById = (id) => api.get(`/cms/pages/${id}`);
export const getPageBySlug = (slug) => api.get(`/cms/pages/s/${slug}`);
export const createPage = (data) => api.post('/cms/pages', data);
export const updatePage = (id, data) => api.put(`/cms/pages/${id}`, data);
export const deletePage = (id) => api.delete(`/cms/pages/${id}`);
export const publishPage = (id) => api.post(`/cms/pages/${id}/publish`);
export const unpublishPage = (id) => api.post(`/cms/pages/${id}/unpublish`);
export const schedulePage = (id, scheduleAt) => api.post(`/cms/pages/${id}/schedule`, { scheduleAt });
export const rollbackPage = (id, version) => api.post(`/cms/pages/${id}/rollback`, { version });

// ============================================
// CONTENT (BLOG / NEWS)
// ============================================

export const getContents = (params = {}) => api.get('/cms/content', { params });
export const getContentById = (id) => api.get(`/cms/content/${id}`);
export const getContentBySlug = (slug) => api.get(`/cms/content/s/${slug}`);
export const createContent = (data) => api.post('/cms/content', data);
export const updateContent = (id, data) => api.put(`/cms/content/${id}`, data);
export const deleteContent = (id) => api.delete(`/cms/content/${id}`);

// ============================================
// FAQS
// ============================================

export const getFaqs = (params = {}) => api.get('/cms/faqs', { params });
export const getFaqById = (id) => api.get(`/cms/faqs/${id}`);
export const createFaq = (data) => api.post('/cms/faqs', data);
export const updateFaq = (id, data) => api.put(`/cms/faqs/${id}`, data);
export const deleteFaq = (id) => api.delete(`/cms/faqs/${id}`);
export const incrementFaqPopularity = (id) => api.post(`/cms/faqs/${id}/popularity`);

// ============================================
// CAMPAIGNS
// ============================================

export const getCampaigns = (params = {}) => api.get('/cms/campaigns', { params });
export const getCampaignById = (id) => api.get(`/cms/campaigns/${id}`);
export const createCampaign = (data) => api.post('/cms/campaigns', data);
export const updateCampaign = (id, data) => api.put(`/cms/campaigns/${id}`, data);
export const deleteCampaign = (id) => api.delete(`/cms/campaigns/${id}`);

// ============================================
// BANNERS
// ============================================

export const getBanners = (params = {}) => api.get('/cms/banners', { params });
export const getBannerById = (id) => api.get(`/cms/banners/${id}`);
export const createBanner = (data) => api.post('/cms/banners', data);
export const updateBanner = (id, data) => api.put(`/cms/banners/${id}`, data);
export const deleteBanner = (id) => api.delete(`/cms/banners/${id}`);
export const reorderBanners = (banners) => api.post('/cms/banners/reorder', { banners });

// ============================================
// MEDIA LIBRARY
// ============================================

export const getMedia = (params = {}) => api.get('/cms/media', { params });
export const getMediaById = (id) => api.get(`/cms/media/${id}`);
export const uploadMedia = (data) => api.post('/cms/media', data, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const updateMedia = (id, data) => api.put(`/cms/media/${id}`, data);
export const deleteMedia = (id) => api.delete(`/cms/media/${id}`);

// ============================================
// TAXONOMIES (Categories & Tags)
// ============================================

export const getTaxonomies = (type) => api.get('/cms/taxonomies', { params: { type } });
export const createTaxonomy = (data) => api.post('/cms/taxonomies', data);
export const updateTaxonomy = (id, data) => api.put(`/cms/taxonomies/${id}`, data);
export const deleteTaxonomy = (id) => api.delete(`/cms/taxonomies/${id}`);

// ============================================
// REVISIONS
// ============================================

export const getRevisions = (contentId, contentType) => 
  api.get('/cms/revisions', { params: { contentId, contentType } });
export const getRevisionById = (id) => api.get(`/cms/revisions/${id}`);

// ============================================
// A/B TESTS
// ============================================

export const getABTests = (status) => api.get('/cms/ab-tests', { params: { status } });
export const createABTest = (data) => api.post('/cms/ab-tests', data);
export const updateABTest = (id, data) => api.put(`/cms/ab-tests/${id}`, data);
export const deleteABTest = (id) => api.delete(`/cms/ab-tests/${id}`);

// ============================================
// ANALYTICS
// ============================================

export const trackAnalytics = (data) => api.post('/cms/analytics/track', data);
export const getAnalytics = (params) => api.get('/cms/analytics', { params });
export const getContentAnalytics = (contentId) => api.get(`/cms/analytics/content/${contentId}`);
export const getDashboardStats = () => api.get('/cms/dashboard/stats');

// ============================================
// PUBLISHING CALENDAR & SEARCH
// ============================================

export const getPublishingCalendar = (startDate, endDate) =>
  api.get('/cms/calendar', { params: { startDate, endDate } });
export const searchContent = (q, type) =>
  api.get('/cms/search', { params: { q, type } });

