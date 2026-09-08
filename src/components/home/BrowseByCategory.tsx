import {
  Car,
  Crown,
  Compass,
  Truck,
  Zap,
  Sparkles,
  ArrowRight,
  Briefcase
} from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { BodyStyle } from '../../types';
import type { FC } from 'react';

export const BrowseByCategory: FC = () => {
  const { navigateTo, setFilters, resetFilters } = useMarketplace();

  const categories = [
    {
      id: 'SUV',
      title: 'SUV',
      desc: 'All-terrain 4x4s & family luxury crossovers',
      image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
      icon: <Compass className="w-5 h-5 text-[#00C9CE]" />,
      action: () => {
        resetFilters();
        setFilters(prev => ({ ...prev, bodyStyles: ['SUV' as BodyStyle] }));
        navigateTo('gallery');
      }
    },
    {
      id: 'Sedan',
      title: 'Sedan',
      desc: 'Refined comfort, executive saloons & city drivers',
      image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80',
      icon: <Car className="w-5 h-5 text-[#00C9CE]" />,
      action: () => {
        resetFilters();
        setFilters(prev => ({ ...prev, bodyStyles: ['Sedan' as BodyStyle] }));
        navigateTo('gallery');
      }
    },
    {
      id: 'Pickup',
      title: 'Pickup',
      desc: 'High-payload double cabs & heavy-duty utilities',
      image: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=800&q=80',
      icon: <Truck className="w-5 h-5 text-[#00C9CE]" />,
      action: () => {
        resetFilters();
        setFilters(prev => ({ ...prev, bodyStyles: ['Truck' as BodyStyle] }));
        navigateTo('gallery');
      }
    },
    {
      id: 'Luxury',
      title: 'Luxury',
      desc: 'Flagship European performance & luxury classics',
      image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
      icon: <Crown className="w-5 h-5 text-amber-400" />,
      action: () => {
        resetFilters();
        setFilters(prev => ({
          ...prev,
          makes: ['Porsche', 'Land Rover', 'Mercedes-Benz', 'BMW', 'Lexus'],
          minPrice: 6000000
        }));
        navigateTo('gallery');
      }
    },
    {
      id: 'Hybrid',
      title: 'Hybrid',
      desc: 'Fuel-efficient eco-powertrains & dual motors',
      image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
      icon: <Zap className="w-5 h-5 text-emerald-400" />,
      action: () => {
        resetFilters();
        setFilters(prev => ({ ...prev, fuelType: ['Hybrid', 'Plug-in Hybrid'] }));
        navigateTo('gallery');
      }
    },
    {
      id: 'Commercial',
      title: 'Commercial',
      desc: 'Fleet transporters, cargo vans & business haulers',
      image: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=800&q=80',
      icon: <Briefcase className="w-5 h-5 text-[#00C9CE]" />,
      action: () => {
        resetFilters();
        setFilters(prev => ({ ...prev, searchQuery: 'commercial' }));
        navigateTo('gallery');
      }
    },
    {
      id: 'Electric',
      title: 'Electric',
      desc: '100% zero-emission next-generation EVs',
      image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800&q=80',
      icon: <Zap className="w-5 h-5 text-[#00C9CE]" />,
      action: () => {
        resetFilters();
        setFilters(prev => ({ ...prev, fuelType: ['Electric'] }));
        navigateTo('gallery');
      }
    },
  ];

  return (
    <section className="py-14 sm:py-20 bg-[#FCF9F4] text-[#1E3063] border-b border-[#E8E1D5] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-6 border-b border-[#E2D8C7]">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E3063]/10 border border-[#1E3063]/20 text-[#1E3063] font-mono font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#00C9CE]" />
              <span>CATEGORIES</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#1E3063] font-serif tracking-tight">
              Browse by Category
            </h2>
            <p className="text-xs sm:text-sm text-[#6B7A99] font-sans font-medium">
              Filter Kenya's verified inventory by body style and drive type.
            </p>
          </div>

          <button
            onClick={() => {
              resetFilters();
              navigateTo('gallery');
            }}
            className="px-6 py-3 bg-[#1E3063] hover:bg-[#121D33] text-white font-mono font-black text-xs uppercase tracking-wider rounded-2xl border border-[#1E3063] shadow-md inline-flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <span>View All Categories</span>
            <ArrowRight className="w-4 h-4 text-[#00C9CE]" />
          </button>
        </div>

        {/* Category Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={cat.action}
              className="group relative h-56 rounded-3xl overflow-hidden border border-[#E2D8C7] shadow-xs hover:border-[#00C9CE] hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col justify-end p-5"
            >
              {/* Background Image */}
              <img
                src={cat.image}
                alt={cat.title}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 select-none"
                referrerPolicy="no-referrer"
              />

              {/* Dark Vignette Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1628]/95 via-[#0B1628]/60 to-transparent transition-opacity group-hover:opacity-90" />

              {/* Content */}
              <div className="relative z-10 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center">
                    {cat.icon}
                  </div>
                  <span className="text-[10px] font-mono font-black px-2.5 py-1 rounded-full bg-[#00C9CE]/20 text-[#00C9CE] uppercase tracking-wider group-hover:bg-[#00C9CE] group-hover:text-[#1E3063] transition-colors">
                    Explore →
                  </span>
                </div>

                <h3 className="text-xl font-serif font-black text-white group-hover:text-[#00C9CE] transition-colors">
                  {cat.title}
                </h3>

                <p className="text-xs text-slate-300 font-sans font-medium line-clamp-1">
                  {cat.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
