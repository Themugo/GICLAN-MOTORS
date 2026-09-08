import { useEffect, useState } from 'react';
import { ShieldCheck, Users, Car, CheckCircle2, Award } from 'lucide-react';
import type { FC } from 'react';

export const TrustMetricsBar: FC = () => {
  const [escrowAmount, setEscrowAmount] = useState(0);
  const [members, setMembers] = useState(0);
  const [vehicles, setVehicles] = useState(0);
  const [satisfaction, setSatisfaction] = useState(0);

  useEffect(() => {
    // Animate counter values smoothly on mount
    const duration = 1500;
    const steps = 30;
    const stepTime = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      // Ease out quad formula
      const easeProgress = 1 - (1 - progress) * (1 - progress);

      setEscrowAmount(Math.round(easeProgress * 3.4 * 10) / 10);
      setMembers(Math.round(easeProgress * 12842));
      setVehicles(Math.round(easeProgress * 2700));
      setSatisfaction(Math.round(easeProgress * 98.9 * 10) / 10);

      if (step >= steps) {
        clearInterval(timer);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, []);

  const metrics = [
    {
      label: 'Protected in Escrow',
      value: `KES ${escrowAmount.toFixed(1)}B+`,
      subtitle: 'CBK-Regulated Bank Vaults',
      icon: <ShieldCheck className="w-5 h-5 text-[#00C9CE]" />,
    },
    {
      label: 'Verified Members',
      value: `${members.toLocaleString()}+`,
      subtitle: 'KRA & ID Verified Buyers/Sellers',
      icon: <Users className="w-5 h-5 text-[#00C9CE]" />,
    },
    {
      label: 'Audited Vehicles',
      value: `${vehicles.toLocaleString()}+`,
      subtitle: '150-Point Structural Audits',
      icon: <Car className="w-5 h-5 text-[#00C9CE]" />,
    },
    {
      label: 'Successful Releases',
      value: `${satisfaction.toFixed(1)}%`,
      subtitle: 'Seamless Disbursal Rate',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    },
  ];

  return (
    <section className="py-10 bg-[#0B1628] dark:bg-[#080E1A] text-white border-y border-white/10 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header Label */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[11px] font-mono font-bold uppercase tracking-widest">
            <Award className="w-3.5 h-3.5 text-[#00C9CE]" />
            PROVEN MARKETPLACE TRUST AT SCALE
          </span>
        </div>

        {/* 4 Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 divide-y-0 sm:divide-x divide-white/10">
          {metrics.map((item, idx) => (
            <div
              key={idx}
              className="p-4 sm:p-5 rounded-2xl bg-white/5 dark:bg-white/3 border border-white/10 backdrop-blur-md flex flex-col items-center text-center space-y-2 hover:bg-white/10 transition-colors group"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#1E3063] flex items-center justify-center border border-[#00C9CE]/30 group-hover:scale-110 transition-transform shadow-md">
                {item.icon}
              </div>

              <div className="space-y-0.5">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white block">
                  {item.value}
                </span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#00C9CE] block">
                  {item.label}
                </span>
              </div>

              <p className="text-[11px] text-slate-300 font-sans font-medium line-clamp-1">
                {item.subtitle}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
