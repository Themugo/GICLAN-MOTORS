import React from 'react';
import {
  ShieldCheck,
  Award,
  Building2,
  Landmark,
  Users,
  CheckCircle2,
  BadgeCheck,
  Banknote,
  FileCheck,
  Clock,
  ThumbsUp,
  AlertCircle
} from 'lucide-react';
import type { AuctionOrganizerType } from '../../types';

export interface TrustBadgeProps {
  type:
    | 'verified_organizer'
    | 'licensed_auctioneer'
    | 'government_approved'
    | 'verified_dealer'
    | 'verified_bank'
    | 'fleet_partner'
    | 'business_verified'
    | 'identity_verified'
    | 'payment_verified'
    | 'compliance_verified'
    | 'quick_responder'
    | 'top_rated';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const BADGE_CONFIG: Record<string, {
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  borderColor: string;
  defaultLabel: string;
}> = {
  verified_organizer: {
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-800',
    borderColor: 'border-emerald-200',
    defaultLabel: 'Verified Organizer',
  },
  licensed_auctioneer: {
    icon: <Award className="w-3.5 h-3.5" />,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-200',
    defaultLabel: 'Licensed Auctioneer',
  },
  government_approved: {
    icon: <Landmark className="w-3.5 h-3.5" />,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200',
    defaultLabel: 'Government Approved',
  },
  verified_dealer: {
    icon: <Building2 className="w-3.5 h-3.5" />,
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-800',
    borderColor: 'border-emerald-200',
    defaultLabel: 'Verified Dealer',
  },
  verified_bank: {
    icon: <Banknote className="w-3.5 h-3.5" />,
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-200',
    defaultLabel: 'Verified Bank',
  },
  fleet_partner: {
    icon: <Users className="w-3.5 h-3.5" />,
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-800',
    borderColor: 'border-slate-200',
    defaultLabel: 'Fleet Partner',
  },
  business_verified: {
    icon: <BadgeCheck className="w-3.5 h-3.5" />,
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-800',
    borderColor: 'border-emerald-200',
    defaultLabel: 'Business Verified',
  },
  identity_verified: {
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-800',
    borderColor: 'border-cyan-200',
    defaultLabel: 'Identity Verified',
  },
  payment_verified: {
    icon: <Banknote className="w-3.5 h-3.5" />,
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-800',
    borderColor: 'border-emerald-200',
    defaultLabel: 'Payment Verified',
  },
  compliance_verified: {
    icon: <FileCheck className="w-3.5 h-3.5" />,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200',
    defaultLabel: 'Compliance Verified',
  },
  quick_responder: {
    icon: <Clock className="w-3.5 h-3.5" />,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-200',
    defaultLabel: 'Quick Responder',
  },
  top_rated: {
    icon: <ThumbsUp className="w-3.5 h-3.5" />,
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-800',
    borderColor: 'border-emerald-200',
    defaultLabel: 'Top Rated',
  },
};

// Get badge type based on organizer type and verification status
export function getOrganizerBadge(type: AuctionOrganizerType, isVerified: boolean = true): string[] {
  const badges: string[] = [];

  if (isVerified) {
    badges.push('verified_organizer');
  }

  switch (type) {
    case 'verified_dealer':
      badges.push('verified_dealer', 'business_verified');
      break;
    case 'licensed_auctioneer':
      badges.push('licensed_auctioneer', 'compliance_verified');
      break;
    case 'commercial_bank':
      badges.push('verified_bank', 'compliance_verified');
      break;
    case 'microfinance_institution':
      badges.push('verified_bank', 'compliance_verified');
      break;
    case 'fleet_disposal_company':
      badges.push('fleet_partner', 'business_verified');
      break;
    case 'government_disposal_agency':
      badges.push('government_approved', 'compliance_verified');
      break;
    case 'insurance_salvage_company':
      badges.push('verified_dealer', 'compliance_verified');
      break;
    case 'corporate_fleet_owner':
      badges.push('fleet_partner', 'business_verified');
      break;
  }

  return badges;
}

// Size classes
const SIZE_CLASSES = {
  sm: 'px-1.5 py-0.5 text-[10px] gap-1',
  md: 'px-2 py-1 text-xs gap-1.5',
  lg: 'px-3 py-1.5 text-sm gap-2',
};

export const TrustBadge: React.FC<TrustBadgeProps> = ({
  type,
  label,
  size = 'md',
  showIcon = true,
}) => {
  const config = BADGE_CONFIG[type];

  if (!config) return null;

  return (
    <span
      className={`
        inline-flex items-center font-bold border rounded-full
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${SIZE_CLASSES[size]}
      `}
    >
      {showIcon && config.icon}
      {label || config.defaultLabel}
    </span>
  );
};

// Organizer type badge
export const OrganizerTypeBadge: React.FC<{ type: AuctionOrganizerType }> = ({ type }) => {
  const typeLabels: Record<AuctionOrganizerType, string> = {
    verified_dealer: 'Verified Dealer',
    licensed_auctioneer: 'Licensed Auctioneer',
    commercial_bank: 'Commercial Bank',
    microfinance_institution: 'Microfinance Institution',
    fleet_disposal_company: 'Fleet Disposal Company',
    government_disposal_agency: 'Government Agency',
    insurance_salvage_company: 'Insurance Salvage',
    corporate_fleet_owner: 'Corporate Fleet',
  };

  const typeIcons: Record<AuctionOrganizerType, React.ReactNode> = {
    verified_dealer: <Building2 className="w-3 h-3" />,
    licensed_auctioneer: <Award className="w-3 h-3" />,
    commercial_bank: <Landmark className="w-3 h-3" />,
    microfinance_institution: <Landmark className="w-3 h-3" />,
    fleet_disposal_company: <Users className="w-3 h-3" />,
    government_disposal_agency: <Landmark className="w-3 h-3" />,
    insurance_salvage_company: <CheckCircle2 className="w-3 h-3" />,
    corporate_fleet_owner: <Users className="w-3 h-3" />,
  };

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold border border-slate-200">
      {typeIcons[type]}
      {typeLabels[type]}
    </span>
  );
};

export default TrustBadge;
