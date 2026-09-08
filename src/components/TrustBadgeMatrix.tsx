import React from 'react';
import { Vehicle } from '../types';
import { isEscrowApplicable, getEscrowBadgeLabel } from '../utils/escrow';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Landmark,
  Gavel,
  Zap,
  UserCheck
} from 'lucide-react';

interface TrustBadgeMatrixProps {
  vehicle: Vehicle;
  variant?: 'compact' | 'full' | 'pills';
  className?: string;
}

export const TrustBadgeMatrix: React.FC<TrustBadgeMatrixProps> = ({
  vehicle,
  variant = 'full',
  className = ''
}) => {
  const isPrivateSeller = vehicle.sellerType === 'Private Seller';

  // Rule: Private sellers ALWAYS require escrow; Dealers ONLY display escrow if explicitly enabled (escrowEligible = true)
  const isEscrowActive = isEscrowApplicable(vehicle);

  // Rule: Inspection badges ONLY appear when inspection exists (inspectionPassed = true)
  const isInspectionActive = Boolean(vehicle.inspectionPassed);

  // Rule: Auction badges ONLY appear for auction-enabled listings (isAuction = true)
  const isAuctionActive = Boolean(vehicle.isAuction);

  // Finance badge only if financeAvailable = true
  const isFinanceActive = Boolean(vehicle.financeAvailable);

  // Verified status
  const isVerifiedSeller = Boolean(vehicle.verified);

  if (variant === 'compact') {
    return (
      <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
        {/* Verified Seller / Dealer Badge */}
        {isVerifiedSeller && (
          <span className="inline-flex items-center gap-1 bg-[#1E3063] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-xs">
            <ShieldCheck className="w-3 h-3 text-amber-400 shrink-0" />
            {vehicle.sellerType}
          </span>
        )}

        {/* Inspection Badge - ONLY when inspectionPassed is true */}
        {isInspectionActive && (
          <span className="inline-flex items-center gap-1 bg-emerald-700 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-xs">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            150-Pt Inspected
          </span>
        )}

        {/* Escrow Badge - ONLY when applicable (Always for private, explicit for dealer) */}
        {isEscrowActive && (
          <span className="inline-flex items-center gap-1 bg-amber-400 text-[#17244B] text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs">
            <Lock className="w-3 h-3 shrink-0" />
            {isPrivateSeller ? 'Escrow Required' : 'Escrow Vault Enabled'}
          </span>
        )}

        {/* Auction Badge - ONLY when isAuction is true */}
        {isAuctionActive && (
          <span className="inline-flex items-center gap-1 bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-xs animate-pulse">
            <Gavel className="w-3 h-3 shrink-0 text-amber-300" />
            Live Auction
          </span>
        )}

        {/* Finance Badge */}
        {isFinanceActive && (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
            <Landmark className="w-3 h-3 text-blue-600 shrink-0" />
            Finance Ready
          </span>
        )}
      </div>
    );
  }

  if (variant === 'pills') {
    return (
      <div className={`flex flex-wrap gap-2 text-xs ${className}`}>
        {/* Seller Trust Pill */}
        {isVerifiedSeller && (
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center gap-2 flex-1 min-w-[130px]">
            {isPrivateSeller ? (
              <UserCheck className="w-4 h-4 text-[#1E3063] shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-[#1E3063] shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-[9px] text-slate-400 font-bold uppercase truncate">Seller</p>
              <p className="font-extrabold text-[#1E3063] truncate text-[11px]">{vehicle.sellerType}</p>
            </div>
          </div>
        )}

        {/* Inspection Pill - Only if inspection exists */}
        {isInspectionActive && (
          <div className="bg-emerald-50/80 p-2 rounded-xl border border-emerald-200 flex items-center gap-2 flex-1 min-w-[130px]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] text-emerald-800 font-bold uppercase truncate">150-Pt Audit</p>
              <p className="font-extrabold text-emerald-900 truncate text-[11px]">Certified Passed</p>
            </div>
          </div>
        )}

        {/* Escrow Pill - Only if escrow active */}
        {isEscrowActive && (
          <div className="bg-amber-50 p-2 rounded-xl border border-amber-200 flex items-center gap-2 flex-1 min-w-[130px]">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] text-amber-800 font-bold uppercase truncate">Escrow Vault</p>
              <p className="font-extrabold text-[#17244B] truncate text-[11px]">
                {isPrivateSeller ? 'Mandatory Escrow' : 'Verified Escrow'}
              </p>
            </div>
          </div>
        )}

        {/* Auction Pill - Only if auction active */}
        {isAuctionActive && (
          <div className="bg-rose-50 p-2 rounded-xl border border-rose-200 flex items-center gap-2 flex-1 min-w-[130px]">
            <Gavel className="w-4 h-4 text-rose-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] text-rose-800 font-bold uppercase truncate">Listing Type</p>
              <p className="font-extrabold text-rose-900 truncate text-[11px]">Live Auction</p>
            </div>
          </div>
        )}

        {/* Financing Pill - Only if finance active */}
        {isFinanceActive && (
          <div className="bg-blue-50/80 p-2 rounded-xl border border-blue-200 flex items-center gap-2 flex-1 min-w-[130px]">
            <Landmark className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] text-blue-800 font-bold uppercase truncate">Asset Finance</p>
              <p className="font-extrabold text-blue-900 truncate text-[11px]">Pre-Approved</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full Trust Matrix Banner - Rendered in Detail Modal
  const activeBadgesCount = [isVerifiedSeller, isInspectionActive, isEscrowActive, isAuctionActive, isFinanceActive].filter(Boolean).length;
  if (activeBadgesCount === 0) return null;

  return (
    <div className={`bg-gradient-to-r from-slate-900 via-[#1E3063] to-[#17244B] text-white p-4 rounded-2xl shadow-lg border border-amber-400/30 space-y-3 ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
        <span className="font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 font-display">
          <ShieldCheck className="w-4 h-4" />
          Verified Listing Specifications
        </span>
        <span className="bg-amber-400 text-[#17244B] text-[10px] font-black px-2.5 py-0.5 rounded-full">
          {vehicle.sellerType}
        </span>
      </div>

      <div className="flex flex-wrap gap-4 text-xs">
        {/* 1. Verified Seller */}
        {isVerifiedSeller && (
          <div className="space-y-0.5 min-w-[120px]">
            <p className="text-[10px] text-slate-300 uppercase font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-amber-400" /> Seller Status
            </p>
            <p className="font-bold text-white text-xs">{vehicle.sellerType}</p>
            <p className="text-[10px] text-slate-300">{vehicle.sellerName}</p>
          </div>
        )}

        {/* 2. Inspection Status - Only when passed */}
        {isInspectionActive && (
          <div className="space-y-0.5 min-w-[120px]">
            <p className="text-[10px] text-slate-300 uppercase font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Technical Audit
            </p>
            <p className="font-bold text-emerald-300 text-xs">150-Point Certified</p>
            <p className="text-[10px] text-slate-300">Logbook & Engine Audited</p>
          </div>
        )}

        {/* 3. Escrow Status - Only when active */}
        {isEscrowActive && (
          <div className="space-y-0.5 min-w-[120px]">
            <p className="text-[10px] text-slate-300 uppercase font-bold flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-400" /> Payment Protection
            </p>
            <p className="font-bold text-amber-300 text-xs">
              {isPrivateSeller ? 'Escrow Mandatory' : 'Escrow Vault Enabled'}
            </p>
            <p className="text-[10px] text-slate-300">Funds Held in Neutral Vault</p>
          </div>
        )}

        {/* 4. Auction Status - Only when active */}
        {isAuctionActive && (
          <div className="space-y-0.5 min-w-[120px]">
            <p className="text-[10px] text-slate-300 uppercase font-bold flex items-center gap-1">
              <Gavel className="w-3 h-3 text-rose-400" /> Sale Format
            </p>
            <p className="font-bold text-rose-300 text-xs">Live Auction Bidding</p>
            <p className="text-[10px] text-slate-300">Reserve Price Set</p>
          </div>
        )}

        {/* 5. Financing - Only when active */}
        {isFinanceActive && (
          <div className="space-y-0.5 min-w-[120px]">
            <p className="text-[10px] text-slate-300 uppercase font-bold flex items-center gap-1">
              <Landmark className="w-3 h-3 text-blue-400" /> Financing
            </p>
            <p className="font-bold text-blue-300 text-xs">Lender Feed Pending</p>
            <p className="text-[10px] text-slate-300">Verified lender terms not connected</p>
          </div>
        )}

        {/* 6. Responsiveness */}
        <div className="space-y-0.5 min-w-[120px]">
          <p className="text-[10px] text-slate-300 uppercase font-bold flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" /> Response Time
          </p>
          <p className="font-bold text-amber-300 text-xs">{vehicle.responseTime || '< 15 mins'}</p>
          <p className="text-[10px] text-slate-300">{vehicle.condition || 'Foreign Used'}</p>
        </div>
      </div>
    </div>
  );
};

export default TrustBadgeMatrix;
