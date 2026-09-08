import { useState, useMemo, type ReactNode, type FC } from 'react';
import {
  History,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Search,
  Download,
  Filter,
  ChevronRight,
  Eye,
  Edit,
  PauseCircle,
  RefreshCw
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { ComplianceAuditEntry, ComplianceStatus } from '../../utils/auctionCompliance';
import { COMPLIANCE_STATUS_STYLES } from '../../utils/auctionCompliance';

export interface ComplianceHistoryProps {
  audits: ComplianceAuditEntry[];
  onExport?: () => void;
}

// Action icons and colors
const ACTION_STYLES: Record<string, {
  icon: ReactNode;
  color: string;
  bgColor: string;
  label: string;
}> = {
  created: {
    icon: <FileText className="w-4 h-4" />,
    color: '#6B7280',
    bgColor: 'bg-slate-100',
    label: 'Created',
  },
  submitted: {
    icon: <AlertCircle className="w-4 h-4" />,
    color: '#3B82F6',
    bgColor: 'bg-blue-100',
    label: 'Submitted',
  },
  under_review: {
    icon: <Eye className="w-4 h-4" />,
    color: '#6366F1',
    bgColor: 'bg-indigo-100',
    label: 'Under Review',
  },
  approved: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: '#10B981',
    bgColor: 'bg-emerald-100',
    label: 'Approved',
  },
  conditional_approved: {
    icon: <AlertCircle className="w-4 h-4" />,
    color: '#F59E0B',
    bgColor: 'bg-amber-100',
    label: 'Conditional',
  },
  rejected: {
    icon: <XCircle className="w-4 h-4" />,
    color: '#EF4444',
    bgColor: 'bg-red-100',
    label: 'Rejected',
  },
  suspended: {
    icon: <PauseCircle className="w-4 h-4" />,
    color: '#DC2626',
    bgColor: 'bg-red-100',
    label: 'Suspended',
  },
  reactivated: {
    icon: <RefreshCw className="w-4 h-4" />,
    color: '#10B981',
    bgColor: 'bg-emerald-100',
    label: 'Reactivated',
  },
  expired: {
    icon: <Clock className="w-4 h-4" />,
    color: '#78716C',
    bgColor: 'bg-stone-100',
    label: 'Expired',
  },
  document_uploaded: {
    icon: <FileText className="w-4 h-4" />,
    color: '#3B82F6',
    bgColor: 'bg-blue-100',
    label: 'Document Uploaded',
  },
  document_expired: {
    icon: <Clock className="w-4 h-4" />,
    color: '#EF4444',
    bgColor: 'bg-red-100',
    label: 'Document Expired',
  },
  policy_acknowledged: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: '#10B981',
    bgColor: 'bg-emerald-100',
    label: 'Policy Acknowledged',
  },
  correction_requested: {
    icon: <Edit className="w-4 h-4" />,
    color: '#F59E0B',
    bgColor: 'bg-amber-100',
    label: 'Correction Requested',
  },
  correction_submitted: {
    icon: <FileText className="w-4 h-4" />,
    color: '#10B981',
    bgColor: 'bg-emerald-100',
    label: 'Correction Submitted',
  },
};

export const ComplianceHistory: FC<ComplianceHistoryProps> = ({
  audits,
  onExport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'all' | '7days' | '30days' | '90days'>('all');
  const [actionFilter, setActionFilter] = useState<string | null>(null);

  // Filter audits
  const filteredAudits = useMemo(() => {
    let filtered = [...audits];

    // Filter by date range
    if (dateRange !== 'all') {
      const now = Date.now();
      const daysMap: Record<string, number> = { '7days': 7, '30days': 30, '90days': 90 };
      const cutoff = now - daysMap[dateRange] * 24 * 60 * 60 * 1000;
      filtered = filtered.filter(a => new Date(a.performedAt).getTime() > cutoff);
    }

    // Filter by action
    if (actionFilter) {
      filtered = filtered.filter(a => a.action === actionFilter);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        a =>
          a.auctionId.toLowerCase().includes(query) ||
          a.organizerId.toLowerCase().includes(query) ||
          a.performedBy.toLowerCase().includes(query) ||
          a.comments?.toLowerCase().includes(query)
      );
    }

    // Sort by date descending
    return filtered.sort((a, b) =>
      new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
    );
  }, [audits, dateRange, actionFilter, searchQuery]);

  // Group by date
  const groupedAudits = useMemo(() => {
    const groups: Record<string, ComplianceAuditEntry[]> = {};

    filteredAudits.forEach(audit => {
      const date = new Date(audit.performedAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(audit);
    });

    return groups;
  }, [filteredAudits]);

  // Summary stats
  const stats = useMemo(() => {
    const approved = audits.filter(a => a.action === 'approved').length;
    const rejected = audits.filter(a => a.action === 'rejected').length;
    const suspended = audits.filter(a => a.action === 'suspended').length;
    const pending = audits.filter(a => a.action === 'submitted' || a.action === 'under_review').length;

    return { approved, rejected, suspended, pending, total: audits.length };
  }, [audits]);

  // Get unique actions for filter
  const uniqueActions = useMemo(() => {
    const actions = new Set(audits.map(a => a.action));
    return Array.from(actions);
  }, [audits]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-black text-slate-600">{stats.total}</div>
          <div className="text-xs text-slate-500">Total Records</div>
        </Card>
        <Card className="p-4 text-center bg-emerald-50 border-emerald-200">
          <div className="text-2xl font-black text-emerald-600">{stats.approved}</div>
          <div className="text-xs text-emerald-600">Approved</div>
        </Card>
        <Card className="p-4 text-center bg-amber-50 border-amber-200">
          <div className="text-2xl font-black text-amber-600">{stats.pending}</div>
          <div className="text-xs text-amber-600">Pending</div>
        </Card>
        <Card className="p-4 text-center bg-red-50 border-red-200">
          <div className="text-2xl font-black text-red-600">{stats.rejected}</div>
          <div className="text-xs text-red-600">Rejected</div>
        </Card>
        <Card className="p-4 text-center bg-red-50 border-red-200">
          <div className="text-2xl font-black text-red-600">{stats.suspended}</div>
          <div className="text-xs text-red-600">Suspended</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by auction ID, organizer, or user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3063]/20 focus:border-[#1E3063]"
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3063]/20"
            >
              <option value="all">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
            </select>
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={actionFilter || ''}
              onChange={(e) => setActionFilter(e.target.value || null)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3063]/20"
            >
              <option value="">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>
                  {ACTION_STYLES[action]?.label || action}
                </option>
              ))}
            </select>
          </div>

          {/* Export */}
          {onExport && (
            <Button size="sm" variant="outline" onClick={onExport}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          )}
        </div>
      </Card>

      {/* Timeline */}
      <div className="space-y-6">
        {(Object.entries(groupedAudits) as [string, ComplianceAuditEntry[]][]).map(([date, dayAudits]) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-4 h-4 text-slate-400" />
              <h3 className="font-bold text-slate-800">{date}</h3>
              <Badge variant="neutral" size="sm">{dayAudits.length}</Badge>
            </div>

            <div className="relative pl-6 border-l-2 border-slate-200 space-y-4">
              {dayAudits.map((audit, idx) => {
                const actionStyle = ACTION_STYLES[audit.action] || ACTION_STYLES.created;

                return (
                  <div key={audit.id} className="relative">
                    {/* Timeline dot */}
                    <div
                      className="absolute -left-[29px] w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: actionStyle.bgColor, color: actionStyle.color }}
                    >
                      {actionStyle.icon}
                    </div>

                    {/* Entry card */}
                    <Card className="p-4 ml-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              size="sm"
                              style={{
                                backgroundColor: actionStyle.bgColor,
                                color: actionStyle.color,
                              }}
                            >
                              {actionStyle.label}
                            </Badge>
                            {audit.previousStatus && audit.newStatus && (
                              <>
                                <span className="text-xs text-slate-400">→</span>
                                <Badge
                                  size="sm"
                                  style={{
                                    backgroundColor: COMPLIANCE_STATUS_STYLES[audit.newStatus].bgColor,
                                    color: COMPLIANCE_STATUS_STYLES[audit.newStatus].color,
                                  }}
                                >
                                  {COMPLIANCE_STATUS_STYLES[audit.newStatus].label}
                                </Badge>
                              </>
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-4 text-sm">
                              <span className="font-medium text-slate-800">
                                Auction: {audit.auctionId}
                              </span>
                              <span className="text-slate-500 text-xs">
                                Organizer: {audit.organizerId}
                              </span>
                            </div>

                            {audit.comments && (
                              <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                                {audit.comments}
                              </p>
                            )}

                            {audit.evidence && audit.evidence.length > 0 && (
                              <div className="flex items-center gap-2 mt-2">
                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs text-slate-500">
                                  {audit.evidence.length} evidence file(s)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="text-right text-xs text-slate-500">
                          <div className="flex items-center gap-1 justify-end">
                            <Clock className="w-3 h-3" />
                            {new Date(audit.performedAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          <div className="flex items-center gap-1 justify-end mt-1">
                            <User className="w-3 h-3" />
                            {audit.performedBy}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredAudits.length === 0 && (
        <Card className="p-12 text-center">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">No History Records</h3>
          <p className="text-sm text-slate-500">
            Compliance history will appear here as reviews are conducted.
          </p>
        </Card>
      )}
    </div>
  );
};

export default ComplianceHistory;
