import { useState, useMemo } from 'react';
import { 
  LayoutGrid, 
  List, 
  SlidersHorizontal, 
  ArrowUpDown, 
  ShieldCheck, 
  Search, 
  Sparkles, 
  X,
  CheckCircle2,
  Lock,
  Car,
  ChevronDown
} from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { FilterSidebar } from './FilterSidebar';
import { VehicleCard } from './VehicleCard';
import { SearchBar } from '../ui/SearchBar';
import type { FC } from 'react';

export const GalleryPage: FC = () => {
  const { vehicles, filters, setFilters, resetFilters } = useMarketplace();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Filter & Sort Logic
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      // Search Query
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase().trim();
        const matchesTitle = vehicle.title?.toLowerCase().includes(q);
        const matchesMake = vehicle.make?.toLowerCase().includes(q);
        const matchesModel = vehicle.model?.toLowerCase().includes(q);
        const matchesVin = vehicle.vin?.toLowerCase().includes(q);
        const matchesLocation = vehicle.location?.toLowerCase().includes(q);
        const matchesSeller = vehicle.sellerName?.toLowerCase().includes(q);
        const matchesBody = vehicle.bodyStyle?.toLowerCase().includes(q);
        const matchesEngine = vehicle.engine?.toLowerCase().includes(q);
        const matchesFuel = vehicle.fuelType?.toLowerCase().includes(q);
        const matchesTrans = vehicle.transmission?.toLowerCase().includes(q);

        if (
          !matchesTitle &&
          !matchesMake &&
          !matchesModel &&
          !matchesVin &&
          !matchesLocation &&
          !matchesSeller &&
          !matchesBody &&
          !matchesEngine &&
          !matchesFuel &&
          !matchesTrans
        ) {
          return false;
        }
      }

      // Makes / Brands
      if (filters.makes.length > 0 && !filters.makes.includes(vehicle.make)) {
        return false;
      }

      // Body Styles
      if (filters.bodyStyles.length > 0 && !filters.bodyStyles.includes(vehicle.bodyStyle)) {
        return false;
      }

      // Price Filter
      const vehiclePrice = vehicle.currentBid || vehicle.price;
      if (vehiclePrice > filters.maxPrice) {
        return false;
      }

      // Fuel Type Filter
      if (filters.fuelType && filters.fuelType.length > 0) {
        if (!filters.fuelType.includes(vehicle.fuelType)) {
          return false;
        }
      }

      // Transmission Filter
      if (filters.transmission && filters.transmission.length > 0) {
        if (!filters.transmission.includes(vehicle.transmission)) {
          return false;
        }
      }

      // Listing Format
      if (filters.listingType === 'auction' && vehicle.listingType === 'fixed') return false;
      if (filters.listingType === 'fixed' && vehicle.listingType === 'auction') return false;

      // Certified Only
      if (filters.certifiedOnly && (!vehicle.inspection || vehicle.inspection.score < 80)) return false;

      return true;
    }).sort((a, b) => {
      const priceA = a.currentBid || a.price;
      const priceB = b.currentBid || b.price;

      if (filters.sortBy === 'newest') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (filters.sortBy === 'price_desc') return priceB - priceA;
      if (filters.sortBy === 'price_asc') return priceA - priceB;
      if (filters.sortBy === 'year_desc') return b.year - a.year;
      if (filters.sortBy === 'mileage_asc') return a.mileage - b.mileage;
      return 0;
    });
  }, [vehicles, filters]);

  const activeFiltersCount = 
    (filters.searchQuery ? 1 : 0) +
    filters.makes.length +
    filters.bodyStyles.length +
    (filters.certifiedOnly ? 1 : 0) +
    (filters.listingType !== 'all' ? 1 : 0) +
    (filters.fuelType?.length || 0);

  return (
    <div className="pt-3 sm:pt-5 pb-10 sm:pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-5 sm:space-y-6 bg-[#FCF9F4] text-[#2E4080] font-sans min-h-screen">
      
      {/* KAYAD Premium Showroom Hero Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#2E4080] text-white border border-white/10 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#23EBFF]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-1.5 max-w-2xl text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#23EBFF]/20 text-[#23EBFF] text-[10px] font-mono font-black uppercase tracking-[0.2em] border border-[#23EBFF]/30">
            <Sparkles className="w-3 h-3 text-[#23EBFF]" />
            <span>KENYA'S EXCLUSIVE AUTOMOTIVE MARKETPLACE</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-serif font-black text-white tracking-tight uppercase leading-snug">
            KAYAD Premium Showroom
          </h1>

          <p className="text-xs sm:text-sm text-slate-200 font-sans font-medium max-w-xl leading-relaxed">
            Curated luxury stock, transparent pricing, M-Pesa escrow protected transactions.
          </p>
        </div>

        {/* Right side trust badges */}
        <div className="relative z-10 flex sm:flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto">
          <div className="flex-1 md:flex-none px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-2.5 text-xs text-white">
            <ShieldCheck className="w-4 h-4 text-[#23EBFF] shrink-0" />
            <div>
              <p className="font-mono font-black text-[9px] uppercase text-[#23EBFF] leading-none">M-Pesa Escrow</p>
              <p className="text-[11px] font-medium text-slate-200">100% Guaranteed</p>
            </div>
          </div>

          <div className="flex-1 md:flex-none px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-2.5 text-xs text-white">
            <Car className="w-4 h-4 text-[#3ddb72] shrink-0" />
            <div>
              <p className="font-mono font-black text-[9px] uppercase text-[#3ddb72] leading-none">150-Pt Audited</p>
              <p className="text-[11px] font-medium text-slate-200">Verified Condition</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Search & Control Toolbar */}
      <SearchBar
        value={filters.searchQuery}
        onChange={q => setFilters(prev => ({ ...prev, searchQuery: q }))}
        placeholder="Search make, model, VIN, or city..."
        resultCount={filteredVehicles.length}
        badgeLabel="KAYAD SHOWROOM INVENTORY"
        filterOptions={[
          { id: 'all', label: 'All Stock' },
          { id: 'fixed', label: 'Direct Buy' },
          { id: 'auction', label: 'Live Auctions' },
        ]}
        activeFilter={filters.listingType}
        onFilterChange={type => setFilters(prev => ({ ...prev, listingType: type as any }))}
        sortOptions={[
          { id: 'newest', label: 'Newest Arrivals' },
          { id: 'price_desc', label: 'Price: High to Low' },
          { id: 'price_asc', label: 'Price: Low to High' },
          { id: 'year_desc', label: 'Newest Model Year' },
          { id: 'mileage_asc', label: 'Lowest Mileage' },
        ]}
        activeSort={filters.sortBy === 'featured' ? 'newest' : filters.sortBy}
        onSortChange={sort => setFilters(prev => ({ ...prev, sortBy: sort as any }))}
        viewMode={viewMode}
        onViewModeChange={mode => setViewMode(mode)}
        onMobileFilterToggle={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
      />

      {/* Main Showroom Content Layout */}
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Sidebar ("REFINE") */}
        <div className="hidden lg:block shrink-0">
          <FilterSidebar />
        </div>

        {/* Mobile Filter Drawer */}
        {isMobileFilterOpen && (
          <div className="lg:hidden mb-6">
            <FilterSidebar />
          </div>
        )}

        {/* Showroom Vehicle Grid */}
        <div className="flex-1 min-w-0 space-y-5">
          
          {/* Results Count Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 pb-2 border-b border-[#E2D8C7]/70">
            <div className="flex items-center gap-3">
              <span className="text-base sm:text-lg font-serif font-black text-[#2E4080]">
                {filteredVehicles.length} {filteredVehicles.length === 1 ? 'vehicle' : 'vehicles'} available
              </span>
              {activeFiltersCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-xs font-bold text-[#23EBFF] hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                >
                  Clear filters ({activeFiltersCount})
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-[#6B7A99] font-bold">
              <span className="flex items-center gap-1.5 text-[#2E4080] bg-white px-3 py-1 rounded-full border border-[#E2D8C7] shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-[#23EBFF]" />
                100% Escrow Protected
              </span>
            </div>
          </div>

          {/* Grid Layout */}
          {filteredVehicles.length === 0 ? (
            <div className="p-12 text-center bg-white border border-[#E2D8C7] rounded-3xl space-y-4 shadow-sm my-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#2E4080]/10 flex items-center justify-center text-[#2E4080]">
                <Car className="w-8 h-8 text-[#23EBFF]" />
              </div>
              <h3 className="text-xl font-black text-[#2E4080] font-serif">
                No matching vehicles were found. Adjust your filters or explore our latest certified arrivals.
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Try clearing active filters or adjusting your budget slider to view all verified stock in our vault.
              </p>
              <button
                onClick={resetFilters}
                className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2E4080] text-white font-extrabold text-xs shadow-md hover:bg-[#1B2647] transition-all cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-7 items-stretch'
                  : 'space-y-4'
              }
            >
              {filteredVehicles.map(vehicle => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} viewMode={viewMode} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


