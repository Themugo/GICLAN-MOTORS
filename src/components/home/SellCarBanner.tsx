import { Sparkles, ArrowRight } from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import type { FC } from 'react';

export const SellCarBanner: FC = () => {
  const { navigateTo } = useMarketplace();

  return (
    <section className="bg-[#2E4080] text-white py-10 sm:py-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden border-t border-white/10">
      <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#23EBFF]/20 text-[#23EBFF] border border-[#23EBFF]/30 font-mono text-xs font-black tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5 text-[#23EBFF]" />
          <span>KENYA'S MOST TRUSTED VEHICLE VAULT</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-4xl font-black text-white font-serif tracking-tight leading-tight">
          Ready to Find Your Dream Car?
        </h2>

        {/* Subtitle */}
        <p className="text-slate-200 text-xs sm:text-sm max-w-2xl mx-auto font-sans font-medium leading-relaxed">
          Join thousands of Kenyan car buyers and sellers who trust KAYAD for secure M-Pesa & bank escrow transactions.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigateTo('gallery')}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#3ddb72] hover:bg-[#1FA855] text-[#2E4080] font-mono font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all cursor-pointer inline-flex items-center justify-center gap-2 hover:scale-[1.02]"
          >
            <span>Start Browsing</span>
            <ArrowRight className="w-4 h-4 text-[#2E4080]" />
          </button>
          <button
            onClick={() => navigateTo('sell')}
            className="w-full sm:w-auto px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/30 font-mono font-black text-xs uppercase tracking-wider rounded-2xl transition-all backdrop-blur-md cursor-pointer"
          >
            Sell a Vehicle
          </button>
        </div>

      </div>
    </section>
  );
};


