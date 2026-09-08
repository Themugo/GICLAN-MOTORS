import { ShieldCheck, CreditCard, Workflow } from 'lucide-react';
import type { FC } from 'react';

export const PartnerEcosystem: FC = () => {
  const services = [
    { name: 'M-Pesa', role: 'Payment Integration', icon: <CreditCard className="w-5 h-5 text-slate-400" /> },
    { name: 'KAYAD Escrow', role: 'Transaction Workflow', icon: <Workflow className="w-5 h-5 text-slate-400" /> },
    { name: 'KAYAD Inspections', role: 'Inspection Workflow', icon: <ShieldCheck className="w-5 h-5 text-slate-400" /> },
  ];
  return (
    <section className="py-10 bg-[#F6F1E8] dark:bg-[#080E1A] border-b border-[#E8E1D5] dark:border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Header Label */}
        <div className="text-center">
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#6B7A99] dark:text-slate-400">
            Verified Integrations & Services
          </span>
        </div>

        {/* Partners Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {services.map((partner, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#121D33] border border-[#E2D8C7] dark:border-white/10 flex flex-col items-center justify-center text-center space-y-1 hover:border-[#1E3063] dark:hover:border-[#00C9CE] transition-all grayscale hover:grayscale-0 group shadow-2xs"
            >
              <div className="w-8 h-8 rounded-xl bg-[#1E3063]/10 dark:bg-white/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                {partner.icon}
              </div>
              <span className="text-xs font-serif font-black text-[#1E3063] dark:text-slate-200 line-clamp-1">
                {partner.name}
              </span>
              <span className="text-[9px] font-mono text-[#6B7A99] dark:text-slate-400 uppercase tracking-wider">
                {partner.role}
              </span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
