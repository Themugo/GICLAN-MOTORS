import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { disputeAPI, formatKES } from '../api/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { timeAgo, formatDate } from '../utils/helpers';
import { ArrowLeft, Shield, Clock, User, AlertTriangle, Gavel, RotateCcw, Activity } from 'lucide-react';
import { LoadingPage } from '../components/features/common/LoadingPage';
import EvidenceUpload from '../components/features/common/EvidenceUpload';
import EvidenceTimeline from '../components/features/common/EvidenceTimeline';
import InternalNotes from '../components/features/common/InternalNotes';
import MediationPanel from '../components/features/common/MediationPanel';
import ResolutionPanel from '../components/features/common/ResolutionPanel';
import AppealPanel from '../components/features/common/AppealPanel';

const STATUS_META = {
  open:          { label: 'Open',           color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: '🆕' },
  under_review:  { label: 'Under Review',   color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   icon: '🔍' },
  mediation:     { label: 'Mediation',      color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: '🤝' },
  resolved:      { label: 'Resolved',       color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  icon: '✅' },
  appealed:      { label: 'Appealed',       color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: '🔄' },
  closed:        { label: 'Closed',         color: 'text-gray-400',   bg: 'bg-gray-500/10',   border: 'border-gray-500/30',   icon: '🔒' },
};

const CATEGORY_LABELS = {
  condition_mismatch: 'Condition Mismatch',
  delivery_issue:     'Delivery Issue',
  payment_dispute:    'Payment Dispute',
  fraud:              'Fraud',
  other:              'Other',
};

export default function DisputeDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { on } = useSocket();
  const [dispute, setDispute] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  const isAdmin = ['admin', 'superadmin', 'escrow_officer'].includes(user?.role);

  const load = () => {
    setLoading(true);
    disputeAPI.get(id)
      .then(d => {
        setDispute(d.dispute || d.data);
        setEvidence(d.evidence || []);
      })
      .catch(err => toast(err?.response?.data?.message || 'Failed to load dispute', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    const offDispute = on?.('disputeUpdate', (data) => {
      if (data.disputeId === id) load();
    });
    const offEvidence = on?.('evidenceUploaded', (data) => {
      if (data.disputeId === id) load();
    });
    return () => { offDispute?.(); offEvidence?.(); };
  }, [on, id]);

  if (loading) return <LoadingPage />;
  if (!dispute) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <Shield size={48} className="mx-auto text-gray-600 mb-4" />
      <p className="text-gray-400">Dispute not found</p>
      <Link to="/disputes" className="text-gold text-sm mt-2 inline-block">← Back to disputes</Link>
    </div>
  );

  const meta = STATUS_META[dispute.status] || { label: dispute.status, color: 'text-gray-400', icon: '❓' };
  const timeline = dispute.timeline || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link to={isAdmin ? '/admin/disputes' : '/disputes'} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 mb-4">
        <ArrowLeft size={14} /> {isAdmin ? 'All Disputes' : 'My Disputes'}
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">{meta.icon}</span>
            <h1 className="text-xl font-bold text-gray-100">{dispute.title}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${meta.bg} ${meta.color} ${meta.border}`}>{meta.label}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {CATEGORY_LABELS[dispute.category] || dispute.category} · Opened {timeAgo(dispute.openedAt)} · KES {dispute.amountInDispute?.toLocaleString('en-KE')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 border-b border-gray-700">
        {[
          { key: 'overview', label: 'Overview', icon: <Activity size={14} /> },
          { key: 'evidence', label: `Evidence (${evidence.length})`, icon: <Shield size={14} /> },
          { key: 'timeline', label: 'Timeline', icon: <Clock size={14} /> },
          ...(isAdmin ? [{ key: 'notes', label: 'Notes', icon: <User size={14} /> }] : []),
          ...(dispute.status === 'mediation' || dispute.status === 'under_review' ? [{ key: 'mediation', label: 'Mediation', icon: <Gavel size={14} /> }] : []),
          ...(dispute.status === 'resolved' || dispute.status === 'appealed' ? [{ key: 'appeal', label: 'Appeal', icon: <RotateCcw size={14} /> }] : []),
          ...(isAdmin && ['under_review', 'mediation', 'appealed'].includes(dispute.status) ? [{ key: 'resolution', label: 'Resolve', icon: <Gavel size={14} /> }] : []),
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition ${tab === t.key ? 'text-gold border-gold' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-2">Description</h3>
              <p className="text-sm text-gray-400 whitespace-pre-wrap">{dispute.description}</p>
            </div>

            {dispute.resolution?.decidedAt && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-green-400 mb-2">Resolution</h3>
                <p className="text-sm text-gray-400">Decision: <span className="text-gray-200">{dispute.resolution.decision}</span></p>
                <p className="text-sm text-gray-400">Amount: <span className="text-gray-200">KES {Number(dispute.resolution.amount || dispute.amountInDispute).toLocaleString('en-KE')}</span></p>
                {dispute.resolution.reason && <p className="text-sm text-gray-400 mt-1">{dispute.resolution.reason}</p>}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</h3>
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-500">Dispute ID</span><p className="text-gray-200 text-xs font-mono">{dispute._id}</p></div>
                {dispute.escrow && <div><span className="text-gray-500">Escrow Amount</span><p className="text-gray-200">KES {Number(dispute.escrow.amount || dispute.amountInDispute).toLocaleString('en-KE')}</p></div>}
                <div><span className="text-gray-500">Priority</span><p className="text-gray-200 capitalize">{dispute.priority}</p></div>
                {dispute.assignedTo && <div><span className="text-gray-500">Assigned To</span><p className="text-gray-200">{dispute.assignedTo.name || dispute.assignedTo}</p></div>}
                <div><span className="text-gray-500">Opened By</span><p className="text-gray-200">{dispute.openedBy?.name || 'Unknown'}</p></div>
                <div><span className="text-gray-500">Against</span><p className="text-gray-200">{dispute.openedAgainst?.name || 'Unknown'}</p></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'evidence' && (
        <div className="space-y-6">
          <EvidenceUpload disputeId={id} onUploaded={load} />
          <EvidenceTimeline evidence={evidence} disputeId={id} onRefresh={load} />
        </div>
      )}

      {tab === 'timeline' && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <div className="relative pl-6 space-y-4">
            {timeline.map((entry, i) => (
              <div key={i} className="relative">
                {i < timeline.length - 1 && <div className="absolute left-[-14px] top-4 bottom-[-16px] w-px bg-gray-700" />}
                <div className="absolute left-[-18px] top-1.5 w-2.5 h-2.5 rounded-full bg-gold border-2 border-gray-900" />
                <p className="text-sm text-gray-200">{entry.action}</p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                  {entry.actor && <span>{typeof entry.actor === 'object' ? entry.actor.name : entry.actor}</span>}
                  <span>{timeAgo(entry.at)}</span>
                  {entry.note && <span className="text-gray-600">— {entry.note}</span>}
                </div>
              </div>
            ))}
            {timeline.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No timeline entries</p>}
          </div>
        </div>
      )}

      {tab === 'notes' && (
        <InternalNotes disputeId={id} notes={dispute.internalNotes} onRefresh={load} />
      )}

      {tab === 'mediation' && (
        <MediationPanel dispute={dispute} onRefresh={load} />
      )}

      {tab === 'resolution' && (
        <ResolutionPanel dispute={dispute} escrow={dispute.escrow} onRefresh={load} />
      )}

      {tab === 'appeal' && (
        <AppealPanel dispute={dispute} onRefresh={load} />
      )}
    </div>
  );
}
