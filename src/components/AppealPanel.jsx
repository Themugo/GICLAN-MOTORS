import { useState } from 'react';
import { RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { disputeAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function AppealPanel({ dispute, onRefresh }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [decision, setDecision] = useState('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdmin = ['admin', 'superadmin', 'escrow_officer'].includes(user?.role);
  const isParty = dispute?.openedBy?._id === user?.id || dispute?.openedAgainst?._id === user?.id;
  const isResolved = dispute?.status === 'resolved';
  const isAppealed = dispute?.status === 'appealed';
  const appeal = dispute?.appeal;
  const hasPendingAppeal = appeal?.status === 'pending';

  const handleSubmitAppeal = async () => {
    if (!reason.trim()) { toast('Reason is required', 'error'); return; }
    setLoading(true);
    try {
      await disputeAPI.appeal(dispute._id, { reason, additionalDetails });
      toast('Appeal submitted', 'success');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to submit appeal', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAppeal = async () => {
    if (!decision) { toast('Select a decision', 'error'); return; }
    setLoading(true);
    try {
      await disputeAPI.reviewAppeal(dispute._id, { decision, reviewNotes });
      toast(`Appeal ${decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'modified'}`, 'success');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to review appeal', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wide flex items-center gap-2">
        <RotateCcw size={16} className="text-gold" /> Appeal
      </h3>

      {appeal?.appealedAt && (
        <div className="bg-gray-800 rounded-lg p-3 space-y-1 text-sm">
          <p className="text-gray-400">Appealed by: <span className="text-gray-200">{appeal.appealedBy?.name || 'Party'}</span></p>
          <p className="text-gray-400">Status: <span className={`font-medium ${appeal.status === 'pending' ? 'text-yellow-400' : appeal.status === 'approved' ? 'text-green-400' : 'text-red-400'}`}>{appeal.status}</span></p>
          <p className="text-gray-400">Reason: <span className="text-gray-200">{appeal.reason}</span></p>
          {appeal.additionalDetails && <p className="text-gray-400 mt-1">Details: <span className="text-gray-200">{appeal.additionalDetails}</span></p>}
          {appeal.reviewNotes && <p className="text-gray-400 mt-1">Review: <span className="text-gray-200">{appeal.reviewNotes}</span></p>}
        </div>
      )}

      {isResolved && isParty && !appeal?.appealedAt && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Reason for Appeal</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Explain why you disagree with the resolution..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold resize-none" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Additional Details (optional)</label>
            <textarea value={additionalDetails} onChange={e => setAdditionalDetails(e.target.value)} rows={2}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold resize-none" />
          </div>
          <button onClick={handleSubmitAppeal} disabled={!reason.trim() || loading}
            className="w-full py-2 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 disabled:opacity-50 text-sm">
            {loading ? 'Submitting...' : 'Submit Appeal'}
          </button>
        </div>
      )}

      {isAdmin && isAppealed && hasPendingAppeal && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Decision</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'approve', label: 'Approve', desc: 'Re-open case', color: 'text-green-400 border-green-700 hover:bg-green-900/20' },
                { value: 'reject', label: 'Reject', desc: 'Uphold resolution', color: 'text-red-400 border-red-700 hover:bg-red-900/20' },
                { value: 'modify', label: 'Modify', desc: 'Partially approve', color: 'text-yellow-400 border-yellow-700 hover:bg-yellow-900/20' },
              ].map(d => (
                <button key={d.value} type="button" onClick={() => setDecision(d.value)}
                  className={`p-3 rounded-lg border text-center text-xs transition ${decision === d.value ? `border-gold bg-gold/10 ${d.color.split(' ')[0]}` : `border-gray-700 bg-gray-800 ${d.color}`}`}>
                  <span className="block font-medium">{d.label}</span>
                  <span className="block text-gray-500 mt-0.5">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Review Notes</label>
            <textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold resize-none" />
          </div>
          <button onClick={handleReviewAppeal} disabled={loading}
            className="w-full py-2 bg-gold text-black font-semibold rounded-lg hover:bg-gold/90 disabled:opacity-50 text-sm">
            {loading ? 'Processing...' : `Review Appeal — ${decision.charAt(0).toUpperCase() + decision.slice(1)}`}
          </button>
        </div>
      )}
    </div>
  );
}
