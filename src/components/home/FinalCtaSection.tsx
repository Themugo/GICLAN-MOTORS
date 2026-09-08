import { ArrowRight, Car, Gavel } from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import type { FC } from 'react';

export const FinalCtaSection: FC = () => {
  const { navigateTo } = useMarketplace();

  return (
    <section className="py-16 sm:py-20 bg-[#FCF9F4] text-[#1E3063] relative overflow-hidden border-t border-[#E8E1D5] transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">

        <h2 className="text-3xl sm:text-5xl font-black font-serif tracking-tight text-[#1E3063] leading-tight">
          Ready to Find or Sell Your Car?
        </h2>

        <p className="text-sm sm:text-base text-[#6B7A99] font-sans font-medium max-w-xl mx-auto">
          Explore thousands of verified listings across Kenya or list your vehicle for sale or live auction today.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={() => navigateTo('gallery')}
            className="w-full sm:w-auto px-8 py-4 bg-[#1E3063] hover:bg-[#121D33] text-white font-mono font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Car className="w-4 h-4 stroke-[2.5]" />
            <span>Browse Cars</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>

          <button
            onClick={() => navigateTo('sell')}
            className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-[#F6F1E8] text-[#1E3063] font-mono font-black text-xs uppercase tracking-wider rounded-2xl border border-[#E2D8C7] flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] shadow-sm"
          >
            <Gavel className="w-4 h-4 text-[#00C9CE]" />
            <span>Sell Your Car</span>
          </button>
        </div>

      </div>
    </section>
  );
};
