// ============================================================
// KAYAD INSPECTION MARKETPLACE - API SERVICE
// ============================================================

import { api as apiClient } from '../../../api/api';
const unwrapInspectionResponse = <T>(response: { data?: T | { data?: T } }): T => {
  const data = response?.data;
  return (data && typeof data === 'object' && 'data' in data ? (data as { data?: T }).data : data) as T;
};

import type {
  InspectionProvider,
  InspectionPackage,
  Booking,
  InspectionReport,
  TimeSlot,
  ProviderDashboard,
  EarningsSummary,
  InspectionType,
} from '../types/inspection';

export interface SearchProvidersParams {
  country?: string;
  county?: string;
  town?: string;
  inspectionType?: InspectionType;
  vehicleTypes?: string[];
  mobileOnly?: boolean;
  workshopOnly?: boolean;
  sameDayAvailable?: boolean;
  weekendAvailable?: boolean;
  commercialVehicles?: boolean;
  electricVehicles?: boolean;
  luxuryVehicles?: boolean;
  minRating?: number;
  sortBy?: 'rating' | 'reviews' | 'price_low' | 'price_high' | 'completions';
  page?: number;
  limit?: number;
}

export interface CreateBookingParams {
  packageId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleRegistration?: string;
  vehicleVin?: string;
  vehicleType?: string;
  county?: string;
  town?: string;
  inspectionAddress?: string;
  latitude?: number;
  longitude?: number;
  isMobile?: boolean;
  sellerName?: string;
  sellerPhone?: string;
  sellerIsDealer?: boolean;
  scheduledDate: string;
  scheduledTime: string;
  staffId?: string;
  notes?: string;
  discount?: number;
}

export interface SubmitReviewParams {
  bookingId: string;
  providerId: string;
  ratings: {
    overall: number;
    professionalism: number;
    thoroughness: number;
    timeliness: number;
    communication: number;
  };
  reviewText?: string;
}

/**
 * Inspection Marketplace API
 */
export const inspectionApi = {
  // ============================================================
  // PROVIDER ENDPOINTS
  // ============================================================

  /**
   * Search inspection providers
   */
  searchProviders: async (params: SearchProvidersParams): Promise<{ items: InspectionProvider[]; total: number }> => {
    const response = await apiClient.get<{ items: InspectionProvider[]; total: number }>(
      '/api/inspection/providers',
      { params }
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Get provider profile
   */
  getProviderProfile: async (providerId: string): Promise<InspectionProvider> => {
    const response = await apiClient.get<InspectionProvider>(
      `/api/inspection/providers/${providerId}`
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Get provider reviews
   */
  getProviderReviews: async (providerId: string, limit = 20) => {
    const response = await apiClient.get<{ reviews: any[] }>(
      `/api/inspection/providers/${providerId}/reviews`,
      { params: { limit } }
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Get available time slots
   */
  getAvailableSlots: async (providerId: string, date: string, staffId?: string): Promise<{ slots: TimeSlot[]; date: string }> => {
    const response = await apiClient.get<{ slots: TimeSlot[]; date: string }>(
      `/api/inspection/providers/${providerId}/slots`,
      { params: { date, staffId } }
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Get provider dashboard
   */
  getProviderDashboard: async (providerId: string): Promise<ProviderDashboard> => {
    const response = await apiClient.get<ProviderDashboard>(
      `/api/inspection/provider/${providerId}/dashboard`
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Get provider earnings
   */
  getProviderEarnings: async (providerId: string, period = 'monthly'): Promise<EarningsSummary> => {
    const response = await apiClient.get<EarningsSummary>(
      `/api/inspection/provider/${providerId}/earnings-summary`,
      { params: { period } }
    );
    return unwrapInspectionResponse(response);
  },

  // ============================================================
  // BOOKING ENDPOINTS
  // ============================================================

  /**
   * Create a new booking
   */
  createBooking: async (params: CreateBookingParams): Promise<Booking> => {
    const response = await apiClient.post<Booking>('/api/inspection/bookings', params);
    return unwrapInspectionResponse(response);
  },

  /**
   * Get customer bookings
   */
  getCustomerBookings: async (params?: { status?: string; upcoming?: boolean }) => {
    const response = await apiClient.get<{ bookings: Booking[] }>(
      '/api/inspection/bookings',
      { params }
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Get booking by reference
   */
  getBooking: async (reference: string) => {
    const response = await apiClient.get<Booking>(
      `/api/inspection/bookings/${reference}`
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Cancel booking
   */
  cancelBooking: async (bookingId: string, reason: string) => {
    const response = await apiClient.post<{ booking: Booking; refundAmount: number }>(
      `/api/inspection/bookings/${bookingId}/cancel`,
      { reason }
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Get provider bookings
   */
  getProviderBookings: async (
    providerId: string,
    params?: {
      status?: string;
      date?: string;
      fromDate?: string;
      toDate?: string;
      staffId?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ items: Booking[]; total: number; page: number; limit: number; totalPages: number }> => {
    const response = await apiClient.get<{
      items: Booking[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/api/inspection/provider/${providerId}/bookings`, { params });
    return unwrapInspectionResponse(response);
  },

  /**
   * Update booking status
   */
  updateBookingStatus: async (
    providerId: string,
    bookingId: string,
    status: string,
    staffId?: string,
    notes?: string
  ) => {
    const response = await apiClient.post<Booking>(
      `/api/inspection/provider/${providerId}/bookings/${bookingId}/status`,
      { status, staffId, notes }
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Assign inspector
   */
  assignInspector: async (providerId: string, bookingId: string, staffId: string) => {
    const response = await apiClient.post<Booking>(
      `/api/inspection/provider/${providerId}/bookings/${bookingId}/assign`,
      { staffId }
    );
    return unwrapInspectionResponse(response);
  },

  /** Initiate the authoritative M-Pesa payment for a canonical booking. */
  initiateBookingPayment: async (bookingId: string, phone: string): Promise<{ success: boolean; mode?: string; checkoutID?: string; checkoutRequestID?: string; message?: string }> => {
    const response = await apiClient.post<{ success: boolean; mode?: string; checkoutID?: string; checkoutRequestID?: string; message?: string }>('/api/payments/initiate', {
      bookingId,
      phone,
      type: 'inspection',
    });
    return unwrapInspectionResponse(response);
  },

  /** Check the shared payment ledger status for a checkout request. */
  getPaymentStatus: async (checkoutRequestId: string): Promise<{ status: string; payment?: { resultDesc?: string } }> => {
    const response = await apiClient.get<{ status: string; payment?: { resultDesc?: string } }>(`/api/payments/status/${encodeURIComponent(checkoutRequestId)}`);
    return unwrapInspectionResponse(response);
  },

  // ============================================================
  // REPORT ENDPOINTS
  // ============================================================

  /**
   * Get report
   */
  getReport: async (reportId: string) => {
    const response = await apiClient.get<InspectionReport>(
      `/api/inspection/reports/${reportId}`
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Get report by share token
   */
  getReportByShareToken: async (token: string) => {
    const response = await apiClient.get<InspectionReport>(
      `/api/inspection/reports/share/${token}`
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Generate PDF
   */
  generatePDF: async (providerId: string, reportId: string) => {
    const response = await apiClient.post<{ pdfUrl: string }>(
      `/api/inspection/provider/${providerId}/reports/${reportId}/pdf`
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Share report
   */
  shareReport: async (providerId: string, reportId: string) => {
    const response = await apiClient.post<{ shareUrl: string; expiresAt: string }>(
      `/api/inspection/provider/${providerId}/reports/${reportId}/share`
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Revoke report share
   */
  revokeReportShare: async (providerId: string, reportId: string) => {
    await apiClient.delete(
      `/api/inspection/provider/${providerId}/reports/${reportId}/share`
    );
  },

  /**
   * Get inspection categories
   */
  getInspectionCategories: async () => {
    const response = await apiClient.get<{ categories: any }>(
      '/api/inspection/categories'
    );
    return unwrapInspectionResponse(response);
  },

  // ============================================================
  // REVIEW ENDPOINTS
  // ============================================================

  /**
   * Submit review
   */
  submitReview: async (params: SubmitReviewParams) => {
    const response = await apiClient.post('/api/inspection/reviews', params);
    return unwrapInspectionResponse(response);
  },

  // ============================================================
  // PAYMENT ENDPOINTS
  // ============================================================

  /**
   * Get transactions
   */
  getTransactions: async (
    providerId: string,
    params?: {
      type?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
      page?: number;
      limit?: number;
    }
  ) => {
    const response = await apiClient.get<{
      items: any[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/api/inspection/provider/${providerId}/transactions`, { params });
    return unwrapInspectionResponse(response);
  },

  /**
   * Get settlements
   */
  getSettlements: async (providerId: string, status?: string) => {
    const response = await apiClient.get<{ settlements: any[] }>(
      `/api/inspection/provider/${providerId}/settlements`,
      { params: { status } }
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Generate settlement
   */
  generateSettlement: async (providerId: string, periodStart: string, periodEnd: string) => {
    const response = await apiClient.post(
      `/api/inspection/provider/${providerId}/settlements`,
      { periodStart, periodEnd }
    );
    return unwrapInspectionResponse(response);
  },

  /**
   * Get earnings summary
   */
  getEarningsSummary: async (providerId: string, period = 'monthly') => {
    const response = await apiClient.get<EarningsSummary>(
      `/api/inspection/provider/${providerId}/earnings`,
      { params: { period } }
    );
    return unwrapInspectionResponse(response);
  },
};

export default inspectionApi;
