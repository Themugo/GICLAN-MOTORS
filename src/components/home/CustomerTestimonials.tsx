import { Star, ShieldCheck, MapPin } from 'lucide-react';
import type { FC } from 'react';

export const CustomerTestimonials: FC = () => {
  const testimonials: Array<{ name: string; location: string; role: string; vehicle: string; quote: string; rating: number; date: string; avatar: string }> = [];
  return (
    <section className="py-14 sm:py-20 bg-[#FCF9F4] dark:bg-[#0B132B] text-[#1E3063] dark:text-slate-100 border-b border-[#E8E1D5] dark:border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1E3063]/10 dark:bg-white/10 border border-[#1E3063]/20 dark:border-white/20 text-[#1E3063] dark:text-slate-100 font-mono font-black text-xs uppercase tracking-wider">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>4.9 / 5.0 VERIFIED MEMBER TRUST SCORE</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-[#1E3063] dark:text-white font-serif tracking-tight">
            Trusted by Car Buyers & Sellers Across Kenya
          </h2>

          <p className="text-xs sm:text-sm text-[#6B7A99] dark:text-slate-300 font-sans font-medium">
            Verified member reviews will appear here once they are loaded from the live review records.
          </p>
        </div>

        {/* Testimonials Grid */}
        {testimonials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-white dark:bg-[#121D33] border border-[#E2D8C7] dark:border-white/10 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">

                {/* Top Rating & Escrow Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-500" />
                    ))}
                  </div>

                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono font-bold uppercase border border-emerald-500/20">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    Verified Escrow
                  </span>
                </div>

                {/* Quote Text */}
                <p className="text-xs sm:text-sm text-[#1E3063] dark:text-slate-200 font-sans italic leading-relaxed">
                  "{item.quote}"
                </p>

                <div className="text-[11px] font-mono text-[#00C9CE] font-bold">
                  Asset: {item.vehicle}
                </div>
              </div>

              {/* User Bio Footer */}
              <div className="pt-4 border-t border-[#E8E1D5] dark:border-white/10 flex items-center gap-3">
                <img
                  src={item.avatar}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  className="w-11 h-11 rounded-2xl object-cover border border-[#1E3063]/20 dark:border-white/20 shrink-0"
                />

                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-serif font-black text-[#1E3063] dark:text-white truncate">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#6B7A99] dark:text-slate-400 font-sans">
                    <MapPin className="w-3 h-3 text-[#00C9CE]" />
                    <span>{item.location}</span>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
        ) : (
          <div className="max-w-2xl mx-auto rounded-3xl bg-white dark:bg-[#121D33] border border-[#E2D8C7] dark:border-white/10 p-8 text-center text-sm text-[#6B7A99] dark:text-slate-300">
            No verified member reviews are available yet.
          </div>
        )}

      </div>
    </section>
  );
};
