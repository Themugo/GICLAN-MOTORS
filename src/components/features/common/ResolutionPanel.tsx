import { useState } from 'react';
import { CheckCircle, DollarSign, ArrowRight, FileText, Send } from 'lucide-react';

interface ResolutionPanelProps {
  disputeId: string;
  buyerName: string;
  sellerName: string;
  disputedAmount?: number;
  resolution?: {
    winner: 'buyer' | 'seller' | 'split';
    refundAmount?: number;
    sellerPayout?: number;
    reason: string;
  };
  onSubmitResolution?: (resolution: ResolutionPanelProps['resolution']) => void;
}

export default function ResolutionPanel({
  disputeId,
  buyerName,
  sellerName,
  disputedAmount = 0,
  resolution,
  onSubmitResolution
}: ResolutionPanelProps) {
  const [winner, setWinner] = useState<'buyer' | 'seller' | 'split' | ''>('');
  const [refundAmount, setRefundAmount] = useState('');
  const [sellerPayout, setSellerPayout] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!winner || !reason) return;

    setSubmitting(true);
    const finalResolution = {
      winner,
      refundAmount: winner === 'buyer' || winner === 'split' ? Number(refundAmount) : undefined,
      sellerPayout: winner === 'seller' || winner === 'split' ? Number(sellerPayout) : undefined,
      reason
    };

    try {
      // TODO: Call API to submit resolution

      onSubmitResolution?.(finalResolution);
    } catch (error) {
      console.error('Failed to submit resolution:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (resolution) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <h3 className="text-lg font-semibold">Resolution Summary</h3>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Resolution</p>
            <p className="text-lg font-semibold capitalize">
              {resolution.winner === 'split' ? 'Split Decision' : `${resolution.winner} Wins`}
            </p>
          </div>

          {(resolution.refundAmount || resolution.sellerPayout) && (
            <div className="grid grid-cols-2 gap-4">
              {resolution.refundAmount && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">Buyer Refund</p>
                  <p className="text-xl font-bold text-blue-700">
                    KES {resolution.refundAmount.toLocaleString()}
                  </p>
                </div>
              )}
              {resolution.sellerPayout && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Seller Payout</p>
                  <p className="text-xl font-bold text-green-700">
                    KES {resolution.sellerPayout.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Resolution Reason</p>
            <p className="text-gray-900">{resolution.reason}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-blue-600" />
        Issue Resolution
      </h3>

      <div className="space-y-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Disputed Amount</p>
          <p className="text-2xl font-bold text-gray-900">
            KES {disputedAmount.toLocaleString()}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Winner
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['buyer', 'seller', 'split'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setWinner(option)}
                className={`p-3 rounded-lg border-2 text-center transition-colors ${
                  winner === option
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="block text-sm font-medium capitalize">{option}</span>
              </button>
            ))}
          </div>
        </div>

        {winner === 'buyer' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Refund Amount
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                max={disputedAmount}
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {winner === 'seller' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seller Payout
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                value={sellerPayout}
                onChange={(e) => setSellerPayout(e.target.value)}
                max={disputedAmount}
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {winner === 'split' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buyer Refund
              </label>
              <input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                max={disputedAmount}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seller Payout
              </label>
              <input
                type="number"
                value={sellerPayout}
                onChange={(e) => setSellerPayout(e.target.value)}
                max={disputedAmount}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Resolution Reason
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Explain the reasoning behind this decision..."
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!winner || !reason || submitting}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {submitting ? 'Submitting...' : 'Issue Resolution'}
        </button>
      </div>
    </div>
  );
}
