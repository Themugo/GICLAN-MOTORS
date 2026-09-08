import React from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  Star,
  ShieldCheck,
  Award,
  ExternalLink,
  Building2,
  Landmark,
  Users,
  CheckCircle2
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import type { AuctionOrganizerType } from '../../types';

export interface OrganizerProfileProps {
  organizer: {
    id: string;
    name: string;
    type: AuctionOrganizerType;
    logo?: string;
    isVerified?: boolean;
    verificationBadge?: 'verified' | 'premium' | 'government' | 'bank' | 'licensed';
    profileUrl?: string;
    phone?: string;
    email?: string;
    address?: string;
    website?: string;
    rating?: number;
    yearsOnPlatform?: number;
    completedAuctions?: number;
    businessHours?: string;
  };
  variant?: 'compact' | 'full' | 'card' | 'inline';
  showPaymentDetails?: boolean;
  paymentDetails?: {
    bankName: string;
    accountName: string;
    accountNumber?: string;
    paybill?: string;
    tillNumber?: string;
  };
}

const ORGANIZER_TYPE_DISPLAY: Record<AuctionOrganizerType, string> = {
  verified_dealer: 'Verified Dealer',
  licensed_auctioneer: 'Licensed Auctioneer',
  commercial_bank: 'Commercial Bank',
  microfinance_institution: 'Microfinance Institution',
  fleet_disposal_company: 'Fleet Disposal Company',
  government_disposal_agency: 'Government Disposal Agency',
  insurance_salvage_company: 'Insurance Salvage Company',
  corporate_fleet_owner: 'Corporate Fleet Owner',
};

const VERIFICATION_BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  verified: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  premium: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  government: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  bank: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  licensed: { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300' },
};

const TYPE_ICONS: Record<AuctionOrganizerType, React.ReactNode> = {
  verified_dealer: <Building2 className="w-4 h-4" />,
  licensed_auctioneer: <Award className="w-4 h-4" />,
  commercial_bank: <Landmark className="w-4 h-4" />,
  microfinance_institution: <Users className="w-4 h-4" />,
  fleet_disposal_company: <Users className="w-4 h-4" />,
  government_disposal_agency: <Landmark className="w-4 h-4" />,
  insurance_salvage_company: <CheckCircle2 className="w-4 h-4" />,
  corporate_fleet_owner: <Users className="w-4 h-4" />,
};

export const OrganizerProfile: React.FC<OrganizerProfileProps> = ({
  organizer,
  variant = 'compact',
  showPaymentDetails = false,
  paymentDetails,
}) => {
  const typeDisplay = ORGANIZER_TYPE_DISPLAY[organizer.type] || organizer.type;
  const badgeColors = organizer.verificationBadge
    ? VERIFICATION_BADGE_COLORS[organizer.verificationBadge]
    : VERIFICATION_BADGE_COLORS.verified;

  // Compact variant - single line with icon
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#1E3063] flex items-center justify-center text-white font-bold text-sm overflow-hidden">
          {organizer.logo ? (
            <img src={organizer.logo} alt={organizer.name} className="w-full h-full object-cover" />
          ) : (
            organizer.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-[#1E3063]">{organizer.name}</span>
          <span className="text-xs text-slate-500">{typeDisplay}</span>
        </div>
        {organizer.isVerified && (
          <ShieldCheck className="w-4 h-4 text-emerald-600 ml-1" />
        )}
      </div>
    );
  }

  // Inline variant - for use within cards
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <div className="w-12 h-12 rounded-xl bg-[#1E3063] flex items-center justify-center text-white font-bold text-lg overflow-hidden shadow-sm">
          {organizer.logo ? (
            <img src={organizer.logo} alt={organizer.name} className="w-full h-full object-cover" />
          ) : (
            organizer.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm text-[#1E3063] truncate">{organizer.name}</span>
            {organizer.isVerified && (
              <Badge variant="success" size="sm" className="bg-emerald-100 text-emerald-800 border-emerald-200">
                <ShieldCheck className="w-3 h-3 mr-0.5" />
                Verified
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              {TYPE_ICONS[organizer.type]}
              {typeDisplay}
            </span>
            {organizer.rating && (
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                {organizer.rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
        {organizer.profileUrl && (
          <a
            href={organizer.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-slate-400 hover:text-[#1E3063] transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    );
  }

  // Full variant - detailed organizer information
  if (variant === 'full') {
    return (
      <Card className="p-6 bg-white border-slate-200 space-y-6">
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
            <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
              <span className="flex items-center gap-1">
                {TYPE_ICONS[organizer.type]}
                {typeDisplay}
              </span>
            </div>
            {organizer.rating && (
              <div className="flex items-center gap-1 mt-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < Math.round(organizer.rating!) ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`}
                  />
                ))}
                <span className="text-sm text-slate-600 ml-1">{organizer.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {organizer.yearsOnPlatform && (
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <div className="text-lg font-black text-[#1E3063]">{organizer.yearsOnPlatform}</div>
              <div className="text-xs text-slate-500">Years on KAYAD</div>
            </div>
          )}
          {organizer.completedAuctions !== undefined && (
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <div className="text-lg font-black text-[#1E3063]">{organizer.completedAuctions}</div>
              <div className="text-xs text-slate-500">Completed Auctions</div>
            </div>
          )}
          {organizer.rating && (
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <div className="text-lg font-black text-emerald-600">{organizer.rating.toFixed(1)}</div>
              <div className="text-xs text-slate-500">Customer Rating</div>
            </div>
          )}
        </div>

        {/* Contact Info */}
        <div className="space-y-2">
          {organizer.phone && (
            <a
              href={`tel:${organizer.phone}`}
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <Phone className="w-4 h-4 text-[#C85A32]" />
              <span className="text-sm text-[#1E3063] font-medium">{organizer.phone}</span>
            </a>
          )}
          {organizer.email && (
            <a
              href={`mailto:${organizer.email}`}
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <Mail className="w-4 h-4 text-[#C85A32]" />
              <span className="text-sm text-[#1E3063] font-medium">{organizer.email}</span>
            </a>
          )}
          {organizer.address && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <MapPin className="w-4 h-4 text-[#C85A32]" />
              <span className="text-sm text-[#1E3063] font-medium">{organizer.address}</span>
            </div>
          )}
          {organizer.website && (
            <a
              href={organizer.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <Globe className="w-4 h-4 text-[#C85A32]" />
              <span className="text-sm text-[#1E3063] font-medium">{organizer.website}</span>
            </a>
          )}
          {organizer.businessHours && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Clock className="w-4 h-4 text-[#C85A32]" />
              <span className="text-sm text-[#1E3063] font-medium">{organizer.businessHours}</span>
            </div>
          )}
        </div>

        {/* Payment Details */}
        {showPaymentDetails && paymentDetails && (
          <div className="p-4 bg-[#1E3063] text-white rounded-xl space-y-3">
            <div className="flex items-center gap-2 border-b border-white/20 pb-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span className="font-black text-sm">Organizer Payment Details</span>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400">Bank</span>
                <p className="font-bold text-white">{paymentDetails.bankName}</p>
              </div>
              <div>
                <span className="text-slate-400">Account Name</span>
                <p className="font-bold text-white">{paymentDetails.accountName}</p>
              </div>
              {paymentDetails.accountNumber && (
                <div>
                  <span className="text-slate-400">Account Number</span>
                  <p className="font-mono font-bold text-white">{paymentDetails.accountNumber}</p>
                </div>
              )}
              {paymentDetails.paybill && (
                <div>
                  <span className="text-slate-400">Paybill</span>
                  <p className="font-mono font-bold text-white">{paymentDetails.paybill}</p>
                </div>
              )}
              {paymentDetails.tillNumber && (
                <div>
                  <span className="text-slate-400">Till Number</span>
                  <p className="font-mono font-bold text-white">{paymentDetails.tillNumber}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile Link */}
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
    );
  }

  // Card variant - default
  return (
    <Card className="p-4 bg-white border-slate-200">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-[#1E3063] flex items-center justify-center text-white font-bold text-lg overflow-hidden shadow-sm">
          {organizer.logo ? (
            <img src={organizer.logo} alt={organizer.name} className="w-full h-full object-cover" />
          ) : (
            organizer.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm text-[#1E3063] truncate">{organizer.name}</span>
            {organizer.isVerified && (
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              {TYPE_ICONS[organizer.type]}
              {typeDisplay}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        {organizer.phone && (
          <div className="flex items-center gap-2 text-slate-600">
            <Phone className="w-3.5 h-3.5 text-[#C85A32]" />
            <span>{organizer.phone}</span>
          </div>
        )}
        {organizer.email && (
          <div className="flex items-center gap-2 text-slate-600">
            <Mail className="w-3.5 h-3.5 text-[#C85A32]" />
            <span className="truncate">{organizer.email}</span>
          </div>
        )}
        {organizer.address && (
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-[#C85A32]" />
            <span className="truncate">{organizer.address}</span>
          </div>
        )}
      </div>

      {(organizer.rating || organizer.completedAuctions) && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
          {organizer.rating && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="text-xs font-bold text-slate-700">{organizer.rating.toFixed(1)}</span>
            </div>
          )}
          {organizer.completedAuctions !== undefined && (
            <div className="text-xs text-slate-500">
              {organizer.completedAuctions} auctions
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default OrganizerProfile;
