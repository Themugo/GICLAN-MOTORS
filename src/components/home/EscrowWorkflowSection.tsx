import { useState } from 'react';
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
  BadgeCheck,
  UserCheck,
  ChevronRight
} from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import type { FC } from 'react';

export const EscrowWorkflowSection: FC = () => {
  const { navigateTo } = useMarketplace();
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const workflowSteps = [
    {
      step: '01',
      title: 'Agreement & Terms',
      actor: 'Buyer & Seller',
      desc: 'Price and terms locked with digital OTP signatures. Contract terms stored immutably.',
      icon: <FileCheck2 className="w-5 h-5 text-[#00C9CE]" />,
      badge: 'OTP SIGNED'
    },
    {
      step: '02',
      title: 'Segregated Bank Deposit',
      actor: 'Buyer → Escrow Vault',
      desc: 'Buyer deposits funds into KAYAD regulated CBK-licensed bank escrow account.',
      icon: <Lock className="w-5 h-5 text-[#00C9CE]" />,
      badge: 'FUNDS VAULTED'
    },
    {
      step: '03',
      title: '150-Pt Physical Audit',
      actor: 'Certified Inspector',
      desc: 'Physical KRA TIMS logbook verification, lien check, and mechanical diagnostic audit.',
      icon: <ShieldCheck className="w-5 h-5 text-[#00C9CE]" />,
      badge: 'AUDIT PASSED'
    },
    {
      step: '04',
      title: 'Insured Carrier Shipping',
      actor: 'KAYAD Transport',
      desc: 'Enclosed vehicle carrier dispatched with real-time GPS tracking to buyer.',
      icon: <Truck className="w-5 h-5 text-[#00C9CE]" />,
      badge: 'GPS DISPATCHED'
    },
    {
      step: '05',
      title: '48h Inspection Window',
      actor: 'Buyer Verification',
      desc: 'Buyer conducts physical vehicle check before authorizing payment release.',
      icon: <CheckCircle2 className="w-5 h-5 text-[#00C9CE]" />,
      badge: 'BUYER APPROVAL'
    },
    {
      step: '06',
      title: 'Instant Wired Payout',
      actor: 'Escrow → Seller Bank',
      desc: 'Seller receives instant wired disbursal immediately upon final buyer sign-off.',
      icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
      badge: 'PAYOUT COMPLETE'
    }
  ];

  return (
    <section className="py-14 sm:py-20 bg-[#FCF9F4] dark:bg-[#0B132B] text-[#1E3063] dark:text-slate-100 border-b border-[#E8E1D5] dark:border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#E2D8C7] dark:border-white/10">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1E3063]/10 dark:bg-white/10 border border-[#1E3063]/20 dark:border-white/20 text-[#1E3063] dark:text-slate-100 font-mono font-black text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-[#00C9CE]" />
              <span>REGULATED MULTI-SIGNATURE ESCROW VAULT</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-black text-[#1E3063] dark:text-white font-serif tracking-tight leading-tight">
              The 6-Step Protected Escrow Flow
            </h2>
            
            <p className="text-xs sm:text-sm text-[#6B7A99] dark:text-slate-300 font-sans font-medium leading-relaxed">
              Your money is never sent directly to a stranger. Funds remain 100% secured in CBK-regulated bank escrow until you physically inspect and approve the vehicle.
            </p>
          </div>

          <button
            onClick={() => navigateTo('escrow')}
            className="shrink-0 bg-[#1E3063] dark:bg-[#1E293B] hover:bg-[#121D33] text-white font-mono font-black text-xs uppercase tracking-wider rounded-2xl px-7 py-3.5 shadow-lg border border-[#1E3063] dark:border-white/20 hover:scale-[1.02] transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <span>Launch Escrow Vault</span>
            <ArrowRight className="w-4 h-4 text-[#00C9CE]" />
          </button>
        </div>

        {/* Interactive Visual Timeline Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {workflowSteps.map((item, idx) => {
            const isActive = idx === activeStepIndex;
            return (
              <div
                key={idx}
                onClick={() => setActiveStepIndex(idx)}
                className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between space-y-4 cursor-pointer relative ${
                  isActive
                    ? 'bg-[#1E3063] text-white border-[#00C9CE] shadow-2xl scale-[1.02]'
                    : 'bg-white dark:bg-[#121D33] text-[#1E3063] dark:text-slate-100 border-[#E2D8C7] dark:border-white/10 hover:border-[#1E3063] dark:hover:border-[#00C9CE] shadow-xs'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono font-black px-2.5 py-1 rounded-xl uppercase tracking-wider ${
                      isActive ? 'bg-[#00C9CE] text-[#1E3063]' : 'bg-[#1E3063] text-white'
                    }`}>
                      STEP {item.step}
                    </span>

                    <span className={`text-[10px] font-mono font-bold uppercase ${
                      isActive ? 'text-[#00C9CE]' : 'text-[#6B7A99] dark:text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${
                      isActive 
                        ? 'bg-[#00C9CE]/20 border-[#00C9CE]' 
                        : 'bg-[#1E3063]/10 dark:bg-white/10 border-[#1E3063]/20 dark:border-white/20'
                    }`}>
                      {item.icon}
                    </div>

                    <div>
                      <h3 className={`text-base font-serif font-black ${isActive ? 'text-white' : 'text-[#1E3063] dark:text-white'}`}>
                        {item.title}
                      </h3>
                      <p className={`text-[11px] font-mono font-semibold ${isActive ? 'text-[#00C9CE]' : 'text-[#6B7A99] dark:text-slate-400'}`}>
                        {item.actor}
                      </p>
                    </div>
                  </div>

                  <p className={`text-xs font-sans font-normal leading-relaxed ${
                    isActive ? 'text-slate-200' : 'text-[#6B7A99] dark:text-slate-300'
                  }`}>
                    {item.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
                  <span className={isActive ? 'text-[#00C9CE] font-bold' : 'text-slate-400'}>
                    {isActive ? '● CURRENT ACTIVE STEP' : 'CLICK TO VIEW DETAILS'}
                  </span>
                  <ChevronRight className={`w-4 h-4 ${isActive ? 'text-[#00C9CE]' : 'text-slate-400'}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Security Guarantees Bar */}
        <div className="p-6 rounded-3xl bg-[#1E3063] text-white border border-[#1E3063] shadow-xl grid grid-cols-2 md:grid-cols-4 gap-4 divide-y-0 sm:divide-x divide-white/15">
          
          <div className="flex items-center gap-3 sm:px-2">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-[#00C9CE]" />
            </div>
            <div>
              <p className="text-xs font-mono font-black text-white uppercase">Regulated Custody</p>
              <p className="text-[10px] text-slate-300 font-sans">CBK Licensed Bank Accounts</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:px-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-[#00C9CE]" />
            </div>
            <div>
              <p className="text-xs font-mono font-black text-white uppercase">OTP Signing</p>
              <p className="text-[10px] text-slate-300 font-sans">M-Pesa Digital Contracts</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:px-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <BadgeCheck className="w-5 h-5 text-[#00C9CE]" />
            </div>
            <div>
              <p className="text-xs font-mono font-black text-white uppercase">KRA Verified</p>
              <p className="text-[10px] text-slate-300 font-sans">Clean Logbook Transfer</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:px-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-[#00C9CE]" />
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
