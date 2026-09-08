/**
 * Enterprise Auction Compliance Center
 * Governance framework for auction compliance and policy management
 */

import type { AuctionSession, Vehicle } from '../types';

// ============================================================
// Compliance Types & Interfaces
// ============================================================

export type ComplianceStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'conditional_approval'
  | 'suspended'
  | 'rejected'
  | 'expired';

export type ComplianceCategory =
  | 'organization'
  | 'vehicle'
  | 'auction'
  | 'financial'
  | 'inspection'
  | 'document'
  | 'marketplace_policy'
  | 'customer_protection';

export type ComplianceCheckSeverity = 'required' | 'recommended' | 'optional';

export interface ComplianceCheck {
  id: string;
  category: ComplianceCategory;
  label: string;
  description: string;
  severity: ComplianceCheckSeverity;
  isComplete: boolean;
  isVerified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  expiryDate?: string;
  documentUrl?: string;
}

export interface ComplianceItem {
  id: string;
  auctionId: string;
  organizerId: string;
  status: ComplianceStatus;
  checks: ComplianceCheck[];
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  expiresAt?: string;
  policyAcknowledged?: boolean;
  policyAcknowledgedAt?: string;
}

export interface ComplianceMetrics {
  totalAuctions: number;
  pendingReview: number;
  approved: number;
  suspended: number;
  rejected: number;
  expired: number;
  expiringWithin30Days: number;
  expiringWithin7Days: number;
}

export interface ExpiryReminder {
  id: string;
  organizerId: string;
  auctionId?: string;
  documentType: string;
  documentName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  reminderSent: boolean;
  severity: 'critical' | 'warning' | 'info';
}

export interface PolicyAcknowledgement {
  policyId: string;
  policyName: string;
  version: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface ComplianceAuditEntry {
  id: string;
  auctionId: string;
  organizerId: string;
  action: ComplianceAuditAction;
  previousStatus?: ComplianceStatus;
  newStatus?: ComplianceStatus;
  performedBy: string;
  performedAt: string;
  comments?: string;
  evidence?: string[];
}

export type ComplianceAuditAction =
  | 'created'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'conditional_approved'
  | 'rejected'
  | 'suspended'
  | 'reactivated'
  | 'expired'
  | 'document_uploaded'
  | 'document_expired'
  | 'policy_acknowledged'
  | 'correction_requested'
  | 'correction_submitted';

// ============================================================
// Category Definitions
// ============================================================

export const COMPLIANCE_CATEGORIES: Record<ComplianceCategory, {
  label: string;
  icon: string;
  color: string;
  description: string;
}> = {
  organization: {
    label: 'Organization Compliance',
    icon: 'building',
    color: '#6366F1',
    description: 'Business verification and licensing',
  },
  vehicle: {
    label: 'Vehicle Compliance',
    icon: 'car',
    color: '#8B5CF6',
    description: 'Vehicle ownership and documentation',
  },
  auction: {
    label: 'Auction Compliance',
    icon: 'gavel',
    color: '#EC4899',
    description: 'Auction settings and configuration',
  },
  financial: {
    label: 'Financial Compliance',
    icon: 'banknote',
    color: '#F59E0B',
    description: 'Payment and settlement configuration',
  },
  inspection: {
    label: 'Inspection Compliance',
    icon: 'clipboard-check',
    color: '#14B8A6',
    description: 'Vehicle inspection status',
  },
  document: {
    label: 'Document Compliance',
    icon: 'file-text',
    color: '#10B981',
    description: 'Required documents and licenses',
  },
  marketplace_policy: {
    label: 'Marketplace Policy',
    icon: 'shield',
    color: '#3B82F6',
    description: 'Policy acknowledgements',
  },
  customer_protection: {
    label: 'Customer Protection',
    icon: 'users',
    color: '#EF4444',
    description: 'Buyer transparency and protection',
  },
};

// ============================================================
// Status Definitions
// ============================================================

export const COMPLIANCE_STATUS_STYLES: Record<ComplianceStatus, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  isBlocking: boolean;
}> = {
  pending: {
    label: 'Pending',
    color: '#6B7280',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
    icon: 'clock',
    isBlocking: true,
  },
  under_review: {
    label: 'Under Review',
    color: '#3B82F6',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    icon: 'eye',
    isBlocking: true,
  },
  approved: {
    label: 'Approved',
    color: '#10B981',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-300',
    icon: 'check-circle',
    isBlocking: false,
  },
  conditional_approval: {
    label: 'Conditional',
    color: '#F59E0B',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
    icon: 'alert-circle',
    isBlocking: false,
  },
  suspended: {
    label: 'Suspended',
    color: '#DC2626',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    icon: 'pause-circle',
    isBlocking: true,
  },
  rejected: {
    label: 'Rejected',
    color: '#991B1B',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    icon: 'x-circle',
    isBlocking: true,
  },
  expired: {
    label: 'Expired',
    color: '#78716C',
    bgColor: 'bg-stone-100',
    borderColor: 'border-stone-300',
    icon: 'clock',
    isBlocking: true,
  },
};

// ============================================================
// Default Compliance Checks
// ============================================================

export function getDefaultComplianceChecks(): ComplianceCheck[] {
  return [
    // Organization Compliance
    {
      id: 'org-verified',
      category: 'organization',
      label: 'Business Verification',
      description: 'Organization identity verified by KAYAD',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'org-registration',
      category: 'organization',
      label: 'Business Registration',
      description: 'Valid business registration certificate',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'org-dealer-license',
      category: 'organization',
      label: 'Dealer License',
      description: 'Valid dealer license (if applicable)',
      severity: 'recommended',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'org-auctioneer-license',
      category: 'organization',
      label: 'Auctioneer License',
      description: 'Valid auctioneer license (if applicable)',
      severity: 'recommended',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'org-payment-accounts',
      category: 'organization',
      label: 'Payment Accounts Verified',
      description: 'Bank/M-Pesa accounts verified',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'org-support-contacts',
      category: 'organization',
      label: 'Support Contacts',
      description: 'Phone and email for buyer support',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'org-physical-office',
      category: 'organization',
      label: 'Physical Office Address',
      description: 'Verified office location',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },

    // Vehicle Compliance
    {
      id: 'veh-ownership',
      category: 'vehicle',
      label: 'Ownership Verified',
      description: 'Vehicle ownership documentation verified',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'veh-vin',
      category: 'vehicle',
      label: 'VIN Recorded',
      description: 'Vehicle identification number recorded',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'veh-registration',
      category: 'vehicle',
      label: 'Registration Valid',
      description: 'Vehicle registration verified',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'veh-description',
      category: 'vehicle',
      label: 'Description Complete',
      description: 'Full vehicle description provided',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'veh-media',
      category: 'vehicle',
      label: 'Media Complete',
      description: 'Minimum 6 photos uploaded',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'veh-category',
      category: 'vehicle',
      label: 'Category Valid',
      description: 'Vehicle category correctly assigned',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },

    // Auction Compliance
    {
      id: 'auc-dates',
      category: 'auction',
      label: 'Auction Dates Set',
      description: 'Valid start and end dates configured',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'auc-viewing',
      category: 'auction',
      label: 'Viewing Schedule',
      description: 'Public viewing dates configured',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'auc-opening-bid',
      category: 'auction',
      label: 'Opening Bid Set',
      description: 'Starting price configured',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'auc-increment',
      category: 'auction',
      label: 'Bid Increment',
      description: 'Minimum bid increment defined',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'auc-rules',
      category: 'auction',
      label: 'Auction Rules',
      description: 'Specific auction rules defined',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'auc-terms',
      category: 'auction',
      label: 'Terms & Conditions',
      description: 'Auction terms accepted',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },

    // Financial Compliance
    {
      id: 'fin-payment-recipient',
      category: 'financial',
      label: 'Payment Recipient',
      description: 'Organizer confirmed as payment recipient',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'fin-bank-details',
      category: 'financial',
      label: 'Bank Details',
      description: 'Payment receiving account configured',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'fin-refund-policy',
      category: 'financial',
      label: 'Refund Policy',
      description: 'Bid security refund policy published',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'fin-settlement',
      category: 'financial',
      label: 'Settlement Instructions',
      description: 'Winning payment instructions published',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },

    // Inspection Compliance
    {
      id: 'ins-report-or-booking',
      category: 'inspection',
      label: 'Inspection Available',
      description: 'Inspection report or booking available',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },

    // Document Compliance
    {
      id: 'doc-ownership',
      category: 'document',
      label: 'Ownership Documents',
      description: 'Vehicle ownership documents uploaded',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'doc-inspection-cert',
      category: 'document',
      label: 'Inspection Certificate',
      description: 'Valid inspection certificate (if applicable)',
      severity: 'recommended',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'doc-auction-terms',
      category: 'document',
      label: 'Auction Terms Document',
      description: 'Signed auction terms document',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },

    // Marketplace Policy
    {
      id: 'pol-auction-policy',
      category: 'marketplace_policy',
      label: 'Auction Policy',
      description: 'KAYAD Auction Policy acknowledged',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'pol-bidder-rules',
      category: 'marketplace_policy',
      label: 'Bidder Rules',
      description: 'Bidder participation rules acknowledged',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'pol-payment-responsibility',
      category: 'marketplace_policy',
      label: 'Payment Responsibility',
      description: 'Payment handling responsibility acknowledged',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'pol-fraud-prevention',
      category: 'marketplace_policy',
      label: 'Fraud Prevention',
      description: 'Fraud prevention policy acknowledged',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'pol-code-of-conduct',
      category: 'marketplace_policy',
      label: 'Marketplace Code of Conduct',
      description: 'Code of conduct acknowledged',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },

    // Customer Protection
    {
      id: 'cp-organizer-identity',
      category: 'customer_protection',
      label: 'Organizer Identity',
      description: 'Organizer identity visible to buyers',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'cp-viewing-info',
      category: 'customer_protection',
      label: 'Viewing Information',
      description: 'Viewing schedule visible to buyers',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'cp-inspection-info',
      category: 'customer_protection',
      label: 'Inspection Information',
      description: 'Inspection options visible to buyers',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'cp-payment-info',
      category: 'customer_protection',
      label: 'Payment Transparency',
      description: 'Payment instructions visible to buyers',
      severity: 'required',
      isComplete: false,
      isVerified: false,
    },
    {
      id: 'cp-complaint-process',
      category: 'customer_protection',
      label: 'Complaint Process',
      description: 'Complaint escalation process defined',
      severity: 'recommended',
      isComplete: false,
      isVerified: false,
    },
  ];
}

// ============================================================
// Compliance Validation
// ============================================================

export interface ComplianceValidationResult {
  isCompliant: boolean;
  requiredComplete: boolean;
  canPublish: boolean;
  missingRequired: ComplianceCheck[];
  incompleteRecommended: ComplianceCheck[];
  blockingIssues: string[];
}

export function validateCompliance(
  session: Partial<AuctionSession>,
  vehicle: Partial<Vehicle>,
  checks: ComplianceCheck[]
): ComplianceValidationResult {
  const requiredChecks = checks.filter(c => c.severity === 'required');
  const recommendedChecks = checks.filter(c => c.severity === 'recommended');

  const missingRequired = requiredChecks.filter(c => !c.isComplete);
  const incompleteRecommended = recommendedChecks.filter(c => !c.isComplete);

  // Check if payment recipient is clearly identified (never allow auction without this)
  const paymentRecipientConfigured = session.organizer?.name && session.organizer?.paymentDetails;

  // Check if inspection is available
  const inspectionAvailable = vehicle.inspectionPassed || vehicle.inspectionBookingAvailable;

  const blockingIssues: string[] = [];

  if (!paymentRecipientConfigured) {
    blockingIssues.push('Payment recipient must be configured before publishing');
  }

  if (!inspectionAvailable) {
    blockingIssues.push('Inspection report or booking must be available');
  }

  const requiredComplete = missingRequired.length === 0;
  const isCompliant = requiredComplete && paymentRecipientConfigured && inspectionAvailable;
  const canPublish = requiredComplete && blockingIssues.length === 0;

  return {
    isCompliant,
    requiredComplete,
    canPublish,
    missingRequired,
    incompleteRecommended,
    blockingIssues,
  };
}

// ============================================================
// Compliance Metrics
// ============================================================

export function calculateComplianceMetrics(
  items: ComplianceItem[]
): ComplianceMetrics {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const expiringWithin30Days = items.filter(item => {
    if (!item.expiresAt) return false;
    const expiryDate = new Date(item.expiresAt);
    return expiryDate > now && expiryDate <= in30Days;
  }).length;

  const expiringWithin7Days = items.filter(item => {
    if (!item.expiresAt) return false;
    const expiryDate = new Date(item.expiresAt);
    return expiryDate > now && expiryDate <= in7Days;
  }).length;

  return {
    totalAuctions: items.length,
    pendingReview: items.filter(i => i.status === 'pending' || i.status === 'under_review').length,
    approved: items.filter(i => i.status === 'approved').length,
    suspended: items.filter(i => i.status === 'suspended').length,
    rejected: items.filter(i => i.status === 'rejected').length,
    expired: items.filter(i => i.status === 'expired').length,
    expiringWithin30Days,
    expiringWithin7Days,
  };
}

// ============================================================
// Expiry Management
// ============================================================

export function generateExpiryReminders(
  items: ComplianceItem[]
): ExpiryReminder[] {
  const reminders: ExpiryReminder[] = [];
  const now = new Date();

  items.forEach(item => {
    item.checks.forEach(check => {
      if (check.expiryDate) {
        const expiryDate = new Date(check.expiryDate);
        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        if (daysUntilExpiry > 0) {
          let severity: ExpiryReminder['severity'] = 'info';
          if (daysUntilExpiry <= 7) {
            severity = 'critical';
          } else if (daysUntilExpiry <= 30) {
            severity = 'warning';
          }

          reminders.push({
            id: `reminder-${check.id}-${expiryDate.getTime()}`,
            organizerId: item.organizerId,
            auctionId: item.auctionId,
            documentType: check.category,
            documentName: check.label,
            expiryDate: check.expiryDate,
            daysUntilExpiry,
            reminderSent: false,
            severity,
          });
        }
      }
    });
  });

  return reminders.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

// ============================================================
// Policy Acknowledgements
// ============================================================

export const MARKETPLACE_POLICIES: PolicyAcknowledgement[] = [
  { policyId: 'pol-auction', policyName: 'Auction Policy', version: '2.0', acknowledged: false },
  { policyId: 'pol-bidder', policyName: 'Bidder Participation Rules', version: '2.0', acknowledged: false },
  { policyId: 'pol-payment', policyName: 'Payment Handling Responsibility', version: '1.5', acknowledged: false },
  { policyId: 'pol-fraud', policyName: 'Fraud Prevention Policy', version: '1.0', acknowledged: false },
  { policyId: 'pol-conduct', policyName: 'Marketplace Code of Conduct', version: '1.0', acknowledged: false },
  { policyId: 'pol-privacy', policyName: 'Privacy Policy', version: '2.0', acknowledged: false },
  { policyId: 'pol-dispute', policyName: 'Dispute Resolution Policy', version: '1.0', acknowledged: false },
];

// ============================================================
// Helpers
// ============================================================

export function getChecksByCategory(
  checks: ComplianceCheck[]
): Record<ComplianceCategory, ComplianceCheck[]> {
  const grouped: Record<ComplianceCategory, ComplianceCheck[]> = {} as Record<ComplianceCategory, ComplianceCheck[]>;

  for (const category of Object.keys(COMPLIANCE_CATEGORIES) as ComplianceCategory[]) {
    grouped[category] = checks.filter(c => c.category === category);
  }

  return grouped;
}

export function getComplianceSummary(
  checks: ComplianceCheck[]
): {
  total: number;
  completed: number;
  required: number;
  requiredCompleted: number;
  recommended: number;
  recommendedCompleted: number;
  percentage: number;
} {
  const total = checks.length;
  const completed = checks.filter(c => c.isComplete).length;
  const required = checks.filter(c => c.severity === 'required').length;
  const requiredCompleted = checks.filter(c => c.severity === 'required' && c.isComplete).length;
  const recommended = checks.filter(c => c.severity === 'recommended').length;
  const recommendedCompleted = checks.filter(c => c.severity === 'recommended' && c.isComplete).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    required,
    requiredCompleted,
    recommended,
    recommendedCompleted,
    percentage,
  };
}

export function canChangeStatus(
  currentStatus: ComplianceStatus,
  newStatus: ComplianceStatus,
  userRole: 'admin' | 'compliance_officer' | 'organizer'
): boolean {
  // Organizers can only submit for review
  if (userRole === 'organizer') {
    return currentStatus === 'pending' && newStatus === 'under_review';
  }

  // Admins and Compliance Officers can change status
  if (userRole === 'admin' || userRole === 'compliance_officer') {
    const validTransitions: Record<ComplianceStatus, ComplianceStatus[]> = {
      pending: ['under_review', 'rejected'],
      under_review: ['approved', 'conditional_approval', 'rejected', 'suspended'],
      approved: ['suspended', 'expired'],
      conditional_approval: ['approved', 'suspended', 'rejected'],
      suspended: ['approved', 'rejected', 'pending'],
      rejected: ['pending'],
      expired: ['pending', 'approved'],
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  return false;
}

export default {
  COMPLIANCE_CATEGORIES,
  COMPLIANCE_STATUS_STYLES,
  MARKETPLACE_POLICIES,
  getDefaultComplianceChecks,
  validateCompliance,
  calculateComplianceMetrics,
  generateExpiryReminders,
  getChecksByCategory,
  getComplianceSummary,
  canChangeStatus,
};
