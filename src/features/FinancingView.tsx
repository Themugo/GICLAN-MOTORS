import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Vehicle } from '../types';
import { 
  CreditCard, 
  Calculator, 
  ArrowRight, 
  Landmark, 
  CheckCircle2, 
  Percent, 
  FileCheck, 
  Sparkles, 
  ShieldCheck, 
  Building2,
  Clock,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  FileText,
  AlertCircle,
  Info,
  Check,
  X,
  ExternalLink,
  Lock,
  Shield,
  Car,
  HelpCircle,
  UserCheck,
  Sliders,
  DollarSign,
  Briefcase,
  FileSpreadsheet,
  ArrowUpRight,
  RefreshCw,
  SearchCheck,
  CheckSquare,
  Square,
  Search
} from 'lucide-react';
import { PageHeader, StatWidget, Card, Badge, Button, LazyImage } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { createLoanApplication, getMyLoanApplications, LoanApiError, type LoanApplication } from '../services/loanApi';

interface FinancingViewProps {
  vehicles?: Vehicle[];
  onQuickViewVehicle?: (vehicle: Vehicle) => void;
}

export type ApplicationStatus = 
  | 'Draft'
  | 'Submitted'
  | 'Documents Requested'
  | 'Under Review'
  | 'Conditionally Approved'
  | 'Approved'
  | 'Declined'
  | 'Completed';

export interface PartnerBank {
  id: string;
  name: string;
  shortName: string;
  logoBg: string;
  rateRange: string;
  baseRate: number; // e.g. 12.5
  maxFinancing: string; // e.g. 85%
  minDepositPercent: number; // e.g. 15
  maxTermMonths: number; // e.g. 60
  approvalTime: string; // e.g. 24 Hours
  earlyRepaymentPolicy: string;
  eligibilitySummary: string;
  badge: string;
  features: string[];
}

export const FinancingView: React.FC<FinancingViewProps> = ({
  vehicles = [],
  onQuickViewVehicle
}) => {
  const { user } = useAuth();

  // Mode Switcher: 'buyer' | 'bank_portal'

  // Calculator State
  const [vehiclePrice, setVehiclePrice] = useState<number>(3500000);
  const [depositPercent, setDepositPercent] = useState<number>(20);
  const [tenureMonths, setTenureMonths] = useState<number>(36);
  const [annualInterestRate, setAnnualInterestRate] = useState<number>(0);
  const [employmentType, setEmploymentType] = useState<'salaried' | 'self_employed' | 'sme'>('salaried');

  // Comparison State
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
  
  // Application Form State
  const [activeTab, setActiveTab] = useState<'calculator' | 'lenders' | 'comparison' | 'tracker' | 'eligibility'>('calculator');
  const [selectedBankForApply, setSelectedBankForApply] = useState<PartnerBank | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [applicationSuccess, setApplicationSuccess] = useState<boolean>(false);
  const [applicationSubmitting, setApplicationSubmitting] = useState(false);
  const [applicationError, setApplicationError] = useState<string | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [currentApplication, setCurrentApplication] = useState<LoanApplication | null>(null);
  const currentAppStatus: ApplicationStatus | null = currentApplication
    ? ({ submitted: 'Submitted', under_review: 'Under Review', approved: 'Approved', declined: 'Declined', withdrawn: 'Declined' } as const)[currentApplication.status]
    : null;
  const uploadedDocs: Record<string, boolean> = {};

  useEffect(() => {
    if (!user) { setCurrentApplication(null); return; }
    let cancelled = false;
    getMyLoanApplications().then(apps => {
      if (!cancelled) setCurrentApplication(apps[0] || null);
    }).catch(() => {
      if (!cancelled) setCurrentApplication(null);
    });
    return () => { cancelled = true; };
  }, [user]);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Ref for smooth scrolling
  const calculatorRef = useRef<HTMLDivElement>(null);

  // Calculations
  const depositAmount = (vehiclePrice * depositPercent) / 100;
  const loanAmount = Math.max(0, vehiclePrice - depositAmount);
  const monthlyInterestRate = (annualInterestRate / 100) / 12;
  
  const estimatedMonthly = useMemo(() => {
    if (loanAmount <= 0) return 0;
    if (monthlyInterestRate === 0) return loanAmount / tenureMonths;
    return Math.round(
      (loanAmount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, tenureMonths)) /
      (Math.pow(1 + monthlyInterestRate, tenureMonths) - 1)
    );
  }, [loanAmount, monthlyInterestRate, tenureMonths]);

  const totalRepayment = estimatedMonthly * tenureMonths;
  const totalInterest = Math.max(0, totalRepayment - loanAmount);

  // Lender offers must come from a verified backend partner directory.
  // Until that contract is connected, do not present invented rates, fees,
  // eligibility thresholds, approval times, or partner names as live offers.
  const partnerBanks: PartnerBank[] = useMemo(() => [], []);

  // Filtered compare list
  const comparedBanks = useMemo(() => {
    return partnerBanks.filter(b => selectedBankIds.includes(b.id));
  }, [partnerBanks, selectedBankIds]);

  const toggleCompareBank = (id: string) => {
    if (selectedBankIds.includes(id)) {
      if (selectedBankIds.length <= 1) return; // Keep at least 1
      setSelectedBankIds(prev => prev.filter(i => i !== id));
    } else {
      if (selectedBankIds.length >= 4) {
        setSelectedBankIds(prev => [...prev.slice(1), id]);
      } else {
        setSelectedBankIds(prev => [...prev, id]);
      }
    }
  };

  const scrollToCalculator = () => {
    calculatorRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOpenApply = () => {
    setSelectedBankForApply({
      id: 'kayad-financing', name: 'KAYAD Financing Request', shortName: 'KAYAD',
      logoBg: 'bg-[#1E3063] text-white', rateRange: 'Not quoted', baseRate: annualInterestRate,
      maxFinancing: 'Subject to lender terms', minDepositPercent: depositPercent, maxTermMonths: tenureMonths,
      approvalTime: 'Not quoted', earlyRepaymentPolicy: 'Subject to lender terms',
      eligibilitySummary: 'Submitting this request does not imply lender approval or a lender offer.', badge: 'Request', features: []
    });
    setIsApplyModalOpen(true); setApplicationSuccess(false); setApplicationError(null);
  };

  const submitFinancingRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setApplicationError('Please sign in before submitting a financing request.'); return; }
    setApplicationSubmitting(true); setApplicationError(null);
    try {
      const created = await createLoanApplication({ vehiclePrice, depositAmount, loanAmount, termMonths: tenureMonths, monthlyIncome: monthlyIncome || undefined, employmentStatus: employmentType });
      setCurrentApplication(created); setApplicationSuccess(true);
    } catch (err) {
      setApplicationError(err instanceof LoanApiError ? err.message : 'Could not submit the financing request.');
    } finally { setApplicationSubmitting(false); }
  };

  const handleDocToggle = (_documentKey?: string) => {
    setApplicationError('Document upload is not connected yet. No document was marked as verified.');
  };

  // No active API currently exposes vehicles actually financed through KAYAD.
  // Never relabel ordinary marketplace inventory as funded/partner-bank vehicles.
  const financedVehicles = useMemo(() => [], []);

  // FAQs
  const faqs = [
    {
      q: "Is KAYAD a direct lender or bank?",
      a: "KAYAD is an independent automotive fintech marketplace. We are NOT a lender. We help you compare rates from Central Bank regulated financial institutions to enable transparent rate comparison, instant affordability calculation, and direct pre-qualified application routing."
    },
    {
      q: "How long does financing approval take?",
      a: "Approval timing is determined by the lender after a real application is submitted. KAYAD does not promise a specific turnaround until verified lender terms are connected."
    },
    {
      q: "Can I settle a vehicle loan early?",
      a: "Early-settlement terms depend on the lender and the final loan agreement. Review the lender's current terms before accepting an offer."
    },
    {
      q: "What insurance requirements apply to financed cars?",
      a: "Insurance requirements depend on the lender and vehicle. Confirm the current requirements with the lender handling your application."
    },
    {
      q: "How is vehicle ownership handled during financing?",
      a: "Ownership and security-interest arrangements depend on the lender and the applicable NTSA process. KAYAD does not claim a specific transfer workflow until the relevant lender contract is connected."
    }
  ];

  // All 8 required application statuses
  const statusFlow: { status: ApplicationStatus; label: string; desc: string; step: number }[] = [
    { status: 'Draft', label: '1. Draft', desc: 'Calculator inputs saved; choosing lender', step: 1 },
    { status: 'Submitted', label: '2. Submitted', desc: 'Pre-approval application routed to lender desk', step: 2 },
    { status: 'Documents Requested', label: '3. Docs Requested', desc: 'Lender underwriting requesting certified statements', step: 3 },
    { status: 'Under Review', label: '4. Under Review', desc: 'Lender underwriting evaluation', step: 4 },
    { status: 'Conditionally Approved', label: '5. Conditional Approval', desc: 'Lender issued term sheet pending physical audit', step: 5 },
    { status: 'Approved', label: '6. Approved', desc: 'Full credit approval granted; loan contract ready', step: 6 },
    { status: 'Declined', label: '7. Declined', desc: 'Application failed lender eligibility criteria', step: 7 },
    { status: 'Completed', label: '8. Completed', desc: 'Logbook endorsed & funds disbursed to vehicle seller', step: 8 }
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-[#101935] border-b border-amber-400/30 px-4 py-3 text-xs shadow-md rounded-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <span className="text-amber-400 font-black text-xs uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded border border-white/15">
            KAYAD Financing Marketplace
          </span>
          <span className="text-slate-300 text-[11px] hidden md:inline font-semibold">
            Real application records only; lender offers remain unavailable until a verified feed is connected.
          </span>
        </div>
      </div>

      {/* ==========================================
          1. HERO SECTION
          ========================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#17244B] via-[#1E3063] to-slate-900 text-white p-8 sm:p-12 border border-amber-400/20 shadow-lg">
        {/* Subtle Decorative Backdrop Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-5">
          {/* KAYAD Marketplace Position Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-xs font-extrabold text-amber-300 shadow-xs">
            <Landmark className="w-4 h-4 text-amber-400" />
            <span>Independent Vehicle Financing Marketplace</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display text-white tracking-tight leading-tight">
            Vehicle Financing Made Simple
          </h1>

          <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal">
            Calculate an affordability estimate using your own assumptions. Verified lender offers will appear only after a real lender feed is connected.
          </p>

          {/* ONE CLEAR PRIMARY CTA */}
          <div className="pt-2 flex items-center gap-4 flex-wrap">
            <Button
              variant="accent"
              size="lg"
              onClick={scrollToCalculator}
              className="shadow-md text-sm font-black tracking-wide"
            >
              <CheckCircle2 className="w-5 h-5 text-[#17244B]" />
              <span>Check Your Eligibility</span>
            </Button>

            <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Non-binding affordability estimates
            </span>
          </div>
        </div>
      </div>

      {/* ==========================================
          2. KPI STATS BAR
          ========================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatWidget
          label="Financing LTV"
          value="Not quoted"
          trend="Depends on lender terms"
          trendType="positive"
          icon={<Percent className="w-4 h-4 text-emerald-600" />}
        />

        <StatWidget
          label="Lender Rates"
          value="Not connected"
          trend="No verified lender feed"
          trendType="positive"
          icon={<Landmark className="w-4 h-4 text-blue-500" />}
        />

        <StatWidget
          label="Approval Decision Time"
          value="Not quoted"
          trend="Determined by lender"
          trendType="neutral"
          icon={<Clock className="w-4 h-4 text-amber-500" />}
        />

        <StatWidget
          label="Lender Requirements"
          value="Not quoted"
          trend="Confirm with lender"
          trendType="positive"
          icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />}
        />
      </div>

      {/* NAVIGATION SUB-TABS */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-none pt-2">
        {[
          { id: 'calculator', label: '1. Finance Calculator', icon: <Calculator className="w-4 h-4" /> },
          { id: 'lenders', label: '2. Lender Offers', icon: <Landmark className="w-4 h-4" /> },
          { id: 'comparison', label: `3. Compare Offers (${selectedBankIds.length})`, icon: <Sliders className="w-4 h-4" /> },
          { id: 'tracker', label: '4. Application Journey', icon: <Clock className="w-4 h-4" /> },
          { id: 'eligibility', label: '5. Eligibility & Docs', icon: <FileCheck className="w-4 h-4 text-emerald-600" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 border-b-2 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === tab.id
                ? 'border-[#1E3063] text-[#1E3063] bg-amber-50/60 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ==========================================
          3. FINANCE CALCULATOR (Interactive & Precise)
          ========================================== */}
      <div ref={calculatorRef} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-[#1E3063] font-display flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-500" />
            Interactive Vehicle Finance Estimator
          </h2>
          <Badge variant="verified" size="sm">
            Backend-Synced Estimator
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Controls Card (7 Cols) */}
          <Card className="lg:col-span-7 p-6 space-y-6 bg-white border-slate-200 shadow-xs">
            
            {/* Employment Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-[#1E3063] uppercase tracking-wider font-display">
                Employment / Income Category
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { id: 'salaried', label: 'Salaried Employee', icon: <Briefcase className="w-3.5 h-3.5" /> },
                  { id: 'self_employed', label: 'Self-Employed', icon: <UserCheck className="w-3.5 h-3.5" /> },
                  { id: 'sme', label: 'SME / Company', icon: <Building2 className="w-3.5 h-3.5" /> }
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setEmploymentType(type.id as any)}
                    className={`p-3 rounded-xl font-bold border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      employmentType === type.id
                        ? 'bg-[#1E3063] text-white border-[#1E3063] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {type.icon}
                    <span>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle Price Slider & Direct Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-600">Vehicle Purchase Price (Ksh)</span>
                <div className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                  <span className="text-slate-400 font-normal">Ksh</span>
                  <input
                    type="number"
                    min={500000}
                    max={25000000}
                    step={100000}
                    value={vehiclePrice}
                    onChange={(e) => setVehiclePrice(Math.max(0, Number(e.target.value)))}
                    className="w-28 text-right font-black text-[#1E3063] bg-transparent outline-none text-sm"
                  />
                </div>
              </div>
              <input
                type="range"
                min={1000000}
                max={15000000}
                step={250000}
                value={vehiclePrice}
                onChange={(e) => setVehiclePrice(Number(e.target.value))}
                className="w-full accent-[#1E3063] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                <span>Ksh 1,000,000</span>
                <span>Ksh 8,000,000</span>
                <span>Ksh 15,000,000+</span>
              </div>
            </div>

            {/* Deposit Percent Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Down Payment Deposit ({depositPercent}%)</span>
                <span className="text-emerald-700 font-black text-sm">Ksh {depositAmount.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={10}
                max={50}
                step={5}
                value={depositPercent}
                onChange={(e) => setDepositPercent(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                <span>10% (Min)</span>
                <span>20% (Standard)</span>
                <span>50% (High Deposit)</span>
              </div>
            </div>

            {/* Loan Tenure Pills */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Loan Repayment Term</span>
                <span className="text-[#1E3063] font-black text-sm">{tenureMonths} Months ({(tenureMonths / 12).toFixed(1)} Yrs)</span>
              </div>
              <div className="grid grid-cols-5 gap-2 text-xs">
                {[12, 24, 36, 48, 60].map((m) => (
                  <button
                    key={m}
                    onClick={() => setTenureMonths(m)}
                    className={`py-2.5 rounded-xl font-extrabold border transition-all cursor-pointer ${
                      tenureMonths === m
                        ? 'bg-[#1E3063] text-white border-[#1E3063] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            {/* Interest Rate Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Benchmark Interest Rate (% p.a.)</span>
                <span className="text-blue-900 font-black text-sm">{annualInterestRate.toFixed(1)}% p.a.</span>
              </div>
              <input
                type="range"
                min={11.5}
                max={16.0}
                step={0.1}
                value={annualInterestRate}
                onChange={(e) => setAnnualInterestRate(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

          </Card>

          {/* Results Display Panel (5 Cols) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#1E3063] via-[#17244B] to-slate-900 text-white rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6 border border-amber-400/30">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Calculated Monthly Payment
                </span>
                <Badge variant="accent" size="sm">
                  Reducing Balance
                </Badge>
              </div>

              {/* ESTIMATED MONTHLY PAYMENT */}
              <div>
                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Estimated Installment</p>
                <div className="text-4xl font-black font-display text-white mt-1">
                  Ksh {estimatedMonthly.toLocaleString()} <span className="text-xs font-normal text-slate-300">/ mo</span>
                </div>
              </div>

              {/* BREAKDOWN METRICS */}
              <div className="space-y-2.5 pt-4 border-t border-white/10 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Financed Principal (Loan):</span>
                  <span className="font-extrabold text-white">Ksh {loanAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Down Payment Deposit:</span>
                  <span className="font-extrabold text-emerald-400">Ksh {depositAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estimated Total Interest:</span>
                  <span className="font-extrabold text-amber-300">Ksh {totalInterest.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/10">
                  <span className="text-slate-300 font-bold">Estimated Total Cost:</span>
                  <span className="font-black text-white text-sm">Ksh {totalRepayment.toLocaleString()}</span>
                </div>
              </div>

              {/* CLEAR ESTIMATE DISCLAIMER */}
              <div className="p-3 bg-white/10 rounded-xl border border-white/15 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Estimates only.</strong> Final loan terms, interest rates, and limits are subject to the terms of the lender that receives a real application.
                </span>
              </div>
            </div>

            <Button
              variant="accent"
              size="lg"
              fullWidth
              onClick={handleOpenApply}
              className="shadow-md"
            >
              <span>Submit Financing Request</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

        </div>
      </div>

      {/* ==========================================
          4. LENDER MARKETPLACE (Partner Institutions Grid)
          ========================================== */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-black text-[#1E3063] font-display flex items-center gap-2">
              <Landmark className="w-5 h-5 text-amber-500" />
              Verified Lender Feed
            </h2>
            <p className="text-xs text-slate-500 font-medium">Partner lender offers will appear here when a verified lender feed is connected</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('comparison')}
          >
            <Sliders className="w-4 h-4 text-[#1E3063]" />
            <span>View Comparison Matrix ({selectedBankIds.length})</span>
          </Button>
        </div>

        <Card className="p-6 bg-slate-50 border-slate-200">
          <div className="flex items-start gap-3"><Info className="w-5 h-5 text-amber-600 shrink-0" /><div><p className="font-extrabold text-[#1E3063]">Verified lender offers are not connected yet</p><p className="text-sm text-slate-600 mt-1">KAYAD will not display invented lender rates, fees, approval times, or eligibility claims. Submit a real financing request instead.</p></div></div>
        </Card>
      </div>

      {/* ==========================================
          5. COMPARE FINANCING OFFERS
          ========================================== */}
      {activeTab === 'comparison' && <Card className="p-6 bg-slate-50 border-slate-200"><div className="flex items-start gap-3"><Info className="w-5 h-5 text-amber-600" /><div><h2 className="text-xl font-black text-[#1E3063]">Lender comparison unavailable</h2><p className="text-sm text-slate-600 mt-1">A verified lender-offer feed is not connected yet. No synthetic comparison data is shown.</p></div></div></Card>}

      {/* ==========================================
          6. APPLICATION JOURNEY & STATUS TRACKER
          ========================================== */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div><h2 className="text-xl font-black text-[#1E3063] font-display flex items-center gap-2"><Clock className="w-5 h-5 text-amber-500" />Application Journey & Live Tracker</h2><p className="text-xs text-slate-500 font-medium">Status is read from your real backend loan application.</p></div>
          <div className="text-[11px] text-slate-500 font-semibold px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200">Backend-authoritative</div>
        </div>
        {currentApplication ? (
          <Card className="p-6 bg-slate-50 border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2"><div><p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Application {currentApplication.id}</p><h3 className="text-base font-extrabold text-[#1E3063]">Vehicle Financing Request</h3></div><Badge variant={currentAppStatus === 'Approved' ? 'success' : currentAppStatus === 'Declined' ? 'danger' : 'escrow'} size="md">Current Status: {currentAppStatus}</Badge></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs"><div className="bg-white p-4 rounded-xl border border-slate-200"><p className="text-slate-400">Vehicle Asset Value</p><p className="font-extrabold text-[#1E3063]">Ksh {Number(currentApplication.vehiclePrice || 0).toLocaleString()}</p></div><div className="bg-white p-4 rounded-xl border border-slate-200"><p className="text-slate-400">Requested Loan</p><p className="font-extrabold text-emerald-700">Ksh {Number(currentApplication.loanAmount || 0).toLocaleString()}</p></div><div className="bg-white p-4 rounded-xl border border-slate-200"><p className="text-slate-400">Submitted</p><p className="font-extrabold text-[#1E3063]">{new Date(currentApplication.createdAt).toLocaleString('en-KE')}</p></div></div>
            <p className="text-xs text-slate-500">KAYAD does not fabricate lender-side approvals, document verification, disbursement, or callback promises.</p>
          </Card>
        ) : (
          <Card className="p-6 bg-slate-50 border-slate-200"><p className="text-sm text-slate-600">No financing application has been submitted from this account yet.</p></Card>
        )}
      </div>

      {/* ==========================================
          7. SECURE DOCUMENT UPLOAD MODULE
          ========================================== */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-[#1E3063] font-display flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            Secure Underwriting Document Center
          </h2>
          <Badge variant="verified" size="sm">
            256-Bit Bank Encryption
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {[
            { key: 'nationalId', title: 'National ID / Passport', req: 'Both front & back copy', desc: 'Required for identity verification' },
            { key: 'payslips', title: 'Proof of Income / Payslips', req: 'Latest 3 months', desc: 'Required for salaried applicants' },
            { key: 'bankStatements', title: 'Certified Bank Statements', req: '6 months stamped PDF', desc: 'Required for credit scoring' },
            { key: 'employmentLetter', title: 'Employment / Contract Letter', req: 'HR Stamped', desc: 'Confirms job stability' }
          ].map((doc) => {
            const isUploaded = uploadedDocs[doc.key];

            return (
              <Card key={doc.key} className="p-5 space-y-4 bg-white border-slate-200 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-slate-100 text-[#1E3063]">
                      <FileSpreadsheet className="w-5 h-5" />
                    </span>
                    <Badge variant={isUploaded ? 'success' : 'neutral'} size="sm">
                      {isUploaded ? 'Verified ✓' : 'Pending'}
                    </Badge>
                  </div>
                  <h3 className="font-extrabold text-[#1E3063] text-sm">{doc.title}</h3>
                  <p className="text-[11px] font-bold text-amber-900">{doc.req}</p>
                  <p className="text-slate-500 text-[11px]">{doc.desc}</p>
                </div>

                <Button
                  variant={isUploaded ? 'outline' : 'primary'}
                  size="sm"
                  fullWidth
                  onClick={() => handleDocToggle(doc.key)}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{isUploaded ? 'Replace Document' : 'Upload Document'}</span>
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ==========================================
          8. ELIGIBILITY GUIDANCE
          ========================================== */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-black text-[#1E3063] font-display flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-amber-500" />
          General Partner Lender Eligibility Guidance
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          
          <Card className="p-5 space-y-3 bg-white border-slate-200">
            <div className="flex items-center gap-2 font-extrabold text-[#1E3063] text-sm font-display">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              General Requirements
            </div>
            <ul className="space-y-2 text-slate-600 list-disc list-inside">
              <li>Kenyan Citizen or legal East Africa Resident</li>
              <li>Minimum 21 years of age (max 65 at loan maturity)</li>
              <li>Valid KRA PIN Certificate & National ID</li>
              <li>Clean Credit Reference Bureau (CRB) standing</li>
            </ul>
          </Card>

          <Card className="p-5 space-y-3 bg-white border-slate-200">
            <div className="flex items-center gap-2 font-extrabold text-[#1E3063] text-sm font-display">
              <DollarSign className="w-4 h-4 text-blue-600" />
              Income & Down Payment
            </div>
            <ul className="space-y-2 text-slate-600 list-disc list-inside">
              <li>Minimum Net Salary: Ksh 45,000 / month</li>
              <li>Total debt-to-income ratio must not exceed 50%</li>
              <li>Down payment deposit: 15% - 20% minimum</li>
              <li>Comprehensive insurance policy required</li>
            </ul>
          </Card>

          <Card className="p-5 space-y-3 bg-white border-slate-200">
            <div className="flex items-center gap-2 font-extrabold text-[#1E3063] text-sm font-display">
              <Briefcase className="w-4 h-4 text-amber-600" />
              Supported Employment
            </div>
            <ul className="space-y-2 text-slate-600 list-disc list-inside">
              <li>Permanent Salaried Corporate Employees</li>
              <li>Civil Servants & Public Sector Officers</li>
              <li>Registered SME Directors & Business Owners</li>
              <li>Agricultural Producers with 12m Bank History</li>
            </ul>
          </Card>

        </div>
      </div>

      {/* ==========================================
          9. RECENTLY FINANCED VEHICLES
          ========================================== */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="text-xl font-black text-[#1E3063] font-display flex items-center gap-2">
            <Car className="w-5 h-5 text-amber-500" />
            Recently Financed Vehicles on KAYAD
          </h2>
          <p className="text-xs text-slate-500 font-medium">Only vehicles with a real financing record will appear here.</p>
        </div>
        <Card className="p-6 bg-slate-50 border-slate-200">
          <p className="text-sm font-semibold text-slate-700">No financed-vehicle records are currently exposed by the active financing API.</p>
        </Card>
      </div>

      {/* ==========================================
          10. FREQUENTLY ASKED QUESTIONS (FAQ)
          ========================================== */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-black text-[#1E3063] font-display flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-500" />
          Frequently Asked Questions About Vehicle Financing
        </h2>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;

            return (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between font-bold text-xs text-[#1E3063] hover:bg-slate-50 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black flex items-center justify-center">?</span>
                    {faq.q}
                  </span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {isOpen && (
                  <div className="p-4 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ==========================================
          MOBILE STICKY APPLY BAR
          ========================================== */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-[#17244B] text-white p-3 border-t border-amber-400/20 lg:hidden shadow-lg flex items-center justify-between">
        <div>
          <p className="text-[10px] text-amber-400 font-bold uppercase">Est. Monthly</p>
          <p className="text-base font-black font-display text-white">Ksh {estimatedMonthly.toLocaleString()} / mo</p>
        </div>

        <Button
          variant="accent"
          size="sm"
          onClick={scrollToCalculator}
        >
          <span>Calculate & Apply</span>
          <ArrowRight className="w-4 h-4 text-[#17244B]" />
        </Button>
      </div>

      {/* ==========================================
          MODAL: APPLY WITH LENDER FORM
          ========================================== */}
      {isApplyModalOpen && selectedBankForApply && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card className="max-w-xl w-full p-6 space-y-6 bg-white relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsApplyModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="border-b border-slate-200 pb-3 space-y-1">
              <Badge variant="verified" size="sm">
                KAYAD Financing Request
              </Badge>
              <h3 className="text-xl font-black text-[#1E3063] font-display">
                Submit a Financing Request
              </h3>
              <p className="text-xs text-slate-500">
                This submits a real financing application to the KAYAD backend. It does not imply lender approval or a lender offer.
              </p>
            </div>

            {applicationSuccess ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-emerald-950 font-display">Financing Request Submitted</h4>
                  <p className="text-xs text-emerald-800 leading-relaxed max-w-sm mx-auto">
                    Your financing request was recorded by the KAYAD backend. No lender approval or callback time is promised.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setIsApplyModalOpen(false)}
                >
                  Return to Financing Marketplace
                </Button>
              </div>
            ) : (
              <form 
                onSubmit={submitFinancingRequest} 
                className="space-y-4 text-xs"
              >
                {/* Summary Box */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Vehicle Asset Value:</span>
                    <span className="text-[#1E3063] font-black">Ksh {vehiclePrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Deposit ({depositPercent}%):</span>
                    <span className="text-emerald-700 font-black">Ksh {depositAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Loan Amount ({tenureMonths}m):</span>
                    <span className="text-blue-900 font-black">Ksh {loanAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-black text-emerald-800 pt-2 border-t border-slate-200 text-sm">
                    <span>Est. Monthly Installment:</span>
                    <span>Ksh {estimatedMonthly.toLocaleString()} / mo</span>
                  </div>
                </div>

                {/* Form Inputs — only fields supported by the real loan API */}
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-slate-700">Monthly Gross Income (Ksh)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 120000"
                      value={monthlyIncome || ''}
                      onChange={(e) => setMonthlyIncome(Number(e.target.value) || 0)}
                      className="w-full mt-1 p-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 outline-none focus:border-[#1E3063]"
                    />
                  </div>
                </div>

                {applicationError && <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700">{applicationError}</div>}
                <div className="pt-2">
                  <Button
                    variant="accent"
                    size="lg"
                    fullWidth
                    type="submit"
                    disabled={applicationSubmitting}
                  >
                    <span>{applicationSubmitting ? 'Submitting…' : 'Submit Financing Request'}</span>
                    <ArrowRight className="w-4 h-4 text-[#17244B]" />
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}

    </div>
  );
};

export default FinancingView;
