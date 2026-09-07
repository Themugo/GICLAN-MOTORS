import type React from 'react';
import { useState } from 'react';
import { Search, SlidersHorizontal, ArrowRight, ShieldCheck, MapPin, DollarSign, Calendar, Fuel, Gauge, Car } from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { BodyStyle, FuelType, TransmissionType } from '../../types';
import type { FC } from 'react';

export const GlobalSearchSection: FC = () => {
  const { navigateTo, setFilters, resetFilters } = useMarketplace();

  const [keyword, setKeyword] = useState('');
  const [selectedMake, setSelectedMake] = useState<string>('all');
  const [selectedBodyStyle, setSelectedBodyStyle] = useState<string>('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedFuel, setSelectedFuel] = useState<string>('all');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [isExpandedFilters, setIsExpandedFilters] = useState(false);

  const makes = ['Toyota', 'Land Rover', 'Porsche', 'Mercedes-Benz', 'BMW', 'Subaru', 'Lexus', 'Nissan', 'Ford', 'Audi'];
  const locations = ['Nairobi', 'Mombasa', 'Eldoret', 'Nakuru', 'Kisumu', 'Thika'];

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    resetFilters();

    setFilters(prev => {
      const updated = { ...prev };

      if (keyword.trim()) {
        updated.searchQuery = keyword.trim();
      }

      if (selectedMake !== 'all') {
        updated.makes = [selectedMake];
      }

      if (selectedBodyStyle !== 'all') {
        updated.bodyStyles = [selectedBodyStyle as BodyStyle];
      }

      if (selectedFuel !== 'all') {
        updated.fuelType = [selectedFuel];
      }

      if (selectedYear !== 'all') {
        const yearNum = parseInt(selectedYear, 10);
        if (!isNaN(yearNum)) {
          updated.minYear = yearNum;
        }
      }

      if (selectedPriceRange !== 'all') {
        if (selectedPriceRange === 'under_2m') {
          updated.maxPrice = 2000000;
        } else if (selectedPriceRange === '2m_5m') {
          updated.minPrice = 2000000;
          updated.maxPrice = 5000000;
        } else if (selectedPriceRange === '5m_10m') {
          updated.minPrice = 5000000;
          updated.maxPrice = 10000000;
        } else if (selectedPriceRange === 'above_10m') {
          updated.minPrice = 10000000;
          updated.maxPrice = 100000000;
        }
      }

      return updated;
    });

    navigateTo('gallery');
  };

  return (
    <section className="relative z-30 -mt-8 sm:-mt-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="bg-[#1E3063] dark:bg-[#121D33] text-white rounded-3xl p-4 sm:p-6 shadow-2xl border border-white/20 dark:border-white/10 backdrop-blur-xl space-y-4">
        
        {/* Top Search Input & Quick Filters */}
        <form onSubmit={handleSearch} className="flex flex-col lg:flex-row items-center gap-3">
          
          {/* Main Keyword Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#00C9CE]" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by make, model, VIN, or keyword (e.g. Prado TX, Land Cruiser V8)..."
              className="w-full pl-12 pr-4 py-3.5 bg-[#2A3B7A] dark:bg-[#0B132B] text-white placeholder-slate-300 dark:placeholder-slate-400 rounded-2xl text-xs sm:text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#00C9CE] border border-white/15 transition-all"
            />
          </div>

          {/* Quick Dropdowns Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full lg:w-auto">
            
            {/* Make Selector */}
            <select
              value={selectedMake}
              onChange={(e) => setSelectedMake(e.target.value)}
              className="px-3 py-3 bg-[#2A3B7A] dark:bg-[#0B132B] text-white rounded-2xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#00C9CE] border border-white/15 cursor-pointer"
            >
              <option value="all" className="bg-[#1E3063] text-white">All Brands</option>
              {makes.map((make) => (
                <option key={make} value={make} className="bg-[#1E3063] text-white">
                  {make}
                </option>
              ))}
            </select>

            {/* Price Range Selector */}
            <select
              value={selectedPriceRange}
              onChange={(e) => setSelectedPriceRange(e.target.value)}
              className="px-3 py-3 bg-[#2A3B7A] dark:bg-[#0B132B] text-white rounded-2xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#00C9CE] border border-white/15 cursor-pointer"
            >
              <option value="all" className="bg-[#1E3063] text-white">Any Budget</option>
              <option value="under_2m" className="bg-[#1E3063] text-white">Under KES 2M</option>
              <option value="2m_5m" className="bg-[#1E3063] text-white">KES 2M - 5M</option>
              <option value="5m_10m" className="bg-[#1E3063] text-white">KES 5M - 10M</option>
              <option value="above_10m" className="bg-[#1E3063] text-white">Above KES 10M</option>
            </select>

            {/* Body Style */}
            <select
              value={selectedBodyStyle}
              onChange={(e) => setSelectedBodyStyle(e.target.value)}
              className="px-3 py-3 bg-[#2A3B7A] dark:bg-[#0B132B] text-white rounded-2xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#00C9CE] border border-white/15 cursor-pointer col-span-2 sm:col-span-1"
            >
              <option value="all" className="bg-[#1E3063] text-white">All Body Styles</option>
              <option value="SUV" className="bg-[#1E3063] text-white">SUV / 4x4</option>
              <option value="Sedan" className="bg-[#1E3063] text-white">Sedan / Luxury</option>
              <option value="Truck" className="bg-[#1E3063] text-white">Pickup / Commercial</option>
              <option value="Coupe" className="bg-[#1E3063] text-white">Coupe / Sports</option>
              <option value="Hatchback" className="bg-[#1E3063] text-white">Hatchback</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setIsExpandedFilters(!isExpandedFilters)}
              className={`p-3.5 rounded-2xl border transition-colors cursor-pointer flex items-center justify-center ${
                isExpandedFilters
                  ? 'bg-[#00C9CE] text-[#1E3063] border-[#00C9CE]'
                  : 'bg-[#2A3B7A] text-slate-200 border-white/15 hover:bg-white/10'
              }`}
              title="More Filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <button
              type="submit"
              className="flex-1 lg:flex-none px-6 py-3.5 bg-[#00C9CE] hover:bg-[#00B0B5] text-[#1E3063] font-mono font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.02] cursor-pointer shrink-0"
            >
              <span>Search Verified Vehicles</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

        </form>

        {/* Expanded Filters Section */}
        {isExpandedFilters && (
          <div className="pt-3 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fadeIn">
            
            <div>
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 block mb-1">
                Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-3 py-2 bg-[#2A3B7A] dark:bg-[#0B132B] text-white rounded-xl text-xs font-mono font-bold border border-white/15 focus:outline-none"
              >
                <option value="all">All Kenya</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 block mb-1">
                Min Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 bg-[#2A3B7A] dark:bg-[#0B132B] text-white rounded-xl text-xs font-mono font-bold border border-white/15 focus:outline-none"
              >
                <option value="all">Any Year</option>
                <option value="2024">2024+</option>
                <option value="2022">2022+</option>
                <option value="2020">2020+</option>
                <option value="2018">2018+</option>
                <option value="2015">2015+</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 block mb-1">
                Fuel Type
              </label>
              <select
                value={selectedFuel}
                onChange={(e) => setSelectedFuel(e.target.value)}
                className="w-full px-3 py-2 bg-[#2A3B7A] dark:bg-[#0B132B] text-white rounded-xl text-xs font-mono font-bold border border-white/15 focus:outline-none"
              >
                <option value="all">Any Fuel</option>
                <option value="Gasoline">Petrol / Gasoline</option>
                <option value="Diesel">Diesel</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Electric">Electric</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 block mb-1">
                Condition
              </label>
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="w-full px-3 py-2 bg-[#2A3B7A] dark:bg-[#0B132B] text-white rounded-xl text-xs font-mono font-bold border border-white/15 focus:outline-none"
              >
                <option value="all">Any Condition</option>
                <option value="New">Brand New</option>
                <option value="Like New">Like New</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
              </select>
            </div>

          </div>
        )}

        {/* Footer info pill inside search card */}
        <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 font-sans">
          <div className="flex items-center gap-1.5 text-[#00C9CE]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00C9CE]" />
            <span className="font-mono font-bold">100% Verified Inventory • CBK Bank Escrow Protected</span>
          </div>
          <span className="hidden sm:inline text-slate-400 font-mono">
            Directly linked to KRA & NTSA verification systems
          </span>
        </div>

      </div>
    </section>
  );
};
