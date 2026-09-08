/**
 * KAYAD Type Definitions
 * Central location for all shared TypeScript types
 */

// ============================================================
// Common Types
// ============================================================

export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  response?: {
    status?: number;
    data?: {
      message?: string;
      error?: string;
    };
  };
  message?: string;
  code?: string;
}

// ============================================================
// User & Auth Types
// ============================================================

export interface User {
  _id?: string;
  id?: string;
  email: string;
  name?: string;
  phone?: string;
  role: 'user' | 'dealer' | 'admin' | 'inspector' | 'support';
  avatar?: string;
  location?: string;
  approved?: boolean;
  businessName?: string;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

// ============================================================
// Car Types
// ============================================================

export interface CarImage {
  url: string;
  alt?: string;
}

export interface CarLocation {
  city: string;
  area?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Car {
  _id?: string;
  id?: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  fuel: 'Petrol' | 'Diesel' | 'Electric' | 'Hybrid';
  transmission: 'Automatic' | 'Manual';
  bodyType: string;
  color?: string;
  description?: string;
  features?: string[];
  images?: CarImage[];
  location?: CarLocation;
  dealer?: {
    _id?: string;
    id?: string;
    name?: string;
    avatar?: string;
  };
  owner?: {
    _id?: string;
    id?: string;
    name?: string;
  };
  isAuction?: boolean;
  isLive?: boolean;
  auctionEnd?: string;
  currentBid?: number;
  totalBids?: number;
  isFeatured?: boolean;
  isPromoted?: boolean;
  hasInspection?: boolean;
  hasEscrow?: boolean;
  vin?: string;
  logbook?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CarFilters {
  brand?: string;
  model?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  fuel?: string;
  transmission?: string;
  bodyType?: string;
  location?: string;
  isAuction?: boolean;
  isFeatured?: boolean;
}

// ============================================================
// Form Types
// ============================================================

export interface FormField {
  name: string;
  value: unknown;
  error?: string;
  touched?: boolean;
}

export interface FormState {
  values: Record<string, unknown>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

export type ValidationRule = {
  required?: boolean | string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  email?: boolean;
  phone?: boolean;
  url?: boolean;
  custom?: (value: unknown) => string | undefined;
};

export type ValidationSchema = Record<string, ValidationRule>;

// ============================================================
// Toast Types
// ============================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  toast: (message: string, type?: ToastType) => void;
}

// ============================================================
// API Request/Response Types
// ============================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: 'user' | 'dealer';
  phone?: string;
  location?: string;
  businessName?: string;
}

export interface CreateCarRequest {
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  fuel: string;
  transmission: string;
  bodyType: string;
  color?: string;
  description?: string;
  features?: string[];
  locationCity?: string;
  locationArea?: string;
}

export interface BidRequest {
  amount: number;
  carId: string;
}

export interface PaymentRequest {
  amount: number;
  carId: string;
  method: 'mpesa' | 'card' | 'bank';
}

// ============================================================
// Marketplace / Vehicle Types
// (used by src/context/MarketplaceContext.tsx and src/components/home/*
// — a richer, auction/escrow-oriented data model distinct from the
// simpler `Car` type above used by CarCard and the main Home page)
// ============================================================

export type UserRole = 'buyer' | 'seller' | 'dealer' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  companyName?: string;
  isVerified: boolean;
  createdAt: string;
  rating?: number;
  reviewsCount?: number;
}

export type VehicleCondition = 'New' | 'Like New' | 'Excellent' | 'Good' | 'Fair' | 'Brand New';
export type TransmissionType = 'Automatic' | 'Manual' | 'Dual-Clutch' | 'CVT' | 'Direct Drive' | '10-Speed Automatic' | '8-Speed Automatic';
export type FuelType = 'Gasoline' | 'Diesel' | 'Hybrid' | 'Plug-in Hybrid' | 'Electric';
export type BodyStyle = 'Sedan' | 'SUV' | 'Coupe' | 'Truck' | 'Convertible' | 'Hatchback' | 'Wagon';
export type ListingType = 'fixed' | 'auction' | 'both';

export interface VehicleInspection {
  inspectedAt: string;
  inspectorName: string;
  score: number; // 0-100
  passedPoints: number;
  totalPoints: number;
  engineHealth: 'Excellent' | 'Good' | 'Attention Needed';
  bodyCondition: 'Flawless' | 'Minor Scratches' | 'Repaired';
  interiorHealth: 'Clean' | 'Minor Wear';
  reportPdfUrl?: string;
}

export interface Vehicle {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  price: number;
  reservePrice?: number;
  currentBid?: number;
  buyNowPrice?: number;
  mileage: number;
  location: string;
  county?: string;
  bodyStyle: BodyStyle;
  transmission: TransmissionType;
  fuelType: FuelType;
  engine: string;
  engineSize?: string;
  horsepower: number;
  driveType?: '2WD' | '4WD' | 'AWD';
  exteriorColor: string;
  interiorColor: string;
  condition: VehicleCondition;
  listingType: ListingType;
  images: string[];
  image?: string;
  additionalImages?: string[];
  description: string;
  features: string[];
  sellerId: string;
  sellerName: string;
  sellerAvatar?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  sellerRating: number;
  sellerType?: 'Verified Dealer' | 'Private Seller';
  isDealerCertified: boolean;
  dealerId?: string;
  verified?: boolean;
  isAuction?: boolean;
  auctionEndsAt?: string;
  auctionEnds?: string;
  bidsCount?: number;
  viewsCount?: number;
  savedCount: number;
  inspection?: VehicleInspection;
  inspectionPassed?: boolean;
  inspectionReportId?: string;
  escrowEligible?: boolean;
  escrowOverride?: 'enforce' | 'revoke' | null;
  financeAvailable?: boolean;
  inspectionBookingAvailable?: boolean;
  responseTime?: string;
  listingFreshness?: string;
  marketPriceAvg?: number;
  isNewArrival?: boolean;
  badge?: string;
  status: 'active' | 'sold' | 'pending' | 'draft';
  createdAt: string;
}

export interface Bid {
  id: string;
  vehicleId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  placedAt: string;
  isAutoBid?: boolean;
}

export type EscrowStatus =
  | 'initiated'
  | 'buyer_funded'
  | 'inspection_pending'
  | 'inspection_approved'
  | 'delivery_in_transit'
  | 'buyer_accepted'
  | 'disputed'
  | 'completed'
  | 'refunded';

export interface EscrowMilestone {
  step: number;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
  timestamp?: string;
}

export interface EscrowContract {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  vehicleImage: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  agreedPrice: number;
  escrowFee: number;
  status: EscrowStatus;
  milestones: EscrowMilestone[];
  createdAt: string;
  updatedAt: string;
  trackingNumber?: string;
  inspectionReportApproved?: boolean;
  disputeReason?: string;
}

export interface DealerProfile {
  id: string;
  name: string;
  logo: string;
  bannerImage: string;
  address: string;
  phone: string;
  email: string;
  rating: number;
  reviewsCount: number;
  verifiedSince: string;
  activeListingsCount: number;
  totalSales: number;
  bio: string;
  operatingHours: string;
  badge: string;
}

export interface PriceAlert {
  id: string;
  userId: string;
  vehicleId: string;
  vehicleTitle: string;
  targetPrice: number;
  alertOnPriceDrop: boolean;
  alertOnStatusChange: boolean;
  currentPriceAtSet: number;
  notifyMethod: 'in_app' | 'email' | 'both';
  createdAt: string;
  isActive: boolean;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'bid' | 'outbid' | 'auction_won' | 'escrow' | 'message' | 'system' | 'price_alert' | 'price_drop' | 'status_change';
  isRead: boolean;
  createdAt: string;
  linkUrl?: string;
  vehicleId?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  vehicleId?: string;
  text: string;
  sentAt: string;
  offerAmount?: number;
}

export interface FilterState {
  searchQuery: string;
  makes: string[];
  bodyStyles: BodyStyle[];
  minYear: number;
  maxYear: number;
  minPrice: number;
  maxPrice: number;
  maxMileage: number;
  transmission: string[];
  fuelType: string[];
  listingType: 'all' | 'auction' | 'fixed';
  certifiedOnly: boolean;
  sortBy: 'featured' | 'newest' | 'price_asc' | 'price_desc' | 'year_desc' | 'mileage_asc' | 'ending_soon';
}

export interface Advert {
  id: string;
  title: string;
  subtitle: string;
  badgeTag: string;
  ctaText: string;
  ctaPage: 'gallery' | 'auctions' | 'ghost_check' | 'escrow' | 'dashboard' | 'support';
  theme: 'cyan_navy' | 'emerald_escrow' | 'gold_luxury' | 'sunset_red';
  placement: 'homepage' | 'auctions' | 'search_feed';
  imageUrl?: string;
  isActive: boolean;
  clicksCount: number;
  createdAt: string;
}

// ============================================================
// Auction Organizer Types
// ============================================================

export type AuctionOrganizerType =
  | 'verified_dealer'
  | 'licensed_auctioneer'
  | 'commercial_bank'
  | 'microfinance_institution'
  | 'fleet_disposal_company'
  | 'government_disposal_agency'
  | 'insurance_salvage_company'
  | 'corporate_fleet_owner';

export interface OrganizerContact {
  phone?: string;
  email?: string;
  website?: string;
}

export interface OrganizerAddress {
  street?: string;
  city?: string;
  county?: string;
  country?: string;
  postalCode?: string;
}

export interface OrganizerBusinessHours {
  weekdays?: string;
  saturday?: string;
  sunday?: string;
  holidays?: string;
}

export interface OrganizerPaymentDetails {
  bankName: string;
  accountName: string;
  accountNumber?: string;
  paybill?: string;
  tillNumber?: string;
  swiftCode?: string;
  wireInstructions?: string;
}

export interface AuctionOrganizer {
  id: string;
  name: string;
  type: AuctionOrganizerType;
  logo?: string;
  bannerImage?: string;
  isVerified: boolean;
  verificationBadge?: 'verified' | 'premium' | 'government' | 'bank' | 'licensed';
  address?: OrganizerAddress;
  contacts?: OrganizerContact;
  businessHours?: OrganizerBusinessHours;
  website?: string;
  yearsOnPlatform?: number;
  completedAuctions?: number;
  customerRating?: number;
  totalReviews?: number;
  profileUrl?: string;
  bio?: string;
  paymentDetails?: OrganizerPaymentDetails;
  supportedPaymentMethods?: ('mpesa' | 'bank_transfer' | 'cash' | 'card')[];
  createdAt?: string;
}

// ============================================================
// Auction Session with Organizer (Enhanced)
// ============================================================

export interface AuctionSessionOrganizer {
  organizerId: string;
  organizerName: string;
  organizerType: AuctionOrganizerType;
  organizerLogo?: string;
  organizerVerified: boolean;
  organizerProfileUrl?: string;
  organizerPhone?: string;
  organizerEmail?: string;
  organizerAddress?: OrganizerAddress;
  organizerWebsite?: string;
  organizerRating?: number;
  organizerYearsOnPlatform?: number;
  organizerCompletedAuctions?: number;
}

// ============================================================
// Helper type to get display name for organizer type
// ============================================================

export const ORGANIZER_TYPE_DISPLAY_NAMES: Record<AuctionOrganizerType, string> = {
  verified_dealer: 'Verified Dealer',
  licensed_auctioneer: 'Licensed Auctioneer',
  commercial_bank: 'Commercial Bank',
  microfinance_institution: 'Microfinance Institution',
  fleet_disposal_company: 'Fleet Disposal Company',
  government_disposal_agency: 'Government Disposal Agency',
  insurance_salvage_company: 'Insurance Salvage Company',
  corporate_fleet_owner: 'Corporate Fleet Owner',
};

export const ORGANIZER_TYPE_ICONS: Record<AuctionOrganizerType, string> = {
  verified_dealer: '🏢',
  licensed_auctioneer: '🔨',
  commercial_bank: '🏦',
  microfinance_institution: '💰',
  fleet_disposal_company: '🚗',
  government_disposal_agency: '🏛️',
  insurance_salvage_company: '📋',
  corporate_fleet_owner: '🚙',
};
