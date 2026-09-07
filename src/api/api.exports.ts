// src/api/api.exports.ts
// All the per-route API objects.
import { api, unwrap } from "./httpClient";

// ── AUTH ──────────────────────────────────────────────
import {
  login as authLogin,
  register as authRegister,
  logout as authLogout,
  getMe as authGetMe,
  updateProfile as authUpdateProfile,
  changePassword as authChangePassword,
  forgotPassword as authForgotPassword,
  resetPassword as authResetPassword,
  verifyEmail as authVerifyEmail,
  resendVerification as authResendVerification,
  sendOTP as authSendOTP,
  verifyPhone as authVerifyPhone,
  phoneStatus as authPhoneStatus,
} from '../services/authApi';

// Canonical authentication adapter. All legacy callers keep their existing
// response shape while the actual transport is the verified /api/v1/auth
// cookie-based client. No second authentication implementation remains.
export const authAPI = {
  register: async (body: any) => ({ success: true, user: await authRegister(body) }),
  login: async (body: any) => ({ success: true, user: await authLogin(body.email, body.password) }),
  refresh: () => api.post('/v1/auth/refresh').then(unwrap),
  logout: async () => ({ success: true, ...(await authLogout(), {}) }),
  profile: async () => { const user = await authGetMe(); return { success: !!user, user }; },
  me: async () => { const user = await authGetMe(); return { success: !!user, user }; },
  changePassword: (body: any) => authChangePassword(body),
  forgotPassword: (body: any) => authForgotPassword(body),
  resetPassword: (body: any) => authResetPassword(body),
  verifyEmail: (token: string) => authVerifyEmail(token),
  resendVerification: (body: any) => authResendVerification(body),
  updateProfile: async (body: any) => ({ success: true, user: await authUpdateProfile(body) }),
  sendOTP: () => authSendOTP(),
  verifyPhone: (otp: string) => authVerifyPhone(otp),
  phoneStatus: () => authPhoneStatus(),
};

// ── CARS ──────────────────────────────────────────────
export const carsAPI = {
  list: (params: any) => api.get('/cars', { params }).then(unwrap),
  // BrowsePage and MobileBrowsePage both call this, but it never
  // existed — every call threw immediately and silently fell back to
  // hardcoded mock data. Wraps the real /cars endpoint with the
  // page/limit params it actually expects, and normalizes its
  // { data, cars, pagination: { total, pages } } response into the
  // flat { cars, total, hasMore } shape both pages consume.
  listPaginated: async (params: any, pageNum: number, pageSize: number) => {
    const res: any = await api.get('/cars', { params: { ...params, page: pageNum, limit: pageSize } }).then(unwrap);
    const cars = res.cars || res.data || [];
    const total = res.pagination?.total ?? cars.length;
    const pages = res.pagination?.pages ?? Math.ceil(total / pageSize);
    return { cars, total, hasMore: pageNum < pages };
  },
  get:  (id: string)     => api.get(`/cars/${id}`).then(unwrap),
  insights: (id: string) => api.get(`/cars/${id}/insights`).then(unwrap),
  priceHistory: (id: string) => api.get(`/cars/${id}/price-history`).then(unwrap),
  trackClick: (id: string) => api.post(`/cars/${id}/click`).then(unwrap),
  create: (formData: FormData) =>
    api.post('/cars', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  addImages: (id: string, formData: FormData) =>
    api.post(`/cars/${id}/images`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  deleteImage: (id: string, idx: number) => api.delete(`/cars/${id}/images/${idx}`).then(unwrap),
  deleteImages: async (id: string, indices: number[]) => {
    const sorted = [...indices].sort((a, b) => b - a);
    const results: any[] = [];
    for (const idx of sorted) {
      const res = await api.delete(`/cars/${id}/images/${idx}`).then(unwrap);
      results.push(res);
    }
    return results;
  },
  update:  (id: string, body: any) => api.put(`/cars/${id}`, body).then(unwrap),
  promote: (id: string, body: any) => api.patch(`/cars/${id}/promote`, body).then(unwrap),
  remove: (id: string)       => api.delete(`/cars/${id}`).then(unwrap),
  myCars:    ()      => api.get('/cars/dealer/my-cars').then(unwrap),
  analytics: ()      => api.get('/cars/dealer/analytics').then(unwrap),
  bid: (id: string, body: any)        => api.post(`/cars/${id}/bid`, body).then(unwrap),
  toggleFav: (id: string)        => api.post(`/cars/${id}/favorite`).then(unwrap),
  batch: (body: any)         => api.post('/cars/batch', body).then(unwrap),
  fraudCheck: (id: string) => api.get(`/cars/admin/${id}/fraud`).then(unwrap),
  adminStart: (id: string) => api.post(`/cars/admin/${id}/start`).then(unwrap),
  adminEnd:   (id: string) => api.post(`/cars/admin/${id}/end`).then(unwrap),
};

// ── BIDS ──────────────────────────────────────────────
export const bidsAPI = {
  place:           (carId: string, body: any) => api.post(`/bids/${carId}/bid`, body).then(unwrap),
  getForCar:       (carId: string)       => api.get(`/bids/${carId}/bids`).then(unwrap),
  endAuction:      (carId: string)       => api.post(`/bids/${carId}/end`).then(unwrap),
  adminAll:        (params: any)      => api.get('/bids/admin/all', { params }).then(unwrap),
  adminSuspicious: ()            => api.get('/bids/admin/suspicious').then(unwrap),
  adminSetWinner:  (bidId: string)       => api.post(`/bids/admin/${bidId}/set-winner`).then(unwrap),
  myBids:         ()              => api.get('/bids/my').then(unwrap),
};

// ── PAYMENTS ──────────────────────────────────────────
export const paymentsAPI = {
  initiate:    (body: any)      => api.post('/payments/initiate', body, { timeout: 45000 }).then(unwrap),
  status:      (id: string)        => api.get(`/payments/status/${id}`).then(unwrap),
  myPayments:  (params?: any) => api.get('/payments/my', { params }).then(unwrap),
  byCheckout:  (checkoutId: string)=> api.get(`/payments/checkout/${checkoutId}`).then(unwrap),
  all:         (params?: any)       => api.get('/payments', { params }).then(unwrap),
  byId:        (id: string)        => api.get(`/payments/${id}`).then(unwrap),
};

// ── ESCROW ────────────────────────────────────────────
export const escrowAPI = {
  mine:    ()              => api.get('/escrow/my').then(unwrap),
  all:     (params: any)        => api.get('/escrow', { params }).then(unwrap),
  get:     (id: string)            => api.get(`/escrow/${id}`).then(unwrap),
  release:        (id: string)          => api.post(`/escrow/${id}/release`).then(unwrap),
  refund:         (id: string)          => api.post(`/escrow/${id}/refund`).then(unwrap),
  dispute:        (id: string, reason: string) => api.post(`/escrow/${id}/dispute`, { reason }).then(unwrap),
  requestRelease: (id: string)          => api.post(`/escrow/${id}/request-release`).then(unwrap),
  confirmVehicle: (id: string)          => api.post(`/escrow/${id}/confirm-vehicle`).then(unwrap),
  confirmDelivery:(id: string)          => api.post(`/escrow/${id}/confirm-delivery`).then(unwrap),
  close:          (id: string)          => api.post(`/escrow/${id}/close`).then(unwrap),
};

// ── DEALER ────────────────────────────────────────────
export const dealerAPI = {
  earnings:   (params: any) => api.get('/dealer/earnings', { params }).then(unwrap),
  cars:       (params: any) => api.get('/dealer/cars', { params }).then(unwrap),
  analytics:  (params: any) => api.get('/dealer/analytics', { params }).then(unwrap),
  summary:    ()       => api.get('/dealer/summary').then(unwrap),
  quickStats: ()       => api.get('/dealer/quick-stats').then(unwrap),
  bids:       (params: any) => api.get('/dealer/bids', { params }).then(unwrap),
  duplicate:  (carId: string)        => api.post(`/dealer/cars/${carId}/duplicate`).then(unwrap),
  markSold:   (carId: string, body: any)  => api.patch(`/dealer/cars/${carId}/mark-sold`, body).then(unwrap),
  acceptBid:  (carId: string, bidId: string) => api.post(`/dealer/cars/${carId}/accept-bid`, { bidId }).then(unwrap),
  rejectBid:  (carId: string, bidId: string) => api.post(`/dealer/cars/${carId}/reject-bid`, { bidId }).then(unwrap),
  bulkStatus: (body: any)         => api.patch('/dealer/cars/bulk-status', body).then(unwrap),
  bulkDelete: (ids: string[])     => api.post('/dealer/cars/bulk-delete', { ids }).then(unwrap),
  exportCSV:  (params: any)       => api.get('/dealer/cars', { params, responseType: 'blob' }).then(r => r.data),
  getTeam:        ()             => api.get('/dealer/team').then(unwrap),
  inviteMember:   (body: any)         => api.post('/dealer/team/invite', body).then(unwrap),
  updateMember:   (memberId: string, body: any) => api.patch(`/dealer/team/${memberId}`, body).then(unwrap),
  removeMember:   (memberId: string)     => api.delete(`/dealer/team/${memberId}`).then(unwrap),
  getSettlement:  ()             => api.get('/dealer/settlement').then(unwrap),
  updateSettlement: (body: any)       => api.put('/dealer/settlement', body).then(unwrap),
  getMyActivityLog: (params: any)     => api.get('/security-logs/my', { params }).then(unwrap),
  getProfile:   ()       => api.get('/dealer/profile').then(unwrap),
  updateProfile: (body: any)  => api.put('/dealer/profile', body).then(unwrap),
  milestones:   ()       => api.get('/dealer/milestones').then(unwrap),
  upgrade:      (body: any) => api.post('/dealer/upgrade', body).then(unwrap),
  getVerificationStatus: () => api.get('/dealer/verification').then(unwrap),
  submitVerification: (stepId: string, body: any) => api.post(`/dealer/verification/${stepId}`, body).then(unwrap),
  leads:           (params?: any) => api.get('/leads', { params }).then(unwrap),
  updateLeadStage: (leadId: string, body: any) => api.put(`/leads/${leadId}/stage`, body).then(unwrap),
  archiveLead:     (leadId: string) => api.put(`/leads/${leadId}/archive`).then(unwrap),
  toggleWholesale: (carId: string, wholesale: boolean) => api.patch(`/dealer/cars/${carId}/wholesale`, { wholesale }).then(unwrap),
  tradeListings:   (params?: any) => api.get('/dealer/trade-listings', { params }).then(unwrap),
  pricingRecommendations: (body: any) => api.post('/dealer/pricing-recommendations', body).then(unwrap),
  generateApiKey:  () => api.post('/dealer/api-key').then(unwrap),
};

// ── ADMIN ─────────────────────────────────────────────
export const adminAPI = {
  stats:         ()          => api.get('/admin/stats').then(unwrap),
  users:         (params: any)    => api.get('/admin/users', { params }).then(unwrap),
  toggleBan:     (userId: string)    => api.post(`/admin/users/${userId}/toggle-ban`).then(unwrap),
  approveDealer: (userId: string)    => api.post(`/admin/users/${userId}/approve-dealer`).then(unwrap),
  cars:          (params: any)    => api.get('/admin/cars', { params }).then(unwrap),
  deleteCar:     (carId: string)     => api.delete(`/admin/cars/${carId}`).then(unwrap),
  updateSellerSettings: (userId: string, body: any) => api.put(`/admin/users/${userId}/seller-settings`, body).then(unwrap),
  getConfig:      ()          => api.get('/admin/config').then(unwrap),
  getPublicConfig: ()         => api.get('/admin/public/config').then(unwrap),
  updateConfig:   (body: any)      => api.put('/admin/config', body).then(unwrap),
  getAuditLog:    (params: any)    => api.get('/admin/audit-log', { params }).then(unwrap),
  appendAuditLog: (body: any)      => api.post('/admin/audit-log', body).then(unwrap),
  getAuditLogs:          (params: any) => api.get('/audit/logs', { params }).then(unwrap),
  getAuditLogById:       (id: string)     => api.get(`/audit/logs/${id}`).then(unwrap),
  getAuditLogsByAction:  (action: string, params: any) => api.get(`/audit/logs/action/${action}`, { params }).then(unwrap),
  getAuditLogsByActor:   (actorId: string, params: any) => api.get(`/audit/logs/actor/${actorId}`, { params }).then(unwrap),
  getAuditLogsByTarget:  (targetId: string, targetModel: string, params: any) => api.get(`/audit/logs/target/${targetId}/${targetModel}`, { params }).then(unwrap),
  getAuditLogStatistics: (params: any) => api.get('/audit/logs/statistics', { params }).then(unwrap),
  exportAuditLogs:       (params: any) => api.get('/audit/logs/export', { params }).then(unwrap),
  getReconciliationDashboard: (params: any) => api.get('/reconciliation/dashboard', { params }).then(unwrap),
  getFinancialIntegrityScore: (params: any) => api.get('/reconciliation/integrity-score', { params }).then(unwrap),
  getNegativeBalances:        (params: any) => api.get('/reconciliation/negative-balances', { params }).then(unwrap),
  getUnreleasedEscrows:       (params: any) => api.get('/reconciliation/unreleased-escrows', { params }).then(unwrap),
  runReconciliationReport:    (body: any)   => api.post('/reconciliation/run', body).then(unwrap),
  getReconciliationReports:   (params: any) => api.get('/reconciliation/reports', { params }).then(unwrap),
  getReconciliationReportById: (id: string)     => api.get(`/reconciliation/reports/${id}`).then(unwrap),
  resolveReconciliationIssue: (reportId: string, body: any) => api.post(`/reconciliation/reports/${reportId}/resolve`, body).then(unwrap),
  exportReconciliationReport: (reportId: string, format: string) => api.get(`/reconciliation/export/${reportId}/${format}`, { responseType: 'blob' }).then(unwrap),
  testMpesa:      (body: any)      => api.post('/admin/daraja/test', body).then(unwrap),
  systemKillSwitch: (body: any) => api.post('/admin/system/kill-switch', body).then(unwrap),
  systemRecover:    (body: any) => api.post('/admin/system/recover', body).then(unwrap),
  verifyDealer:    (userId: string, body: any) => api.post(`/admin/users/${userId}/verify-dealer`, body).then(unwrap),
  verifyCar:       (carId: string, body: any) => api.post(`/admin/cars/${carId}/verify`, body).then(unwrap),
  moderateCar:     (carId: string, body: any) => api.post(`/admin/cars/${carId}/moderate`, body).then(unwrap),
  getOperationsMetrics: () => api.get('/admin/operations/metrics').then(unwrap),
  getStaff:        ()            => api.get('/admin/staff').then(unwrap),
  createStaff:     (body: any)        => api.post('/admin/staff', body).then(unwrap),
  updateStaff:     (id: string, body: any)    => api.put(`/admin/staff/${id}`, body).then(unwrap),
  deleteStaff:     (id: string)          => api.delete(`/admin/staff/${id}`).then(unwrap),
  getPermCatalog:  ()            => api.get('/admin/staff/permissions/catalog').then(unwrap),
  getStaffPerms:   (id: string)          => api.get(`/admin/staff/${id}/permissions`).then(unwrap),
  setStaffPerms:   (id: string, body: any)    => api.put(`/admin/staff/${id}/permissions`, body).then(unwrap),
  deleteUser:      (userId: string)      => api.delete(`/admin/users/${userId}`).then(unwrap),
  deactivateUser:  (userId: string)      => api.put(`/admin/users/${userId}/deactivate`).then(unwrap),
  assignPackage:   (userId: string, body: any) => api.patch(`/admin/dealers/${userId}/package`, body).then(unwrap),
  updatePackages:  (packages: any) => api.put('/admin/config/packages', { packages }).then(unwrap),
  reviews:         (params: any)    => api.get('/admin/reviews', { params }).then(unwrap),
  deleteReview:    (id: string)        => api.delete(`/admin/reviews/${id}`).then(unwrap),
  referrals:        (params: any)    => api.get('/admin/referrals', { params }).then(unwrap),
  referralStats:    ()          => api.get('/admin/referrals/stats').then(unwrap),
  referralDetail:   (id: string)        => api.get(`/admin/referrals/${id}`).then(unwrap),
  creditReferral:   (id: string, body: any)  => api.post(`/admin/referrals/${id}/credit`, body).then(unwrap),
  expireReferral:   (id: string)        => api.post(`/admin/referrals/${id}/expire`).then(unwrap),
  userReferrals:    (userId: string)    => api.get(`/admin/users/${userId}/referrals`).then(unwrap),
  chats:            (params: any)    => api.get('/admin/chats', { params }).then(unwrap),
  chatMessages:     (chatId: string)    => api.get(`/admin/chats/${chatId}/messages`).then(unwrap),
  deleteChatMessage: (chatId: string, msgId: string) => api.delete(`/admin/chats/${chatId}/messages/${msgId}`).then(unwrap),
  blockChat:        (chatId: string)    => api.post(`/admin/chats/${chatId}/block`).then(unwrap),
  unblockChat:      (chatId: string)    => api.post(`/admin/chats/${chatId}/unblock`).then(unwrap),
  marketData:       (params: any)    => api.get('/admin/market-data', { params }).then(unwrap),
  marketDataDetail: (id: string)        => api.get(`/admin/market-data/${id}`).then(unwrap),
  createMarketData: (body: any)      => api.post('/admin/market-data', body).then(unwrap),
  updateMarketData: (id: string, body: any)  => api.put(`/admin/market-data/${id}`, body).then(unwrap),
  deleteMarketData: (id: string)        => api.delete(`/admin/market-data/${id}`).then(unwrap),
  bulkMarketData:  (entries: any)   => api.post('/admin/market-data/bulk', { entries }).then(unwrap),
  alerts:          (params: any)    => api.get('/admin/alerts', { params }).then(unwrap),
  markAlertRead:   (id: string)        => api.post(`/admin/alerts/${id}/read`).then(unwrap),
  markAllAlertsRead: ()        => api.post('/admin/alerts/read-all').then(unwrap),
  systemHealth:    ()          => api.get('/admin/system/health').then(unwrap),
  inspectorApplications: (params: any) => api.get('/inspector-applications', { params }).then(unwrap),
  reviewInspector: (id: string, action: string, body: any) => api.post(`/inspector-applications/${id}/${action}`, body).then(unwrap),
  uploadLogo: (formData: FormData) => api.post('/admin/upload-logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  fraudAnalytics:    ()          => api.get('/fraud/analytics').then(unwrap),
  fraudGetAll:       (params: any)    => api.get('/fraud/all', { params }).then(unwrap),
  fraudUpdateStatus: (id: string, body: any)  => api.put(`/fraud/${id}/status`, body).then(unwrap),
  integrityDashboard: ()        => api.get('/new-admin/auction-integrity/dashboard').then(unwrap),
  integrityFlags:     (p: any)  => api.get('/new-admin/auction-integrity', { params: p }).then(unwrap),
  integrityFlag:      (id: string)  => api.get(`/new-admin/auction-integrity/${id}`).then(unwrap),
  integrityUpdateFlag:(id: string, body: any) => api.patch(`/new-admin/auction-integrity/${id}/status`, body).then(unwrap),
  integrityScan:      (body: any)   => api.post('/new-admin/auction-integrity/scan', body).then(unwrap),
  integrityRiskProfiles: (p: any) => api.get('/new-admin/auction-integrity/risk-profiles', { params: p }).then(unwrap),
  escrowApprove: (userId: string) => api.put(`/admin/users/${userId}/escrow-approve`).then(unwrap),
  escrowForce:   (userId: string) => api.put(`/admin/users/${userId}/escrow-force`).then(unwrap),
};

// ── DISPUTE ───────────────────────────────────────────
export const disputeAPI = {
  my:           (params?: any)       => api.get('/disputes/my', { params }).then(unwrap),
  create:       (body: any)          => api.post('/disputes', body).then(unwrap),
  get:          (id: string)         => api.get(`/disputes/${id}`).then(unwrap),
  evidence:     (id: string)         => api.get(`/disputes/${id}/evidence`).then(unwrap),
  uploadEvidence: (id: string, formData: FormData) =>
    api.post(`/disputes/${id}/evidence`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  evidenceItem: (id: string, evidenceId: string) => api.get(`/disputes/${id}/evidence/${evidenceId}`).then(unwrap),
  deleteEvidence: (id: string, evidenceId: string) => api.delete(`/disputes/${id}/evidence/${evidenceId}`).then(unwrap),
  verifyEvidence: (id: string, evidenceId: string) => api.post(`/disputes/${id}/evidence/${evidenceId}/verify`).then(unwrap),
  all:          (params?: any)       => api.get('/disputes', { params }).then(unwrap),
  stats:        ()                   => api.get('/disputes/stats').then(unwrap),
  assign:       (id: string, body: any) => api.post(`/disputes/${id}/assign`, body).then(unwrap),
  transitionTo:   (id: string, body: any) => api.patch(`/disputes/${id}/status`, body).then(unwrap),
  addNote:      (id: string, body: any) => api.post(`/disputes/${id}/notes`, body).then(unwrap),
  startMediation:   (id: string, body: any) => api.post(`/disputes/${id}/mediation/start`, body).then(unwrap),
  completeMediation: (id: string, body: any) => api.post(`/disputes/${id}/mediation/complete`, body).then(unwrap),
  resolve:      (id: string, body: any) => api.post(`/disputes/${id}/resolve`, body).then(unwrap),
  appeal:       (id: string, body: any) => api.post(`/disputes/${id}/appeal`, body).then(unwrap),
  reviewAppeal: (id: string, body: any) => api.post(`/disputes/${id}/appeal/review`, body).then(unwrap),
};

// ── NOTIFICATIONS ─────────────────────────────────────
export const notifAPI = {
  list:        (params: any) => api.get('/notifications', { params }).then(unwrap),
  markRead:    (id: string)     => api.post(`/notifications/${id}/read`).then(unwrap),
  markAllRead: ()       => api.post('/notifications/read-all').then(unwrap),
  remove:      (id: string)     => api.delete(`/notifications/${id}`).then(unwrap),
  createReminder: (body: any) => api.post('/notifications/reminders', body).then(unwrap),
};

// ── FAVORITES ─────────────────────────────────────────
export const favoritesAPI = {
  list:   ()      => api.get('/favorites').then(unwrap),
  add:    (carId: string) => api.post(`/favorites/${carId}`).then(unwrap),
  remove: (carId: string) => api.delete(`/favorites/${carId}`).then(unwrap),
  toggle: (carId: string) => api.post(`/favorites/${carId}/toggle`).then(unwrap),
  setPriceAlert: (carId: string, notify: boolean) => api.put(`/favorites/${carId}/price-alert`, { notifyOnPriceDrop: notify }).then(unwrap),
};

// ── SAVED SEARCHES ────────────────────────────────────
export const savedSearchAPI = {
  list:   ()             => api.get('/saved-searches').then(unwrap),
  create: (body: any)         => api.post('/saved-searches', body).then(unwrap),
  update: (id: string, body: any)     => api.put(`/saved-searches/${id}`, body).then(unwrap),
  remove: (id: string)           => api.delete(`/saved-searches/${id}`).then(unwrap),
  toggleAlerts: async (id: string, enabled?: boolean) => {
    const body = enabled === undefined ? {} : { notifyOnNewMatch: enabled };
    return api.put(`/saved-searches/${id}`, body).then(unwrap);
  },
};

// ── NTSA ──────────────────────────────────────────────
export const ntsaAPI = {
  list:    (params: any)    => api.get('/ntsa-verification', { params }).then(unwrap),
  queue:   (carId: string)     => api.post('/ntsa-verification', { carId }).then(unwrap),
  process: (id: string, body: any)  => api.post(`/ntsa-verification/${id}/process`, body).then(unwrap),
  addDoc:  (id: string, body: any)  => api.post(`/ntsa-verification/${id}/documents`, body).then(unwrap),
  status:  (carId: string)     => api.get(`/ntsa-verification/car/${carId}/status`).then(unwrap),
};

// ── REFERRAL ──────────────────────────────────────────
export const referralAPI = {
  stats: () => api.get('/referral/stats').then(unwrap),
  code:  () => api.get('/referral/code').then(unwrap),
};

// ── INSPECTIONS ───────────────────────────────────────
export const inspectionAPI = {
  order:           (body: any)           => api.post('/inspections/order', body).then(unwrap),
  confirmPayment:  (checkoutRequestID: string) => api.post('/inspections/confirm-payment', { checkoutRequestID }).then(unwrap),
  myOrders:        ()               => api.get('/inspections/my').then(unwrap),
  myTasks:         ()               => api.get('/inspections/my-tasks').then(unwrap),
  list:            (params: any)         => api.get('/inspections', { params }).then(unwrap),
  availableInspectors: ()           => api.get('/inspections/available-inspectors').then(unwrap),
  assign:          (id: string, inspectorId: string)=> api.post(`/inspections/${id}/assign`, { inspectorId }).then(unwrap),
  start:           (id: string)             => api.post(`/inspections/${id}/start`).then(unwrap),
  submit:          (id: string, body: any)       => api.post(`/inspections/${id}/submit`, body).then(unwrap),
  get:             (id: string)             => api.get(`/inspections/${id}`).then(unwrap),
  forCar:          (carId: string)          => api.get(`/inspections/car/${carId}`).then(unwrap),
};

// ── REVIEWS ───────────────────────────────────────────
export const reviewsAPI = {
  create:       (body: any)     => api.post('/reviews', body).then(unwrap),
  mine:         ()         => api.get('/reviews/my').then(unwrap),
  forDealer:    (dealerId: string) => api.get(`/reviews/dealer/${dealerId}`).then(unwrap),
  remove:       (id: string)       => api.delete(`/reviews/${id}`).then(unwrap),
};

// ── TRANSACTIONS ──────────────────────────────────────
export const transactionsAPI = {
  list:    (params: any) => api.get('/transactions', { params }).then(unwrap),
  get:     (id: string)     => api.get(`/transactions/${id}`).then(unwrap),
  summary: ()       => api.get('/transactions/summary').then(unwrap),
};

// ── AUCTION ADMIN ─────────────────────────────────────
export const auctionAdminAPI = {
  start:     (carId: string, body: any)  => api.post(`/auction-admin/${carId}/start`, body).then(unwrap),
  end:       (carId: string)        => api.post(`/auction-admin/${carId}/end`).then(unwrap),
  extend:    (carId: string, body: any)  => api.post(`/auction-admin/${carId}/extend`, body).then(unwrap),
  bidHistory:(carId: string)        => api.get(`/auction-admin/${carId}/bids`).then(unwrap),
  setWinner: (carId: string, bidId: string) => api.post(`/auction-admin/${carId}/set-winner`, { bidId }).then(unwrap),
};

// ── DEALER AUCTION ────────────────────────────────────
export const dealerAuctionAPI = {
  start:     (carId: string, body: any)  => api.post(`/dealer/cars/${carId}/auction/start`, body).then(unwrap),
  end:       (carId: string)        => api.post(`/dealer/cars/${carId}/auction/end`).then(unwrap),
  extend:    (carId: string, hours: number) => api.post(`/dealer/cars/${carId}/auction/extend`, { hours }).then(unwrap),
};

// ── VERIFIED BUYER ────────────────────────────────────
export const buyerVerificationAPI = {
  submitPreApproval: (body: any) => api.post('/users/bank-pre-approval', body).then(unwrap),
  removePreApproval: ()     => api.delete('/users/bank-pre-approval').then(unwrap),
};

// ── ADS ───────────────────────────────────────────────
export const adsAPI = {
  list:       (params: any) => api.get('/ads', { params }).then(unwrap),
  adminList:  ()       => api.get('/admin/ads').then(unwrap),
  create:     (body: any)   => api.post('/admin/ads', body).then(unwrap),
  update:     (id: string, body: any) => api.put(`/admin/ads/${id}`, body).then(unwrap),
  remove:     (id: string)     => api.delete(`/admin/ads/${id}`).then(unwrap),
};

// ── SMS BIDDING ───────────────────────────────────────
export const smsBiddingAPI = {
  my:          ()                => api.get('/sms-bidding/my').then(unwrap),
  register:    (phone: string)           => api.post('/sms-bidding/register', { phone }).then(unwrap),
  subscribe:   (body: any)            => api.post('/sms-bidding/subscribe', body).then(unwrap),
  unsubscribe: (carId: string)           => api.delete(`/sms-bidding/unsubscribe/${carId}`).then(unwrap),
};

// ── CONTACT ───────────────────────────────────────────
export const contactAPI = {
  send: (body: any) => api.post('/contact', body).then(unwrap),
};

// ── MARKET ────────────────────────────────────────────
export const marketAPI = {
  pulse:      (carId: string)  => api.get(`/market/pulse/${carId}`).then(unwrap),
  trends:     (params: any) => api.get('/market/trends', { params }).then(unwrap),
  dealerInsights: ()   => api.get('/market/dealer/insights').then(unwrap),
};

// ── INSPECTOR ─────────────────────────────────────────
export const inspectorAPI = {
  apply: (body: any) => api.post('/inspector-applications/apply', body).then(unwrap),
  listActive: () => api.get('/inspector-applications/active').then(unwrap),
};

// ── ADMIN PAYMENTS ────────────────────────────────────
export const adminPaymentsAPI = {
  list: (params: any) => api.get('/admin/payments', { params }).then(unwrap),
};

// ── BULK ADMIN ────────────────────────────────────────
export const bulkAdminAPI = {
  moderateCars: (body: any) => api.post('/admin/bulk/cars/moderate', body).then(unwrap),
  deleteCars:   (body: any) => api.post('/admin/bulk/cars/delete', body).then(unwrap),
  exportCars:   (params?: any) => api.get('/admin/bulk/export/cars', { params, responseType: 'blob' }).then(unwrap),
  exportUsers:  (params?: any) => api.get('/admin/bulk/export/users', { params, responseType: 'blob' }).then(unwrap),
};

// ── ADMIN VERIFICATION ────────────────────────────────
export const adminVerificationAPI = {
  list:        (params?: any)  => api.get('/verification/admin/all', { params }).then(unwrap),
  getById:     (id: string)    => api.get(`/verification/admin/${id}`).then(unwrap),
  approve:     (id: string, body?: any) => api.post(`/verification/admin/${id}/approve`, body).then(unwrap),
  reject:      (id: string, body: any)  => api.post(`/verification/admin/${id}/reject`, body).then(unwrap),
  suspend:     (id: string, body: any)  => api.post(`/verification/admin/${id}/suspend`, body).then(unwrap),
  reinstate:   (id: string)    => api.post(`/verification/admin/${id}/reinstate`).then(unwrap),
};

// ── VERIFICATION ──────────────────────────────────────
export const verificationAPI = {
  submit:      (body: any)     => api.post('/verification/submit', body).then(unwrap),
  getStatus:   ()              => api.get('/verification/status').then(unwrap),
  requestPhoneOTP: ()          => api.post('/verification/phone/request').then(unwrap),
  verifyPhoneOTP: (code: string) => api.post('/verification/phone/verify', { code }).then(unwrap),
};

// ── SUPPORT ───────────────────────────────────────────
export const supportAPI = {
  list:          (params?: any) => api.get('/support/all', { params }).then(unwrap),
  getById:       (id: string)   => api.get(`/support/${id}`).then(unwrap),
  updateStatus:  (id: string, body: any) => api.put(`/support/${id}/status`, body).then(unwrap),
  analytics:     ()             => api.get('/support/analytics').then(unwrap),
  myTickets:     (params?: any) => api.get('/support/my-tickets', { params }).then(unwrap),
  create:        (body: any)    => api.post('/support', body).then(unwrap),
};

// ── SUPPORT TICKET ADMIN ──────────────────────────────
export const supportTicketAdminAPI = {
  stats:      ()            => api.get('/admin/support-tickets/stats').then(unwrap),
  list:       (params?: any) => api.get('/admin/support-tickets', { params }).then(unwrap),
  get:        (id: string)  => api.get(`/admin/support-tickets/${id}`).then(unwrap),
  updateStatus: (id: string, body: any) => api.patch(`/admin/support-tickets/${id}/status`, body).then(unwrap),
  assign:     (id: string, body: any) => api.patch(`/admin/support-tickets/${id}/assign`, body).then(unwrap),
  addMessage: (id: string, body: any) => api.post(`/admin/support-tickets/${id}/messages`, body).then(unwrap),
};

// ── REPORTS ───────────────────────────────────────────
export const reportAPI = {
  submit:      (body: any) => api.post('/reports/submit', body).then(unwrap),
  my:          (params?: any) => api.get('/reports/my', { params }).then(unwrap),
  adminAll:    (params?: any) => api.get('/reports/admin/all', { params }).then(unwrap),
  adminGet:    (id: string)  => api.get(`/reports/admin/${id}`).then(unwrap),
  adminUpdate: (id: string, body: any) => api.patch(`/reports/admin/${id}/status`, body).then(unwrap),
};

// ── FEEDBACK ──────────────────────────────────────────
export const feedbackAPI = {
  submit:      (body: any) => api.post('/feedback/submit', body).then(unwrap),
  adminAll:    (params?: any) => api.get('/feedback/admin/all', { params }).then(unwrap),
  adminUpdate: (id: string, body: any) => api.patch(`/feedback/admin/${id}/status`, body).then(unwrap),
};

// ── ANNOUNCEMENTS ─────────────────────────────────────
export const announcementAPI = {
  create:     (body: any)  => api.post('/announcements', body).then(unwrap),
  send:       (id: string) => api.post(`/announcements/${id}/send`).then(unwrap),
  list:       (params?: any) => api.get('/announcements', { params }).then(unwrap),
  get:        (id: string) => api.get(`/announcements/${id}`).then(unwrap),
  delete:     (id: string) => api.delete(`/announcements/${id}`).then(unwrap),
};

// ── CONTACT ADMIN ─────────────────────────────────────
export const contactAdminAPI = {
  list:    (params?: any) => api.get('/contact', { params }).then(unwrap),
};

// ── OPERATIONS ────────────────────────────────────────
export const operationsAPI = {
  dashboard:    ()            => api.get('/operations/dashboard').then(unwrap),
  supportQueue: (params?: any) => api.get('/operations/support-queue', { params }).then(unwrap),
  escrowQueue:  (params?: any) => api.get('/operations/escrow-queue', { params }).then(unwrap),
  dealerQueue:  (params?: any) => api.get('/operations/dealer-queue', { params }).then(unwrap),
  paymentQueue: (params?: any) => api.get('/operations/payment-queue', { params }).then(unwrap),
};

// ── PARTNERS ──────────────────────────────────────────
export const partnersAPI = {
  list: async () => {
    try {
      const config = await adminAPI.getConfig();
      return config?.partners || [];
    } catch {
      return [];
    }
  },
  update: async (partners: any[]) => {
    const config = await adminAPI.getConfig();
    return adminAPI.updateConfig({ ...config, partners });
  },
};

// ── PLATFORM STATS ────────────────────────────────────
export const platformStatsAPI = {
  get: async () => {
    const [carsData, adminStats] = await Promise.allSettled([
      carsAPI.list({ page: 1, limit: 1, category: 'all' }),
      adminAPI.stats(),
    ]);
    const totalCars = carsData.status === 'fulfilled'
      ? (carsData.value?.total || carsData.value?.cars?.length || 0)
      : 0;
    const adminData = adminStats.status === 'fulfilled' ? adminStats.value : {};
    const verifiedDealers = adminData?.totalDealers || adminData?.verifiedDealers || 0;
    const totalTransactions = adminData?.totalTransactions || adminData?.completedSales || 0;
    const totalRevenue = adminData?.totalRevenue || adminData?.revenue || 0;
    const liveAuctions = adminData?.liveAuctions || 0;
    const totalUsers = adminData?.totalUsers || 0;
    return { totalCars, verifiedDealers, totalTransactions, totalRevenue, liveAuctions, totalUsers };
  },
};

// ── formatKES (re-exported from helpers) ──────────────
export { formatKES } from "../utils/helpers";

// ── BID LOGS ────────────────────────────────────────────
export const bidLogsAPI = {
  // User endpoints
  getMyHistory: (params?: any) => api.get('/bid-logs/my', { params }).then(unwrap),
  getDetail: (logId: string) => api.get(`/bid-logs/${logId}`).then(unwrap),
  
  // Public endpoints
  getActive: (carId: string, params?: any) => api.get(`/bid-logs/car/${carId}`, { params }).then(unwrap),
  getWinning: (carId: string) => api.get(`/bid-logs/car/${carId}/winning`).then(unwrap),
  getStats: (carId: string, params?: any) => api.get(`/bid-logs/car/${carId}/stats`, { params }).then(unwrap),
  
  // Admin endpoints
  getAll: (params?: any) => api.get('/bid-logs/admin/all', { params }).then(unwrap),
  getAdminStats: (params?: any) => api.get('/bid-logs/admin/stats', { params }).then(unwrap),
};

// ── TRANSACTION LEDGER ──────────────────────────────────
export const ledgerAPI = {
  // User endpoints
  getMyTransactions: (params?: any) => api.get('/ledger/my', { params }).then(unwrap),
  getByHash: (hash: string) => api.get(`/ledger/hash/${hash}`).then(unwrap),
  getSummary: () => api.get('/ledger/summary').then(unwrap),
  createDeposit: (body: any) => api.post('/ledger/deposit', body).then(unwrap),
  createWithdrawal: (body: any) => api.post('/ledger/withdraw', body).then(unwrap),
  createEscrowHold: (body: any) => api.post('/ledger/escrow/hold', body).then(unwrap),
  createEscrowRelease: (body: any) => api.post('/ledger/escrow/release', body).then(unwrap),
  getEscrowTransactions: (escrowId: string, params?: any) => api.get(`/ledger/escrow/${escrowId}`, { params }).then(unwrap),
  getChain: (ledgerId: string) => api.get(`/ledger/chain/${ledgerId}`).then(unwrap),
  
  // Admin endpoints
  getAll: (params?: any) => api.get('/ledger/admin/all', { params }).then(unwrap),
  verifyChain: (params?: any) => api.get('/ledger/admin/verify', { params }).then(unwrap),
  verifyTransaction: (ledgerId: string) => api.patch(`/ledger/${ledgerId}/verify`).then(unwrap),
};

// ── USER PREFERENCES ────────────────────────────────────
export const preferencesAPI = {
  get: () => api.get('/preferences').then(unwrap),
  update: (body: any) => api.patch('/preferences', body).then(unwrap),
  setTheme: (theme: 'light' | 'dark' | 'system') => api.post('/preferences/theme', { theme }).then(unwrap),
  toggleDarkMode: () => api.post('/preferences/theme/toggle').then(unwrap),
  setLanguage: (language: string) => api.post('/preferences/language', { language }).then(unwrap),
  updateNotifications: (channel: string, settings: any) => 
    api.post('/preferences/notifications', { channel, settings }).then(unwrap),
  addRecentSearch: (query: string) => api.post('/preferences/search/recent', { query }).then(unwrap),
  clearRecentSearches: () => api.delete('/preferences/search/recent').then(unwrap),
  updateAccessibility: (settings: any) => api.post('/preferences/accessibility', settings).then(unwrap),
  updateLastSeen: (platform?: string) => api.post('/preferences/last-seen', { platform }).then(unwrap),
  getStats: () => api.get('/preferences/stats').then(unwrap),
};

// ── SEO METADATA ────────────────────────────────────────
export const seoAPI = {
  getMetadata: (params: any) => api.get('/seo/metadata', { params }).then(unwrap),
  getPageSEO: (slug: string) => api.get(`/seo/page/${slug}`).then(unwrap),
  getCarSEO: (carId: string) => api.get(`/seo/car/${carId}`).then(unwrap),
  getBreadcrumbJsonLd: (path: string) => api.get('/seo/breadcrumb', { params: { path } }).then(unwrap),
  create: (body: any) => api.post('/seo/metadata', body).then(unwrap),
  update: (id: string, body: any) => api.patch(`/seo/metadata/${id}`, body).then(unwrap),
  delete: (id: string) => api.delete(`/seo/metadata/${id}`).then(unwrap),
  list: (params?: any) => api.get('/seo/metadata/list', { params }).then(unwrap),
  generateCarSEO: (carId: string) => api.post(`/seo/car/${carId}/generate`).then(unwrap),
  getStats: () => api.get('/seo/stats').then(unwrap),
};

// ── RE-EXPORTS from data layer ──────────────────────────
export const BRANDS = [
  'Toyota', 'Mercedes-Benz', 'BMW', 'Land Rover', 'Subaru', 'Mazda', 'Nissan',
  'Honda', 'Volkswagen', 'Lexus', 'Audi', 'Mitsubishi', 'Hyundai', 'Kia', 'Ford',
  'Jeep', 'Peugeot', 'Isuzu', 'Porsche', 'Jaguar', 'Volvo', 'Suzuki', 'Daihatsu',
].map(name => ({ name }));
