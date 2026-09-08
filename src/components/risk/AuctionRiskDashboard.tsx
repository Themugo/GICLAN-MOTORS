import React, { useState, useMemo } from 'react';
import {
  AlertOctagon,
  AlertCircle,
  AlertTriangle,
  Info,
  Shield,
  ShieldCheck,
  Settings,
  Car,
  ClipboardCheck,
  Banknote,
  Calendar,
  FileText,
  Bug,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  User,
  Building2,
  MoreVertical,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { AuctionSession, Vehicle } from '../../types';
import type {
  RiskItem,
  RiskSeverity,
  RiskCategory,
  RiskDashboardMetrics,
  RiskCheckContext
} from '../../utils/auctionRisk';
import {
  RISK_CATEGORIES,
  SEVERITY_STYLES,
  detectAllRisks,
  calculateRiskMetrics,
  canPublishAuction,
  getRisksByCategory,
  sortRisksByPriority,
} from '../../utils/auctionRisk';

export interface AuctionRiskDashboardProps {
  sessions?: Partial<AuctionSession>[];
  vehicles?: Partial<Vehicle>[];
  risks?: RiskItem[];
  onResolveRisk?: (riskId: string, resolution: string) => void;
  onDismissRisk?: (riskId: string) => void;
  onRequestCorrection?: (riskId: string) => void;
  onSuspendAuction?: (auctionId: string) => void;
  onExportReport?: (format: 'csv' | 'pdf') => void;
  isAdminView?: boolean;
  organizerId?: string;
}

// Category icons mapping
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  auction_configuration: <Settings className="w-4 h-4" />,
  vehicle_integrity: <Car className="w-4 h-4" />,
  organizer_compliance: <Shield className="w-4 h-4" />,
  inspection_status: <ClipboardCheck className="w-4 h-4" />,
  payment_configuration: <Banknote className="w-4 h-4" />,
  scheduling: <Calendar className="w-4 h-4" />,
  documentation: <FileText className="w-4 h-4" />,
  marketplace_conflicts: <AlertTriangle className="w-4 h-4" />,
  fraud_indicators: <AlertOctagon className="w-4 h-4" />,
  technical_errors: <Bug className="w-4 h-4" />,
};

// Severity icons mapping
const SEVERITY_ICONS: Record<RiskSeverity, React.ReactNode> = {
  critical: <AlertOctagon className="w-5 h-5" />,
  high: <AlertCircle className="w-5 h-5" />,
  medium: <AlertTriangle className="w-5 h-5" />,
  low: <Info className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
};

// Risk severity summary card
const SeveritySummaryCard: React.FC<{
  severity: RiskSeverity;
  count: number;
  label: string;
}> = ({ severity, count, label }) => {
  const style = SEVERITY_STYLES[severity];

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${style.bgColor} ${style.borderColor}`}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: style.color + '20' }}>
        <span style={{ color: style.color }}>{SEVERITY_ICONS[severity]}</span>
      </div>
      <div>
        <div className="text-2xl font-black" style={{ color: style.color }}>{count}</div>
        <div className="text-xs text-slate-600 font-medium">{label}</div>
      </div>
    </div>
  );
};

// Individual risk alert
const RiskAlert: React.FC<{
  risk: RiskItem;
  onResolve?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onViewDetails?: (risk: RiskItem) => void;
  isAdmin?: boolean;
}> = ({ risk, onResolve, onDismiss, onViewDetails, isAdmin }) => {
  const [expanded, setExpanded] = useState(false);
  const style = SEVERITY_STYLES[risk.severity];
  const category = RISK_CATEGORIES[risk.category];

  return (
    <div className={`border rounded-xl overflow-hidden ${style.bgColor} ${style.borderColor}`}>
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ color: style.color }}>
          {SEVERITY_ICONS[risk.severity]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900">{risk.title}</span>
            <Badge
              size="sm"
              className="text-[10px]"
              style={{
                backgroundColor: style.color + '20',
                color: style.color,
                borderColor: style.color + '40'
              }}
            >
              {style.label}
            </Badge>
          </div>
          <p className="text-xs text-slate-600 mt-0.5 truncate">{risk.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium"
            style={{ backgroundColor: category.color + '15', color: category.color }}
          >
            {CATEGORY_ICONS[risk.category]}
            <span className="hidden sm:inline">{category.label}</span>
          </div>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: style.borderColor }}>
          {/* Recommendation */}
          <div className="bg-white rounded-lg p-4 space-y-3">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recommendation</h5>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-slate-500 font-medium uppercase">Problem</p>
                <p className="text-sm text-slate-800">{risk.recommendation.problem}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-medium uppercase">Why It Matters</p>
                <p className="text-sm text-slate-800">{risk.recommendation.whyItMatters}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] text-slate-500 font-medium uppercase">Solution</p>
              <p className="text-sm text-slate-800">{risk.recommendation.solution}</p>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-600">
                  Responsible: <span className="font-medium capitalize">{risk.recommendation.responsibleParty}</span>
                </span>
              </div>
              {risk.recommendation.estimatedTime && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-600">{risk.recommendation.estimatedTime}</span>
                </div>
              )}
            </div>

            {/* Code reference */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 font-mono">{risk.code}</span>
            </div>
          </div>

          {/* Actions */}
          {isAdmin && (
            <div className="flex items-center gap-2 mt-4">
              <Button
                size="sm"
                variant="success"
                onClick={() => onResolve?.(risk.id)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Resolve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDismiss?.(risk.id)}
              >
                <EyeOff className="w-3.5 h-3.5 mr-1" />
                Dismiss
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewDetails?.(risk)}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                View Auction
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Category filter
const CategoryFilter: React.FC<{
  selectedCategories: RiskCategory[];
  onToggle: (category: RiskCategory) => void;
}> = ({ selectedCategories, onToggle }) => (
  <div className="flex flex-wrap gap-2">
    {Object.entries(RISK_CATEGORIES).map(([key, cat]) => (
      <button
        key={key}
        onClick={() => onToggle(key as RiskCategory)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          selectedCategories.includes(key as RiskCategory)
            ? 'ring-2 ring-offset-1'
            : 'opacity-60 hover:opacity-100'
        }`}
        style={{
          backgroundColor: cat.color + '15',
          color: cat.color,
          borderColor: selectedCategories.includes(key as RiskCategory) ? cat.color : 'transparent',
          boxShadow: selectedCategories.includes(key as RiskCategory) ? `0 0 0 2px ${cat.color}40` : undefined,
        }}
      >
        {CATEGORY_ICONS[key]}
        {cat.label}
      </button>
    ))}
  </div>
);

// Main Dashboard Component
export const AuctionRiskDashboard: React.FC<AuctionRiskDashboardProps> = ({
  sessions = [],
  vehicles = [],
  risks: initialRisks = [],
  onResolveRisk,
  onDismissRisk,
  onRequestCorrection,
  onSuspendAuction,
  onExportReport,
  isAdminView = false,
  organizerId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<RiskCategory[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<RiskSeverity[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);

  // Generate risks for each session if not provided
  const risks = useMemo(() => {
    if (initialRisks.length > 0) return initialRisks;

    const allRisks: RiskItem[] = [];
    sessions.forEach((session, idx) => {
      const vehicle = vehicles[idx] || {};
      const ctx: RiskCheckContext = { session, vehicle };
      const detectedRisks = detectAllRisks(ctx);
      allRisks.push(...detectedRisks);
    });

    return allRisks;
  }, [sessions, vehicles, initialRisks]);

  // Calculate metrics
  const metrics = useMemo(() => calculateRiskMetrics(risks), [risks]);

  // Publication status
  const { canPublish, blockingRisks } = useMemo(() => {
    return canPublishAuction(risks);
  }, [risks]);

  // Filter risks
  const filteredRisks = useMemo(() => {
    let filtered = [...risks];

    // Filter by status
    if (!showResolved) {
      filtered = filtered.filter(r => r.status === 'active');
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        r =>
          r.title.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query) ||
          r.code.toLowerCase().includes(query)
      );
    }

    // Filter by categories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(r => selectedCategories.includes(r.category));
    }

    // Filter by severities
    if (selectedSeverities.length > 0) {
      filtered = filtered.filter(r => selectedSeverities.includes(r.severity));
    }

    // Filter by organizer if specified
    if (organizerId) {
      filtered = filtered.filter(r => r.organizerId === organizerId);
    }

    return sortRisksByPriority(filtered);
  }, [risks, searchQuery, selectedCategories, selectedSeverities, showResolved, organizerId]);

  // Group by category
  const groupedRisks = useMemo(() => {
    return getRisksByCategory(filteredRisks);
  }, [filteredRisks]);

  const toggleCategory = (category: RiskCategory) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleSeverity = (severity: RiskSeverity) => {
    setSelectedSeverities(prev =>
      prev.includes(severity)
        ? prev.filter(s => s !== severity)
        : [...prev, severity]
    );
  };

  return (
    <div className="space-y-6">
      {/* Confidentiality Notice */}
      <Card className="p-4 bg-blue-50 border border-blue-200">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-blue-800">Internal Risk Dashboard</p>
            <p className="text-xs text-blue-600">
              This information is confidential and visible only to Auction Organizers, KAYAD Administrators, and Compliance Officers.
            </p>
          </div>
        </div>
      </Card>

      {/* Publication Status Banner */}
      <Card className={`p-5 ${canPublish ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {canPublish ? (
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertOctagon className="w-6 h-6 text-red-600" />
              </div>
            )}
            <div>
              <h3 className={`font-black text-lg ${canPublish ? 'text-emerald-800' : 'text-red-800'}`}>
                {canPublish ? 'Auction Publication Enabled' : 'Publication Blocked'}
              </h3>
              <p className="text-sm text-slate-600">
                {canPublish
                  ? 'No critical or high-severity risks blocking publication.'
                  : `${blockingRisks.length} risk(s) must be resolved before publishing.`
                }
              </p>
            </div>
          </div>
          {!canPublish && (
            <Badge variant="danger" className="bg-red-100 text-red-700 border-red-200">
              {blockingRisks.length} Blocking
            </Badge>
          )}
        </div>
      </Card>

      {/* Severity Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SeveritySummaryCard severity="critical" count={metrics.critical} label="Critical" />
        <SeveritySummaryCard severity="high" count={metrics.high} label="High" />
        <SeveritySummaryCard severity="medium" count={metrics.medium} label="Medium" />
        <SeveritySummaryCard severity="low" count={metrics.low} label="Low" />
        <SeveritySummaryCard severity="info" count={metrics.info} label="Info" />
      </div>

      {/* Quick Stats */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl">
          <AlertCircle className="w-4 h-4 text-slate-600" />
          <span className="text-sm text-slate-700">
            <strong>{metrics.totalActive}</strong> Active Risks
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-sm text-emerald-700">
            <strong>{metrics.resolvedToday}</strong> Resolved Today
          </span>
        </div>
        {metrics.requiresReview > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl">
            <Eye className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700">
              <strong>{metrics.requiresReview}</strong> Requires Review
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search risks by title, description, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3063]/20 focus:border-[#1E3063]"
            />
          </div>

          {/* Category Filters */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Categories</span>
            </div>
            <CategoryFilter
              selectedCategories={selectedCategories}
              onToggle={toggleCategory}
            />
          </div>

          {/* Severity Filters */}
          <div className="flex items-center gap-2">
            {(['critical', 'high', 'medium', 'low', 'info'] as RiskSeverity[]).map((sev) => (
              <button
                key={sev}
                onClick={() => toggleSeverity(sev)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedSeverities.includes(sev) ? 'ring-2 ring-offset-1' : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: SEVERITY_STYLES[sev].color + '20',
                  color: SEVERITY_STYLES[sev].color,
                  borderColor: selectedSeverities.includes(sev) ? SEVERITY_STYLES[sev].color : 'transparent',
                  boxShadow: selectedSeverities.includes(sev) ? `0 0 0 2px ${SEVERITY_STYLES[sev].color}40` : undefined,
                }}
              >
                {SEVERITY_STYLES[sev].label}
              </button>
            ))}
          </div>

          {/* Additional Options */}
          <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#1E3063] focus:ring-[#1E3063]/20"
              />
              <span className="text-sm text-slate-600">Show resolved</span>
            </label>

            <div className="flex-1" />

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
        </div>
      </Card>

      {/* Risk List by Category */}
      <div className="space-y-6">
        {Object.entries(groupedRisks)
          .filter(([_, risks]) => risks.length > 0)
          .sort(([a], [b]) => {
            const catOrder = Object.keys(RISK_CATEGORIES);
            return catOrder.indexOf(a) - catOrder.indexOf(b);
          })
          .map(([category, categoryRisks]) => {
            const catInfo = RISK_CATEGORIES[category as RiskCategory];
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: catInfo.color + '20', color: catInfo.color }}
                  >
                    {CATEGORY_ICONS[category]}
                  </div>
                  <h3 className="font-bold text-[#1E3063]">{catInfo.label}</h3>
                  <Badge variant="neutral" size="sm">{categoryRisks.length}</Badge>
                </div>
                <div className="space-y-2">
                  {categoryRisks.map((risk) => (
                    <RiskAlert
                      key={risk.id}
                      risk={risk}
                      onResolve={onResolveRisk ? (id: string) => onResolveRisk(id, 'Resolved by admin') : undefined}
                      onDismiss={onDismissRisk}
                      isAdmin={isAdminView}
                    />
                  ))}
                </div>
              </div>
            );
          })}
      </div>

      {/* Empty State */}
      {filteredRisks.length === 0 && (
        <Card className="p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">No Risks Detected</h3>
          <p className="text-sm text-slate-500">
            {searchQuery || selectedCategories.length > 0 || selectedSeverities.length > 0
              ? 'No risks match your current filters. Try adjusting your search criteria.'
              : 'All auctions are operating within normal parameters.'
            }
          </p>
        </Card>
      )}
    </div>
  );
};

export default AuctionRiskDashboard;
