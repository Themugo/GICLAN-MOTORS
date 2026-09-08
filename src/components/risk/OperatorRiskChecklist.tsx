import React, { useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  AlertOctagon,
  Clock,
  User
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { RiskItem, RiskSeverity } from '../../utils/auctionRisk';
import { SEVERITY_STYLES, sortRisksByPriority } from '../../utils/auctionRisk';

export interface OperatorRiskChecklistProps {
  risks: RiskItem[];
  onViewRisk?: (risk: RiskItem) => void;
  onResolveRisk?: (riskId: string) => void;
}

// Simple risk item for organizers
const OperatorRiskItem: React.FC<{
  risk: RiskItem;
  onView?: (risk: RiskItem) => void;
}> = ({ risk, onView }) => {
  const style = SEVERITY_STYLES[risk.severity];

  return (
    <div className={`p-4 rounded-xl border ${style.bgColor} ${style.borderColor}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${style.color}`}>
          {risk.severity === 'critical' || risk.severity === 'high' ? (
            <AlertOctagon className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900">{risk.title}</span>
            {risk.severity === 'critical' && (
              <Badge size="sm" className="bg-red-100 text-red-700 border-red-200 text-[10px]">
                Action Required
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1">{risk.description}</p>

          {/* Solution hint */}
          <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">How to Fix</p>
            <p className="text-sm text-slate-800">{risk.recommendation.solution}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              {risk.recommendation.responsibleParty === 'organizer' && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Your action needed
                </span>
              )}
              {risk.recommendation.estimatedTime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {risk.recommendation.estimatedTime}
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 mt-2 flex-shrink-0" />
      </div>
    </div>
  );
};

export const OperatorRiskChecklist: React.FC<OperatorRiskChecklistProps> = ({
  risks,
  onViewRisk,
  onResolveRisk,
}) => {
  // Filter to only organizer-related risks
  const organizerRisks = useMemo(() => {
    return sortRisksByPriority(
      risks.filter(r =>
        r.status === 'active' &&
        r.recommendation.responsibleParty === 'organizer'
      )
    );
  }, [risks]);

  const blockingRisks = useMemo(() => {
    return organizerRisks.filter(r =>
      r.severity === 'critical' ||
      (r.severity === 'high' && SEVERITY_STYLES[r.severity].blocksPublication)
    );
  }, [organizerRisks]);

  const improvementRisks = useMemo(() => {
    return organizerRisks.filter(r =>
      r.severity === 'medium' || r.severity === 'low' || r.severity === 'info'
    );
  }, [organizerRisks]);

  if (organizerRisks.length === 0) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800 mb-2">All Clear!</h3>
        <p className="text-sm text-slate-500">
          Your auctions have no outstanding issues. Keep up the great work!
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center bg-red-50 border-red-200">
          <div className="text-2xl font-black text-red-600">{blockingRisks.length}</div>
          <div className="text-xs text-red-600 font-medium">Must Fix</div>
        </Card>
        <Card className="p-4 text-center bg-amber-50 border-amber-200">
          <div className="text-2xl font-black text-amber-600">{improvementRisks.length}</div>
          <div className="text-xs text-amber-600 font-medium">Improvements</div>
        </Card>
        <Card className="p-4 text-center bg-emerald-50 border-emerald-200">
          <div className="text-2xl font-black text-emerald-600">{organizerRisks.length}</div>
          <div className="text-xs text-emerald-600 font-medium">Total</div>
        </Card>
      </div>

      {/* Publication Status */}
      {blockingRisks.length > 0 && (
        <Card className="p-5 bg-red-50 border-red-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-red-800 mb-1">Auction Publication Blocked</h3>
              <p className="text-sm text-slate-600 mb-3">
                {blockingRisks.length} issue{blockingRisks.length > 1 ? 's' : ''} must be resolved before your auction can go live.
              </p>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                onClick={() => onViewRisk?.(blockingRisks[0])}
              >
                Fix Issues
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Must Fix Section */}
      {blockingRisks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertOctagon className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-slate-800">Issues Requiring Action</h3>
            <Badge variant="danger" size="sm">{blockingRisks.length}</Badge>
          </div>
          <div className="space-y-3">
            {blockingRisks.map((risk) => (
              <OperatorRiskItem
                key={risk.id}
                risk={risk}
                onView={onViewRisk}
              />
            ))}
          </div>
        </div>
      )}

      {/* Improvements Section */}
      {improvementRisks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-slate-800">Suggested Improvements</h3>
            <Badge variant="warning" size="sm">{improvementRisks.length}</Badge>
          </div>
          <div className="space-y-3">
            {improvementRisks.map((risk) => (
              <OperatorRiskItem
                key={risk.id}
                risk={risk}
                onView={onViewRisk}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorRiskChecklist;
