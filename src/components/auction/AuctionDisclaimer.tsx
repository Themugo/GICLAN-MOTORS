import React from 'react';
import { Shield, Info, Building2, CreditCard, Gavel } from 'lucide-react';
import { Card } from '../ui/Card';

export interface AuctionDisclaimerProps {
  variant?: 'compact' | 'standard' | 'full';
  showIcon?: boolean;
  className?: string;
}

/**
 * Auction Disclaimer Component
 *
 * This component displays the official KAYAD auction disclaimer to ensure
 * complete transparency about the marketplace's role.
 *
 * Key points:
 * - KAYAD is a technology marketplace, not an auction organizer
 * - Auction organizers conduct auctions independently
 * - All payments go directly to the organizer
 * - KAYAD provides technology tools, not payment services
 */
export const AuctionDisclaimer: React.FC<AuctionDisclaimerProps> = ({
  variant = 'standard',
  showIcon = true,
  className = '',
}) => {
  // Compact variant - single line
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg ${className}`}>
        {showIcon && <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />}
        <span className="text-xs text-blue-800 font-medium">
          Auctions conducted by verified organizers • Payments go directly to organizers
        </span>
      </div>
    );
  }

  // Full variant - detailed card
  if (variant === 'full') {
    return (
      <Card className={`p-6 bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-200 ${className}`}>
        <div className="flex items-start gap-4">
          {showIcon && (
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
          )}
          <div className="flex-1 space-y-4">
            <div>
              <h4 className="font-black text-[#1E3063] text-lg mb-2">
                Auction Transparency Notice
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed">
                Every auction published on KAYAD is independently conducted by the verified
                Auction Organizer displayed on each listing. KAYAD provides the digital marketplace
                and auction technology tools.
              </p>
            </div>

            {/* Key Points */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-1">Auction Organizer</p>
                  <p className="text-xs text-slate-500">
                    Each auction is independently conducted by the verified organizer displayed on the listing.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-1">Payment Recipient</p>
                  <p className="text-xs text-slate-500">
                    Bid security deposits and vehicle payments go directly to the Auction Organizer.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Gavel className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-1">KAYAD's Role</p>
                  <p className="text-xs text-slate-500">
                    Digital marketplace, bidder registration, live auction technology, and auction management tools.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-1">KAYAD Does NOT</p>
                  <p className="text-xs text-slate-500">
                    Receive bid security deposits or vehicle purchase payments from buyers.
                  </p>
                </div>
              </div>
            </div>

            {/* Important Notice */}
            <div className="p-4 bg-[#1E3063]/5 rounded-lg border border-[#1E3063]/20">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-[#1E3063] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-[#1E3063] mb-1">
                    Important Payment Information
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    All financial transactions related to auction participation—including bid security deposits
                    and final vehicle payments—must be made directly to the Auction Organizer using their
                    verified payment channels. KAYAD's Escrow Vault facilitates secure title transfer
                    only, not payment collection.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Standard variant - default
  return (
    <div className={`p-4 bg-slate-50 border border-slate-200 rounded-xl ${className}`}>
      <div className="flex items-start gap-3">
        {showIcon && (
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
        )}
        <div className="flex-1">
          <h4 className="font-bold text-[#1E3063] mb-2">
            Auction Disclaimer
          </h4>
          <div className="space-y-2 text-sm text-slate-600">
            <p>
              Every auction on KAYAD is independently conducted by the verified Auction Organizer
              shown on each listing.
            </p>
            <p>
              <strong>Bid Security deposits and vehicle purchase payments are made directly to the
              Auction Organizer</strong> using their verified payment channels—not to KAYAD.
            </p>
            <p className="text-xs text-slate-500">
              KAYAD provides the digital marketplace, bidder registration, live auction technology,
              digital certificates and auction management tools. KAYAD does not receive Bid Security
              deposits or vehicle purchase payments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Inline version for forms and modals
export const AuctionDisclaimerInline: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg ${className}`}>
    <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
    <span className="text-xs text-blue-800">
      Payments go directly to the Auction Organizer, not KAYAD
    </span>
  </div>
);

export default AuctionDisclaimer;
