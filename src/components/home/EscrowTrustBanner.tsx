import { 
  ShieldCheck, 
  Lock, 
  FileCheck2, 
  Truck, 
  CheckCircle2, 
  DollarSign, 
  ArrowRight, 
  Shield, 
  KeyRound, 
  Award,
  BadgeCheck 
} from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import type { FC } from 'react';

export const EscrowTrustBanner: FC = () => {
  const { navigateTo } = useMarketplace();

  const steps = [
    {
      step: '01',
      title: 'Agreement & Terms',
      desc: 'Buyer & seller lock price and terms with automated M-Pesa digital signatures.',
      icon: <FileCheck2 className="w-5 h-5 text-[#2E4080] group-hover:text-white transition-colors" />
    },
    {
      step: '02',
      title: 'Segregated Deposit',
      desc: 'Buyer wires funds into KAYAD regulated CBK-licensed bank escrow account.',
      icon: <Lock className="w-5 h-5 text-[#2E4080] group-hover:text-white transition-colors" />
    },
    {
      step: '03',
      title: '150-Pt Legal Audit',
      desc: 'Physical KRA logbook verification, lien check, and vehicle inspection.',
      icon: <ShieldCheck className="w-5 h-5 text-[#2E4080] group-hover:text-white transition-colors" />
    },
    {
      step: '04',
      title: 'Insured Transport',
      desc: 'Enclosed carrier shipping dispatched with live GPS tracking to buyer.',
      icon: <Truck className="w-5 h-5 text-[#2E4080] group-hover:text-white transition-colors" />
    },
    {
      step: '05',
      title: '48h Inspection Window',
      desc: 'Buyer conducts physical vehicle check before authorizing payout release.',
      icon: <CheckCircle2 className="w-5 h-5 text-[#2E4080] group-hover:text-white transition-colors" />
    },
    {
      step: '06',
      title: 'Instant Disbursal',
      desc: 'Seller receives full wired payout immediately upon final buyer approval.',
      icon: <DollarSign className="w-5 h-5 text-emerald-600 group-hover:text-white transition-colors" />
    }
  ];

  return (
    <section className="py-10 sm:py-14 bg-[#FCF9F4] text-[#2E4080] relative overflow-hidden border-b border-[#E8E1D5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#E2D8C7]">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2E4080]/10 border border-[#2E4080]/20 text-[#2E4080] font-mono font-black text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-[#23EBFF]" />
              <span>MULTI-SIGNATURE ESCROW VAULT</span>
            </div>
            
            <h2 className="text-2xl sm:text-4xl font-black text-[#2E4080] font-serif tracking-tight leading-tight">
              6-Step Bank Escrow Workflow
            </h2>
            
            <p className="text-xs sm:text-sm text-[#6B7A99] font-sans font-medium leading-relaxed">
              Your funds remain 100% protected in CBK-regulated bank escrow until you physically inspect and approve the vehicle.
            </p>
          </div>

          <button
            onClick={() => navigateTo('escrow')}
            className="shrink-0 bg-[#2E4080] hover:bg-[#1B2647] text-white font-mono font-black text-xs uppercase tracking-wider rounded-2xl px-7 py-3.5 shadow-lg hover:scale-[1.02] transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <span>Launch Escrow Vault</span>
            <ArrowRight className="w-4 h-4 text-[#23EBFF]" />
          </button>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {steps.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-white border border-[#E2D8C7] shadow-xs hover:border-[#2E4080] hover:shadow-xl transition-all duration-300 flex items-start gap-4 group cursor-pointer"
              onClick={() => navigateTo('escrow')}
            >
              <div className="w-10 h-10 rounded-2xl bg-[#2E4080]/10 border border-[#2E4080]/20 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#2E4080] transition-all shadow-2xs group-hover:scale-105">
                {item.icon}
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-black px-2.5 py-0.5 rounded-xl bg-[#2E4080] text-white uppercase tracking-wider">
                    STEP {item.step}
                  </span>
                </div>
                
                <h3 className="text-base font-serif font-black text-[#2E4080] leading-snug">
                  {item.title}
                </h3>
                
                <p className="text-xs text-[#6B7A99] font-sans font-normal leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Seal Footer Bar */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#2E4080] text-white border border-[#2E4080] shadow-lg grid grid-cols-2 md:grid-cols-4 gap-4 divide-y-0 sm:divide-x divide-white/15">
          
          <div className="flex items-center gap-3 sm:px-2">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-[#23EBFF]" />
            </div>
            <div>
              <p className="text-xs font-mono font-black text-white uppercase">Regulated Custody</p>
              <p className="text-[10px] text-slate-300 font-sans">CBK Licensed Bank Accounts</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:px-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-[#23EBFF]" />
            </div>
            <div>
              <p className="text-xs font-mono font-black text-white uppercase">OTP Signing</p>
              <p className="text-[10px] text-slate-300 font-sans">M-Pesa Digital Contracts</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:px-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <BadgeCheck className="w-5 h-5 text-[#23EBFF]" />
            </div>
            <div>
              <p className="text-xs font-mono font-black text-white uppercase">KRA Verified</p>
              <p className="text-[10px] text-slate-300 font-sans">Clean Logbook Transfer</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:px-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-[#23EBFF]" />
            </div>
            <div>
              <p className="text-xs font-mono font-black text-white uppercase">100% Protection</p>
              <p className="text-[10px] text-slate-300 font-sans">Buyer Money-Back Guarantee</p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};


