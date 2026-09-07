import { Check, X, Shield, Award, ArrowRight } from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import type { FC } from 'react';

export const WhyKayadComparison: FC = () => {
  const { navigateTo } = useMarketplace();

  const comparisonRows = [
    {
      feature: 'Seller Identity',
      traditional: 'Anonymous profiles & untraceable accounts',
      kayad: 'National ID & KRA Biometric Verification',
    },
    {
      feature: 'Payment Security',
      traditional: 'Risky cash meetups or unsecured bank wires',
      kayad: 'CBK-Regulated Bank Escrow Vault with OTP',
    },
    {
      feature: 'Vehicle History',
      traditional: 'Unverified verbal seller claims & reset odometers',
      kayad: 'KRA TIMS Logbook + VIN Audit + 150-Pt Report',
    },
    {
      feature: 'Physical Condition',
      traditional: 'As-is purchase with hidden mechanical defects',
      kayad: 'On-site engineer pre-inspection & diagnostic scan',
    },
    {
      feature: 'Auctions & Bidding',
      traditional: 'Ghost bids, unvetted buyers & fake reserves',
      kayad: 'Escrow-backed verified bidders with real-time timers',
    },
    {
      feature: 'Outstanding Debt / Liens',
      traditional: 'Risk of buying a vehicle with unpaid bank loans',
      kayad: 'Automated charge register check for 100% clean title',
    },
  ];

  return (
    <section className="py-14 sm:py-20 bg-[#0B1628] dark:bg-[#060B14] text-white border-b border-white/10 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-[#00C9CE] font-mono font-black text-xs uppercase tracking-wider">
            <Award className="w-4 h-4 text-[#00C9CE]" />
            <span>THE UNMATCHED KAYAD SECURITY ADVANTAGE</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black font-serif tracking-tight text-white leading-tight">
            Why Kenya Chooses KAYAD
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 font-sans font-medium leading-relaxed max-w-2xl mx-auto">
            See how KAYAD transforms vehicle buying and selling compared to traditional classifieds and unverified peer-to-peer social groups.
          </p>
        </div>

        {/* Comparison Table / Matrix */}
        <div className="bg-[#1E3063]/80 border border-white/15 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
          
          {/* Table Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 bg-[#121D33] p-4 sm:p-6 border-b border-white/15 text-xs font-mono font-black uppercase tracking-wider text-slate-300">
            <div className="hidden md:block text-slate-400">Marketplace Standard</div>
            <div className="text-rose-400 flex items-center gap-2">
              <X className="w-4 h-4 text-rose-500 stroke-[3]" />
              <span>Traditional Classifieds</span>
            </div>
            <div className="text-[#00C9CE] flex items-center gap-2 mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/10">
              <Shield className="w-4 h-4 text-[#00C9CE]" />
              <span>KAYAD Regulated Marketplace</span>
            </div>
          </div>

          {/* Table Body Rows */}
          <div className="divide-y divide-white/10">
            {comparisonRows.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-3 p-4 sm:p-6 items-center gap-3 sm:gap-4 hover:bg-white/5 transition-colors"
              >
                {/* Feature Name */}
                <div className="font-mono font-bold text-xs sm:text-sm text-white uppercase tracking-wider">
                  {row.feature}
                </div>

                {/* Traditional */}
                <div className="flex items-start gap-2 text-xs sm:text-sm text-slate-300 font-sans">
                  <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 stroke-[3]" />
                  <span>{row.traditional}</span>
                </div>

                {/* KAYAD */}
                <div className="flex items-start gap-2 text-xs sm:text-sm text-[#00C9CE] font-sans font-bold bg-[#00C9CE]/10 p-2.5 rounded-2xl border border-[#00C9CE]/20">
                  <Check className="w-4 h-4 text-[#00C9CE] shrink-0 mt-0.5 stroke-[3]" />
                  <span>{row.kayad}</span>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Bottom CTA */}
        <div className="text-center pt-2">
          <button
            onClick={() => navigateTo('escrow')}
            className="px-8 py-4 bg-[#00C9CE] hover:bg-[#00B0B5] text-[#1E3063] font-mono font-black text-xs uppercase tracking-wider rounded-2xl inline-flex items-center gap-2 shadow-xl hover:scale-[1.02] transition-all cursor-pointer"
          >
            <span>Experience Escrow-Protected Trading</span>
            <ArrowRight className="w-4 h-4 text-[#1E3063]" />
          </button>
        </div>

      </div>
    </section>
  );
};
