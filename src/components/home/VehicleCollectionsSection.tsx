import {
  Sparkles,
  Crown,
  Compass,
  Users,
  Truck,
  Zap,
  ShieldCheck,
  Banknote,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { BodyStyle } from '../../types';
import type { FC } from 'react';

export const VehicleCollectionsSection: FC = () => {
  const { navigateTo, setFilters, resetFilters } = useMarketplace();

  const collections = [
    {
      id: 'luxury',
      title: 'Luxury Collection',
      subtitle: 'Porsche, Range Rover, Lexus & Flagship German Engineering',
      image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
      icon: <Crown className="w-5 h-5 text-amber-400" />,
      action: () => {
        resetFilters();
        setFilters(prev => ({
          ...prev,
          makes: ['Porsche', 'Land Rover', 'Mercedes-Benz', 'Lexus'],
          minPrice: 8000000
        }));
        navigateTo('gallery');
      }
    },
    {
      id: 'suv',
      title: '4x4 & SUV Command',
      subtitle: 'Land Cruiser Prado, V8, Defender & Safari Utility',
      image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
      icon: <Compass className="w-5 h-5 text-[#00C9CE]" />,
      action: () => {
        resetFilters();
        setFilters(prev => ({
          ...prev,
          bodyStyles: ['SUV' as BodyStyle]
        }));
        navigateTo('gallery');
      }
    },
    {
      id: 'hybrid',
      title: 'Hybrid & Electric',
      subtitle: 'Zero-Emission & High-Efficiency Modern Powertrains',
      image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
      icon: <Zap className="w-5 h-5 text-emerald-400" />,
      action: () => {
        resetFilters();
        setFilters(prev => ({
          ...prev,
          fuelType: ['Hybrid', 'Electric', 'Plug-in Hybrid']
        }));
        navigateTo('gallery');
      }
    },
    {
      id: 'certified',
      title: 'Dealer Certified',
      subtitle: 'Official Franchise Dealership Listings with Warranty',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
      icon: <ShieldCheck className="w-5 h-5 text-[#00C9CE]" />,
      action: () => {
        resetFilters();
        setFilters(prev => ({
          ...prev,
          certifiedOnly: true
        }));
        navigateTo('gallery');
      }
    },
    {
      id: 'under_2m',
      title: 'Under KES 2M',
      subtitle: 'High-Value Verified Everyday Drivers & First Cars',
      image: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=800&q=80',
      icon: <Banknote className="w-5 h-5 text-emerald-400" />,
      action: () => {
        resetFilters();
        setFilters(prev => ({
          ...prev,
          maxPrice: 2000000
        }));
        navigateTo('gallery');
      }
    },
    {
      id: 'commercial',
      title: 'Commercial Fleet',
      subtitle: 'Hilux Pickups, Double Cabs & Utility Transporters',
      image: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=800&q=80',
      icon: <Truck className="w-5 h-5 text-[#00C9CE]" />,
      action: () => {
        resetFilters();
        setFilters(prev => ({
          ...prev,
          bodyStyles: ['Truck' as BodyStyle]
        }));
        navigateTo('gallery');
      }
    }
  ];

  return (
    <section className="py-14 sm:py-20 bg-[#F6F1E8] dark:bg-[#080E1A] text-[#1E3063] dark:text-slate-100 border-b border-[#E8E1D5] dark:border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

        {/* Section Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-6 border-b border-[#E2D8C7] dark:border-white/10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1E3063]/10 dark:bg-white/10 border border-[#1E3063]/20 dark:border-white/20 text-[#1E3063] dark:text-slate-100 font-mono font-black text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-[#00C9CE]" />
              <span>CURATED COLLECTIONS</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-[#1E3063] dark:text-white font-serif tracking-tight">
              Explore Vehicle Categories
            </h2>

            <p className="text-xs sm:text-sm text-[#6B7A99] dark:text-slate-300 font-sans font-medium">
              Find exactly what you need with our hand-curated vehicle categories across Kenya.
            </p>
          </div>

          <button
            onClick={() => {
              resetFilters();
              navigateTo('gallery');
            }}
            className="px-6 py-3 bg-[#1E3063] dark:bg-[#1E293B] hover:bg-[#121D33] text-white font-mono font-black text-xs uppercase tracking-wider rounded-2xl border border-[#1E3063] dark:border-white/20 shadow-md inline-flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <span>View All Categories</span>
            <ArrowRight className="w-4 h-4 text-[#00C9CE]" />
          </button>
        </div>

        {/* Collections Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((item) => (
            <div
              key={item.id}
              onClick={item.action}
              className="group relative h-64 rounded-3xl overflow-hidden border border-[#E2D8C7] dark:border-white/10 shadow-md hover:border-[#00C9CE] hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col justify-end p-6"
            >
              {/* Background Image */}
              <img
                src={item.image}
                alt={item.title}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 select-none"
              />

              {/* Gradient Vignette Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1628]/95 via-[#0B1628]/60 to-transparent transition-opacity group-hover:opacity-90" />

              {/* Content */}
              <div className="relative z-10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#00C9CE]/20 border border-[#00C9CE]/40 text-[#00C9CE] text-[10px] font-mono font-black uppercase tracking-wider group-hover:bg-[#00C9CE] group-hover:text-[#1E3063] transition-colors">
                    Explore Inventory →
                  </span>
                </div>

                <h3 className="text-xl font-serif font-black text-white group-hover:text-[#00C9CE] transition-colors">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-300 font-sans font-medium line-clamp-2">
                  {item.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
