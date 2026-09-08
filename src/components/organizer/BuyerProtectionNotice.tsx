import React from 'react';
import { Shield, Info, AlertCircle, ExternalLink } from 'lucide-react';
import { Card } from '../ui/Card';

export interface BuyerProtectionNoticeProps {
  variant?: 'compact' | 'full' | 'inline';
  organizerName?: string;
  showReadMore?: boolean;
}

export const BuyerProtectionNotice: React.FC<BuyerProtectionNoticeProps> = ({
  variant = 'inline',
  organizerName = 'the verified organizer',
  showReadMore = false,
}) => {
  const baseText = `This auction is conducted independently by the verified organizer shown above.`;

  const fullText = `This auction is conducted independently by the verified organizer shown above. KAYAD provides the digital marketplace and auction technology but does not receive auction bid security deposits or vehicle purchase payments. All financial transactions are handled directly between the buyer and the auction organizer.`;

  // Compact variant - for use in headers
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
        <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <span className="text-xs text-blue-800 font-medium">
          Auction conducted by organizer
        </span>
      </div>
    );
  }

  // Full variant - standalone card
  if (variant === 'full') {
    return (
      <Card className="p-5 bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="font-black text-[#1E3063] text-sm">Buyer Protection Notice</h4>
              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                ACTIVE
              </span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {fullText}
            </p>
            <div className="pt-2 border-t border-blue-200">
              <div className="flex items-center gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  Secure Auction Technology
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  Verified Organizers
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  Direct Payment to Organizer
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Inline variant - default (for use within other cards)
  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-[#1E3063]" />
        <span className="font-black text-sm text-[#1E3063]">Auction Transparency Notice</span>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">
        {showReadMore ? fullText : baseText}
      </p>
      <div className="pt-2 border-t border-slate-200">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 font-medium">
            All auction payments must be made directly to <strong>{organizerName}</strong>. KAYAD never requests or receives auction-related payments from buyers.
          </p>
        </div>
      </div>
    </div>
  );
};

// Compact inline notice for forms and modals
export const CompactProtectionNotice: React.FC = () => (
  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
    <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
    <span className="text-xs text-amber-800">
      Payments go directly to the auction organizer, not KAYAD
    </span>
  </div>
);

// Trust statement footer for pages
export const TrustFooter: React.FC<{ organizerName?: string }> = ({
  organizerName = 'the auction organizer'
}) => (
  <div className="flex items-center justify-center gap-6 py-4 border-t border-slate-200 bg-slate-50">
    <div className="flex items-center gap-2 text-xs text-slate-600">
      <Shield className="w-4 h-4 text-emerald-600" />
      <span>KAYAD Verified Marketplace</span>
    </div>
    <div className="w-px h-4 bg-slate-300"></div>
    <div className="flex items-center gap-2 text-xs text-slate-600">
      <AlertCircle className="w-4 h-4 text-amber-600" />
      <span>Direct payment to {organizerName}</span>
    </div>
    <div className="w-px h-4 bg-slate-300"></div>
    <div className="flex items-center gap-2 text-xs text-slate-600">
      <Info className="w-4 h-4 text-blue-600" />
      <span>Technology provider only</span>
    </div>
  </div>
);

export default BuyerProtectionNotice;
