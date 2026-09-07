import { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  Clock, 
  ChevronDown,
  ChevronUp,
  Zap,
  HelpCircle,
  User,
  Car,
  Building2,
  Shield,
  X,
  FileCheck2,
  Scale,
  ArrowRight
} from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Button } from '../ui/Button';
import type { FC } from 'react';

export const EscrowPage: FC = () => {
  const { escrowContracts, updateEscrowStep, navigateTo } = useMarketplace();

  // Active contract selection or default contract
  const [selectedContractId, setSelectedContractId] = useState(escrowContracts[0]?.id || 'escrow_KYD_99812');
  const activeContract = escrowContracts.find(c => c.id === selectedContractId) || escrowContracts[0];

  // Confirmation modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isConfirmedSuccess, setIsConfirmedSuccess] = useState(false);

  // FAQ Accordion Toggle State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  // Helper to accurately derive contract progress state
  const completedStepsCount = activeContract?.milestones.filter(m => m.status === 'completed').length || 0;
  const isFullyCompleted = activeContract?.status === 'completed' || completedStepsCount === 6;
  const currentStepNumber = isFullyCompleted
    ? 6
    : (activeContract?.milestones.find(m => m.status === 'current')?.step || completedStepsCount + 1);

  const formatContractAmount = (agreedPrice: number) => {
    // Standardize representation to Kenya Shillings (KES)
    const amountInKes = agreedPrice < 1000000 ? agreedPrice * 100 : agreedPrice;
    return `KES ${amountInKes.toLocaleString()}`;
  };

  const handleConfirmReceipt = () => {
    if (activeContract) {
      updateEscrowStep(activeContract.id, 6); // Advance to final step 6 (Funds Disbursed)
      setIsConfirmedSuccess(true);
      setTimeout(() => {
        setIsConfirmModalOpen(false);
        setIsConfirmedSuccess(false);
      }, 2200);
    }
  };

  const faqs = [
    {
      q: 'How long are funds held in the KAYAD Escrow Vault?',
      a: 'Funds remain securely locked in the Escrow Vault until the buyer inspects the vehicle and confirms receipt, or until the mandatory 48-hour inspection window elapses without dispute. Standard fund release takes less than 15 minutes after digital confirmation.'
    },
    {
      q: 'What happens if a dispute occurs during inspection?',
      a: 'If a buyer flags a discrepancy during the 48-hour inspection window, funds remain strictly frozen in escrow. KAYAD’s independent dispute arbitration team reviews physical inspection logs, VIN audit reports, and contract terms to resolve the matter within 48 business hours.'
    },
    {
      q: 'Are there any fees for using the Escrow Vault?',
      a: 'KAYAD Escrow Vault is 100% free for buyers. Verified sellers pay a standard 1% transaction facilitation fee (capped at KES 50,000) upon successful fund disbursal.'
    },
    {
      q: 'Which payment channels are supported for escrow deposits?',
      a: 'We accept M-Pesa Express, RTGS bank transfers, EFTs, and SWIFT international wire transfers directly into our CBK-regulated client trust account.'
    },
    {
      q: 'Is my capital protected against platform insolvency?',
      a: 'Yes. All escrow capital is held in ring-fenced, segregated client trust accounts governed by Kenyan trust law and Central Bank of Kenya guidelines, completely isolated from KAYAD operating assets.'
    }
  ];

  return (
    <div className="pt-3 sm:pt-5 pb-10 sm:pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-5 sm:space-y-6 bg-[#FCF9F4] text-[#2E4080] font-sans">
      {/* 1. Top Hero Section */}
      <div className="p-5 sm:p-6 lg:p-7 rounded-2xl bg-[#2E4080] text-white border border-white/10 shadow-lg relative overflow-hidden space-y-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#23EBFF]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#23EBFF]/20 text-[#23EBFF] text-xs font-extrabold uppercase tracking-wider border border-[#23EBFF]/30">
            <ShieldCheck className="w-4 h-4 text-[#23EBFF]" />
            <span>CBK Regulated Escrow Framework</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black font-serif tracking-tight text-white">
            KAYAD Escrow Vault
          </h1>

          <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed max-w-2xl">
            Your transaction capital remains strictly protected in a segregated, licensed escrow account. Funds are released to the seller only after physical vehicle inspection, VIN verification, and digital handover sign-off.
          </p>
        </div>

        {/* Hero Stats Row */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-2xl sm:text-3xl font-black text-[#23EBFF] font-mono block">
              KES 2.4B+
            </span>
            <span className="text-[11px] text-slate-300 font-bold uppercase tracking-wider mt-0.5 block">
              Total Protected Capital
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono block">
              4,800+
            </span>
            <span className="text-[11px] text-slate-300 font-bold uppercase tracking-wider mt-0.5 block">
              Verified Transactions
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-2xl sm:text-3xl font-black text-[#3ddb72] font-mono block">
              99.8%
            </span>
            <span className="text-[11px] text-slate-300 font-bold uppercase tracking-wider mt-0.5 block">
              Dispute Settlement Rate
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-2xl sm:text-3xl font-black text-[#23EBFF] font-mono block">
              18 Hrs
            </span>
            <span className="text-[11px] text-slate-300 font-bold uppercase tracking-wider mt-0.5 block">
              Avg. Disbursal Speed
            </span>
          </div>
        </div>
      </div>

      {/* 2. Step-by-Step "How Escrow Vault Works" */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E2D8C7] shadow-sm space-y-6">
        <div className="space-y-1 pb-4 border-b border-[#E8E1D5]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2E4080]/10 text-[#2E4080] text-xs font-bold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-[#23EBFF]" />
            <span>Step-by-Step Governance</span>
          </div>
          <h2 className="text-2xl font-black text-[#2E4080] font-serif tracking-tight">
            How Escrow Vault Protects Your Purchase
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Step 1 */}
          <div className="p-5 rounded-2xl bg-[#F6F1E8]/70 border border-[#E2D8C7] space-y-3 relative flex flex-col justify-between hover:border-[#23EBFF]/50 transition-colors">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-xl bg-[#2E4080] text-[#23EBFF] font-black font-mono text-sm flex items-center justify-center">
                01
              </div>
              <h3 className="text-base font-extrabold text-[#2E4080] font-serif">
                Buyer Deposits Capital
              </h3>
              <p className="text-xs text-[#3D4F6F] leading-relaxed font-medium">
                Buyer deposits transaction capital into KAYAD Escrow Vault — a ring-fenced, segregated client account managed under CBK trust regulations.
              </p>
            </div>
            <div className="pt-2 flex items-center gap-1.5 text-[11px] font-bold text-[#23EBFF]">
              <Lock className="w-3.5 h-3.5" />
              <span>M-Pesa / RTGS Bank Transfer</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-2xl bg-[#F6F1E8]/70 border border-[#E2D8C7] space-y-3 relative flex flex-col justify-between hover:border-[#23EBFF]/50 transition-colors">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-xl bg-[#2E4080] text-[#23EBFF] font-black font-mono text-sm flex items-center justify-center">
                02
              </div>
              <h3 className="text-base font-extrabold text-[#2E4080] font-serif">
                Vehicle Handover & Inspection
              </h3>
              <p className="text-xs text-[#3D4F6F] leading-relaxed font-medium">
                Seller dispatches vehicle to buyer’s vault or delivery point. Independent physical inspection and VIN verification are completed.
              </p>
            </div>
            <div className="pt-2 flex items-center gap-1.5 text-[11px] font-bold text-[#23EBFF]">
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Inspection & VIN Clear</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-2xl bg-[#F6F1E8]/70 border border-[#E2D8C7] space-y-3 relative flex flex-col justify-between hover:border-[#23EBFF]/50 transition-colors">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-xl bg-[#2E4080] text-[#23EBFF] font-black font-mono text-sm flex items-center justify-center">
                03
              </div>
              <h3 className="text-base font-extrabold text-[#2E4080] font-serif">
                Buyer Authorizes Handover
              </h3>
              <p className="text-xs text-[#3D4F6F] leading-relaxed font-medium">
                Buyer conducts physical inspection during the 48-hour inspection window and approves handover via one-click digital authorization.
              </p>
            </div>
            <div className="pt-2 flex items-center gap-1.5 text-[11px] font-bold text-[#23EBFF]">
              <Clock className="w-3.5 h-3.5" />
              <span>48-Hour Inspection Window</span>
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-5 rounded-2xl bg-[#F6F1E8]/70 border border-[#E2D8C7] space-y-3 relative flex flex-col justify-between hover:border-[#3ddb72]/50 transition-colors">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-xl bg-[#2E4080] text-[#3ddb72] font-black font-mono text-sm flex items-center justify-center">
                04
              </div>
              <h3 className="text-base font-extrabold text-[#2E4080] font-serif">
                Instant Fund Disbursal
              </h3>
              <p className="text-xs text-[#3D4F6F] leading-relaxed font-medium">
                Escrow Vault automatically disburses net purchase funds directly to seller’s verified corporate account within minutes of signoff.
              </p>
            </div>
            <div className="pt-2 flex items-center gap-1.5 text-[11px] font-bold text-[#3ddb72]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Instant Bank Disbursal</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bank-Grade Security Section */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#2E4080] text-white border border-white/10 shadow-lg space-y-6">
        <div className="space-y-2 border-b border-white/10 pb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#23EBFF]/20 text-[#23EBFF] text-xs font-bold uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5 text-[#23EBFF]" />
            <span>CBK Regulated Framework</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-serif text-white">
            Bank-Grade Capital Protection
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed max-w-3xl">
            KAYAD Escrow Vault operates under Central Bank of Kenya trust frameworks. All buyer capital is deposited in ring-fenced client trust accounts, completely insulated from operational liabilities.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
            <Shield className="w-5 h-5 text-[#23EBFF] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-extrabold text-white">256-bit SSL & TLS Encryption</h4>
              <p className="text-[11px] text-slate-300 mt-0.5">End-to-end cryptographic security</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
            <Building2 className="w-5 h-5 text-[#23EBFF] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-extrabold text-white">CBK-Regulated Custodian</h4>
              <p className="text-[11px] text-slate-300 mt-0.5">Segregated client trust accounts</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
            <Lock className="w-5 h-5 text-[#23EBFF] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-extrabold text-white">Multi-Factor Authorization</h4>
              <p className="text-[11px] text-slate-300 mt-0.5">Dual-approval protocol for payouts</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
            <Scale className="w-5 h-5 text-[#3ddb72] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-extrabold text-white">Institutional Dispute Team</h4>
              <p className="text-[11px] text-slate-300 mt-0.5">Legal audit trails & inspection review</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. KAYAD Escrow Vault - Active Transaction Card Widget */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E2D8C7] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E1D5]">
          <div>
            <span className="text-[10px] font-black uppercase text-[#23EBFF] tracking-widest block">
              LIVE ESCROW CONTROLLER
            </span>
            <h2 className="text-2xl font-black text-[#2E4080] font-serif tracking-tight">
              Active Escrow Transaction
            </h2>
            <p className="text-xs text-[#6B7A99] font-medium">
              Real-time institutional oversight of active vehicle escrow agreements. Track milestone progress or authorize fund disbursal.
            </p>
          </div>

          {/* Selector for active contracts if multiple exist */}
          {escrowContracts.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#6B7A99]">Select Transaction:</span>
              <select
                value={selectedContractId}
                onChange={e => setSelectedContractId(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-[#E2D8C7] bg-[#F6F1E8] text-xs font-bold text-[#2E4080] outline-none focus:border-[#23EBFF]"
              >
                {escrowContracts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.vehicleTitle} ({c.id})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Active Deal Card */}
        {activeContract ? (
          <div className="p-6 sm:p-8 rounded-3xl bg-[#141E3F] text-white border border-white/10 shadow-xl space-y-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full ${isFullyCompleted ? 'bg-[#3ddb72]/20 text-[#3ddb72] border-[#3ddb72]/40' : 'bg-[#23EBFF]/20 text-[#23EBFF] border-[#23EBFF]/40'} text-xs font-black uppercase tracking-wider border flex items-center gap-1.5`}>
                  <ShieldCheck className="w-4 h-4" />
                  {isFullyCompleted ? 'Funds Disbursed' : 'Escrow Secured'}
                </span>
                <span className="text-xs text-slate-300 font-mono">
                  CONTRACT: {activeContract.id}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-300 font-bold uppercase block">Escrow Protected Capital</span>
                <span className="text-2xl sm:text-3xl font-black text-[#23EBFF] font-mono">
                  {formatContractAmount(activeContract.agreedPrice)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <span className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                  Target Vehicle
                </span>
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-[#23EBFF]" />
                  <span className="text-sm font-extrabold text-white font-serif truncate">
                    {activeContract.vehicleTitle}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                  Buyer Account
                </span>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#23EBFF]" />
                  <span className="text-sm font-bold text-white">
                    {activeContract.buyerName || 'Alex Mercer'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                  Seller Account
                </span>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#23EBFF]" />
                  <span className="text-sm font-bold text-white">
                    {activeContract.sellerName || 'Vanguard Euro Performance'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                  Current Status
                </span>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#23EBFF]" />
                  <span className={`text-sm font-bold ${isFullyCompleted ? 'text-[#3ddb72]' : 'text-amber-300'}`}>
                    {isFullyCompleted ? 'Completed & Funds Released' : 'In Transit — Awaiting Signoff'}
                  </span>
                </div>
              </div>
            </div>

            {/* Milestones Stepper Bar */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Milestone Governance Progress ({completedStepsCount} of 6 Completed)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {activeContract.milestones.map((m, idx) => {
                  const isCompleted = m.status === 'completed' || (isFullyCompleted && idx < 6);
                  const isCurrent = !isFullyCompleted && m.status === 'current';
                  return (
                    <div
                      key={m.step}
                      className={`p-2.5 rounded-xl border text-center space-y-1 transition-all ${
                        isCompleted
                          ? 'border-[#3ddb72]/50 bg-[#3ddb72]/15 text-white'
                          : isCurrent
                          ? 'border-[#23EBFF] bg-[#23EBFF]/20 text-white shadow-md'
                          : 'border-white/10 bg-white/5 text-slate-400'
                      }`}
                    >
                      <span className="text-[10px] font-mono font-bold block">STEP 0{m.step}</span>
                      <span className="text-[11px] font-extrabold truncate block">{m.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-slate-300 font-medium max-w-xl">
                Confirming receipt verifies physical delivery and authorizes KAYAD Escrow Vault to disburse {formatContractAmount(activeContract.agreedPrice)} to {activeContract.sellerName}. This action is legally binding.
              </p>

              {isFullyCompleted ? (
                <div className="px-6 py-3 rounded-2xl bg-[#3ddb72] text-[#141E3F] font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-[#141E3F]" />
                  <span>Funds Released Successfully</span>
                </div>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => setIsConfirmModalOpen(true)}
                  className="w-full sm:w-auto bg-[#3ddb72] hover:bg-[#3ddb72] text-[#141E3F] font-black text-xs py-3.5 px-8 uppercase tracking-wider shadow-lg shrink-0 cursor-pointer"
                  leftIcon={<CheckCircle2 className="w-4 h-4 text-[#141E3F]" />}
                >
                  Confirm Receipt & Release Funds
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-[#6B7A99]">
            No active escrow deals found. Initiate a purchase from certified inventory to lock funds in Escrow.
          </div>
        )}
      </div>

      {/* 5. Got Questions? Escrow FAQ */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E2D8C7] shadow-sm space-y-6">
        <div className="space-y-1 pb-4 border-b border-[#E8E1D5]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2E4080]/10 text-[#2E4080] text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-[#23EBFF]" />
            <span>Institutional Escrow FAQ</span>
          </div>
          <h2 className="text-2xl font-black text-[#2E4080] font-serif tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-[#E2D8C7] bg-[#F6F1E8]/50 overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-sm text-[#2E4080] hover:bg-[#F6F1E8] cursor-pointer"
                >
                  <span className="font-serif">{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#23EBFF] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#6B7A99] shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 pt-2 text-xs text-[#3D4F6F] font-medium leading-relaxed border-t border-[#E8E1D5] bg-white">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirm Receipt Modal Dialog */}
      {isConfirmModalOpen && activeContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md p-6 sm:p-8 bg-white rounded-3xl shadow-2xl border border-[#E2D8C7] space-y-6">
            <button
              onClick={() => setIsConfirmModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-[#6B7A99] hover:text-[#2E4080] rounded-full hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-full bg-[#3ddb72]/20 text-[#3ddb72] flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6 text-[#3ddb72]" />
              </div>

              <h3 className="text-xl font-extrabold text-[#2E4080] font-serif">
                Authorize Escrow Fund Release
              </h3>

              <p className="text-xs text-[#6B7A99] font-medium leading-relaxed">
                Are you sure you want to release <strong className="text-[#2E4080]">{formatContractAmount(activeContract.agreedPrice)}</strong> from KAYAD Escrow Vault to <strong className="text-[#2E4080]">{activeContract.sellerName}</strong>?
              </p>
            </div>

            {isConfirmedSuccess ? (
              <div className="p-4 rounded-2xl bg-[#3ddb72]/20 border border-[#3ddb72]/40 text-[#141E3F] text-xs font-bold text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#3ddb72] mx-auto" />
                <p>Funds successfully disbursed to {activeContract.sellerName}! Escrow contract completed.</p>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <Button
                  onClick={handleConfirmReceipt}
                  variant="primary"
                  className="w-full bg-[#3ddb72] hover:bg-[#3ddb72] text-[#141E3F] font-black text-xs py-3.5 uppercase tracking-wider cursor-pointer"
                >
                  Yes, Authorize Fund Release
                </Button>

                <Button
                  onClick={() => setIsConfirmModalOpen(false)}
                  variant="outline"
                  className="w-full border-[#E2D8C7] text-[#2E4080] font-bold text-xs cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
