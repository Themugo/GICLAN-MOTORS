import React, { useState, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Building,
  Car,
  Gavel,
  Banknote,
  ClipboardCheck,
  FileText,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  PauseCircle,
  AlertCircle,
  Calendar,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Ban,
  CheckCheck,
  RefreshCw,
  ExternalLink,
  Bell,
  Info
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { AuctionSession } from '../../types';
import type {
  ComplianceItem,
  ComplianceStatus,
  ComplianceCategory,
  ComplianceCheck,
  ComplianceMetrics,
  ComplianceAuditEntry
} from '../../utils/auctionCompliance';
import {
  COMPLIANCE_CATEGORIES,
  COMPLIANCE_STATUS_STYLES,
  getChecksByCategory,
  getComplianceSummary,
  calculateComplianceMetrics,
  generateExpiryReminders
} from '../../utils/auctionCompliance';

export interface ComplianceDashboardProps {
  complianceItems?: ComplianceItem[];
  sessions?: Partial<AuctionSession>[];
  audits?: ComplianceAuditEntry[];
  onApprove?: (itemId: string) => void;
  onReject?: (itemId: string, reason: string) => void;
  onSuspend?: (itemId: string, reason: string) => void;
  onRequestCorrection?: (itemId: string, corrections: string[]) => void;
  onViewDetails?: (item: ComplianceItem) => void;
  onExportReport?: (format: 'csv' | 'pdf') => void;
  isAdminView?: boolean;
}

// Status icons mapping
const STATUS_ICONS: Record<ComplianceStatus, React.ReactNode> = {
  pending: <Clock className="w-4 h-4" />,
  under_review: <Eye className="w-4 h-4" />,
  approved: <CheckCircle2 className="w-4 h-4" />,
  conditional_approval: <AlertCircle className="w-4 h-4" />,
  suspended: <PauseCircle className="w-4 h-4" />,
  rejected: <XCircle className="w-4 h-4" />,
  expired: <Clock className="w-4 h-4" />,
};

// Category icons mapping
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  organization: <Building className="w-4 h-4" />,
  vehicle: <Car className="w-4 h-4" />,
  auction: <Gavel className="w-4 h-4" />,
  financial: <Banknote className="w-4 h-4" />,
  inspection: <ClipboardCheck className="w-4 h-4" />,
  document: <FileText className="w-4 h-4" />,
  marketplace_policy: <Shield className="w-4 h-4" />,
  customer_protection: <Users className="w-4 h-4" />,
};

// Status summary card
const StatusSummaryCard: React.FC<{
  status: ComplianceStatus;
  count: number;
  label: string;
}> = ({ status, count, label }) => {
  const style = COMPLIANCE_STATUS_STYLES[status];

  return (
    <Card
      className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${style.bgColor} border ${style.borderColor}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: style.color + '20', color: style.color }}>
          {STATUS_ICONS[status]}
        </div>
        <div>
          <div className="text-2xl font-black" style={{ color: style.color }}>{count}</div>
          <div className="text-xs text-slate-600 font-medium">{label}</div>
        </div>
      </div>
    </Card>
  );
};

// Compliance item card
const ComplianceItemCard: React.FC<{
  item: ComplianceItem;
  session?: Partial<AuctionSession>;
  onApprove?: () => void;
  onReject?: () => void;
  onSuspend?: () => void;
  onViewDetails?: () => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
  isAdmin?: boolean;
}> = ({ item, session, onApprove, onReject, onSuspend, onViewDetails, expanded, onToggleExpand, isAdmin }) => {
  const statusStyle = COMPLIANCE_STATUS_STYLES[item.status];
  const summary = getComplianceSummary(item.checks);
  const checksByCategory = getChecksByCategory(item.checks);

  return (
    <Card className={`overflow-hidden border ${item.status === 'approved' ? 'border-emerald-200' : item.status === 'suspended' || item.status === 'rejected' ? 'border-red-200' : 'border-slate-200'}`}>
      {/* Header */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50"
        onClick={onToggleExpand}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: statusStyle.color + '20', color: statusStyle.color }}>
          {STATUS_ICONS[item.status]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-[#1E3063] truncate">
              {session?.id || item.auctionId}
            </h4>
            <Badge
              size="sm"
              className="text-[10px]"
              style={{ backgroundColor: statusStyle.bgColor, color: statusStyle.color, borderColor: statusStyle.borderColor }}
            >
              {statusStyle.label}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 truncate">
            {session?.organizer?.name || 'Unknown Organizer'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-black text-[#1E3063]">{summary.percentage}%</div>
          <div className="text-[10px] text-slate-500">
            {summary.requiredCompleted}/{summary.required} required
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-400" />
        )}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-4">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600">Compliance Progress</span>
              <span className="font-bold text-[#1E3063]">{summary.percentage}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${summary.percentage}%`,
                  backgroundColor: summary.requiredCompleted === summary.required ? '#10B981' : '#F59E0B'
                }}
              />
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(checksByCategory)
              .filter(([_, checks]) => checks.length > 0)
              .map(([category, checks]) => {
                const catInfo = COMPLIANCE_CATEGORIES[category as ComplianceCategory];
                const completed = checks.filter(c => c.isComplete).length;
                return (
                  <div
                    key={category}
                    className="p-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <div className="flex items-center gap-1.5 mb-1" style={{ color: catInfo.color }}>
                      {CATEGORY_ICONS[category]}
                      <span className="text-[10px] font-medium truncate">{catInfo.label}</span>
                    </div>
                    <div className="text-sm font-bold text-slate-700">
                      {completed}/{checks.length}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Missing Required Checks */}
          {summary.required > summary.requiredCompleted && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-xs font-bold text-red-800">
                  {summary.required - summary.requiredCompleted} Required Checks Incomplete
                </span>
              </div>
              <div className="space-y-1">
                {item.checks
                  .filter(c => c.severity === 'required' && !c.isComplete)
                  .slice(0, 3)
                  .map(check => (
                    <div key={check.id} className="text-xs text-red-700">
                      • {check.label}
                    </div>
                  ))}
                {(summary.required - summary.requiredCompleted) > 3 && (
                  <div className="text-xs text-red-600 font-medium">
                    +{(summary.required - summary.requiredCompleted) - 3} more...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {isAdmin && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <Button size="sm" variant="success" onClick={onApprove}>
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={onReject}>
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Reject
              </Button>
              <Button size="sm" variant="outline" onClick={onSuspend}>
                <PauseCircle className="w-3.5 h-3.5 mr-1" />
                Suspend
              </Button>
              <div className="flex-1" />
              <Button size="sm" variant="ghost" onClick={onViewDetails}>
                View Details
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-200">
            <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>
            {item.reviewedAt && (
              <span>Reviewed: {new Date(item.reviewedAt).toLocaleDateString()}</span>
            )}
            {item.reviewedBy && (
              <span>By: {item.reviewedBy}</span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

// Main Dashboard Component
export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({
  complianceItems = [],
  sessions = [],
  audits = [],
  onApprove,
  onReject,
  onSuspend,
  onRequestCorrection,
  onViewDetails,
  onExportReport,
  isAdminView = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplianceStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ComplianceCategory | 'all'>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Calculate metrics
  const metrics = useMemo(() => calculateComplianceMetrics(complianceItems), [complianceItems]);

  // Generate expiry reminders
  const reminders = useMemo(() => generateExpiryReminders(complianceItems), [complianceItems]);

  // Filter items
  const filteredItems = useMemo(() => {
    let filtered = [...complianceItems];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(i => i.status === statusFilter);
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(i =>
        i.checks.some(c => c.category === categoryFilter && !c.isComplete)
      );
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(i =>
        i.auctionId.toLowerCase().includes(query) ||
        i.organizerId.toLowerCase().includes(query)
      );
    }

    // Sort by status priority
    const statusPriority: Record<ComplianceStatus, number> = {
      pending: 0,
      under_review: 1,
      suspended: 2,
      rejected: 3,
      conditional_approval: 4,
      approved: 5,
      expired: 6,
    };
    filtered.sort((a, b) => statusPriority[a.status] - statusPriority[b.status]);

    return filtered;
  }, [complianceItems, statusFilter, categoryFilter, searchQuery]);

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Confidentiality Notice */}
      <Card className="p-4 bg-blue-50 border border-blue-200">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-blue-800">Internal Compliance Center</p>
            <p className="text-xs text-blue-600">
              This information is confidential and visible only to Auction Organizers, KAYAD Administrators, and Compliance Officers.
            </p>
          </div>
        </div>
      </Card>

      {/* Compliance Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatusSummaryCard status="pending" count={metrics.pendingReview} label="Pending" />
        <StatusSummaryCard status="under_review" count={complianceItems.filter(i => i.status === 'under_review').length} label="Under Review" />
        <StatusSummaryCard status="approved" count={metrics.approved} label="Approved" />
        <StatusSummaryCard status="conditional_approval" count={complianceItems.filter(i => i.status === 'conditional_approval').length} label="Conditional" />
        <StatusSummaryCard status="suspended" count={metrics.suspended} label="Suspended" />
        <StatusSummaryCard status="rejected" count={metrics.rejected} label="Rejected" />
        <StatusSummaryCard status="expired" count={metrics.expired} label="Expired" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center bg-emerald-50 border-emerald-200">
          <div className="text-2xl font-black text-emerald-600">{metrics.approved}</div>
          <div className="text-xs text-emerald-600">Compliant Auctions</div>
        </Card>
        <Card className="p-4 text-center bg-red-50 border-red-200">
          <div className="text-2xl font-black text-red-600">{metrics.pendingReview}</div>
          <div className="text-xs text-red-600">Awaiting Review</div>
        </Card>
        <Card className="p-4 text-center bg-amber-50 border-amber-200">
          <div className="text-2xl font-black text-amber-600">{metrics.expiringWithin7Days}</div>
          <div className="text-xs text-amber-600">Expiring Soon (7 days)</div>
        </Card>
        <Card className="p-4 text-center bg-blue-50 border-blue-200">
          <div className="text-2xl font-black text-blue-600">{metrics.expiringWithin30Days}</div>
          <div className="text-xs text-blue-600">Expiring Soon (30 days)</div>
        </Card>
      </div>

      {/* Expiry Reminders */}
      {reminders.length > 0 && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-amber-800">Upcoming Expirations</h3>
          </div>
          <div className="space-y-2">
            {reminders.slice(0, 5).map(reminder => (
              <div
                key={reminder.id}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  reminder.severity === 'critical' ? 'bg-red-100' : 'bg-amber-50'
                }`}
              >
                <AlertTriangle className={`w-4 h-4 ${reminder.severity === 'critical' ? 'text-red-600' : 'text-amber-600'}`} />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-800">{reminder.documentName}</span>
                  <span className="text-xs text-slate-500 ml-2">({reminder.documentType})</span>
                </div>
                <Badge
                  size="sm"
                  className={reminder.severity === 'critical' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'}
                >
                  {reminder.daysUntilExpiry} days
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by auction ID or organizer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3063]/20 focus:border-[#1E3063]"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ComplianceStatus | 'all')}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3063]/20"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="conditional_approval">Conditional</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as ComplianceCategory | 'all')}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3063]/20"
          >
            <option value="all">All Categories</option>
            {Object.entries(COMPLIANCE_CATEGORIES).map(([key, cat]) => (
              <option key={key} value={key}>{cat.label}</option>
            ))}
          </select>

          {/* Export */}
          {isAdminView && onExportReport && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => onExportReport('csv')}>
                <Download className="w-3.5 h-3.5 mr-1" />
                CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => onExportReport('pdf')}>
                <Download className="w-3.5 h-3.5 mr-1" />
                PDF
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Compliance Items List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#1E3063]">
            Compliance Items ({filteredItems.length})
          </h3>
        </div>

        {filteredItems.length === 0 ? (
          <Card className="p-12 text-center">
            <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              {statusFilter === 'all' ? 'No Compliance Items' : `No ${COMPLIANCE_STATUS_STYLES[statusFilter].label} Items`}
            </h3>
            <p className="text-sm text-slate-500">
              {statusFilter === 'all'
                ? 'Compliance items will appear here as auctions are created.'
                : `There are no auctions with ${COMPLIANCE_STATUS_STYLES[statusFilter].label} status.`
              }
            </p>
          </Card>
        ) : (
          filteredItems.map(item => {
            const session = sessions.find(s => s.id === item.auctionId);
            return (
              <ComplianceItemCard
                key={item.id}
                item={item}
                session={session}
                expanded={expandedItems.has(item.id)}
                onToggleExpand={() => toggleExpand(item.id)}
                onApprove={() => onApprove?.(item.id)}
                onReject={() => onReject?.(item.id, '')}
                onSuspend={() => onSuspend?.(item.id, '')}
                onViewDetails={() => onViewDetails?.(item)}
                isAdmin={isAdminView}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default ComplianceDashboard;
