import React, { useState } from 'react';
import {
  Building,
  Car,
  Gavel,
  Banknote,
  ClipboardCheck,
  FileText,
  Users,
  Shield,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Info,
  ExternalLink,
  FileCheck,
  Clock
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type {
  ComplianceCheck,
  ComplianceCategory,
  ComplianceItem
} from '../../utils/auctionCompliance';
import {
  COMPLIANCE_CATEGORIES,
  getChecksByCategory,
  getComplianceSummary
} from '../../utils/auctionCompliance';

export interface ComplianceChecklistProps {
  checks: ComplianceCheck[];
  onCheckToggle?: (checkId: string, isComplete: boolean) => void;
  onViewPolicy?: (policyId: string) => void;
  onSubmitForReview?: () => void;
  isEditable?: boolean;
}

// Category icons
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  organization: <Building className="w-5 h-5" />,
  vehicle: <Car className="w-5 h-5" />,
  auction: <Gavel className="w-5 h-5" />,
  financial: <Banknote className="w-5 h-5" />,
  inspection: <ClipboardCheck className="w-5 h-5" />,
  document: <FileText className="w-5 h-5" />,
  marketplace_policy: <Shield className="w-5 h-5" />,
  customer_protection: <Users className="w-5 h-5" />,
};

// Single check item
const ComplianceCheckItem: React.FC<{
  check: ComplianceCheck;
  onToggle?: (id: string, complete: boolean) => void;
  editable?: boolean;
}> = ({ check, onToggle, editable }) => {
  const categoryInfo = COMPLIANCE_CATEGORIES[check.category];

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${
      check.isComplete
        ? 'bg-emerald-50 border-emerald-200'
        : check.severity === 'required'
          ? 'bg-red-50 border-red-200'
          : 'bg-slate-50 border-slate-200'
    }`}>
      <button
        onClick={() => editable && onToggle?.(check.id, !check.isComplete)}
        disabled={!editable}
        className={`mt-0.5 ${check.isComplete ? 'text-emerald-600' : 'text-slate-400'} ${
          editable ? 'cursor-pointer hover:text-emerald-600' : 'cursor-default'
        }`}
      >
        {check.isComplete ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${
            check.isComplete ? 'text-emerald-800' : 'text-slate-900'
          }`}>
            {check.label}
          </span>
          {check.severity === 'required' && !check.isComplete && (
            <Badge variant="danger" size="sm" className="text-[10px] bg-red-100 text-red-700 border-red-200">
              Required
            </Badge>
          )}
          {check.severity === 'recommended' && !check.isComplete && (
            <Badge variant="warning" size="sm" className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">
              Recommended
            </Badge>
          )}
          {check.isVerified && (
            <Badge variant="success" size="sm" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">
              <FileCheck className="w-3 h-3 mr-0.5" />
              Verified
            </Badge>
          )}
          {check.expiryDate && (
            <Badge variant="neutral" size="sm" className="text-[10px] bg-slate-100 text-slate-600 border-slate-200">
              <Clock className="w-3 h-3 mr-0.5" />
              Expires: {new Date(check.expiryDate).toLocaleDateString()}
            </Badge>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{check.description}</p>
        {check.documentUrl && (
          <a
            href={check.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#C85A32] font-medium mt-1 flex items-center gap-1 hover:underline"
          >
            View Document
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
};

// Category section accordion
const ComplianceCategorySection: React.FC<{
  category: ComplianceCategory;
  checks: ComplianceCheck[];
  isExpanded: boolean;
  onToggle: () => void;
  onCheckToggle?: (checkId: string, complete: boolean) => void;
  editable?: boolean;
}> = ({ category, checks, isExpanded, onToggle, onCheckToggle, editable }) => {
  const categoryInfo = COMPLIANCE_CATEGORIES[category];
  const completedCount = checks.filter(c => c.isComplete).length;
  const totalCount = checks.length;
  const requiredCount = checks.filter(c => c.severity === 'required').length;
  const requiredComplete = checks.filter(c => c.severity === 'required' && c.isComplete).length;
  const isComplete = completedCount === totalCount;
  const hasIncompleteRequired = requiredComplete < requiredCount;

  return (
    <div className={`border rounded-xl overflow-hidden ${
      isComplete ? 'border-emerald-200' : hasIncompleteRequired ? 'border-red-200' : 'border-slate-200'
    }`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-4 p-4 text-left transition-colors ${
          isComplete ? 'bg-emerald-50 hover:bg-emerald-100' : hasIncompleteRequired ? 'bg-red-50 hover:bg-red-100' : 'bg-slate-50 hover:bg-slate-100'
        }`}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isComplete ? 'bg-emerald-100 text-emerald-600' : hasIncompleteRequired ? 'bg-red-100 text-red-600' : 'bg-white text-slate-600'
        }`} style={{ color: categoryInfo.color }}>
          {CATEGORY_ICONS[category]}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-[#1E3063]">{categoryInfo.label}</h4>
          <p className="text-xs text-slate-500">{categoryInfo.description}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-black text-[#1E3063]">{completedCount}/{totalCount}</div>
          {requiredCount > 0 && (
            <div className="text-[10px] text-slate-500">
              {requiredComplete}/{requiredCount} required
            </div>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 bg-white space-y-2">
          {checks.map(check => (
            <ComplianceCheckItem
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

// Main checklist component
export const ComplianceChecklist: React.FC<ComplianceChecklistProps> = ({
  checks,
  onCheckToggle,
  onViewPolicy,
  onSubmitForReview,
  isEditable = false,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<ComplianceCategory>>(
    new Set(['organization', 'financial'])
  );

  const checksByCategory = getChecksByCategory(checks);
  const summary = getComplianceSummary(checks);

  const toggleCategory = (category: ComplianceCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleCheckToggle = (checkId: string, isComplete: boolean) => {
    onCheckToggle?.(checkId, isComplete);
  };

  const canSubmitForReview = summary.requiredCompleted === summary.required;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="p-5 bg-gradient-to-r from-[#101935] to-[#1a2a4a] text-white border-none">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Progress Ring */}
          <div className="relative w-24 h-24">
            <svg className="transform -rotate-90" width="96" height="96">
              <circle
                cx="48"
                cy="48"
                r="42"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="8"
              />
              <circle
                cx="48"
                cy="48"
                r="42"
                fill="none"
                stroke={summary.requiredCompleted === summary.required ? '#10B981' : '#F59E0B'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - summary.percentage / 100)}`}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black">{summary.percentage}%</span>
              <span className="text-[10px] text-slate-400">Complete</span>
            </div>
          </div>

          {/* Summary */}
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl font-black mb-2">
              Compliance Checklist
            </h3>
            <p className="text-slate-300 text-sm mb-4">
              {canSubmitForReview
                ? 'All required items are complete. Ready to submit for review.'
                : `${summary.required - summary.requiredCompleted} required items must be completed before submitting.`
              }
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${summary.requiredCompleted === summary.required ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="text-sm text-slate-300">
                  {summary.requiredCompleted}/{summary.required} Required
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="text-sm text-slate-300">
                  {summary.recommendedCompleted}/{summary.recommended} Recommended
                </span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            size="lg"
            disabled={!canSubmitForReview}
            onClick={onSubmitForReview}
            className={`px-6 font-bold ${
              canSubmitForReview
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-400 text-slate-600 cursor-not-allowed'
            }`}
          >
            {canSubmitForReview ? (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Submit for Review
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 mr-2" />
                Complete Required Items
              </>
            )}
          </Button>
        </div>

        {/* Not Ready Notice */}
        {!canSubmitForReview && (
          <div className="mt-4 p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-400">Required Items Incomplete</p>
              <p className="text-xs text-slate-300 mt-1">
                Please complete all required compliance items before submitting your auction for review.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Category Sections */}
      <div className="space-y-3">
        {Object.entries(checksByCategory)
          .filter(([_, checks]) => checks.length > 0)
          .sort(([a], [b]) => {
            const order = Object.keys(COMPLIANCE_CATEGORIES);
            return order.indexOf(a) - order.indexOf(b);
          })
          .map(([category, categoryChecks]) => (
            <ComplianceCategorySection
              key={category}
              category={category as ComplianceCategory}
              checks={categoryChecks}
              isExpanded={expandedCategories.has(category as ComplianceCategory)}
              onToggle={() => toggleCategory(category as ComplianceCategory)}
              onCheckToggle={handleCheckToggle}
              editable={isEditable}
            />
          ))
        }
      </div>

      {/* Bottom Action */}
      {canSubmitForReview && onSubmitForReview && (
        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            onClick={onSubmitForReview}
            className="px-8 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Submit for Compliance Review
          </Button>
        </div>
      )}
    </div>
  );
};

export default ComplianceChecklist;
