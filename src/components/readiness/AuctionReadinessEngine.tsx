import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Car,
  Camera,
  Eye,
  ClipboardCheck,
  Lock,
  Settings,
  Trophy,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Info,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { AuctionSession, Vehicle } from '../../types';
import type {
  AuctionReadinessData,
  ReadinessResult,
  ReadinessCheck,
  ReadinessSection,
  ReadinessSeverity
} from '../../utils/auctionReadiness';
import {
  READINESS_SECTIONS,
  validateAuctionReadiness,
  runQAValidation,
  getDefaultReadinessData
} from '../../utils/auctionReadiness';

export interface AuctionReadinessEngineProps {
  session: Partial<AuctionSession>;
  vehicle: Partial<Vehicle>;
  initialData?: Partial<AuctionReadinessData>;
  onDataChange?: (data: Partial<AuctionReadinessData>) => void;
  onPublish?: () => void;
  isAdminView?: boolean;
}

// Section icons mapping
const SECTION_ICONS: Record<string, React.ReactNode> = {
  'shield-check': <ShieldCheck className="w-5 h-5" />,
  'car': <Car className="w-5 h-5" />,
  'camera': <Camera className="w-5 h-5" />,
  'eye': <Eye className="w-5 h-5" />,
  'clipboard-check': <ClipboardCheck className="w-5 h-5" />,
  'lock': <Lock className="w-5 h-5" />,
  'settings': <Settings className="w-5 h-5" />,
  'trophy': <Trophy className="w-5 h-5" />,
};

// Severity styling
const SEVERITY_STYLES: Record<ReadinessSeverity, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  critical: {
    icon: <AlertCircle className="w-4 h-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200'
  },
  info: {
    icon: <Info className="w-4 h-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
};

// Score ring component
const ScoreRing: React.FC<{ score: number; size?: 'sm' | 'md' | 'lg' }> = ({
  score,
  size = 'md'
}) => {
  const dimensions = { sm: 60, md: 100, lg: 140 };
  const dim = dimensions[size];
  const radius = (dim - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const strokeWidth = size === 'sm' ? 4 : size === 'md' ? 6 : 8;
  const fontSize = size === 'sm' ? 'text-sm' : size === 'md' ? 'text-2xl' : 'text-4xl';
  const labelSize = size === 'sm' ? 'text-[8px]' : size === 'md' ? 'text-[10px]' : 'text-xs';

  return (
    <div className="relative" style={{ width: dim, height: dim }}>
      <svg className="transform -rotate-90" width={dim} height={dim}>
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke={score === 100 ? '#10B981' : score >= 70 ? '#F59E0B' : '#EF4444'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-black ${fontSize} text-white`}>{score}%</span>
        <span className={`${labelSize} text-slate-400 font-medium`}>READY</span>
      </div>
    </div>
  );
};

// Single check item
const CheckItem: React.FC<{
  check: ReadinessCheck;
  onToggle?: (id: string, complete: boolean) => void;
  editable?: boolean;
}> = ({ check, onToggle, editable = false }) => {
  const style = SEVERITY_STYLES[check.severity];
  const isRequired = check.isRequired;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${style.bgColor} ${style.borderColor}`}>
      <div className={`mt-0.5 ${style.color}`}>
        {check.isComplete ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        ) : (
          <Circle className="w-4 h-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${check.isComplete ? 'text-slate-700 line-through' : 'text-slate-900'}`}>
            {check.label}
          </span>
          {isRequired && !check.isComplete && (
            <Badge variant="danger" size="sm" className="text-[10px] bg-red-100 text-red-700 border-red-200">
              Required
            </Badge>
          )}
          {!isRequired && (
            <Badge variant="neutral" size="sm" className="text-[10px] bg-slate-100 text-slate-600 border-slate-200">
              Optional
            </Badge>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{check.description}</p>
        {!check.isComplete && check.actionLabel && (
          <button className="text-xs text-[#C85A32] font-medium mt-1 hover:underline flex items-center gap-1">
            {check.actionLabel}
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
      {editable && (
        <button
          onClick={() => onToggle?.(check.id, !check.isComplete)}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
            check.isComplete
              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {check.isComplete ? 'Undo' : 'Complete'}
        </button>
      )}
    </div>
  );
};

// Section accordion
const ReadinessSectionAccordion: React.FC<{
  section: ReadinessSection;
  checks: ReadinessCheck[];
  isExpanded: boolean;
  onToggle: () => void;
  onCheckToggle?: (id: string, complete: boolean) => void;
  editable?: boolean;
}> = ({ section, checks, isExpanded, onToggle, onCheckToggle, editable }) => {
  const completedCount = checks.filter(c => c.isComplete).length;
  const totalCount = checks.length;
  const isComplete = completedCount === totalCount;
  const hasCritical = checks.some(c => c.severity === 'critical' && !c.isComplete);

  return (
    <div className={`border rounded-xl overflow-hidden ${isComplete ? 'border-emerald-200' : hasCritical ? 'border-red-200' : 'border-slate-200'}`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-4 p-4 text-left transition-colors ${
          isComplete ? 'bg-emerald-50 hover:bg-emerald-100' : hasCritical ? 'bg-red-50 hover:bg-red-100' : 'bg-slate-50 hover:bg-slate-100'
        }`}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isComplete ? 'bg-emerald-100 text-emerald-600' : hasCritical ? 'bg-red-100 text-red-600' : 'bg-white text-slate-600'
        }`}>
          {SECTION_ICONS[section.icon] || <Settings className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-[#1E3063]">{section.title}</h4>
          <p className="text-xs text-slate-500">
            {completedCount} of {totalCount} completed
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isComplete ? (
            <Badge variant="success" size="sm" className="bg-emerald-100 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Complete
            </Badge>
          ) : hasCritical ? (
            <Badge variant="danger" size="sm" className="bg-red-100 text-red-700 border-red-200">
              <AlertCircle className="w-3 h-3 mr-1" />
              {totalCount - completedCount} Required
            </Badge>
          ) : (
            <Badge variant="warning" size="sm" className="bg-amber-100 text-amber-700 border-amber-200">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {totalCount - completedCount} Pending
            </Badge>
          )}
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 bg-white space-y-2">
          {checks.map((check) => (
            <CheckItem
              key={check.id}
              check={check}
              onToggle={onCheckToggle}
              editable={editable}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Main component
export const AuctionReadinessEngine: React.FC<AuctionReadinessEngineProps> = ({
  session,
  vehicle,
  initialData,
  onDataChange,
  onPublish,
  isAdminView = false,
}) => {
  const [readinessData, setReadinessData] = useState<Partial<AuctionReadinessData>>(
    { ...getDefaultReadinessData(), ...initialData }
  );
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['organizer']));

  // Calculate readiness
  const result = useMemo(() => {
    return validateAuctionReadiness(session, vehicle, readinessData);
  }, [session, vehicle, readinessData]);

  // QA Validation
  const qaResult = useMemo(() => {
    return runQAValidation(session, vehicle, readinessData as AuctionReadinessData);
  }, [session, vehicle, readinessData]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleCheckToggle = (checkId: string, complete: boolean) => {
    const newData = { ...readinessData, [checkId]: complete };
    setReadinessData(newData);
    onDataChange?.(newData);
  };

  const handleRefresh = () => {
    setReadinessData({ ...getDefaultReadinessData(), ...initialData });
  };

  return (
    <div className="space-y-6">
      {/* Header Dashboard */}
      <Card className="p-6 bg-gradient-to-r from-[#101935] to-[#1a2a4a] text-white border-none">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <ScoreRing score={result.score} size="lg" />

          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl font-black mb-2">
              Auction Readiness Score
            </h3>
            <p className="text-slate-300 text-sm mb-4">
              {result.isPublishable
                ? 'This auction is ready to be published.'
                : `${result.criticalIssues.length} critical items must be completed before publishing.`
              }
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-slate-300">{result.completedChecks} Completed</span>
              </div>
              {result.criticalIssues.length > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-slate-300">{result.criticalIssues.length} Critical</span>
                </div>
              )}
              {result.warnings.length > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-slate-300">{result.warnings.length} Warnings</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {result.nextAction && !result.isPublishable && (
          <div className="mt-4 p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <span className="text-sm font-bold text-amber-400">Next Required Action:</span>
              <span className="text-sm text-white ml-2">{result.nextAction.label}</span>
              <span className="text-xs text-slate-400 ml-2">({result.nextAction.section})</span>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4" />
            This readiness score is visible only to the Auction Organizer and KAYAD Administrators.
            Buyers will only see fully validated auctions.
          </p>
        </div>
      </Card>

      {/* Publish Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          disabled={!result.isPublishable}
          onClick={onPublish}
          className={`px-8 font-bold ${
            result.isPublishable
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
          }`}
        >
          {result.isPublishable ? (
            <>
              <Trophy className="w-5 h-5 mr-2" />
              Publish Auction
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 mr-2" />
              Complete Required Items First
            </>
          )}
        </Button>
      </div>

      {!result.isPublishable && (
        <p className="text-center text-sm text-slate-500">
          Complete all required checklist items before publishing this auction.
        </p>
      )}

      {/* Checklist Sections */}
      <div className="space-y-3">
        {result.sections.map(({ section, checks }) => (
          <ReadinessSectionAccordion
            key={section.id}
            section={section}
            checks={checks}
            isExpanded={expandedSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
            onCheckToggle={handleCheckToggle}
            editable={isAdminView}
          />
        ))}
      </div>

      {/* QA Validation Results */}
      {isAdminView && (
        <Card className="p-6 bg-white border-slate-200">
          <h4 className="font-bold text-[#1E3063] mb-4 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            Quality Assurance Validation
          </h4>
          <div className="space-y-2">
            {qaResult.checks.map((check) => (
              <div
                key={check.name}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  check.passed ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                {check.passed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <div className="flex-1">
                  <span className={`font-medium ${check.passed ? 'text-emerald-800' : 'text-red-800'}`}>
                    {check.name}
                  </span>
                  {!check.passed && (
                    <p className="text-xs text-red-600 mt-0.5">{check.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200">
            <Badge
              variant={qaResult.passed ? 'success' : 'danger'}
              className={qaResult.passed ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-800 border-red-200'}
            >
              {qaResult.passed ? 'All QA checks passed' : 'QA validation failed'}
            </Badge>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AuctionReadinessEngine;
