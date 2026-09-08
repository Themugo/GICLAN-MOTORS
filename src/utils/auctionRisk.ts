/**
 * Enterprise Auction Risk Monitoring Engine
 * Internal monitoring for auction quality and integrity
 */

import type { AuctionSession, Vehicle } from '../types';

// ============================================================
// Risk Types & Interfaces
// ============================================================

export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type RiskCategory =
  | 'auction_configuration'
  | 'vehicle_integrity'
  | 'organizer_compliance'
  | 'inspection_status'
  | 'payment_configuration'
  | 'scheduling'
  | 'documentation'
  | 'marketplace_conflicts'
  | 'fraud_indicators'
  | 'technical_errors';

export type RiskStatus = 'active' | 'resolved' | 'dismissed' | 'requires_review';

export interface RiskRecommendation {
  problem: string;
  whyItMatters: string;
  solution: string;
  responsibleParty: 'organizer' | 'administrator' | 'system';
  estimatedTime?: string;
}

export interface RiskItem {
  id: string;
  code: string;
  title: string;
  description: string;
  category: RiskCategory;
  severity: RiskSeverity;
  status: RiskStatus;
  auctionId?: string;
  organizerId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  recommendation: RiskRecommendation;
  metadata?: Record<string, unknown>;
  previousOccurrences?: number;
}

export interface RiskTrend {
  date: string;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  resolvedCount: number;
}

export interface RiskDashboardMetrics {
  totalActive: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  resolvedToday: number;
  requiresReview: number;
  avgResolutionTime?: string;
}

// ============================================================
// Category Definitions
// ============================================================

export const RISK_CATEGORIES: Record<RiskCategory, {
  label: string;
  icon: string;
  color: string;
}> = {
  auction_configuration: { label: 'Auction Configuration', icon: 'settings', color: '#6366F1' },
  vehicle_integrity: { label: 'Vehicle Integrity', icon: 'car', color: '#8B5CF6' },
  organizer_compliance: { label: 'Organizer Compliance', icon: 'shield', color: '#EC4899' },
  inspection_status: { label: 'Inspection Status', icon: 'clipboard-check', color: '#14B8A6' },
  payment_configuration: { label: 'Payment Configuration', icon: 'banknote', color: '#F59E0B' },
  scheduling: { label: 'Scheduling', icon: 'calendar', color: '#3B82F6' },
  documentation: { label: 'Documentation', icon: 'file-text', color: '#10B981' },
  marketplace_conflicts: { label: 'Marketplace Conflicts', icon: 'alert-triangle', color: '#EF4444' },
  fraud_indicators: { label: 'Fraud Indicators', icon: 'alert-octagon', color: '#DC2626' },
  technical_errors: { label: 'Technical Errors', icon: 'bug', color: '#6B7280' },
};

// ============================================================
// Severity Styling
// ============================================================

export const SEVERITY_STYLES: Record<RiskSeverity, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  blocksPublication: boolean;
}> = {
  critical: {
    label: 'Critical',
    color: '#DC2626',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: 'alert-octagon',
    blocksPublication: true,
  },
  high: {
    label: 'High',
    color: '#EA580C',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: 'alert-circle',
    blocksPublication: true,
  },
  medium: {
    label: 'Medium',
    color: '#D97706',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: 'alert-triangle',
    blocksPublication: false,
  },
  low: {
    label: 'Low',
    color: '#0891B2',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    icon: 'info',
    blocksPublication: false,
  },
  info: {
    label: 'Information',
    color: '#6B7280',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    icon: 'info',
    blocksPublication: false,
  },
};

// ============================================================
// Risk Detection Functions
// ============================================================

export interface RiskCheckContext {
  session: Partial<AuctionSession>;
  vehicle: Partial<Vehicle>;
  existingRisks?: RiskItem[];
  organizerHistory?: {
    cancelledAuctions: number;
    failedVerifications: number;
    lastVerificationDate?: string;
  };
}

export function detectConfigurationRisks(ctx: RiskCheckContext): RiskItem[] {
  const risks: RiskItem[] = [];
  const { session } = ctx;

  // Missing Reserve Price
  if (!session.reservePrice || session.reservePrice <= 0) {
    risks.push(createRisk({
      code: 'CFG-001',
      title: 'Reserve Price Not Configured',
      description: 'This auction has no reserve price set. Consider adding one to protect the seller.',
      category: 'auction_configuration',
      severity: 'medium',
      recommendation: {
        problem: 'No reserve price has been set for this auction.',
        whyItMatters: 'Without a reserve price, the vehicle may sell below fair market value.',
        solution: 'Set a reserve price that reflects the minimum acceptable amount.',
        responsibleParty: 'organizer',
        estimatedTime: '5 minutes',
      },
    }));
  }

  // Missing Opening Bid
  if (!session.startingPrice || session.startingPrice <= 0) {
    risks.push(createRisk({
      code: 'CFG-002',
      title: 'Opening Bid Not Configured',
      description: 'This auction has no starting price. A starting bid must be set.',
      category: 'auction_configuration',
      severity: 'critical',
      recommendation: {
        problem: 'No opening bid has been configured.',
        whyItMatters: 'Auctions require a starting price to begin bidding.',
        solution: 'Set a competitive starting price based on market analysis.',
        responsibleParty: 'organizer',
        estimatedTime: '2 minutes',
      },
    }));
  }

  // Invalid Bid Increment
  if (!session.minimumIncrement || session.minimumIncrement <= 0) {
    risks.push(createRisk({
      code: 'CFG-003',
      title: 'Bid Increment Not Defined',
      description: 'The minimum bid increment has not been configured.',
      category: 'auction_configuration',
      severity: 'high',
      recommendation: {
        problem: 'No minimum bid increment has been set.',
        whyItMatters: 'Without defined increments, bidding may be disorganized.',
        solution: 'Set a reasonable increment (typically 1-5% of starting price).',
        responsibleParty: 'organizer',
        estimatedTime: '2 minutes',
      },
    }));
  }

  // Auction Duration Validation
  if (session.startsAt && session.endsAt) {
    const start = new Date(session.startsAt);
    const end = new Date(session.endsAt);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (durationHours < 1) {
      risks.push(createRisk({
        code: 'CFG-004',
        title: 'Auction Duration Too Short',
        description: 'This auction is scheduled for less than 1 hour.',
        category: 'auction_configuration',
        severity: 'medium',
        recommendation: {
          problem: 'Auction duration is less than 1 hour.',
          whyItMatters: 'Short auctions may not attract sufficient bidding activity.',
          solution: 'Extend the auction to at least 24-48 hours for optimal participation.',
          responsibleParty: 'organizer',
          estimatedTime: '2 minutes',
        },
      }));
    }

    if (durationHours > 720) { // 30 days
      risks.push(createRisk({
        code: 'CFG-005',
        title: 'Auction Duration Too Long',
        description: 'This auction is scheduled for more than 30 days.',
        category: 'auction_configuration',
        severity: 'low',
        recommendation: {
          problem: 'Auction duration exceeds 30 days.',
          whyItMatters: 'Extended auctions may lose bidder engagement.',
          solution: 'Consider shortening to 7-14 days for better urgency.',
          responsibleParty: 'organizer',
          estimatedTime: '2 minutes',
        },
      }));
    }

    // Auction End Before Start
    if (end <= start) {
      risks.push(createRisk({
        code: 'CFG-006',
        title: 'Invalid Auction Schedule',
        description: 'The auction end time is before or equal to the start time.',
        category: 'auction_configuration',
        severity: 'critical',
        recommendation: {
          problem: 'Auction schedule is invalid.',
          whyItMatters: 'The auction cannot function with invalid timing.',
          solution: 'Set a valid start time before the end time.',
          responsibleParty: 'organizer',
          estimatedTime: '1 minute',
        },
      }));
    }
  }

  // Viewing Schedule Missing
  if (!session.viewingDates) {
    risks.push(createRisk({
      code: 'CFG-007',
      title: 'Viewing Schedule Missing',
      description: 'No viewing dates have been configured for this auction.',
      category: 'auction_configuration',
      severity: 'high',
      recommendation: {
        problem: 'No viewing schedule has been created.',
        whyItMatters: 'Bidders need opportunity to inspect vehicles before bidding.',
        solution: 'Add viewing dates, times, and location details.',
        responsibleParty: 'organizer',
        estimatedTime: '5 minutes',
      },
    }));
  }

  return risks;
}

export function detectVehicleRisks(ctx: RiskCheckContext): RiskItem[] {
  const risks: RiskItem[] = [];
  const { vehicle } = ctx;

  // Missing VIN
  if (!vehicle.vin) {
    risks.push(createRisk({
      code: 'VEH-001',
      title: 'VIN Not Recorded',
      description: 'Vehicle identification number has not been recorded.',
      category: 'vehicle_integrity',
      severity: 'critical',
      recommendation: {
        problem: 'No VIN has been recorded for this vehicle.',
        whyItMatters: 'VIN is required for vehicle verification and ownership transfer.',
        solution: 'Record the complete 17-character VIN.',
        responsibleParty: 'organizer',
        estimatedTime: '2 minutes',
      },
    }));
  }

  // Missing Images
  const imageCount = vehicle.images?.length || 0;
  if (imageCount < 6) {
    risks.push(createRisk({
      code: 'VEH-002',
      title: 'Insufficient Vehicle Images',
      description: `Only ${imageCount} images uploaded. Minimum 6 required.`,
      category: 'vehicle_integrity',
      severity: 'critical',
      recommendation: {
        problem: `Only ${imageCount} images uploaded.`,
        whyItMatters: 'Buyers need comprehensive views to make informed decisions.',
        solution: 'Upload at least 6 images: exterior (4 sides), interior, dashboard.',
        responsibleParty: 'organizer',
        estimatedTime: '10 minutes',
      },
    }));
  }

  // Missing Vehicle Description
  if (!vehicle.description || vehicle.description.length < 50) {
    risks.push(createRisk({
      code: 'VEH-003',
      title: 'Vehicle Description Incomplete',
      description: 'The vehicle description is too short or missing.',
      category: 'vehicle_integrity',
      severity: 'high',
      recommendation: {
        problem: 'Vehicle description is insufficient.',
        whyItMatters: 'Buyers need detailed information about vehicle condition.',
        solution: 'Provide a comprehensive description including condition, history, and notable features.',
        responsibleParty: 'organizer',
        estimatedTime: '10 minutes',
      },
    }));
  }

  // Duplicate VIN check (would need backend integration)
  // This is a placeholder for the actual implementation
  if (vehicle.vin && vehicle.vin.length !== 17) {
    risks.push(createRisk({
      code: 'VEH-004',
      title: 'VIN Format Invalid',
      description: 'The VIN does not appear to be in standard 17-character format.',
      category: 'vehicle_integrity',
      severity: 'high',
      recommendation: {
        problem: 'VIN format is invalid.',
        whyItMatters: 'Standard VINs are required for vehicle identification.',
        solution: 'Verify and correct the VIN format.',
        responsibleParty: 'organizer',
        estimatedTime: '2 minutes',
      },
    }));
  }

  // Expired Information
  if (vehicle.year && vehicle.year < new Date().getFullYear() - 20) {
    risks.push(createRisk({
      code: 'VEH-005',
      title: 'Vehicle Information May Be Stale',
      description: 'This vehicle is over 20 years old. Verify all information is current.',
      category: 'vehicle_integrity',
      severity: 'info',
      recommendation: {
        problem: 'Vehicle is over 20 years old.',
        whyItMatters: 'Older vehicles may have outdated information.',
        solution: 'Verify current mileage, condition, and documentation.',
        responsibleParty: 'organizer',
        estimatedTime: '5 minutes',
      },
    }));
  }

  return risks;
}

export function detectOrganizerRisks(ctx: RiskCheckContext): RiskItem[] {
  const risks: RiskItem[] = [];
  const { session, organizerHistory } = ctx;

  // Verification Expired
  if (session.organizer?.isVerified === false) {
    risks.push(createRisk({
      code: 'ORG-001',
      title: 'Organizer Verification Expired',
      description: 'The organizer verification status needs to be renewed.',
      category: 'organizer_compliance',
      severity: 'critical',
      recommendation: {
        problem: 'Organizer verification has expired or is invalid.',
        whyItMatters: 'Unverified organizers cannot conduct auctions.',
        solution: 'Complete the verification renewal process.',
        responsibleParty: 'organizer',
        estimatedTime: '1-2 days',
      },
    }));
  }

  // Support Contacts Missing
  if (!session.organizer?.phone || !session.organizer?.email) {
    risks.push(createRisk({
      code: 'ORG-002',
      title: 'Support Contacts Incomplete',
      description: 'Organizer contact information is incomplete.',
      category: 'organizer_compliance',
      severity: 'high',
      recommendation: {
        problem: 'Missing phone or email for customer support.',
        whyItMatters: 'Buyers need reliable contact channels.',
        solution: 'Add a phone number and email address for buyer inquiries.',
        responsibleParty: 'organizer',
        estimatedTime: '2 minutes',
      },
    }));
  }

  // Payment Details Changed (would need history tracking)
  if (!session.organizer?.paymentDetails) {
    risks.push(createRisk({
      code: 'ORG-003',
      title: 'Payment Details Missing',
      description: 'No payment receiving details have been configured.',
      category: 'organizer_compliance',
      severity: 'critical',
      recommendation: {
        problem: 'Organizer has no payment details configured.',
        whyItMatters: 'Cannot process auction payments without receiving details.',
        solution: 'Add bank account or M-Pesa details for receiving payments.',
        responsibleParty: 'organizer',
        estimatedTime: '5 minutes',
      },
    }));
  }

  // Repeated Cancellations
  if (organizerHistory && organizerHistory.cancelledAuctions > 3) {
    risks.push(createRisk({
      code: 'ORG-004',
      title: 'High Auction Cancellation Rate',
      description: `This organizer has cancelled ${organizerHistory.cancelledAuctions} auctions.`,
      category: 'organizer_compliance',
      severity: 'medium',
      recommendation: {
        problem: `Organizer has ${organizerHistory.cancelledAuctions} cancellations on record.`,
        whyItMatters: 'Frequent cancellations affect marketplace trust.',
        solution: 'Ensure auction readiness before scheduling. Consider a cooling-off period.',
        responsibleParty: 'organizer',
        estimatedTime: 'Ongoing',
      },
    }));
  }

  // Low Customer Satisfaction
  if (session.organizer?.rating && session.organizer.rating < 3.5) {
    risks.push(createRisk({
      code: 'ORG-005',
      title: 'Low Customer Satisfaction',
      description: `Organizer rating is ${session.organizer.rating}/5.0.`,
      category: 'organizer_compliance',
      severity: 'medium',
      recommendation: {
        problem: 'Customer satisfaction rating is below acceptable threshold.',
        whyItMatters: 'Low ratings may indicate service quality issues.',
        solution: 'Focus on improving buyer communication and fulfillment.',
        responsibleParty: 'organizer',
        estimatedTime: 'Ongoing',
      },
    }));
  }

  return risks;
}

export function detectPaymentRisks(ctx: RiskCheckContext): RiskItem[] {
  const risks: RiskItem[] = [];
  const { session } = ctx;

  // Missing Payment Details
  if (!session.organizer?.paymentDetails) {
    risks.push(createRisk({
      code: 'PAY-001',
      title: 'Payment Configuration Missing',
      description: 'No payment receiving details have been set up.',
      category: 'payment_configuration',
      severity: 'critical',
      recommendation: {
        problem: 'No payment receiving configuration exists.',
        whyItMatters: 'Auctions cannot proceed without payment collection capability.',
        solution: 'Configure bank account or M-Pesa Paybill/Till.',
        responsibleParty: 'organizer',
        estimatedTime: '10 minutes',
      },
    }));
  }

  // Refund Policy Missing
  if (!session.organizer?.refundPolicy) {
    risks.push(createRisk({
      code: 'PAY-002',
      title: 'Refund Policy Not Published',
      description: 'The bid security refund policy has not been defined.',
      category: 'payment_configuration',
      severity: 'high',
      recommendation: {
        problem: 'No refund policy has been published.',
        whyItMatters: 'Buyers need clear refund terms for bid security.',
        solution: 'Define and publish a clear refund policy.',
        responsibleParty: 'organizer',
        estimatedTime: '5 minutes',
      },
    }));
  }

  // Bid Security Not Configured
  if (session.bidSecurityAmount === undefined || session.bidSecurityAmount === 0) {
    risks.push(createRisk({
      code: 'PAY-003',
      title: 'Bid Security Not Configured',
      description: 'No bid security amount has been set.',
      category: 'payment_configuration',
      severity: 'medium',
      recommendation: {
        problem: 'Bid security amount has not been configured.',
        whyItMatters: 'Bid security protects sellers from frivolous bidding.',
        solution: 'Set an appropriate bid security amount.',
        responsibleParty: 'organizer',
        estimatedTime: '2 minutes',
      },
    }));
  }

  return risks;
}

export function detectSchedulingRisks(ctx: RiskCheckContext): RiskItem[] {
  const risks: RiskItem[] = [];
  const { session } = ctx;

  // Auction Holiday Conflict
  const holidays = [
    '2026-04-03', // Good Friday
    '2026-04-05', // Easter Sunday
    '2026-05-01', // Labour Day
    '2026-06-01', // Madaraka Day
    '2026-10-10', // Utalii Day
    '2026-10-20', // Mashujaa Day
    '2026-12-12', // Jamhuri Day
    '2026-12-25', // Christmas
    '2026-12-26', // Boxing Day
  ];

  if (session.endsAt) {
    const endDate = new Date(session.endsAt).toISOString().split('T')[0];
    if (holidays.includes(endDate)) {
      risks.push(createRisk({
        code: 'SCH-001',
        title: 'Auction Ends on Public Holiday',
        description: 'The auction end date coincides with a public holiday.',
        category: 'scheduling',
        severity: 'low',
        recommendation: {
          problem: 'Auction ends on a public holiday.',
          whyItMatters: 'Payment processing may be delayed on holidays.',
          solution: 'Consider adjusting the end date to the next business day.',
          responsibleParty: 'organizer',
          estimatedTime: '2 minutes',
        },
      }));
    }
  }

  // Insufficient Registration Window
  if (session.startsAt) {
    const startDate = new Date(session.startsAt);
    const daysUntilStart = Math.floor((startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (daysUntilStart > 0 && daysUntilStart < 3) {
      risks.push(createRisk({
        code: 'SCH-002',
        title: 'Short Registration Window',
        description: `Only ${daysUntilStart} day(s) before auction starts.`,
        category: 'scheduling',
        severity: 'medium',
        recommendation: {
          problem: 'Insufficient time for bidder registration.',
          whyItMatters: 'Bidders need time to verify and complete registration.',
          solution: 'Allow at least 3-5 days between scheduling and start.',
          responsibleParty: 'organizer',
          estimatedTime: '2 minutes',
        },
      }));
    }
  }

  return risks;
}

export function detectInspectionRisks(ctx: RiskCheckContext): RiskItem[] {
  const risks: RiskItem[] = [];
  const { vehicle } = ctx;

  // No Inspection Status
  if (!vehicle.inspectionPassed && !vehicle.inspectionBookingAvailable) {
    risks.push(createRisk({
      code: 'INS-001',
      title: 'Inspection Status Not Defined',
      description: 'Neither inspection report nor booking option has been configured.',
      category: 'inspection_status',
      severity: 'critical',
      recommendation: {
        problem: 'No inspection arrangement exists.',
        whyItMatters: 'Buyers need assurance about vehicle condition.',
        solution: 'Either upload a certified inspection report or enable inspection booking.',
        responsibleParty: 'organizer',
        estimatedTime: '15 minutes',
      },
    }));
  }

  // Expired Inspection Certificate
  if (vehicle.inspection?.inspectedAt) {
    const inspectionDate = new Date(vehicle.inspection.inspectedAt);
    const monthsSinceInspection = (Date.now() - inspectionDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

    if (monthsSinceInspection > 3) {
      risks.push(createRisk({
        code: 'INS-002',
        title: 'Inspection Certificate May Be Expired',
        description: `Last inspection was ${Math.floor(monthsSinceInspection)} months ago.`,
        category: 'inspection_status',
        severity: 'medium',
        recommendation: {
          problem: 'Inspection certificate may no longer be current.',
          whyItMatters: 'Vehicle condition may have changed since inspection.',
          solution: 'Obtain a fresh inspection or clearly note the age of the report.',
          responsibleParty: 'organizer',
          estimatedTime: '1-2 days',
        },
      }));
    }
  }

  return risks;
}

export function detectDocumentationRisks(ctx: RiskCheckContext): RiskItem[] {
  const risks: RiskItem[] = [];
  const { session } = ctx;

  // Missing Terms and Conditions
  if (!session.termsAndConditions || session.termsAndConditions.length === 0) {
    risks.push(createRisk({
      code: 'DOC-001',
      title: 'Auction Terms Not Defined',
      description: 'No terms and conditions have been specified.',
      category: 'documentation',
      severity: 'high',
      recommendation: {
        problem: 'No terms and conditions have been defined.',
        whyItMatters: 'Clear terms protect both parties and prevent disputes.',
        solution: 'Define auction rules, payment terms, and collection procedures.',
        responsibleParty: 'organizer',
        estimatedTime: '10 minutes',
      },
    }));
  }

  // Missing Collection Instructions
  if (!session.viewingLocation && !session.vehicle?.location) {
    risks.push(createRisk({
      code: 'DOC-002',
      title: 'Collection Location Not Specified',
      description: 'No vehicle collection point has been defined.',
      category: 'documentation',
      severity: 'high',
      recommendation: {
        problem: 'No collection location has been specified.',
        whyItMatters: 'Winners need to know where to collect the vehicle.',
        solution: 'Specify the exact collection address.',
        responsibleParty: 'organizer',
        estimatedTime: '2 minutes',
      },
    }));
  }

  return risks;
}

export function detectFraudRisks(ctx: RiskCheckContext): RiskItem[] {
  const risks: RiskItem[] = [];
  const { organizerHistory } = ctx;

  // High cancellation rate flag
  if (organizerHistory && organizerHistory.cancelledAuctions > 5) {
    risks.push(createRisk({
      code: 'FRD-001',
      title: 'Frequent Auction Cancellations',
      description: `This organizer has cancelled ${organizerHistory.cancelledAuctions} auctions. Flagged for review.`,
      category: 'fraud_indicators',
      severity: 'medium',
      recommendation: {
        problem: 'Unusually high number of auction cancellations.',
        whyItMatters: 'May indicate practice of testing market prices without commitment.',
        solution: 'Manual review recommended. Consider additional verification requirements.',
        responsibleParty: 'administrator',
        estimatedTime: '30 minutes',
      },
    }));
  }

  // Repeated Failed Verifications
  if (organizerHistory && organizerHistory.failedVerifications > 2) {
    risks.push(createRisk({
      code: 'FRD-002',
      title: 'Repeated Verification Failures',
      description: `${organizerHistory.failedVerifications} failed verification attempts recorded.`,
      category: 'fraud_indicators',
      severity: 'high',
      recommendation: {
        problem: 'Multiple verification failures on record.',
        whyItMatters: 'May indicate fraudulent activity or document issues.',
        solution: 'Require in-person verification or additional documentation.',
        responsibleParty: 'administrator',
        estimatedTime: '1-2 days',
      },
    }));
  }

  // Suspicious Bid Security Amount
  if (ctx.session.bidSecurityAmount) {
    const startingPrice = ctx.session.startingPrice || 1;
    const securityRatio = ctx.session.bidSecurityAmount / startingPrice;

    if (securityRatio > 0.5) {
      risks.push(createRisk({
        code: 'FRD-003',
        title: 'Unusually High Bid Security',
        description: `Bid security is ${(securityRatio * 100).toFixed(0)}% of starting price.`,
        category: 'fraud_indicators',
        severity: 'info',
        recommendation: {
          problem: 'Bid security amount is unusually high relative to starting price.',
          whyItMatters: 'May discourage legitimate bidding.',
          solution: 'Review and adjust bid security to reasonable level (typically 5-15%).',
          responsibleParty: 'organizer',
          estimatedTime: '2 minutes',
        },
      }));
    }
  }

  return risks;
}

// ============================================================
// Risk Aggregation
// ============================================================

export function detectAllRisks(ctx: RiskCheckContext): RiskItem[] {
  const allRisks: RiskItem[] = [
    ...detectConfigurationRisks(ctx),
    ...detectVehicleRisks(ctx),
    ...detectOrganizerRisks(ctx),
    ...detectPaymentRisks(ctx),
    ...detectSchedulingRisks(ctx),
    ...detectInspectionRisks(ctx),
    ...detectDocumentationRisks(ctx),
    ...detectFraudRisks(ctx),
  ];

  // Add auction and organizer IDs where available
  return allRisks.map(risk => ({
    ...risk,
    auctionId: ctx.session.id || risk.auctionId,
    organizerId: ctx.session.organizer?.id || risk.organizerId,
  }));
}

export function calculateRiskMetrics(risks: RiskItem[]): RiskDashboardMetrics {
  const activeRisks = risks.filter(r => r.status === 'active');

  return {
    totalActive: activeRisks.length,
    critical: activeRisks.filter(r => r.severity === 'critical').length,
    high: activeRisks.filter(r => r.severity === 'high').length,
    medium: activeRisks.filter(r => r.severity === 'medium').length,
    low: activeRisks.filter(r => r.severity === 'low').length,
    info: activeRisks.filter(r => r.severity === 'info').length,
    resolvedToday: risks.filter(r => {
      if (r.resolvedAt) {
        const resolved = new Date(r.resolvedAt);
        const today = new Date();
        return resolved.toDateString() === today.toDateString();
      }
      return false;
    }).length,
    requiresReview: activeRisks.filter(r => r.category === 'fraud_indicators').length,
  };
}

export function canPublishAuction(risks: RiskItem[]): { canPublish: boolean; blockingRisks: RiskItem[] } {
  const blockingRisks = risks.filter(
    r => r.status === 'active' &&
    (r.severity === 'critical' || r.severity === 'high') &&
    SEVERITY_STYLES[r.severity].blocksPublication
  );

  return {
    canPublish: blockingRisks.length === 0,
    blockingRisks,
  };
}

// ============================================================
// Helpers
// ============================================================

function createRisk(partial: Partial<RiskItem>): RiskItem {
  const now = new Date().toISOString();
  return {
    id: `RISK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...partial,
  } as RiskItem;
}

export function getRisksByCategory(risks: RiskItem[]): Record<RiskCategory, RiskItem[]> {
  const grouped: Record<RiskCategory, RiskItem[]> = {} as Record<RiskCategory, RiskItem[]>;

  for (const category of Object.keys(RISK_CATEGORIES) as RiskCategory[]) {
    grouped[category] = risks.filter(r => r.category === category);
  }

  return grouped;
}

export function getRisksBySeverity(risks: RiskItem[]): Record<RiskSeverity, RiskItem[]> {
  const grouped: Record<RiskSeverity, RiskItem[]> = {} as Record<RiskSeverity, RiskItem[]>;

  for (const severity of Object.keys(SEVERITY_STYLES) as RiskSeverity[]) {
    grouped[severity] = risks.filter(r => r.severity === severity);
  }

  return grouped;
}

export function sortRisksByPriority(risks: RiskItem[]): RiskItem[] {
  const severityOrder: Record<RiskSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  };

  return [...risks].sort((a, b) => {
    // Active risks first
    if (a.status !== b.status) {
      if (a.status === 'active') return -1;
      if (b.status === 'active') return 1;
    }
    // Then by severity
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

export default {
  RISK_CATEGORIES,
  SEVERITY_STYLES,
  detectAllRisks,
  detectConfigurationRisks,
  detectVehicleRisks,
  detectOrganizerRisks,
  detectPaymentRisks,
  detectSchedulingRisks,
  detectInspectionRisks,
  detectDocumentationRisks,
  detectFraudRisks,
  calculateRiskMetrics,
  canPublishAuction,
  getRisksByCategory,
  getRisksBySeverity,
  sortRisksByPriority,
};
