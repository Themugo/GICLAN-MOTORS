// Re-export types from types/index for consistency
import type { Vehicle, BodyStyle, TransmissionType, FuelType, VehicleCondition } from './types/index';
export type { Vehicle, BodyStyle, TransmissionType, FuelType, VehicleCondition };

export interface BidRecord {
  id: string;
  bidderName: string;
  bidderLocation?: string;
  amount: number;
  timestamp: string;
  status: 'Highest Bid' | 'Outbid' | 'Winning';
  verifiedDeposit?: boolean;
}

export interface AuctionSession {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  vehicle: Vehicle;
  sellerId: string;
  sellerName: string;
  sellerType: 'Verified Dealer' | 'Private Seller';
  // Organizer (Auction owner - always required)
  organizer: {
    id: string;
    name: string;
    type: AuctionOrganizerType;
    logo?: string;
    isVerified: boolean;
    verificationBadge?: 'verified' | 'premium' | 'government' | 'bank' | 'licensed';
    profileUrl?: string;
    // Contact information
    contact?: {
      phone?: string;
      email?: string;
      address?: string;
      website?: string;
      businessHours?: string;
      operatingRegion?: string;
    };
    // Legacy flat contact fields (for backward compatibility)
    phone?: string;
    email?: string;
    address?: string;
    website?: string;
    businessHours?: string;
    rating?: number;
    yearsOnPlatform?: number;
    completedAuctions?: number;
    // Payment details
    paymentDetails?: {
      bankName: string;
      accountName: string;
      accountNumber?: string;
      paybill?: string;
      tillNumber?: string;
      wireInstructions?: string;
    };
    // Refund policy
    refundPolicy?: string;
  };
  category: 'Bank Repossession' | 'Direct Import' | 'Fleet Clearance' | 'Dealer Clearance' | 'Government Disposal' | 'Premium Public';
  status: 'Upcoming' | 'Live' | 'Ended' | 'Awaiting Settlement';
  startingPrice: number;
  reservePrice: number;
  currentBid: number;
  buyoutPrice?: number;
  minimumIncrement: number;
  startsAt: string;
  endsAt: string;
  totalBidsCount: number;
  uniqueBiddersCount: number;
  reserveMet: boolean;
  bidHistory: BidRecord[];
  termsAndConditions: string[];
  // Viewing Schedule & Location
  viewingDates?: string;
  viewingLocation?: string;
  // Bid Security Deposit Configuration (managed by organizer)
  bidSecurityAmount?: number;
  bidSecurityRefundPolicy?: string;
  bidSecurityVerificationMethod?: string;
  // Legacy flat organizer/bid-security fields (for backward compatibility)
  organizerType?: string;
  organizerPhone?: string;
  organizerEmail?: string;
  bidSecurityBank?: string;
  bidSecurityAccountName?: string;
  bidSecurityPaybillOrAccount?: string;
  viewingHours?: string;
  // Winning Payment Instructions
  handoverInstructions?: string;
}

// Re-export AuctionOrganizerType for convenience
export type AuctionOrganizerType = 
  | 'verified_dealer'
  | 'licensed_auctioneer'
  | 'commercial_bank'
  | 'microfinance_institution'
  | 'fleet_disposal_company'
  | 'government_disposal_agency'
  | 'insurance_salvage_company'
  | 'corporate_fleet_owner';

export interface SavedSearch {
  id: string;
  title: string;
  filters: Record<string, any>;
  notifyOnPriceDrop: boolean;
  notifyOnNewListing: boolean;
  createdAt: string;
}

export interface DealerReview {
  id: string;
  buyerName: string;
  buyerAvatar?: string;
  rating: number;
  date: string;
  vehicleTitle?: string;
  comment: string;
  verifiedPurchase: boolean;
}

export interface Dealer {
  id: string;
  name: string;
  type?: 'Enterprise Dealer' | 'Private Seller';
  location: string;
  county: string;
  verifiedSince: string;
  rating: number;
  reviewsCount: number;
  activeListingsCount: number;
  completedEscrowDeals?: number;
  logo: string;
  coverBanner?: string;
  badges: string[];
  phone: string;
  email: string;
  responseTime?: string;
  description?: string;
  address?: string;
  website?: string;
  kraPin?: string;
  subscriptionTier?: 'Bronze' | 'Silver' | 'Gold Enterprise' | 'Free Individual';
  subscriptionStatus?: 'Active' | 'Renewal Pending' | 'Trial';
  subscriptionExpiry?: string;
  maxListingsLimit?: number;
  featuredListingsUsed?: number;
  featuredListingsLimit?: number;
  operatingHours?: string;
  specializations?: string[];
  languages?: string[];
  paymentMethods?: string[];
  servicesOffered?: string[];
  galleryImages?: string[];
  reviews?: DealerReview[];
  buyerSatisfaction?: number;
  followersCount?: number;
  landmark?: string;
}

export interface DealerTeamMember {
  id: string;
  dealerId: string;
  name: string;
  role: 'Owner / Principal' | 'Sales Manager' | 'Senior Sales Agent' | 'Inventory Specialist';
  email: string;
  phone: string;
  avatar: string;
  assignedLeadsCount: number;
  closedDealsCount: number;
  active: boolean;
}

export interface DealerLead {
  id: string;
  dealerId: string;
  vehicleId?: string;
  vehicleTitle: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  source: 'Marketplace Listing' | 'Escrow Negotiation' | 'Test Drive Booking' | 'Finance Pre-Approval' | 'Live Chat';
  status: 'New Lead' | 'In Contact' | 'Test Drive Scheduled' | 'Deposit Paid' | 'Sale Closed' | 'Lost';
  assignedToName?: string;
  notes?: string;
  offeredPrice?: number;
  createdAt: string;
  lastFollowUp: string;
}

export interface DealerPromotion {
  id: string;
  dealerId: string;
  vehicleId: string;
  vehicleTitle: string;
  type: 'Top of Search Boost' | 'Featured Showroom Badge' | 'Sponsored Homepage Banner' | 'Social Media Blast';
  durationDays: number;
  startDate: string;
  endDate: string;
  costKsh: number;
  impressionsCount: number;
  clicksCount: number;
  status: 'Active' | 'Scheduled' | 'Expired';
}

export interface DealerAnalytics {
  totalViews30Days: number;
  totalLeads30Days: number;
  conversionRate: number;
  averageDaysToSell: number;
  totalInventoryValue: number;
  topPerformingMake: string;
  viewsByCounty: { county: string; views: number }[];
}

export interface EscrowLogEntry {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  actor: 'Buyer' | 'Seller' | 'Inspector' | 'NTSA TIMS' | 'Bank Custodian';
  type: 'info' | 'success' | 'warning' | 'dispute';
}

export interface EscrowDispute {
  id: string;
  openedAt: string;
  openedBy: 'Buyer' | 'Seller';
  reason: string;
  status: 'Under Review' | 'Evidence Gathering' | 'Mediation In Progress' | 'Resolved - Refunded' | 'Resolved - Released';
  evidence: { title: string; fileType: string; uploadedAt: string }[];
  updates: { timestamp: string; note: string; author: string }[];
}

export interface EscrowTransaction {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  vehicleImage?: string;
  vehiclePrice?: number;
  vin?: string;
  plateNumber?: string;
  amount: number;
  buyerName: string;
  buyerPhone?: string;
  buyerEmail?: string;
  sellerName: string;
  sellerPhone?: string;
  sellerEmail?: string;
  sellerType?: 'Private Seller' | 'Verified Dealer';
  status: string; // e.g. 'Vehicle Reserved' | 'Awaiting Buyer Deposit' | 'Deposit Deposited' | 'Inspection Scheduled' | 'Inspection Completed' | 'Inspection Approved' | 'Awaiting Buyer Approval' | 'Title Transfer' | 'Ownership Transfer In Progress' | 'Funds Ready for Release' | 'Completed' | 'Dispute Under Review';
  step: number; // 1: Reserved, 2: Deposit, 3: Inspection, 4: Buyer Approval, 5: Title Transfer, 6: Seller Paid
  updatedAt: string;
  depositDate?: string;
  paymentMethod?: string;
  bankReference?: string;
  vaultHolder?: string;
  whoControlsFunds?: string;
  inspectionStatus?: 'Booked' | 'In Progress' | 'Completed' | 'Report Available' | 'Reinspection Required';
  inspectionReportId?: string;
  inspectionScore?: number;
  transferStatus?: 'Verification' | 'Transfer Submitted' | 'NTSA Processing' | 'Completed';
  transferReference?: string;
  dispute?: EscrowDispute;
  timelineLogs?: EscrowLogEntry[];
}

export type UnifiedCommCategory = 
  | 'inquiry'
  | 'purchase'
  | 'seller'
  | 'dealer'
  | 'auction'
  | 'inspection'
  | 'escrow'
  | 'finance'
  | 'support'
  | 'notification'
  | 'messages'
  | 'auctions'
  | 'inspections'
  | 'notifications'
  | 'announcements'
  | 'saved_searches';

export type MessageAttachmentType = 'text' | 'image' | 'document' | 'inspection_pdf' | 'video' | 'location' | 'appointment' | 'payment_receipt';
export type MessageReadStatus = 'sent' | 'delivered' | 'read';

export interface SharedTransactionFile {
  id: string;
  fileName: string;
  fileType: 'pdf' | 'logbook' | 'invoice' | 'receipt' | 'image' | 'video' | 'doc';
  fileSize?: string;
  uploadedAt: string;
  uploadedBy?: string;
  url?: string;
}

export interface ConversationTimelineNode {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  status: 'completed' | 'current' | 'upcoming';
  actor?: string;
}

export interface ConversationParticipant {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  onlineStatus?: 'online' | 'offline' | 'away';
  lastSeen?: string;
  isTyping?: boolean;
}

export interface SmartActionItem {
  id: string;
  label: string;
  actionKey: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'coral' | 'outline';
  iconName?: string;
}

export interface MessageAttachment {
  type: MessageAttachmentType;
  url?: string;
  fileName?: string;
  fileSize?: string;
  locationName?: string;
  locationAddress?: string;
  lat?: number;
  lng?: number;
  appointmentTitle?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  appointmentLocation?: string;
  appointmentStatus?: 'Confirmed' | 'Pending' | 'Rescheduled' | 'Cancelled';
  paymentAmount?: number;
  paymentMethod?: string;
  paymentReference?: string;
  videoDuration?: string;
  inspectionScore?: number;
}

export interface UnifiedMessageItem {
  id: string;
  threadId: string;
  category: UnifiedCommCategory;
  sender: 'user' | 'seller' | 'dealer' | 'inspector' | 'bank_officer' | 'escrow_custodian' | 'system';
  senderName: string;
  senderAvatar?: string;
  recipientName?: string;
  text: string;
  timestamp: string;
  readStatus: MessageReadStatus;
  
  // Context links
  vehicleId?: string;
  vehicleTitle?: string;
  vehicleImage?: string;
  vehiclePrice?: number;
  referenceNumber?: string;
  escrowId?: string;
  inspectionId?: string;
  loanAppRef?: string;
  auctionId?: string;
  
  // Rich media payload
  attachments?: MessageAttachment[];
}

export interface UnifiedChatThread {
  id: string;
  category: UnifiedCommCategory;
  referenceNumber: string;
  transactionType: string;
  currentStatus: string;
  currentStage: string;
  
  participantName: string;
  participantRole: string;
  participantAvatar: string;
  participantVerified: boolean;
  participantStatus?: 'online' | 'offline' | 'away';
  isTyping?: boolean;

  unreadCount: number;
  lastMessage: string;
  lastTimestamp: string;
  isArchived?: boolean;
  
  // Vehicle context
  vehicleId?: string;
  vehicleTitle?: string;
  vehicleImage?: string;
  vehiclePrice?: number;
  vehicleVin?: string;
  vehicleLocation?: string;
  vehicleMileage?: string;
  
  // Transaction context refs
  escrowId?: string;
  inspectionId?: string;
  loanAppRef?: string;
  auctionId?: string;

  // Counterparty info (Protected PII)
  // Fixed: trustScore/rating/verifiedSince/county were required, but no
  // real backend equivalent exists for any of them - a real chat
  // participant has no real trust score or star rating anywhere in
  // this system. Made optional (matching maskedPhone, the one other
  // field with no honest real value for a plain, real conversation) so
  // real data can honestly omit them rather than requiring invented
  // values. The 2 fields this component actually renders (trustScore,
  // maskedPhone) were checked directly - both already handle a missing
  // value safely once optional.
  counterpartyInfo: {
    name: string;
    role: string;
    avatar?: string;
    maskedPhone?: string;
    unmaskedPhone?: string;
    rating?: number;
    trustScore?: number;
    verifiedSince?: string;
    location: string;
    county?: string;
  };
  
  // Structured live sub-summaries for context panel
  escrowSummary?: {
    vaultId: string;
    amountLocked: number;
    bankVault: string;
    step: number;
    totalSteps: number;
    status: string;
  };
  inspectionSummary?: {
    reportId: string;
    score: number;
    inspectorName: string;
    station: string;
    chassisStatus: string;
    obdStatus: string;
    status: string;
  };
  financeSummary?: {
    partnerBank: string;
    loanCode: string;
    approvedLimit: number;
    interestRate: string;
    monthlyInstallment: number;
    status: string;
  };
  auctionSummary?: {
    auctionCode: string;
    currentBid: number;
    reservePrice: number;
    bidsCount: number;
    timeLeft: string;
    status: string;
  };

  // Timeline history & Participants & Smart Actions & Files
  participants: ConversationParticipant[];
  timeline: ConversationTimelineNode[];
  smartActions: SmartActionItem[];
  sharedFiles: SharedTransactionFile[];

  messages: UnifiedMessageItem[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'seller';
  text: string;
  timestamp: string;
  vehicleTitle?: string;
}

export interface Mechanic {
  id: string;
  name: string;
  avatar: string;
  companyName: string;
  title: string;
  counties: string[];
  rating: number;
  reviewsCount: number;
  inspectionsCompleted: number;
  baseFee: number;
  specializations: string[];
  certifications: string[];
  yearsExperience: number;
  bio: string;
  phone: string;
  email: string;
  availableDays: string[];
  verified: boolean;
}

export interface InspectionCategoryDetail {
  score: number;
  status: 'Pass' | 'Attention' | 'Fail';
  notes: string;
}

export interface InspectionReport {
  id: string;
  bookingId: string;
  vehicleId?: string;
  vehicleTitle: string;
  vehicleLocation?: string;
  // Fixed: mechanicId/mechanicName/categoryScores were required, but
  // have no honest real value in every case - an inspector may not
  // yet be assigned (real backend, confirmed directly), and the real
  // checklist column is a generic JSONB array with no fixed
  // engine/transmission/suspension/etc. sub-score schema at all
  // (already documented in services/inspectionApi.ts's own header
  // comment). Made optional rather than inventing sub-scores that
  // don't exist.
  mechanicId?: string;
  mechanicName?: string;
  mechanicCompany?: string;
  overallScore: number;
  verdict: 'Passed (Clean Certification)' | 'Minor Issues Noted' | 'Failed (Major Defects)';
  // Fixed: the real backend has no separate VIN/chassis/logbook
  // verification flags - made optional rather than defaulting to
  // false, which would falsely imply a real, failed check.
  vinVerified?: boolean;
  chassisVerified?: boolean;
  logbookOwnerMatch?: boolean;
  inspectionDate: string;
  categoryScores?: {
    engineAndDrivetrain: InspectionCategoryDetail;
    transmissionAndClutch: InspectionCategoryDetail;
    suspensionAndSteering: InspectionCategoryDetail;
    brakesAndTires: InspectionCategoryDetail;
    electricalAndDiagnostics: InspectionCategoryDetail;
    bodyworkAndChassisFrame: InspectionCategoryDetail;
    interiorAndHVAC: InspectionCategoryDetail;
  };
  obdDiagnosticCodes: string[];
  inspectorSummary: string;
  reportPdfUrl?: string;
  photos: string[];
}

export interface InspectionBooking {
  id: string;
  vehicleId?: string;
  vehicleTitle: string;
  vehicleLocation: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  // Fixed: mechanicId/mechanicName were required, but a real
  // inspection order's inspector is only assigned later by an admin
  // (confirmed directly in the real backend) - not always present.
  // packageType was a fixed 3-tier union with no real backend
  // equivalent (the real backend has one flat fee, no package
  // concept) - widened to a plain string. platformCommission/
  // netMechanicFee are not real, buyer-facing concepts at all (the
  // real backend never exposes a commission split to the buyer) -
  // made optional rather than required.
  mechanicId?: string;
  mechanicName?: string;
  scheduledDate: string;
  scheduledTime: string;
  packageType: string;
  totalFee: number;
  platformCommission?: number;
  netMechanicFee?: number;
  status: 'Pending Mechanic Confirmation' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  paymentStatus?: 'Escrow Held' | 'Released to Mechanic' | 'Refunded';
  reportId?: string;
  createdAt: string;
}

export interface InspectionPayment {
  id: string;
  bookingId: string;
  mechanicId: string;
  mechanicName: string;
  buyerName: string;
  vehicleTitle: string;
  grossAmount: number;
  kayadCommission: number;
  mechanicPayout: number;
  status: 'Held in Escrow' | 'Released' | 'Refunded';
  payoutRef: string;
  timestamp: string;
}

export interface InspectionRating {
  id: string;
  mechanicId: string;
  bookingId: string;
  buyerName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'buyer' | 'dealer' | 'ghost_checker' | 'bank_officer' | 'admin';
  avatar: string;
  isVerified?: boolean;
  unreadMessagesCount?: number;
  unreadNotificationsCount?: number;
}

export type BankApplicationStatus = 'Pending' | 'Under Review' | 'Approved' | 'Rejected' | 'Completed';

export interface BankDocumentItem {
  id: string;
  name: string;
  type: 'National ID' | 'Bank Statement' | 'KRA PIN' | 'Payslip' | 'Employment Letter' | 'Vehicle Valuation' | '150-Point Inspection';
  status: 'Verified' | 'Pending Review' | 'Re-upload Required';
  uploadedAt: string;
  fileUrl?: string;
  fileSize?: string;
}

export interface BankCommunicationMessage {
  id: string;
  sender: 'Bank Loan Officer' | 'Applicant' | 'KAYAD System';
  senderName: string;
  message: string;
  timestamp: string;
  type: 'Status Update' | 'Document Request' | 'General Inquiry' | 'Approval Notice';
}

export interface BankFinancingApplication {
  id: string;
  appRef: string;
  bankId: string;
  bankName: string;
  
  // Applicant details
  applicantName: string;
  applicantPhone: string;
  applicantEmail: string;
  applicantIdNumber: string;
  employmentType: 'Salaried' | 'Self-Employed' | 'SME Corporate';
  monthlyIncome: number;
  employerName: string;
  existingLoansMonthly: number;
  
  // Vehicle details
  vehicleTitle: string;
  vehiclePrice: number;
  vehicleVin: string;
  vehicleYear: number;
  vehicleMileage: number;
  vehicleConditionScore: number; // 150-point report overall score e.g. 94%
  dealerName: string;
  logbookVerified: boolean;
  
  // Loan parameters
  depositAmount: number;
  loanAmount: number;
  tenureMonths: number;
  interestRate: number; // % p.a.
  monthlyInstallment: number;
  ltvRatio: number; // % Loan-to-value
  dtiRatio: number; // % Debt-to-income
  
  // Status & Audit
  status: BankApplicationStatus;
  crbScore: 'Clean (Green Tier)' | 'Minor History (Amber Tier)' | 'High Risk (Red Tier)';
  crbScoreNumber: number; // 300 - 850
  assignedOfficer: string;
  submissionDate: string;
  lastUpdated: string;
  stipulations?: string[];
  rejectionReason?: string;
  
  // Nested modules data
  documents: BankDocumentItem[];
  messages: BankCommunicationMessage[];
}


