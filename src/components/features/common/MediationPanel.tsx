import { useState } from 'react';
import { Users, MessageSquare, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

interface MediationPanelProps {
  disputeId: string;
  buyerName: string;
  sellerName: string;
  currentStatus: string;
  onStatusChange?: (status: string) => void;
}

export default function MediationPanel({
  disputeId,
  buyerName,
  sellerName,
  currentStatus,
  onStatusChange
}: MediationPanelProps) {
  const [mediatorNotes, setMediatorNotes] = useState('');
  const [proposedSolution, setProposedSolution] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSubmitMediation = async () => {
    setSubmitting(true);
    try {
      // TODO: Call API to submit mediation

      onStatusChange?.('resolved');
    } catch (error) {
      console.error('Failed to submit mediation:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscalate = () => {
    onStatusChange?.('appealed');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-blue-600" />
          Mediation Session
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 font-medium">Buyer</p>
            <p className="font-medium">{buyerName}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-600 font-medium">Seller</p>
            <p className="font-medium">{sellerName}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mediator Notes
            </label>
            <textarea
              value={mediatorNotes}
              onChange={(e) => setMediatorNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter mediation notes..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proposed Resolution
            </label>
            <textarea
              value={proposedSolution}
              onChange={(e) => setProposedSolution(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Propose a solution to both parties..."
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSubmitMediation}
              disabled={submitting || !mediatorNotes || !proposedSolution}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              {submitting ? 'Submitting...' : 'Resolve Dispute'}
            </button>

            <button
              onClick={handleEscalate}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              <AlertCircle className="h-4 w-4" />
              Escalate to Appeal
            </button>

            <button
              onClick={() => onStatusChange?.('closed')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <XCircle className="h-4 w-4" />
              Close Case
            </button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">Mediation Guidelines</p>
            <ul className="mt-2 text-sm text-blue-800 space-y-1">
              <li>• Remain neutral and professional</li>
              <li>• Consider both parties' evidence</li>
              <li>• Propose fair and equitable solutions</li>
              <li>• Document all communications</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
