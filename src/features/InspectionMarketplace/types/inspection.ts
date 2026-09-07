// ============================================================
// KAYAD INSPECTION MARKETPLACE - TYPES
// ============================================================

export interface InspectionProvider {
  id: string;
  companyName: string;
  tradingName?: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  contact: {
    email: string;
    phone: string;
    whatsapp?: string;
    website?: string;
  };
  location: {
    country: string;
    county: string;
    town: string;
    address?: string;
    serviceRadius?: number;
  };
  businessHours: BusinessHours;
  operatingModel: {
    hasWorkshop: boolean;
    offersMobile: boolean;
    mobileFee: number;
    weekendAvailable: boolean;
    sameDayAvailable: boolean;
  };
  specializations: {
    vehicleTypes: string[];
    inspectionTypes: string[];
    commercialVehicles: boolean;
    electricVehicles: boolean;
    luxuryVehicles: boolean;
  };
  experience: {
    yearsInBusiness: number;
  };
  verification: {
    status: 'unverified' | 'pending' | 'verified';
    verifiedAt?: string;
  };
  stats: {
    averageRating: number;
    totalReviews: number;
    completedInspections: number;
    responseTimeMinutes: number;
    acceptanceRate: number;
  };
  packages?: InspectionPackage[];
  startingPrice?: number | null;
  branches?: Branch[];
  credentials?: Credential[];
  recentReviews?: Review[];
}

export interface InspectionPackage {
  id: string;
  name: string;
  description?: string;
  type: InspectionType;
  price: number;
  currency: string;
  duration: number;
  inspectionPoints: number;
  includes: {
    diagnostics: boolean;
    roadTest: boolean;
    electrical: boolean;
    suspension: boolean;
  };
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  location: {
    latitude?: number;
    longitude?: number;
  };
  phone?: string;
}

export interface Credential {
  id: string;
  type: string;
  name: string;
  issuingBody?: string;
  expiryDate?: string;
}

export interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  reference: string;
  status: BookingStatus;
  scheduledDate: string;
  scheduledTime: string;
  estimatedEndTime?: string;
  inspectionType: InspectionType;
  isMobile: boolean;
  totalPrice: number;
  currency: string;
  paymentStatus: PaymentStatus;
  createdAt: string;
  vehicle?: {
    make: string;
    model: string;
    year: number;
    registration?: string;
  };
  location?: {
    county: string;
    town: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  seller?: {
    name: string;
    phone?: string;
    isDealer: boolean;
  };
  provider?: {
    id: string;
    name: string;
    logo?: string;
    phone?: string;
  };
  inspector?: {
    id: string;
    name: string;
    photo?: string;
  };
  package?: {
    id: string;
    name: string;
    description?: string;
    duration: number;
  };
  report?: {
    id: string;
    number: string;
    overallScore: number;
    overallCondition: string;
    pdfUrl?: string;
    shareToken?: string;
  };
}

export interface InspectionReport {
  id: string;
  reportNumber: string;
  overallScore: number;
  overallCondition: ConditionRating;
  categoryScores: CategoryScores;
  vehicle: VehicleInfo;
  provider: ProviderSummary;
  inspector?: InspectorInfo;
  package: PackageSummary;
  inspectionDate: string;
  inspectionLocation: LocationInfo;
  executiveSummary?: string;
  criticalIssues: CriticalIssue[];
  recommendations: string[];
  findings: Finding[];
  checklistItems: ChecklistCategories;
  photos: Photo[];
  roadTest: RoadTestInfo;
  diagnostics: DiagnosticsInfo;
  quality?: QualityReview;
  share?: ShareInfo;
  createdAt: string;
  pdfUrl?: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  isPast?: boolean;
}

export interface ProviderDashboard {
  overview: DashboardOverview;
  upcomingBookings: Booking[];
  pendingSettlement?: {
    amount: number;
    status: string;
  };
  unreadMessages: number;
}

export interface DashboardOverview {
  todayBookings: number;
  upcomingBookingsCount: number;
  pendingReports: number;
  monthlyRevenue: number;
  monthlyInspections: number;
  averageRating: number;
  totalReviews: number;
}

export interface EarningsSummary {
  period: string;
  totalEarnings: number;
  totalCommission: number;
  netEarnings: number;
  totalPaid: number;
  totalPending: number;
  commissionRate: number;
  currency: string;
}

// Enums and Constants
export type InspectionType = 
  | 'pre_purchase'
  | 'dealer'
  | 'auction'
  | 'fleet'
  | 'insurance'
  | 'warranty'
  | 'mechanical'
  | 'road_test'
  | 'import'
  | 'commercial';

export type BookingStatus = 
  | 'booked'
  | 'confirmed'
  | 'inspector_assigned'
  | 'travelling'
  | 'inspection_started'
  | 'inspection_complete'
  | 'report_generated'
  | 'customer_reviewed'
  | 'closed'
  | 'cancelled'
  | 'no_show';

export type PaymentStatus = 
  | 'pending'
  | 'deposit_paid'
  | 'fully_paid'
  | 'refunded';

export type ConditionRating = 
  | 'excellent'
  | 'good'
  | 'fair'
  | 'poor'
  | 'bad';

export type ChecklistStatus = 
  | 'pass'
  | 'fail'
  | 'warning'
  | 'not_applicable'
  | 'not_inspected';

export type Severity = 
  | 'critical'
  | 'major'
  | 'minor';

// Helper interfaces
interface BusinessHours {
  [day: string]: {
    open: string;
    close: string;
    enabled: boolean;
  };
}

interface CategoryScores {
  engine: number;
  transmission: number;
  suspension: number;
  brakes: number;
  electrical: number;
  interior: number;
  exterior: number;
  body: number;
  paint: number;
  tyres: number;
  undercarriage: number;
  roadTest: number;
}

interface VehicleInfo {
  make: string;
  model: string;
  year: number;
  registration?: string;
  vin?: string;
}

interface ProviderSummary {
  id: string;
  name: string;
  logo?: string;
}

interface InspectorInfo {
  id: string;
  name: string;
  role: string;
}

interface PackageSummary {
  id: string;
  name: string;
  type: InspectionType;
}

interface LocationInfo {
  county: string;
  town: string;
  address?: string;
}

interface CriticalIssue {
  category: string;
  item: string;
  description: string;
}

interface Finding {
  category: string;
  itemName: string;
  status: ChecklistStatus;
  severity?: Severity;
  notes?: string;
  photos?: string[];
}

interface ChecklistCategories {
  [category: string]: {
    name: string;
    score: number;
    items: ChecklistItem[];
  };
}

interface ChecklistItem {
  name: string;
  status: ChecklistStatus;
  notes?: string;
  severity?: Severity;
  photos?: string[];
}

interface Photo {
  url: string;
  caption?: string;
  category?: string;
}

interface RoadTestInfo {
  performed: boolean;
  notes?: string;
  distance?: number;
}

interface DiagnosticsInfo {
  obdScanPerformed: boolean;
  codes?: string[];
}

interface QualityReview {
  reviewed: boolean;
  reviewerId?: string;
  reviewedAt?: string;
  score?: number;
}

interface ShareInfo {
  token: string;
  expiresAt: string;
}

// Inspection Categories (150-point checklist)
export const INSPECTION_CATEGORIES = [
  { id: 'engine', name: 'Engine', points: 20 },
  { id: 'transmission', name: 'Transmission', points: 15 },
  { id: 'suspension', name: 'Suspension', points: 12 },
  { id: 'brakes', name: 'Brakes', points: 12 },
  { id: 'electrical', name: 'Electrical', points: 15 },
  { id: 'interior', name: 'Interior', points: 15 },
  { id: 'exterior', name: 'Exterior', points: 15 },
  { id: 'body', name: 'Body Structure', points: 12 },
  { id: 'paint', name: 'Paint & Finish', points: 10 },
  { id: 'tyres', name: 'Tyres & Wheels', points: 8 },
  { id: 'undercarriage', name: 'Undercarriage', points: 8 },
  { id: 'road_test', name: 'Road Test', points: 8 },
] as const;

export const INSPECTION_TYPES = [
  { value: 'pre_purchase', label: 'Pre-Purchase Inspection' },
  { value: 'dealer', label: 'Dealer Inspection' },
  { value: 'auction', label: 'Auction Inspection' },
  { value: 'fleet', label: 'Fleet Inspection' },
  { value: 'insurance', label: 'Insurance Inspection' },
  { value: 'warranty', label: 'Warranty Inspection' },
  { value: 'mechanical', label: 'Mechanical Diagnosis' },
  { value: 'road_test', label: 'Road Test' },
  { value: 'import', label: 'Import Verification' },
  { value: 'commercial', label: 'Commercial Vehicle Inspection' },
] as const;

export const VEHICLE_TYPES = [
  { value: 'cars', label: 'Cars' },
  { value: 'suvs', label: 'SUVs' },
  { value: 'trucks', label: 'Trucks' },
  { value: 'buses', label: 'Buses' },
  { value: 'vans', label: 'Vans' },
  { value: 'motorcycles', label: 'Motorcycles' },
] as const;
