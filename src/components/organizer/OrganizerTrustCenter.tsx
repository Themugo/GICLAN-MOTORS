import React from 'react';
import {
  ShieldCheck,
  Award,
  Building2,
  Landmark,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  Star,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  FileText,
  ThumbsUp,
  Clock3,
  BadgeDollarSign
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { TrustBadge, OrganizerTypeBadge, getOrganizerBadge } from './TrustBadge';
import { BuyerProtectionNotice } from './BuyerProtectionNotice';
import { PaymentTransparency, PaymentDetails } from './PaymentTransparency';
import type { AuctionOrganizerType } from '../../types';

export interface TrustMetrics {
  totalAuctions?: number;
  vehiclesSold?: number;
  averageRating?: number;
  totalReviews?: number;
  repeatBuyers?: number;
  responseTime?: string;
  satisfactionRate?: number;
  complaintsResolved?: number;
  yearsOnPlatform?: number;
  dateVerified?: string;
  licenseNumber?: string;
  regulatoryBody?: string;
}

export interface OrganizerContact {
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  businessHours?: string;
  operatingRegion?: string;
}

export interface OrganizerTrustCenterProps {
  organizer: {
    id: string;
    name: string;
    type: AuctionOrganizerType;
    logo?: string;
    isVerified?: boolean;
    verificationBadge?: 'verified' | 'premium' | 'government' | 'bank' | 'licensed';
    profileUrl?: string;
    contact?: OrganizerContact;
    paymentDetails?: PaymentDetails;
    refundPolicy?: string;
  };
  trustMetrics?: TrustMetrics;
  variant?: 'minimal' | 'standard' | 'full' | 'sidebar';
  showPaymentDetails?: boolean;
  showTrustIndicators?: boolean;
  showBuyerProtection?: boolean;
  compact?: boolean;
}

// Trust indicator item
const TrustIndicatorItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: string | number;
  positive?: boolean;
}> = ({ icon, label, value, positive = true }) => (
  <div className="flex items-center gap-2">
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
      positive ? 'bg-emerald-50' : 'bg-slate-100'
    }`}>
      {icon}
    </div>
    <div>
      <p className="text-xs font-bold text-[#1E3063]">{value || 'Yes'}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  </div>
);

// Trust metrics display
const TrustMetricsGrid: React.FC<{ metrics: TrustMetrics; compact?: boolean }> = ({
  metrics,
  compact = false
}) => {
  if (compact) {
    return (
      <div className="flex items-center gap-4">
        {metrics.totalAuctions !== undefined && (
          <div className="flex items-center gap-1.5">
            <GavelIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-700">{metrics.totalAuctions} auctions</span>
          </div>
        )}
        {metrics.vehiclesSold !== undefined && (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-bold text-slate-700">{metrics.vehiclesSold} sold</span>
          </div>
        )}
        {metrics.averageRating !== undefined && (
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="text-xs font-bold text-slate-700">{metrics.averageRating.toFixed(1)}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metrics.totalAuctions !== undefined && (
        <div className="text-center p-3 bg-slate-50 rounded-xl">
          <GavelIcon className="w-5 h-5 text-[#1E3063] mx-auto mb-1" />
          <div className="text-lg font-black text-[#1E3063]">{metrics.totalAuctions}</div>
          <div className="text-[10px] text-slate-500">Auctions</div>
        </div>
      )}
      {metrics.vehiclesSold !== undefined && (
        <div className="text-center p-3 bg-emerald-50 rounded-xl">
          <TrendingUp className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
          <div className="text-lg font-black text-emerald-700">{metrics.vehiclesSold}</div>
          <div className="text-[10px] text-emerald-600">Sold</div>
        </div>
      )}
      {metrics.averageRating !== undefined && (
        <div className="text-center p-3 bg-amber-50 rounded-xl">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500 mx-auto mb-1" />
          <div className="text-lg font-black text-amber-700">{metrics.averageRating.toFixed(1)}</div>
          <div className="text-[10px] text-amber-600">Rating</div>
        </div>
      )}
      {metrics.repeatBuyers !== undefined && (
        <div className="text-center p-3 bg-blue-50 rounded-xl">
          <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <div className="text-lg font-black text-blue-700">{metrics.repeatBuyers}%</div>
          <div className="text-[10px] text-blue-600">Repeat</div>
        </div>
      )}
    </div>
  );
};

// Simple Gavel icon component
const GavelIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14.5 3.5L19 8l-7.5 7.5-4.5-4.5L14.5 3.5z" />
    <path d="M12 6L17 11" />
    <path d="M3 21l9-9" />
    <path d="M9.5 9.5L14.5 14.5" />
  </svg>
);

// Minimal variant - single row trust summary
export const OrganizerTrustCenter: React.FC<OrganizerTrustCenterProps> = ({
  organizer,
  trustMetrics,
  variant = 'standard',
  showPaymentDetails = false,
  showTrustIndicators = true,
  showBuyerProtection = true,
  compact = false,
}) => {
  const badges = organizer.isVerified ? getOrganizerBadge(organizer.type, organizer.isVerified) : [];

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#1E3063] flex items-center justify-center text-white font-bold overflow-hidden shadow-sm">
          {organizer.logo ? (
            <img src={organizer.logo} alt={organizer.name} className="w-full h-full object-cover" />
          ) : (
            organizer.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[#1E3063] truncate">{organizer.name}</span>
            {organizer.isVerified && (
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <OrganizerTypeBadge type={organizer.type} />
            {trustMetrics?.averageRating && (
              <span className="flex items-center gap-0.5 text-xs text-slate-500">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                {trustMetrics.averageRating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Sidebar variant - for auction detail pages
  if (variant === 'sidebar') {
    return (
      <Card className="p-4 bg-white border-slate-200 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#1E3063] flex items-center justify-center text-white font-bold text-xl overflow-hidden shadow-md">
            {organizer.logo ? (
              <img src={organizer.logo} alt={organizer.name} className="w-full h-full object-cover" />
            ) : (
              organizer.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-[#1E3063] truncate">{organizer.name}</h3>
              {organizer.isVerified && (
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              )}
            </div>
            <OrganizerTypeBadge type={organizer.type} />
          </div>
        </div>

        {/* Trust Badges */}
        {showTrustIndicators && badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {badges.slice(0, 3).map((badge) => (
              <TrustBadge key={badge} type={badge as any} size="sm" />
            ))}
          </div>
        )}

        {/* Quick Stats */}
        {trustMetrics && (
          <TrustMetricsGrid metrics={trustMetrics} compact />
        )}

        {/* Contact */}
        {organizer.contact && (
          <div className="space-y-2 pt-3 border-t border-slate-100">
            {organizer.contact.phone && (
              <a href={`tel:${organizer.contact.phone}`} className="flex items-center gap-2 text-xs text-slate-600 hover:text-[#1E3063]">
                <Phone className="w-3.5 h-3.5 text-[#C85A32]" />
                {organizer.contact.phone}
              </a>
            )}
            {organizer.contact.email && (
              <a href={`mailto:${organizer.contact.email}`} className="flex items-center gap-2 text-xs text-slate-600 hover:text-[#1E3063]">
                <Mail className="w-3.5 h-3.5 text-[#C85A32]" />
                {organizer.contact.email}
              </a>
            )}
            {organizer.contact.address && (
              <div className="flex items-start gap-2 text-xs text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-[#C85A32] flex-shrink-0 mt-0.5" />
                {organizer.contact.address}
              </div>
            )}
          </div>
        )}

        {/* Payment Details */}
        {showPaymentDetails && organizer.paymentDetails && (
          <div className="pt-3 border-t border-slate-100">
            <PaymentTransparency
              organizerName={organizer.name}
              organizerType={organizer.type}
              paymentDetails={organizer.paymentDetails}
              refundPolicy={organizer.refundPolicy}
              variant="compact"
            />
          </div>
        )}

        {/* Buyer Protection */}
        {showBuyerProtection && (
          <BuyerProtectionNotice variant="compact" organizerName={organizer.name} />
        )}

        {/* View Profile Link */}
        {organizer.profileUrl && (
          <a
            href={organizer.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 bg-[#1E3063] text-white rounded-lg font-bold text-xs hover:bg-[#17244B] transition-colors"
          >
            View Organizer Profile
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </Card>
    );
  }

  // Standard variant - default
  return (
    <div className="space-y-4">
      <Card className="p-5 bg-white border-slate-200 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#1E3063] flex items-center justify-center text-white font-bold text-2xl overflow-hidden shadow-md flex-shrink-0">
            {organizer.logo ? (
              <img src={organizer.logo} alt={organizer.name} className="w-full h-full object-cover" />
            ) : (
              organizer.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-lg text-[#1E3063]">{organizer.name}</h3>
              {organizer.isVerified && (
                <Badge variant="success" size="sm" className="bg-emerald-100 text-emerald-800 border-emerald-200">
                  <ShieldCheck className="w-3 h-3 mr-0.5" />
                  Verified Organizer
                </Badge>
              )}
            </div>
            <OrganizerTypeBadge type={organizer.type} />
          </div>
        </div>

        {/* Trust Badges */}
        {showTrustIndicators && badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <TrustBadge key={badge} type={badge as any} size="md" />
            ))}
          </div>
        )}

        {/* Trust Metrics */}
        {trustMetrics && (
          <TrustMetricsGrid metrics={trustMetrics} />
        )}

        {/* Contact Info */}
        {organizer.contact && (
          <div className="grid grid-cols-2 gap-3">
            {organizer.contact.phone && (
              <a href={`tel:${organizer.contact.phone}`} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <Phone className="w-4 h-4 text-[#C85A32]" />
                <span className="text-xs font-medium text-[#1E3063]">{organizer.contact.phone}</span>
              </a>
            )}
            {organizer.contact.email && (
              <a href={`mailto:${organizer.contact.email}`} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <Mail className="w-4 h-4 text-[#C85A32]" />
                <span className="text-xs font-medium text-[#1E3063] truncate">{organizer.contact.email}</span>
              </a>
            )}
            {organizer.contact.address && (
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl col-span-2">
                <MapPin className="w-4 h-4 text-[#C85A32]" />
                <span className="text-xs font-medium text-[#1E3063]">{organizer.contact.address}</span>
              </div>
            )}
            {organizer.contact.operatingRegion && (
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl col-span-2">
                <Landmark className="w-4 h-4 text-[#C85A32]" />
                <span className="text-xs font-medium text-[#1E3063]">Operating: {organizer.contact.operatingRegion}</span>
              </div>
            )}
            {organizer.contact.businessHours && (
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl col-span-2">
                <Clock className="w-4 h-4 text-[#C85A32]" />
                <span className="text-xs font-medium text-[#1E3063]">{organizer.contact.businessHours}</span>
              </div>
            )}
          </div>
        )}

        {/* Regulatory Info */}
        {trustMetrics?.licenseNumber && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-blue-800">Regulatory Information</span>
            </div>
            <div className="space-y-1 text-xs text-blue-700">
              {trustMetrics.licenseNumber && (
                <p><strong>License:</strong> {trustMetrics.licenseNumber}</p>
              )}
              {trustMetrics.regulatoryBody && (
                <p><strong>Authority:</strong> {trustMetrics.regulatoryBody}</p>
              )}
            </div>
          </div>
        )}

        {/* View Profile Link */}
        {organizer.profileUrl && (
          <a
            href={organizer.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#1E3063] text-white rounded-xl font-bold text-sm hover:bg-[#17244B] transition-colors"
          >
            View Full Organizer Profile
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </Card>

      {/* Payment Details */}
      {showPaymentDetails && organizer.paymentDetails && (
        <PaymentTransparency
          organizerName={organizer.name}
          organizerType={organizer.type}
          paymentDetails={organizer.paymentDetails}
          refundPolicy={organizer.refundPolicy}
          variant="card"
        />
      )}

      {/* Buyer Protection */}
      {showBuyerProtection && (
        <BuyerProtectionNotice variant="full" organizerName={organizer.name} />
      )}
    </div>
  );
};

export default OrganizerTrustCenter;
