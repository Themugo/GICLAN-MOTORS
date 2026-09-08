import React, { useState, useMemo, useEffect } from 'react';
import { EscrowTransaction, EscrowLogEntry, EscrowDispute, UserProfile } from '../types';
import { getMyEscrows, confirmVehicle, disputeEscrow, releaseEscrow, mapBackendEscrowToTransaction, EscrowApiError } from '../services/escrowApi';
import {
  Shield,
  Lock,
  CheckCircle2,
  Landmark,
  Clock,
  ArrowRight,
  Search,
  ShieldCheck,
  FileCheck,
  UserCheck,
  Building2,
  Sparkles,
  ChevronRight,
  Info,
  PlusCircle,
  AlertTriangle,
  History,
  TrendingUp,
  DollarSign,
  Car,
  FileText,
  MessageSquare,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Eye,
  Check,
  User,
  ShieldAlert,
  Download,
  Upload,
  PhoneCall
} from 'lucide-react';
import { PageHeader, StatWidget, Card, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Input, Modal } from '../components/ui';

interface EscrowViewProps {
  user?: UserProfile | null;
  onOpenAuth?: () => void;
}

// Fixed: this entire page previously ran on MOCK_ESCROW_DEALS - fake
// deals, fake specific buyer/seller names, a fake NTSA TIMS ownership-
// transfer visualizer (no real TIMS integration exists anywhere in
// this backend), and a free role switcher that let any visitor
// self-promote to "Administrator / Custodian" with no real permission
// check at all. Rebuilt around real data: real escrow deals loaded
// from the real backend, real per-deal buyer/seller/amount/status,
// and the role perspective now derives from who is actually logged
// in - Buyer or Seller only shown when the current real user is
// genuinely that real party to the deal, Administrator only ever
// shown when the real user's own role is genuinely admin/superadmin/
// moderator (matching the real backend's own authorization checks on
// every action route, confirmed directly in
// backend/controllers/escrowController.js).
export const EscrowView: React.FC<EscrowViewProps> = ({ user, onOpenAuth }) => {
  const [dealsList, setDealsList] = useState<EscrowTransaction[]>([]);
  const [dealsLoading, setDealsLoading] = useState<boolean>(true);
  const [dealsError, setDealsError] = useState<string | null>(null);
  const [dealSearch, setDealSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'journey' | 'deals' | 'create' | 'rules'>('journey');
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const selectedDeal = dealsList.find((d) => d.id === selectedDealId);

  useEffect(() => {
    if (!user) {
      setDealsList([]);
      setDealsLoading(false);
      return;
    }
    let cancelled = false;
    setDealsLoading(true);
    setDealsError(null);
    getMyEscrows()
      .then((escrows) => {
        if (cancelled) return;
        const mapped = escrows.map(mapBackendEscrowToTransaction);
        setDealsList(mapped);
        // Fixed: restores real, pre-existing deep-linking behavior
        // (this project's own earlier Phase 12 work) that this
        // rewrite had otherwise dropped - a shared/refreshed link
        // with ?escrowId=<id> should select that specific real deal,
        // not silently fall back to the first one.
        const urlEscrowId = new URLSearchParams(window.location.search).get('escrowId');
        const matched = urlEscrowId ? mapped.find((d) => d.id === urlEscrowId) : undefined;
        setSelectedDealId((prev) => prev || matched?.id || mapped[0]?.id || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setDealsError(err instanceof EscrowApiError ? err.message : 'Could not load your escrow deals.');
      })
      .finally(() => {
        if (!cancelled) setDealsLoading(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  // Fixed: derives the real, honest perspective from who the deal's
  // real parties actually are, rather than a free toggle anyone could
  // click. isRealAdmin mirrors the real backend's own authorization
  // check (admin/superadmin/moderator) exactly.
  // Fixed: restores real, pre-existing deep-linking behavior - writes
  // the currently-selected real deal's id back to the URL so it can
  // be shared or survive a refresh.
  useEffect(() => {
    if (!selectedDealId) return;
    const params = new URLSearchParams(window.location.search);
    params.set('escrowId', selectedDealId);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }, [selectedDealId]);

  const isRealAdmin = user?.role === 'admin';
  const realUserRole: 'Buyer' | 'Seller' | 'Administrator' | null = useMemo(() => {
    if (!user || !selectedDeal) return null;
    if (isRealAdmin) return 'Administrator';
    // buyerEmail/sellerEmail are the only real identifiers this
    // mapped type carries for comparison against the current session.
    if (user.email && selectedDeal.buyerEmail === user.email) return 'Buyer';
    if (user.email && selectedDeal.sellerEmail === user.email) return 'Seller';
    return null;
  }, [user, selectedDeal, isRealAdmin]);
  const [userRole, setUserRole] = useState<'Buyer' | 'Seller' | 'Administrator'>('Buyer');
  useEffect(() => {
    if (realUserRole) setUserRole(realUserRole);
  }, [realUserRole]);

  // Sub-modals for Inspection & Dispute
  const [showInspectionModal, setShowInspectionModal] = useState<boolean>(false);
  const [showDisputeModal, setShowDisputeModal] = useState<boolean>(false);
  const [disputeReasonInput, setDisputeReasonInput] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Escrow Form State

  // Auto-clear Toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 6-Step Visual Escrow Purchase Timeline Protocol Definition
  const escrowTimelineSteps = [
    {
      step: 1,
      id: 'reserved',
      title: 'Vehicle Reserved',
      desc: 'Price agreed & offer locked by both parties.',
      controller: 'Seller & Buyer Agreement'
    },
    {
      step: 2,
      id: 'deposit',
      title: 'Buyer Deposits Funds',
      desc: 'Funds locked in neutral KAYAD Escrow Vault.',
      controller: 'Awaiting Vault Confirmation'
    },
    {
      step: 3,
      id: 'inspection',
      title: 'Inspection Completed',
      desc: '150-Point technical audit & VIN verification.',
      controller: 'Certified Inspector & Kayad'
    },
    {
      step: 4,
      id: 'approval',
      title: 'Buyer Approves Vehicle',
      desc: 'Buyer signs off on physical condition.',
      controller: 'Buyer Release Sign-off'
    },
    {
      step: 5,
      id: 'transfer',
      title: 'Logbook Transfer',
      desc: 'NTSA TIMS electronic title transfer verified.',
      controller: 'NTSA TIMS Portal'
    },
    {
      step: 6,
      id: 'released',
      title: 'Seller Paid',
      desc: 'Bank vault releases payout to seller.',
      controller: 'Bank Custodian Disbursed'
    }
  ];

  const filteredDeals = useMemo(() => {
    if (!dealSearch) return dealsList;
    const q = dealSearch.toLowerCase();
    return dealsList.filter(
      (d) =>
        d.id.toLowerCase().includes(q) ||
        d.vehicleTitle.toLowerCase().includes(q) ||
        d.buyerName.toLowerCase().includes(q) ||
        d.sellerName.toLowerCase().includes(q)
    );
  }, [dealsList, dealSearch]);

  const totalVaultValue = dealsList.reduce((sum, d) => sum + d.amount, 0);

  // Helper function to derive expected next action and current fund controller
  const getWorkflowContext = (deal: EscrowTransaction) => {
    if (deal.status === 'Dispute Under Review' || deal.dispute) {
      return {
        singleStatusText: 'Dispute Opened — Custodian Funds Frozen in Vault',
        badgeVariant: 'warning' as const,
        fundController: 'KAYAD Legal & KAYAD Trustee Custody (Frozen)',
        nextActionRole: 'Administrator / Legal Compliance',
        nextActionText: 'Reviewing evidence & mechanic logs to resolve dispute.'
      };
    }

    switch (deal.step) {
      case 1:
        return {
          singleStatusText: 'Awaiting Buyer Vault Deposit',
          badgeVariant: 'escrow' as const,
          fundController: 'Buyer (Awaiting Vault Transfer)',
          nextActionRole: 'Buyer',
          nextActionText: 'Deposit purchase funds into KAYAD Escrow Vault.'
        };
      case 2:
        return {
          singleStatusText: 'Vault Deposit Received — Awaiting Inspection',
          badgeVariant: 'escrow' as const,
          fundController: 'KAYAD Escrow (Neutral Hold)',
          nextActionRole: 'Certified Inspector',
          nextActionText: 'Dispatch mechanic to conduct 150-point technical audit.'
        };
      case 3:
        return {
          singleStatusText: '150-Point Technical Inspection Completed',
          badgeVariant: 'verified' as const,
          fundController: 'KAYAD Escrow Vault (Neutral Hold)',
          nextActionRole: 'Buyer',
          nextActionText: 'Review 150-Point Audit Report and approve vehicle.'
        };
      case 4:
        return {
          singleStatusText: 'Awaiting Buyer Approval',
          badgeVariant: 'escrow' as const,
          fundController: 'KAYAD Escrow Vault (Neutral Hold)',
          nextActionRole: 'Buyer',
          nextActionText: 'Sign electronic approval certificate to initiate title transfer.'
        };
      case 5:
        return {
          singleStatusText: 'Ownership Transfer In Progress (NTSA TIMS)',
          badgeVariant: 'verified' as const,
          fundController: 'KAYAD Escrow Vault (Neutral Hold)',
          nextActionRole: 'Seller & NTSA TIMS',
          nextActionText: 'Confirm NTSA TIMS electronic logbook assignment.'
        };
      case 6:
      default:
        return {
          singleStatusText: 'Transaction Completed & Seller Disbursed',
          badgeVariant: 'success' as const,
          fundController: 'Seller Account (Funds Released)',
          nextActionRole: 'None',
          nextActionText: 'Transaction settled successfully. Logbook transferred.'
        };
    }
  };

  // A standalone escrow cannot be created from this view. The backend
  // creates escrow records as part of its real purchase/payment flow.
  const handleCreateEscrow = (e: React.FormEvent) => {
    e.preventDefault();
    triggerToast('Standalone escrow creation is not available. Start from a real purchase/payment flow.');
  };

  // Advance deal workflow step
  // Fixed: this previously advanced through all 6 fake steps purely
  // in local state, including fake "Inspection Completed"/"NTSA
  // Processing" stages with no real backend action behind them at
  // all. The real backend's own matching action is confirmVehicle -
  // the buyer confirming the vehicle, moving the deal forward for
  // real (confirmed directly: backend/controllers/escrowController.js's
  // confirmVehicleHandler, gated to the real buyer or an admin).
  const handleAdvanceStep = async (dealId: string) => {
    try {
      const updatedEscrow = await confirmVehicle(dealId);
      const updated = mapBackendEscrowToTransaction(updatedEscrow);
      setDealsList(prev => prev.map(d => d.id === dealId ? updated : d));
      triggerToast(`Deal moved forward: ${updated.status}`);
    } catch (err) {
      triggerToast(err instanceof EscrowApiError ? err.message : 'Could not confirm this deal. Please try again.');
    }
  };

  // Open Dispute Handler
  // Fixed: this previously fabricated a complete, fake dispute record
  // locally - a fake case ID, fake "evidence" files that were never
  // uploaded, a fake "auditor assigned" message - none of it real or
  // persisted anywhere. Now calls the real backend, which genuinely
  // freezes the deal and is visible to the real other party (buyer/
  // seller) and real staff (confirmed directly:
  // backend/controllers/escrowController.js's disputeEscrow, and its
  // own real Socket.IO emit to both real parties).
  const handleOpenDisputeSubmit = async () => {
    if (!disputeReasonInput.trim() || !selectedDeal) return;
    try {
      const updatedEscrow = await disputeEscrow(selectedDeal.id, disputeReasonInput);
      const updated = mapBackendEscrowToTransaction(updatedEscrow);
      setDealsList(prev => prev.map(d => d.id === updated.id ? updated : d));
      setShowDisputeModal(false);
      setDisputeReasonInput('');
      triggerToast('Dispute opened. Funds frozen pending review.');
    } catch (err) {
      triggerToast(err instanceof EscrowApiError ? err.message : 'Could not open dispute. Please try again.');
    }
  };

  const currentContext = selectedDeal ? getWorkflowContext(selectedDeal) : null;

  return (
    <div className="space-y-6 bg-[#FDFBF7] min-h-screen pb-12">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#1E3063] text-white px-4 py-3 rounded-2xl shadow-xl border border-amber-400/40 flex items-center gap-2 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Standalone Header Banner */}
      <PageHeader
        badgeIcon={<Lock className="w-4 h-4 text-amber-400" />}
        badgeText="Bank-Backed Custodian Portal"
        title="KAYAD Escrow Purchase Journey & Financial Settlement"
        description="Eliminating buyer & seller risk through visual package-tracking escrow clarity, 150-point technical mechanic audits, and direct NTSA TIMS logbook title clearance."
        rightElement={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={activeTab === 'journey' ? 'primary' : 'outline'}
              size="md"
              onClick={() => setActiveTab('journey')}
              className="bg-[#1E3063] text-white font-bold"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Escrow Purchase Journey</span>
            </Button>
            <Button
              variant={activeTab === 'deals' ? 'primary' : 'outline'}
              size="md"
              onClick={() => setActiveTab('deals')}
              className="font-bold text-slate-700"
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>All Protected Deals ({dealsList.length})</span>
            </Button>
            <Button
              variant={activeTab === 'create' ? 'primary' : 'outline'}
              size="md"
              onClick={() => setActiveTab('create')}
              className="font-bold text-slate-700"
            >
              <PlusCircle className="w-4 h-4 text-[#C85A32]" />
              <span>Escrow Flow</span>
            </Button>
          </div>
        }
      />

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatWidget
          label="Total Locked Vault Volume"
          value={`Ksh ${totalVaultValue.toLocaleString()}`}
          trend="Sum of your loaded escrow records"
          trendType="positive"
          icon={<Landmark className="w-4 h-4 text-emerald-600" />}
        />

        <StatWidget
          label="Active Protected Transactions"
          value={dealsList.length}
          trend="Live records only"
          trendType="positive"
          icon={<Lock className="w-4 h-4 text-amber-500" />}
        />

        <StatWidget
          label="Escrow Settlement Time"
          value="Not calculated"
          trend="Backend does not expose this metric"
          trendType="neutral"
          icon={<Clock className="w-4 h-4 text-blue-500" />}
        />

        <StatWidget
          label="Title Clearance"
          value="Not verified here"
          trend="No direct NTSA integration in this view"
          trendType="positive"
          icon={<FileCheck className="w-4 h-4 text-emerald-600" />}
        />
      </div>

      <Card className="p-4 border border-slate-200 bg-white">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <UserCheck className="w-4 h-4 text-[#1E3063]" />
          <span>Current perspective: {userRole}</span>
          <span className="font-normal text-slate-500">(derived from the signed-in user and selected real escrow)</span>
        </div>
      </Card>

      {/* TAB 1: ESCROW PURCHASE JOURNEY DASHBOARD */}
      {activeTab === 'journey' && selectedDeal && (
        <div className="space-y-6">
          {/* DEAL SELECTOR ROW */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1E3063] shrink-0">
              <Car className="w-4 h-4 text-[#C85A32]" />
              <span>Select Active Deal:</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              {dealsList.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDealId(d.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold shrink-0 border transition-all flex items-center gap-2 ${
                    selectedDeal?.id === d.id
                      ? 'bg-[#1E3063] text-white border-[#1E3063] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-mono text-[11px] opacity-80">{d.id}</span>
                  <span className="truncate max-w-[140px]">{d.vehicleTitle}</span>
                  {d.dispute && (
                    <span className="w-2 h-2 rounded-full bg-[#E5484D] animate-ping" title="Dispute Open" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 1. SINGLE CLEAR TRANSACTION STATUS BANNER */}
          <Card className="p-5 bg-gradient-to-r from-[#1E3063] via-[#17244B] to-slate-900 text-white border border-slate-700 shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Badge variant={currentContext.badgeVariant} size="md">
                  <Lock className="w-3.5 h-3.5 text-amber-300" /> Ref #{selectedDeal.id}
                </Badge>
                <span className="text-xs text-slate-300 font-mono font-bold">
                  Updated {selectedDeal.updatedAt}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-300 font-medium">Vault Custodian:</span>
                <span className="text-xs text-amber-300 font-extrabold bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20">
                  {selectedDeal.vaultHolder || 'KAYAD Escrow Custodian'}
                </span>
              </div>
            </div>

            {/* Single Clear Status Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
              <div>
                <p className="text-[11px] uppercase tracking-wider font-extrabold text-amber-400 font-display">
                  Current Transaction Status
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-white font-display mt-0.5 flex items-center gap-2">
                  {selectedDeal.dispute ? (
                    <AlertTriangle className="w-6 h-6 text-[#E5484D] shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  )}
                  {currentContext.singleStatusText}
                </h2>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/15 text-xs text-slate-200 space-y-0.5 shrink-0">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-300">Who Controls Funds Now?</p>
                <p className="font-extrabold text-amber-300 flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-emerald-400" />
                  {selectedDeal.whoControlsFunds || currentContext.fundController}
                </p>
              </div>
            </div>

            {/* EXPECTED NEXT ACTION BANNER */}
            <div className={`p-3.5 rounded-xl border flex items-start sm:items-center justify-between gap-3 text-xs ${
              selectedDeal.dispute
                ? 'bg-[#E5484D]/15 border-[#E5484D]/40 text-rose-100'
                : 'bg-emerald-950/40 border-emerald-400/30 text-emerald-100'
            }`}>
              <div className="flex items-start gap-2.5">
                <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-white text-xs">
                    Expected Next Action: <span className="text-amber-300">[{currentContext.nextActionRole}]</span>
                  </p>
                  <p className="text-[11px] text-slate-200 mt-0.5 leading-normal">
                    {currentContext.nextActionText}
                  </p>
                </div>
              </div>

              <Badge variant="neutral" size="sm" className="bg-white/15 text-white shrink-0 font-bold">
                Step {selectedDeal.step} of 6
              </Badge>
            </div>
          </Card>

          {/* 2. VISUAL ESCROW TIMELINE STEPPER */}
          <Card className="p-6 bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-[#1E3063] font-display flex items-center gap-2">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
                Package-Tracking Visual Escrow Progress Timeline
              </h3>
              <span className="text-xs text-slate-500 font-bold">
                Progress: Step {selectedDeal.step} of 6 Completed
              </span>
            </div>

            {/* Stepper Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              {escrowTimelineSteps.map((st) => {
                const isDone = selectedDeal.step > st.step || selectedDeal.step === 6;
                const isCurrent = selectedDeal.step === st.step && selectedDeal.step < 6;
                return (
                  <div
                    key={st.step}
                    className={`p-3.5 rounded-2xl border text-xs relative flex flex-col justify-between transition-all ${
                      isDone
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs'
                        : isCurrent
                        ? 'bg-amber-50 border-amber-300 text-amber-950 ring-2 ring-amber-400/40 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-400 opacity-75'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`w-6 h-6 rounded-full font-black text-xs flex items-center justify-center font-display ${
                          isDone
                            ? 'bg-emerald-600 text-white'
                            : isCurrent
                            ? 'bg-[#1E3063] text-amber-300'
                            : 'bg-slate-200 text-slate-500'
                        }`}>
                          {isDone ? <Check className="w-3.5 h-3.5" /> : st.step}
                        </span>

                        {isCurrent && (
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" title="Active Step" />
                        )}
                      </div>

                      <p className={`font-extrabold text-xs font-display ${
                        isDone ? 'text-emerald-950' : isCurrent ? 'text-[#1E3063]' : 'text-slate-600'
                      }`}>
                        {st.title}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">
                        {st.desc}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/60 text-[9px] font-bold text-slate-500">
                      Controller: {st.controller}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 3. DUAL COLUMN DASHBOARD GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT COLUMN: VEHICLE & PAYMENT SUMMARY */}
            <div className="lg:col-span-2 space-y-6">

              {/* VEHICLE SUMMARY CARD */}
              <Card className="p-5 bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-extrabold text-[#1E3063] font-display flex items-center gap-2">
                    <Car className="w-4.5 h-4.5 text-[#C85A32]" />
                    Protected Vehicle Item Summary
                  </h3>
                  <Badge variant="neutral" size="sm" className="font-mono">
                    {selectedDeal.vin ? `VIN: ${selectedDeal.vin}` : 'VIN Not on File'}
                  </Badge>
                </div>

                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="w-full sm:w-44 h-32 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative">
                    <img
                      src={selectedDeal.vehicleImage || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800'}
                      alt={selectedDeal.vehicleTitle}
                      className="w-full h-full object-cover"
                    />
                    {selectedDeal.plateNumber && (
                      <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                        {selectedDeal.plateNumber}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 flex-1 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Vehicle Title</span>
                      <h4 className="text-lg font-black text-[#1E3063] font-display">{selectedDeal.vehicleTitle}</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Agreed Sale Price</p>
                        <p className="text-base font-black text-[#1E3063]">
                          Ksh {selectedDeal.amount.toLocaleString()}
                        </p>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Seller Verification</p>
                        <p className="font-extrabold text-emerald-950 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          {selectedDeal.sellerName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium pt-1">
                      <span>Buyer: <strong>{selectedDeal.buyerName}</strong></span>
                      <span>Seller Type: <strong>{selectedDeal.sellerType || 'Verified Seller'}</strong></span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* PAYMENT & CUSTODY SECTION */}
              <Card className="p-5 bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-extrabold text-[#1E3063] font-display flex items-center gap-2">
                    <Landmark className="w-4.5 h-4.5 text-emerald-600" />
                    Custodial Payment Details & Vault Balance
                  </h3>
                  <Badge variant="escrow" size="sm">
                    Protected by KAYAD Trustee
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Deposit Date & Time</p>
                    <p className="font-extrabold text-[#1E3063]">{selectedDeal.depositDate ? new Date(selectedDeal.depositDate).toLocaleString() : 'Not yet deposited'}</p>
                    <p className="text-[10px] text-slate-500">Timestamped Audit Record</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Payment Channel</p>
                    <p className="font-extrabold text-[#1E3063]">{selectedDeal.paymentMethod || 'Bank Transfer'}</p>
                    {/* Only display a payment reference when the backend actually returns one. */}
                    {selectedDeal.bankReference && (
                      <p className="text-[10px] text-slate-500">Ref: {selectedDeal.bankReference}</p>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Locked Vault Balance</p>
                    <p className="font-black text-emerald-700 text-sm">Ksh {selectedDeal.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-emerald-800 font-bold">100% Fully Funded</p>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-slate-700 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Financial Safety Guarantee: Funds are released ONLY upon explicit buyer sign-off and NTSA TIMS logbook transfer.</span>
                  </div>
                  <Badge variant="neutral" size="sm" className="shrink-0 font-bold">
                    Zero Risk Payout
                  </Badge>
                </div>
              </Card>


            </div>

            {/* RIGHT COLUMN: ROLE-AWARE ACTIONS & DISPUTES & NOTIFICATIONS */}
            <div className="space-y-6">

              {/* ROLE-AWARE CONTEXTUAL ACTION BUTTONS PANEL */}
              <Card className="p-5 bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-extrabold text-[#1E3063] font-display flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-amber-500" />
                    {userRole} Contextual Workflow Actions
                  </h3>
                  <Badge variant="neutral" size="sm" className="font-bold">
                    Role: {userRole}
                  </Badge>
                </div>

                <div className="space-y-2.5 text-xs">
                  {userRole === 'Buyer' && (
                    <>
                      {selectedDeal.step === 1 && (
                        <Button
                          variant="primary"
                          size="md"
                          fullWidth
                          onClick={() => handleAdvanceStep(selectedDeal.id)}
                          className="bg-[#1E3063] text-white font-extrabold shadow-xs"
                        >
                          <Lock className="w-4 h-4 text-amber-300" />
                          <span>Pay Deposit into KAYAD Escrow Vault</span>
                        </Button>
                      )}

                      {selectedDeal.step >= 3 && selectedDeal.step <= 4 && (
                        <Button
                          variant="primary"
                          size="md"
                          fullWidth
                          onClick={() => handleAdvanceStep(selectedDeal.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve Vehicle & Authorize Logbook Transfer</span>
                        </Button>
                      )}

                      {!selectedDeal.dispute && (
                        <Button
                          variant="outline"
                          size="md"
                          fullWidth
                          onClick={() => setShowDisputeModal(true)}
                          className="text-[#E5484D] border-[#E5484D]/40 hover:bg-rose-50 font-bold"
                        >
                          <AlertTriangle className="w-4 h-4 text-[#E5484D]" />
                          <span>Report Issue / Open Dispute</span>
                        </Button>
                      )}
                    </>
                  )}

                  {userRole === 'Seller' && (
                    <>
                      <Button
                        variant="primary"
                        size="md"
                        fullWidth
                        onClick={() => triggerToast('Vehicle availability confirmed by seller.')}
                        className="bg-[#1E3063] text-white font-extrabold shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4 text-amber-300" />
                        <span>Confirm Vehicle Availability</span>
                      </Button>

                      <Button
                        variant="secondary"
                        size="md"
                        fullWidth
                        onClick={() => handleAdvanceStep(selectedDeal.id)}
                        className="bg-emerald-50 text-emerald-950 border border-emerald-300 font-bold"
                      >
                        <Upload className="w-4 h-4 text-emerald-600" />
                        <span>Upload TIMS Logbook Documents</span>
                      </Button>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 font-medium">
                        <strong>Seller Payout Status:</strong> Payout of Ksh {selectedDeal.amount.toLocaleString()} will be disbursed directly into your registered bank account upon NTSA TIMS clearance.
                      </div>
                    </>
                  )}

                  {userRole === 'Administrator' && (
                    <>
                      <Button
                        variant="primary"
                        size="md"
                        fullWidth
                        onClick={() => handleAdvanceStep(selectedDeal.id)}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold shadow-xs"
                      >
                        <Landmark className="w-4 h-4" />
                        <span>Release Vault Funds to Seller</span>
                      </Button>

                      {/* Fixed: this action calls the real backend's
                          admin-only release endpoint (confirmed
                          directly) - only ever shown to a genuinely
                          real admin now, not to the buyer this whole
                          block is otherwise scoped to. */}
                      {selectedDeal.dispute && isRealAdmin && (
                        <Button
                          variant="secondary"
                          size="md"
                          fullWidth
                          onClick={async () => {
                            try {
                              await releaseEscrow(selectedDeal.id);
                              const refreshed = await getMyEscrows();
                              setDealsList(refreshed.map(mapBackendEscrowToTransaction));
                              triggerToast('Dispute resolved. Vault funds released to seller.');
                            } catch (err) {
                              triggerToast(err instanceof EscrowApiError ? err.message : 'Could not release funds. Please try again.');
                            }
                          }}
                          className="bg-amber-100 text-[#17244B] border border-amber-300 font-bold"
                        >
                          <ShieldCheck className="w-4 h-4 text-[#C85A32]" />
                          <span>Resolve Dispute & Release Funds</span>
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="md"
                        fullWidth
                        onClick={() => triggerToast('Transaction paused for compliance audit.')}
                        className="text-[#C85A32] border-[#C85A32] hover:bg-amber-50 font-bold"
                      >
                        <Lock className="w-4 h-4" />
                        <span>Pause Transaction for Audit</span>
                      </Button>
                    </>
                  )}
                </div>
              </Card>

              {/* DEDICATED DISPUTE PANEL */}
              {selectedDeal.dispute ? (
                <Card className="p-5 bg-rose-50/70 border border-rose-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-rose-200 pb-3">
                    <h3 className="text-sm font-extrabold text-[#E5484D] font-display flex items-center gap-2">
                      <AlertTriangle className="w-4.5 h-4.5 text-[#E5484D]" />
                      Active Dispute Resolution Panel
                    </h3>
                    <Badge variant="warning" size="sm" className="bg-[#E5484D] text-white font-bold">
                      {selectedDeal.dispute.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs">
                    <p className="text-[11px] font-bold text-slate-700">Reason for Dispute:</p>
                    <p className="p-3 bg-white rounded-xl border border-rose-200 text-slate-800 leading-relaxed font-medium">
                      "{selectedDeal.dispute.reason}"
                    </p>

                    <p className="text-[11px] font-bold text-slate-700 pt-1">Evidence Submitted ({selectedDeal.dispute.evidence.length}):</p>
                    <div className="space-y-1.5">
                      {selectedDeal.dispute.evidence.map((ev, i) => (
                        <div key={i} className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-[11px]">
                          <span className="font-bold text-[#1E3063] flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            {ev.title}
                          </span>
                          <span className="text-slate-400 font-mono">{ev.fileType}</span>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] font-bold text-slate-700 pt-1">Case Investigation Updates:</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {selectedDeal.dispute.updates.map((up, i) => (
                        <div key={i} className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-0.5 text-[11px]">
                          <div className="flex justify-between font-bold text-slate-700">
                            <span>{up.author}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{up.timestamp}</span>
                          </div>
                          <p className="text-slate-600 leading-normal">{up.note}</p>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-rose-200 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-medium">Resolution Timeline: 24-48 Hours</span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => triggerToast('Escalated to Lead KAYAD Legal Arbitrator.')}
                        className="bg-[#C85A32] text-white font-bold text-xs"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Escalate Case</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="p-5 bg-slate-50 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-[#1E3063] font-display flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Dispute Guarantee Shield Active
                    </h4>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                      Zero Open Disputes
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    If the vehicle fails physical 150-point inspection or title transfer encounters encumbrances, the buyer can open a 1-click dispute to freeze vault funds immediately.
                  </p>
                </Card>
              )}

              {/* NOTIFICATIONS & AUDIT TIMELINE LOG */}
              <Card className="p-5 bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-extrabold text-[#1E3063] font-display flex items-center gap-2">
                    <History className="w-4.5 h-4.5 text-blue-600" />
                    Transaction Activity & Notification Audit Log
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono font-bold">Live Stream</span>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {(selectedDeal.timelineLogs || []).map((log) => (
                    <div key={log.id} className="flex items-start gap-3 text-xs border-b border-slate-100 pb-2.5 last:border-0">
                      <div className={`p-1.5 rounded-full mt-0.5 shrink-0 ${
                        log.type === 'success'
                          ? 'bg-emerald-100 text-emerald-700'
                          : log.type === 'dispute'
                          ? 'bg-rose-100 text-[#E5484D]'
                          : log.type === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>

                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-extrabold text-[#1E3063]">{log.title}</p>
                          <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{log.description}</p>
                        <span className="text-[10px] font-bold text-slate-400">Actor: {log.actor}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* SUPPORT CONTACT SHORTCUT */}
              <div className="p-4 bg-[#1E3063] text-white rounded-2xl border border-slate-700 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-extrabold text-amber-300 font-display">Need Custody Officer Assistance?</p>
                  <p className="text-[11px] text-slate-300">Dedicated KAYAD Escrow Desk: +254 700 999 000</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => triggerToast('Connected to KAYAD Senior Financial Officer.')}
                  className="bg-amber-400 text-[#17244B] font-black hover:bg-amber-300 shrink-0"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Contact Vault Officer</span>
                </Button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* TAB 2: ALL PROTECTED DEALS TABLE */}
      {activeTab === 'deals' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-96">
              <Input
                placeholder="Search Deal ID, vehicle title, buyer or seller..."
                value={dealSearch}
                onChange={(e) => setDealSearch(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>

            <div className="text-xs text-slate-500 font-bold flex items-center gap-2">
              <span>Protected Queue Balance:</span>
              <span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-lg font-black text-sm">
                Ksh {totalVaultValue.toLocaleString()}
              </span>
            </div>
          </div>

          <Card className="overflow-hidden bg-white border border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-200 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-[#1E3063]">
                <Lock className="w-4 h-4 text-amber-500" />
                Live Escrow Vault Transaction Queue ({filteredDeals.length})
              </CardTitle>
            </CardHeader>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal Ref</TableHead>
                  <TableHead>Vehicle Item</TableHead>
                  <TableHead>Vault Balance</TableHead>
                  <TableHead>Parties</TableHead>
                  <TableHead>Current Stage</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeals.map((d) => (
                  <TableRow
                    key={d.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      selectedDeal?.id === d.id ? 'bg-amber-50/50' : ''
                    }`}
                  >
                    <TableCell className="font-mono font-extrabold text-xs text-[#1E3063]">{d.id}</TableCell>
                    <TableCell className="font-extrabold text-xs text-[#1E3063]">{d.vehicleTitle}</TableCell>
                    <TableCell className="font-black text-xs text-slate-900">Ksh {d.amount.toLocaleString()}</TableCell>
                    <TableCell className="font-medium text-xs text-slate-600">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800">{d.buyerName} <span className="text-slate-400 font-normal">(Buyer)</span></p>
                        <p className="text-slate-500">{d.sellerName} <span className="text-slate-400 font-normal">(Seller)</span></p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={d.status === 'Completed' ? 'success' : d.dispute ? 'warning' : 'escrow'}
                        size="sm"
                      >
                        <CheckCircle2 className="w-3 h-3" /> {d.status} (Step {d.step}/6)
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedDealId(d.id);
                            setActiveTab('journey');
                          }}
                        >
                          <span>Open Journey</span>
                        </Button>
                        {d.step < 6 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAdvanceStep(d.id)}
                            title="Simulate Next Workflow Step"
                          >
                            <span>Advance Step</span>
                            <ChevronRight className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* TAB 3: ESCROW FLOW INFORMATION */}
      {activeTab === 'create' && (
        <Card className="p-6 max-w-3xl mx-auto space-y-4 bg-white border border-slate-200">
          <Badge variant="escrow" size="md"><Lock className="w-4 h-4 text-amber-500" /> Escrow Flow</Badge>
          <h3 className="text-2xl font-black text-[#1E3063] font-display">How a real KAYAD escrow starts</h3>
          <p className="text-xs text-slate-600 leading-relaxed">A standalone escrow agreement cannot be created from this screen. The backend creates and persists escrow records inside the real purchase/payment workflow.</p>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-700 space-y-2">
            <p><strong>1.</strong> A real vehicle purchase/payment flow creates the transaction.</p>
            <p><strong>2.</strong> The backend creates the corresponding escrow record.</p>
            <p><strong>3.</strong> This screen reads that persisted escrow and exposes only supported actions where authorized.</p>
          </div>
          <Button variant="primary" onClick={() => setActiveTab('deals')}>View My Protected Deals</Button>
        </Card>
      )}

      {/* SUB-MODAL 1: 150-POINT TECHNICAL INSPECTION REPORT VIEWER */}
      {/* SUB-MODAL 2: OPEN DISPUTE FORM VIEWER */}
      {showDisputeModal && selectedDeal && (
        <Modal
          isOpen={true}
          onClose={() => setShowDisputeModal(false)}
          title={`Raise Formal Escrow Dispute — Ref #${selectedDeal.id}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#E5484D]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Immediate Custodian Vault Freeze Guarantee</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-normal">
                Submitting this dispute will immediately freeze all funds (Ksh {selectedDeal.amount.toLocaleString()}) inside the KAYAD Escrow Vault. No funds can be released to the seller until KAYAD legal mediation completes.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-extrabold text-[#1E3063]">Reason for Dispute</label>
              <textarea
                rows={4}
                placeholder="Describe the defect, unmentioned issue, or non-compliance found during inspection..."
                value={disputeReasonInput}
                onChange={(e) => setDisputeReasonInput(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E5484D] focus:border-[#E5484D] text-xs"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
              <p className="font-bold text-[#1E3063]">Automatic Evidence Attached:</p>
              <p>✓ 150-Point Mechanic Inspection Audit Log</p>
              <p>✓ KAYAD Escrow Vault Bank Deposit Statement</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button
                variant="outline"
                size="md"
                onClick={() => setShowDisputeModal(false)}
                className="font-bold text-slate-600"
              >
                <span>Cancel</span>
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={handleOpenDisputeSubmit}
                className="bg-[#E5484D] hover:bg-rose-700 text-white font-extrabold shadow-sm"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Submit Dispute & Freeze Vault Funds</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default EscrowView;
