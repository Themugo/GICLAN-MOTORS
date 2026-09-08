import { useState } from 'react';
import { ArrowUpCircle, Clock, FileText, Send, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

interface AppealPanelProps {
  disputeId: string;
  originalResolution?: {
    winner: string;
    reason: string;
    resolvedAt: string;
  };
  onSubmitAppeal?: (appealReason: string, evidence: string) => void;
  onApproveAppeal?: () => void;
  onRejectAppeal?: () => void;
}

export default function AppealPanel({
  disputeId,
  originalResolution,
  onSubmitAppeal,
  onApproveAppeal,
  onRejectAppeal
}: AppealPanelProps) {
  const [appealReason, setAppealReason] = useState('');
  const [additionalEvidence, setAdditionalEvidence] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const handleSubmitAppeal = async () => {
    if (!appealReason) return;

    setSubmitting(true);
    try {
      // TODO: Call API to submit appeal

      onSubmitAppeal?.(appealReason, additionalEvidence);
    } catch (error) {
      console.error('Failed to submit appeal:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <ArrowUpCircle className="h-6 w-6 text-amber-600" />
          <h3 className="text-lg font-semibold">Appeal Decision</h3>
        </div>

        {originalResolution && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Original Resolution</p>
            <p className="font-medium">
              {originalResolution.winner === 'buyer' ? 'Buyer' : 'Seller'} won
            </p>
            <p className="text-sm text-gray-600 mt-1">{originalResolution.reason}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Why do you believe this decision was incorrect?
            </label>
            <textarea
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="Provide detailed reasons for your appeal..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Evidence (Optional)
            </label>
            <textarea
              value={additionalEvidence}
              onChange={(e) => setAdditionalEvidence(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="Provide any additional evidence to support your appeal..."
            />
          </div>

          <button
            onClick={handleSubmitAppeal}
            disabled={!appealReason || submitting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Submitting...' : 'Submit Appeal'}
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <p className="text-sm text-amber-800">
            Appeals are reviewed by our senior team. You will be notified of the decision within 5 business days.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <ArrowUpCircle className="h-6 w-6 text-purple-600" />
        <h3 className="text-lg font-semibold">Appeal Review</h3>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Pending Review</span>
          </div>
          <p className="text-sm text-purple-600">
            This appeal is awaiting senior review
          </p>
        </div>

        {originalResolution && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Original Decision</span>
            </div>
            <p className="font-medium">{originalResolution.reason}</p>
          </div>
        )}

        <div className="border-t pt-4 mt-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Appeal Actions</p>
          <div className="flex gap-3">
            <button
              onClick={onApproveAppeal}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <ArrowUpCircle className="h-4 w-4" />
              Approve Appeal
            </button>
            <button
              onClick={onRejectAppeal}
              className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Reject Appeal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
