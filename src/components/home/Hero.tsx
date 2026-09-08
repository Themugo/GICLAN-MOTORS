import { useState, useEffect } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Car,
  Tag,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import type { FC } from 'react';

export const Hero: FC = () => {
  const { navigateTo, vehicles, resetFilters } = useMarketplace();

  // Spotlight vehicles slider
  const spotlightVehicles = vehicles.filter(v => (v as any).isFeatured || (v.inspection && v.inspection.score >= 90)).slice(0, 6);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-play slider with clean timer reset on interaction
  useEffect(() => {
    if (spotlightVehicles.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % spotlightVehicles.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [spotlightVehicles.length, currentSlide]);

  const activeVehicle = spotlightVehicles[currentSlide] || vehicles[0];

  const handleNextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % spotlightVehicles.length);
  };

  const handlePrevSlide = () => {
    setCurrentSlide(prev => (prev - 1 + spotlightVehicles.length) % spotlightVehicles.length);
  };

  return (
    <section className="w-full bg-[#FCF9F4] text-[#2E4080] pt-0 pb-1 sm:pb-2 border-b border-[#E8E1D5] transition-colors">
      {/* Full-width Edge-to-Edge Hero Card Slider touching navbar */}
      {activeVehicle && (
        <div className="relative w-full h-[350px] sm:h-[420px] lg:h-[480px] bg-slate-900 group shadow-lg overflow-hidden">
          {/* Auto-sliding Background Images with Smooth Fade Transition */}
          {spotlightVehicles.map((vehicle, idx) => (
            <img
              key={vehicle.id}
              src={vehicle.images[0]}
              alt={vehicle.title}
              className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-1000 ease-in-out transform group-hover:scale-105 ${
                idx === currentSlide ? 'opacity-100 scale-100 z-0' : 'opacity-0 scale-105 pointer-events-none z-0'
              }`}
            />
          ))}
          {/* Faint theme overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/20 to-slate-950/60" />

          {/* Top Left Slogan Overlay - Elevated & Scaled for Phone/Desktop */}
          <div className="absolute top-5 sm:top-8 lg:top-12 left-5 sm:left-10 lg:left-14 xl:left-16 z-10 max-w-[85%] sm:max-w-xl md:max-w-2xl pointer-events-auto">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-[#23EBFF]/40 text-[#23EBFF] text-[10px] sm:text-xs font-mono font-black uppercase tracking-widest shadow-md mb-2 sm:mb-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#23EBFF] animate-pulse" />
              <span>Kenya's Premium Car Market</span>
            </div>

            <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-black text-white uppercase tracking-tight leading-tight drop-shadow-xl">
              Drive Your Dream <span className="text-[#23EBFF] underline decoration-[#23EBFF]/40 decoration-wavy decoration-1 underline-offset-4">Today</span>
            </h1>

            <p className="mt-1.5 sm:mt-2.5 text-[11px] sm:text-xs md:text-sm font-sans font-medium text-slate-200/95 leading-relaxed drop-shadow-md max-w-sm sm:max-w-lg">
              Kenya's trusted automotive hub — 150-point mechanical audits, verified logbooks, and guaranteed secure direct deals.
            </p>
          </div>

          {/* Top Right Slide Dots Indicator */}
          <div className="absolute top-5 sm:top-8 lg:top-12 right-5 sm:right-10 lg:right-14 xl:right-16 z-10 flex items-center gap-1.5 pointer-events-auto bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 shadow-md">
            {spotlightVehicles.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentSlide ? 'w-5 bg-[#23EBFF]' : 'w-1.5 bg-white/50 hover:bg-white'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Slider Side Arrows */}
          <button
            type="button"
            onClick={handlePrevSlide}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-md transition-all cursor-pointer opacity-80 hover:opacity-100 hover:scale-110 shadow-lg border border-white/10 z-10"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button
            type="button"
            onClick={handleNextSlide}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-md transition-all cursor-pointer opacity-80 hover:opacity-100 hover:scale-110 shadow-lg border border-white/10 z-10"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Bottom Navigation Dots Indicator */}
          <div className="absolute bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 sm:gap-2 bg-black/60 backdrop-blur-md px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full border border-white/20 shadow-xl">
            {spotlightVehicles.map((vehicle, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`group relative h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentSlide
                    ? 'w-6 sm:w-8 bg-[#23EBFF] shadow-[0_0_8px_#23EBFF]'
                    : 'w-2 bg-white/40 hover:bg-white/80 hover:w-3'
                }`}
                aria-label={`Go to slide ${idx + 1}: ${vehicle.title}`}
                title={`Slide ${idx + 1}: ${vehicle.title}`}
              >
                <span className="sr-only">Slide {idx + 1}</span>
              </button>
            ))}
          </div>

          {/* Bottom Edge Content Banner for Active Vehicle */}
          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5 lg:p-6 pb-9 sm:pb-10 lg:pb-12 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent z-10">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-end justify-between gap-3 text-white">

              {/* Left Side: Navigation Action Tabs */}
              <div className="flex items-center gap-2 sm:gap-3 pb-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (resetFilters) resetFilters();
                    navigateTo('gallery');
                  }}
                  className="group px-3.5 sm:px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-[#23EBFF] text-white hover:text-[#2E4080] border border-white/20 hover:border-[#23EBFF] text-xs font-mono font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-lg flex items-center gap-2 hover:scale-105 active:scale-95"
                >
                  <Car className="w-3.5 h-3.5 text-[#23EBFF] group-hover:text-[#2E4080] transition-colors" />
                  <span>Browse Cars</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo('sell')}
                  className="group px-3.5 sm:px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-white text-white hover:text-[#2E4080] border border-white/20 hover:border-white text-xs font-mono font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-lg flex items-center gap-2 hover:scale-105 active:scale-95"
                >
                  <Tag className="w-3.5 h-3.5 text-amber-400 group-hover:text-[#2E4080] transition-colors" />
                  <span>Sell a Vehicle</span>
                </button>
              </div>

              {/* Right Side: Consolidated Vehicle Details + Verified Price + CTA */}
              <div
                key={`vehicle-details-${activeVehicle.id}`}
                className="w-full md:w-auto flex flex-col items-start md:items-end text-left md:text-right gap-1.5 transition-all duration-500 animate-fadeIn"
              >
                {/* Specs Metadata Line */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-mono text-slate-300">
                  <span className="text-[#23EBFF] font-bold">{activeVehicle.year}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#23EBFF]" />
                    {activeVehicle.location}
                  </span>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold">150-Pt Inspected</span>
                </div>

                {/* Vehicle Title */}
                <h3
                  onClick={() => navigateTo('vehicle_detail', activeVehicle.id)}
                  className="text-xs sm:text-base lg:text-lg font-serif font-bold text-white hover:text-[#23EBFF] transition-colors cursor-pointer line-clamp-1 max-w-xl"
                >
                  Featured: {activeVehicle.title}
                </h3>

                {/* Integrated Price & CTA Row */}
                <div className="flex items-center gap-3 sm:gap-4 mt-0.5">
                  <div className="text-left md:text-right">
                    <span className="text-[9px] sm:text-[10px] font-mono uppercase text-slate-400 block tracking-wider">Verified Price</span>
                    <span className="text-base sm:text-xl lg:text-2xl font-mono font-black text-[#23EBFF]">
                      KES {(activeVehicle.currentBid || activeVehicle.price).toLocaleString()}
                    </span>
                  </div>

                  <button
                    onClick={() => navigateTo('vehicle_detail', activeVehicle.id)}
                    className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#23EBFF] hover:bg-[#23EBFF] text-[#2E4080] text-[11px] sm:text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-lg hover:scale-[1.02] shrink-0"
                  >
                    <span>Inspect & Buy</span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}
    </section>
  );
};



