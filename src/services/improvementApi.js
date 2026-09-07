import { api } from '../api/httpClient';


// Dashboard
export const getInnovationDashboard = () => api.get('/improvement/dashboard');

// Improvements
export const getImprovementOpportunities = () => api.get('/improvement/opportunities');
export const createImprovement = (data) => api.post('/improvement/improvements', data);
export const updateImprovement = (id, data) => api.put(`/improvement/improvements/${id}`, data);

// AI Recommendations
export const getAIRecommendations = () => api.get('/improvement/recommendations');

// Customer Experience
export const getCustomerExperience = () => api.get('/improvement/customer-experience');

// UX Analytics
export const getUXAnalytics = () => api.get('/improvement/ux-analytics');

// Performance Lab
export const getPerformanceMetrics = () => api.get('/improvement/performance');

// Experiments
export const getExperiments = () => api.get('/improvement/experiments');
export const createExperiment = (data) => api.post('/improvement/experiments', data);
export const updateExperiment = (id, data) => api.put(`/improvement/experiments/${id}`, data);
export const startExperiment = (id) => api.post(`/improvement/experiments/${id}/start`);
export const stopExperiment = (id) => api.post(`/improvement/experiments/${id}/stop`);

// Product Health
export const getProductHealthScores = () => api.get('/improvement/health');

// Innovation Pipeline
export const getInnovationIdeas = () => api.get('/improvement/ideas');
export const createInnovationIdea = (data) => api.post('/improvement/ideas', data);
export const voteIdea = (id) => api.post(`/improvement/ideas/${id}/vote`);
export const updateIdeaStatus = (id, data) => api.put(`/improvement/ideas/${id}/status`, data);

// Roadmap
export const getRoadmap = () => api.get('/improvement/roadmap');

// Optimization
export const getMarketplaceOptimization = () => api.get('/improvement/optimization/marketplace');
export const getSearchOptimization = () => api.get('/improvement/optimization/search');
export const getRevenueOptimization = () => api.get('/improvement/optimization/revenue');

// Reports
export const getImprovementReport = () => api.get('/improvement/report');

// Technical Debt
export const getTechnicalDebt = () => api.get('/improvement/technical-debt');

// AI Assistant
export const askAssistant = (question) => api.post('/improvement/assistant', { question });

