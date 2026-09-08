import React from 'react';
import {
  Building2,
  Banknote,
  CreditCard,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { AuctionOrganizerType } from '../../types';

export interface PaymentDetails {
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  paybill?: string;
  tillNumber?: string;
  wireInstructions?: string;
}

export interface PaymentTransparencyProps {
  organizerName: string;
  organizerType?: AuctionOrganizerType;
  paymentDetails?: PaymentDetails;
  refundPolicy?: string;
  paymentDeadline?: string;
  variant?: 'compact' | 'full' | 'card';
}

export const PaymentTransparency: React.FC<PaymentTransparencyProps> = ({
  organizerName,
  organizerType,
  paymentDetails,
  refundPolicy,
  paymentDeadline = '48 hours after auction close',
  variant = 'card',
}) => {
  // Compact variant - single row
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 px-3 py-2 bg-[#1E3063]/5 border border-[#1E3063]/10 rounded-lg">
        <Building2 className="w-4 h-4 text-[#1E3063]" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-[#1E3063] truncate">
            Pay to: {organizerName}
          </p>
          {paymentDetails?.paybill && (
            <p className="text-[10px] text-slate-500">
              Paybill: {paymentDetails.paybill}
            </p>
          )}
        </div>
        <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
      </div>
    );
  }

  // Full variant - standalone card
  if (variant === 'full') {
    return (
      <Card className="p-6 bg-gradient-to-br from-[#101935] to-[#1a2a4a] text-white border-none">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">Organizer Payment Information</h3>
              <p className="text-xs text-slate-400">All payments go directly to the auction organizer</p>
            </div>
          </div>
          <Badge variant="success" size="sm" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        </div>

        {/* Payment Details */}
        <div className="space-y-4">
          {/* Recipient */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Payment Recipient</span>
            </div>
            <p className="font-black text-lg text-white">{organizerName}</p>
          </div>

          {/* Bank Details */}
          {paymentDetails && (
            <div className="grid grid-cols-2 gap-3">
              {paymentDetails.bankName && (
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Bank</span>
                  <p className="text-sm font-bold text-white mt-1">{paymentDetails.bankName}</p>
                </div>
              )}
              {paymentDetails.accountName && (
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Account Name</span>
                  <p className="text-sm font-bold text-white mt-1">{paymentDetails.accountName}</p>
                </div>
              )}
              {paymentDetails.accountNumber && (
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Account Number</span>
                  <p className="text-sm font-mono font-bold text-amber-400 mt-1">{paymentDetails.accountNumber}</p>
                </div>
              )}
              {paymentDetails.paybill && (
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Paybill</span>
                  <p className="text-sm font-mono font-bold text-amber-400 mt-1">{paymentDetails.paybill}</p>
                </div>
              )}
              {paymentDetails.tillNumber && (
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Till Number</span>
                  <p className="text-sm font-mono font-bold text-amber-400 mt-1">{paymentDetails.tillNumber}</p>
                </div>
              )}
            </div>
          )}

          {/* Important Info */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-xs font-bold text-amber-400">Important Payment Information</p>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <p>• <strong>Payment Deadline:</strong> {paymentDeadline}</p>
                  <p>• <strong>Bid Security:</strong> Paid to organizer (refundable per policy)</p>
                  <p>• <strong>Final Payment:</strong> Complete balance to organizer</p>
                  <p>• <strong>KAYAD:</strong> Does not receive auction payments</p>
                </div>
              </div>
            </div>
          </div>

          {/* Refund Policy */}
          {refundPolicy && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-emerald-400">Refund Policy</p>
                  <p className="text-xs text-slate-300 mt-1">{refundPolicy}</p>
                </div>
              </div>
            </div>
          )}

          {/* Deadline */}
          <div className="flex items-center justify-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-300">
              Complete payment within <strong className="text-white">{paymentDeadline}</strong>
            </span>
          </div>
        </div>
      </Card>
    );
  }

  // Card variant - default
  return (
    <Card className="p-4 bg-[#101935] text-white border-none">
      <div className="flex items-center gap-2 mb-4">
        <Banknote className="w-5 h-5 text-amber-400" />
        <span className="font-black text-sm">Organizer Payment Details</span>
      </div>

      {/* Recipient */}
      <div className="p-3 bg-white/5 rounded-xl mb-3">
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Pay To</span>
        <p className="font-bold text-white mt-1">{organizerName}</p>
      </div>

      {/* Payment Methods */}
      {paymentDetails && (
        <div className="space-y-2">
          {paymentDetails.paybill && (
            <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
              <span className="text-xs text-slate-400">Paybill</span>
              <span className="text-xs font-mono font-bold text-amber-400">{paymentDetails.paybill}</span>
            </div>
          )}
          {paymentDetails.tillNumber && (
            <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
              <span className="text-xs text-slate-400">Till</span>
              <span className="text-xs font-mono font-bold text-amber-400">{paymentDetails.tillNumber}</span>
            </div>
          )}
          {paymentDetails.bankName && (
            <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
              <span className="text-xs text-slate-400">Bank</span>
              <span className="text-xs font-bold text-white">{paymentDetails.bankName}</span>
            </div>
          )}
        </div>
      )}

      {/* Notice */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <p className="text-[10px] text-slate-400 leading-relaxed">
          KAYAD does not receive bid security deposits or vehicle purchase payments. All payments go directly to the auction organizer.
        </p>
      </div>
    </Card>
  );
};

// Inline payment summary for forms
export const PaymentSummaryInline: React.FC<{
  organizerName: string;
  amount: number;
  paymentMethod: 'paybill' | 'till' | 'bank';
  paymentDetails?: PaymentDetails;
}> = ({ organizerName, amount, paymentMethod, paymentDetails }) => (
  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-600 font-medium">Payment To</span>
      <span className="text-sm font-bold text-[#1E3063]">{organizerName}</span>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-600 font-medium">Amount</span>
      <span className="text-sm font-mono font-bold text-[#1E3063]">Ksh {amount.toLocaleString()}</span>
    </div>
    {paymentMethod === 'paybill' && paymentDetails?.paybill && (
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-600 font-medium">Paybill</span>
        <span className="text-xs font-mono font-bold text-[#C85A32]">{paymentDetails.paybill}</span>
      </div>
    )}
    {paymentMethod === 'till' && paymentDetails?.tillNumber && (
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-600 font-medium">Till Number</span>
        <span className="text-xs font-mono font-bold text-[#C85A32]">{paymentDetails.tillNumber}</span>
      </div>
    )}
  </div>
);

export default PaymentTransparency;
