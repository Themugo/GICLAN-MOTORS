import React, { useState, useMemo } from 'react';
import {
  History,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  Search,
  Download,
  Filter
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { RiskItem } from '../../utils/auctionRisk';
import { RISK_CATEGORIES, SEVERITY_STYLES } from '../../utils/auctionRisk';

export interface RiskHistoryProps {
  risks: RiskItem[];
  onExport?: () => void;
}

interface HistoryEntry {
  id: string;
  riskId: string;
  riskCode: string;
  riskTitle: string;
  category: string;
  severity: string;
  action: 'created' | 'resolved' | 'dismissed' | 'escalated';
  timestamp: string;
  user?: string;
  note?: string;
}

// Generate history entries from risk timeline
function generateHistoryEntries(risks: RiskItem[]): HistoryEntry[] {
  const entries: HistoryEntry[] = [];

  risks.forEach(risk => {
    // Creation entry
    entries.push({
      id: `${risk.id}-created`,
      riskId: risk.id,
      riskCode: risk.code,
      riskTitle: risk.title,
      category: risk.category,
      severity: risk.severity,
      action: 'created',
      timestamp: risk.createdAt,
    });

    // Resolution or escalation entry
    if (risk.resolvedAt) {
      entries.push({
        id: `${risk.id}-resolved`,
        riskId: risk.id,
        riskCode: risk.code,
        riskTitle: risk.title,
        category: risk.category,
        severity: risk.severity,
        action: risk.status === 'dismissed' ? 'dismissed' : 'resolved',
        timestamp: risk.resolvedAt,
        user: risk.resolvedBy,
      });
    }
  });

  return entries.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

const ACTION_STYLES = {
  created: {
    icon: <AlertCircle className="w-4 h-4" />,
    color: '#6B7280',
    bgColor: 'bg-slate-100',
    label: 'Detected',
  },
  resolved: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: '#10B981',
    bgColor: 'bg-emerald-100',
    label: 'Resolved',
  },
  dismissed: {
    icon: <XCircle className="w-4 h-4" />,
    color: '#9CA3AF',
    bgColor: 'bg-slate-100',
    label: 'Dismissed',
  },
  escalated: {
    icon: <AlertCircle className="w-4 h-4" />,
    color: '#EF4444',
    bgColor: 'bg-red-100',
    label: 'Escalated',
  },
};

export const RiskHistory: React.FC<RiskHistoryProps> = ({
  risks,
  onExport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'all' | '7days' | '30days' | '90days'>('all');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const historyEntries = useMemo(() => {
    let entries = generateHistoryEntries(risks);

    // Filter by date range
    if (dateRange !== 'all') {
      const now = Date.now();
      const daysMap = { '7days': 7, '30days': 30, '90days': 90 };
      const cutoff = now - daysMap[dateRange] * 24 * 60 * 60 * 1000;
      entries = entries.filter(e => new Date(e.timestamp).getTime() > cutoff);
    }

    // Filter by action
    if (selectedAction) {
      entries = entries.filter(e => e.action === selectedAction);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      entries = entries.filter(
        e =>
          e.riskTitle.toLowerCase().includes(query) ||
          e.riskCode.toLowerCase().includes(query)
      );
    }

    return entries;
  }, [risks, dateRange, selectedAction, searchQuery]);

  // Group by date
  const groupedEntries = useMemo(() => {
    const groups: Record<string, HistoryEntry[]> = {};

    historyEntries.forEach(entry => {
      const date = new Date(entry.timestamp).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    });

    return groups;
  }, [historyEntries]);

  // Summary stats
  const stats = useMemo(() => {
    const created = risks.filter(r => r.status === 'active').length;
    const resolved = risks.filter(r => r.resolvedAt).length;
    const dismissed = risks.filter(r => r.status === 'dismissed').length;

    return { created, resolved, dismissed, total: risks.length };
  }, [risks]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-black text-slate-600">{stats.total}</div>
          <div className="text-xs text-slate-500">Total Records</div>
        </Card>
        <Card className="p-4 text-center bg-amber-50 border-amber-200">
          <div className="text-2xl font-black text-amber-600">{stats.created}</div>
          <div className="text-xs text-amber-600">Active</div>
        </Card>
        <Card className="p-4 text-center bg-emerald-50 border-emerald-200">
          <div className="text-2xl font-black text-emerald-600">{stats.resolved}</div>
          <div className="text-xs text-emerald-600">Resolved</div>
        </Card>
        <Card className="p-4 text-center bg-slate-50 border-slate-200">
          <div className="text-2xl font-black text-slate-600">{stats.dismissed}</div>
          <div className="text-xs text-slate-500">Dismissed</div>
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
              placeholder="Search by risk title or code..."
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
              value={selectedAction || ''}
              onChange={(e) => setSelectedAction(e.target.value || null)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3063]/20"
            >
              <option value="">All Actions</option>
              <option value="created">Detected</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
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
        {Object.entries(groupedEntries).map(([date, entries]) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-4 h-4 text-slate-400" />
              <h3 className="font-bold text-slate-800">{date}</h3>
              <Badge variant="neutral" size="sm">{entries.length}</Badge>
            </div>
            <div className="relative pl-6 border-l-2 border-slate-200 space-y-4">
              {entries.map((entry) => {
                const actionStyle = ACTION_STYLES[entry.action];
                const severityStyle = SEVERITY_STYLES[entry.severity as keyof typeof SEVERITY_STYLES];

                return (
                  <div key={entry.id} className="relative">
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
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              size="sm"
                              style={{
                                backgroundColor: severityStyle.bgColor,
                                color: severityStyle.color,
                                borderColor: severityStyle.borderColor
                              }}
                            >
                              {severityStyle.label}
                            </Badge>
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                              style={{ backgroundColor: actionStyle.bgColor, color: actionStyle.color }}
                            >
                              {actionStyle.icon}
                              {actionStyle.label}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-800">{entry.riskTitle}</h4>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{entry.riskCode}</p>

                          {/* Metadata */}
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {entry.user && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {entry.user}
                              </span>
                            )}
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
      {historyEntries.length === 0 && (
        <Card className="p-12 text-center">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">No History Records</h3>
          <p className="text-sm text-slate-500">
            Risk history will appear here as issues are detected and resolved.
          </p>
        </Card>
      )}
    </div>
  );
};

export default RiskHistory;
