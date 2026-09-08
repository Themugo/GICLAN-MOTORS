import type React from 'react';
import { useState } from 'react';
import { Sparkles, ArrowRight, Search, ShieldCheck } from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { VehicleCard } from '../gallery/VehicleCard';
import { FeaturedVehiclesSkeleton } from '../ui/Skeleton';
import type { FC } from 'react';

interface FeaturedVehiclesProps {
  isLoading?: boolean;
}

export const FeaturedVehicles: FC<FeaturedVehiclesProps> = ({ isLoading: propsIsLoading }) => {
  const { vehicles, navigateTo, setFilters, resetFilters, isLoading: contextIsLoading } = useMarketplace();
  const isLoading = propsIsLoading ?? contextIsLoading;
  const [activeFilter, setActiveFilter] = useState<'All' | 'SUV' | 'Pickup' | 'Auctions'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  if (isLoading) {
    return <FeaturedVehiclesSkeleton />;
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      resetFilters();
      setFilters(prev => ({ ...prev, searchQuery: searchQuery.trim() }));
      navigateTo('gallery');
    }
  };

  const filteredVehicles = vehicles.filter(v => {
    // Quick search text match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        v.title.toLowerCase().includes(q) ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.location.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    if (activeFilter === 'SUV') return v.bodyStyle === 'SUV' || v.model?.includes('Cruiser') || v.model?.includes('Rover') || v.model?.includes('Cayenne');
    if (activeFilter === 'Pickup') return v.bodyStyle === 'Truck' || v.model?.includes('Hilux') || v.model?.includes('Pickup');
    if (activeFilter === 'Auctions') return v.listingType === 'auction' || v.listingType === 'both';
    return true;
  });

  return (
    <section className="bg-[#FCF9F4] pt-4 sm:pt-6 pb-8 sm:pb-12 px-4 sm:px-6 lg:px-8 border-b border-[#E8E1D5] transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Section Header & Search Bar Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[#E8E1D5]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2E4080]/10 border border-[#2E4080]/20 text-[#2E4080] font-mono font-black text-[10px] sm:text-xs tracking-wider uppercase mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#23EBFF]" />
              <span>PREMIUM VERIFIED SELECTION</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#2E4080] font-serif tracking-tight">
              Featured Vehicles
            </h2>
            <p className="text-xs sm:text-sm text-[#6B7A99] font-sans font-medium mt-0.5">
              Handpicked quality luxury & utility vehicles across Kenya, verified by 150-point inspection.
            </p>
          </div>

          {/* Compact Inline Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7A99]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Toyota, Prado, Land Rover..."
              className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-white border border-[#E2D8C7] text-[#2E4080] placeholder-[#6B7A99]/70 text-xs font-sans font-medium focus:outline-none focus:border-[#23EBFF] focus:ring-2 focus:ring-[#23EBFF]/20 transition-all shadow-xs"
            />
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-[#2E4080] hover:bg-[#1B2647] text-white text-[10px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {(['All', 'SUV', 'Pickup', 'Auctions'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeFilter === filter
                    ? 'bg-[#2E4080] text-white shadow-md border border-[#2E4080]'
                    : 'bg-white border border-[#E2D8C7] text-[#2E4080] hover:bg-[#F6F1E8]'
                }`}
              >
                {filter.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>150-Point Inspection Guaranteed</span>
          </div>
        </div>

        {/* 4-Column Vehicles Grid */}
        {filteredVehicles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {filteredVehicles.slice(0, 8).map(vehicle => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#E8E1D5] p-6 space-y-3">
            <p className="text-sm font-mono text-[#6B7A99]">
              No vehicles matched your quick search "{searchQuery}".
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 bg-[#2E4080] text-white text-xs font-mono font-bold rounded-xl cursor-pointer"
            >
              Clear Search Filter
            </button>
          </div>
        )}

        {/* Browse All CTA Button */}
        <div className="text-center pt-2">
          <button
            onClick={() => navigateTo('gallery')}
            className="px-8 py-3.5 rounded-2xl bg-[#2E4080] hover:bg-[#1B2647] text-white font-mono font-black text-xs uppercase tracking-wider transition-all inline-flex items-center gap-2 shadow-lg cursor-pointer hover:scale-[1.02]"
          >
            <span>Browse Full Marketplace Inventory</span>
            <ArrowRight className="w-4 h-4 text-[#23EBFF]" />
          </button>
        </div>

      </div>
    </section>
  );
};

