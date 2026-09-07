import { api } from '../api/httpClient';

export const getDealerDashboard = () => api.get('/dealer-platform/dashboard').then(r => r.data);
export const getLeads = (params = {}) => api.get('/dealer-platform/leads', { params }).then(r => r.data);
export const updateLead = (leadId, body) => api.put(`/dealer-platform/leads/${leadId}`, body).then(r => r.data);
export const getCustomers = () => api.get('/dealer-platform/customers').then(r => r.data);
export const getMarketingCampaigns = () => api.get('/dealer-platform/marketing').then(r => r.data);
export const createCampaign = (body) => api.post('/dealer-platform/marketing', body).then(r => r.data);
export const getAuctionInventory = () => api.get('/dealer-platform/auctions').then(r => r.data);
export const getFinanceApplications = () => api.get('/dealer-platform/finance').then(r => r.data);
export const getInspectionOrders = () => api.get('/dealer-platform/inspections').then(r => r.data);
export const getTeamMembers = (params = {}) => api.get('/dealer-platform/team', { params }).then(r => r.data);
export const inviteTeamMember = (body) => api.post('/dealer-platform/team/invite', body).then(r => r.data);
export const updateTeamMember = (memberId, body) => api.put(`/dealer-platform/team/${memberId}`, body).then(r => r.data);
export const removeTeamMember = (memberId) => api.delete(`/dealer-platform/team/${memberId}`).then(r => r.data);
export const acceptTeamInvite = (token) => api.post('/dealer-platform/team/accept', { token }).then(r => r.data);
export const getDealerAnalytics = () => api.get('/dealer-platform/analytics').then(r => r.data);


export const getDealerProfile = (dealerId) => api.get(`/dealer-platform/profile/${dealerId}`).then(r => r.data);
export const updateDealerProfile = (dealerId, body) => api.put(`/dealer-platform/profile/${dealerId}`, body).then(r => r.data);
export const getReputation = () => api.get("/dealer-platform/reputation").then(r => r.data);

export const getDealerSubscription = () => api.get("/dealer-platform/subscription").then(r => r.data);
export const upgradeDealerSubscription = (body) => api.post("/dealer-platform/subscription/upgrade", body).then(r => r.data);
