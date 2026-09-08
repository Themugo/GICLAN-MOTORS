import { useState } from 'react';
import { Filter, RotateCcw, Check, Search, ShieldCheck, Tag, Car, Zap, ChevronDown, MapPin, Sparkles } from 'lucide-react';
import { useMarketplace, FilterState } from '../../context/MarketplaceContext';
import { TransmissionType, FuelType, BodyStyle } from '../../types';
import type { FC } from 'react';

export const FilterSidebar: FC = () => {
  const { vehicles, filters, setFilters, resetFilters } = useMarketplace();

  // Collapsible accordion states
  const [openSection, setOpenSection] = useState<{ [key: string]: boolean }>({
    brand: true,
    body: true,
    transmission: true,
    fuel: false,
    city: false,
    price: true,
  });

  const toggleSection = (key: string) => {
    setOpenSection(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const availableMakes = [
    'Toyota',
    'Mercedes-Benz',
    'Honda',
    'Mazda',
    'Subaru',
    'Land Rover',
    'Porsche',
    'BMW',
    'Ferrari',
    'Lexus',
    'Audi',
    'Ford'
  ];

  const bodyStyles: BodyStyle[] = ['SUV', 'Sedan', 'Coupe', 'Truck', 'Convertible', 'Hatchback'];
  const transmissions: TransmissionType[] = ['Automatic', 'Manual', 'Dual-Clutch', 'CVT'];
  const cities = ['Nairobi', 'Mombasa', 'Nakuru', 'Eldoret', 'Kisumu'];

  const fuelTypes: { id: FuelType; label: string }[] = [
    { id: 'Gasoline', label: 'Petrol' },
    { id: 'Diesel', label: 'Diesel' },
    { id: 'Hybrid', label: 'Hybrid' },
    { id: 'Electric', label: 'EV Electric' },
  ];

  // Category counts
  const totalCount = vehicles.length;

  const handleMakeToggle = (m: string) => {
    setFilters(prev => {
      const exists = prev.makes.includes(m);
      return {
        ...prev,
        makes: exists ? prev.makes.filter(item => item !== m) : [...prev.makes, m]
      };
    });
  };

  const handleBodyStyleToggle = (style: BodyStyle) => {
    setFilters(prev => {
      const exists = prev.bodyStyles.includes(style);
      return {
        ...prev,
        bodyStyles: exists ? prev.bodyStyles.filter(item => item !== style) : [...prev.bodyStyles, style]
      };
    });
  };

  const handleTransmissionToggle = (trans: TransmissionType) => {
    setFilters(prev => {
      const current = prev.transmission || [];
      const exists = current.includes(trans);
      return {
        ...prev,
        transmission: exists ? current.filter(t => t !== trans) : [...current, trans]
      };
    });
  };

  const handleFuelToggle = (fuel: FuelType) => {
    setFilters(prev => {
      const exists = prev.fuelType?.includes(fuel);
      const current = prev.fuelType || [];
      return {
        ...prev,
        fuelType: exists ? current.filter(f => f !== fuel) : [...current, fuel]
      };
    });
  };

  return (
    <aside className="w-full lg:w-72 bg-white border border-[#E2D8C7] rounded-2xl p-4 sm:p-5 space-y-5 shrink-0 h-fit shadow-xs text-[#2E4080]">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#EFE8DA]">
        <div className="flex items-center gap-2 font-bold text-[#2E4080] font-serif text-sm uppercase tracking-wide">
          <Filter className="w-4 h-4 text-[#23EBFF]" />
          <span>MARKET FILTERS</span>
        </div>
        <button
          onClick={resetFilters}
          className="text-xs text-[#23EBFF] hover:underline font-bold flex items-center gap-1 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* FULL MARKET CATALOG SUMMARY BOX */}
      <div className="space-y-1.5 bg-[#2E4080]/5 p-3.5 rounded-2xl border border-[#2E4080]/10">
        <div className="flex items-center justify-between text-xs font-bold text-[#2E4080]">
          <span className="flex items-center gap-1.5 font-serif text-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#23EBFF]" />
            Full Market Catalog
          </span>
          <span className="text-[11px] font-mono font-bold bg-[#2E4080] text-white px-2 py-0.5 rounded-lg">
            {totalCount} Cars
          </span>
        </div>
        <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
          Filter by Make, Model, Transmission, Fuel, Body & Budget.
        </p>
      </div>

      {/* FILTERS SECTION ACCORDIONS */}
      <div className="space-y-3 pt-1">
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#6B7A99] block">
          SPECIFICATIONS
        </span>

        {/* Brand Accordion */}
        <div className="border border-[#E2D8C7] rounded-xl overflow-hidden bg-[#F4EFE6]/40 shadow-2xs">
          <button
            onClick={() => toggleSection('brand')}
            className="w-full p-3 flex items-center justify-between text-xs sm:text-sm font-bold text-[#2E4080] bg-[#F4EFE6]/70 hover:bg-[#F4EFE6] transition-colors cursor-pointer"
          >
            <span className="font-serif">Brand / Manufacturer</span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${openSection.brand ? 'rotate-180' : ''}`} />
          </button>
          {openSection.brand && (
            <div className="p-2 space-y-1 max-h-48 overflow-y-auto no-scrollbar border-t border-[#E2D8C7]/60 bg-white">
              {availableMakes.map(make => {
                const isChecked = filters.makes.includes(make);
                return (
                  <button
                    key={make}
                    onClick={() => handleMakeToggle(make)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs sm:text-sm font-semibold transition-all text-left cursor-pointer ${
                      isChecked ? 'bg-[#2E4080] text-white shadow-2xs' : 'text-[#2E4080] hover:bg-[#F4EFE6]'
                    }`}
                  >
                    <span>{make}</span>
                    {isChecked && <Check className="w-3.5 h-3.5 text-[#23EBFF]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Transmission Accordion */}
        <div className="border border-[#E2D8C7] rounded-xl overflow-hidden bg-[#F4EFE6]/40 shadow-2xs">
          <button
            onClick={() => toggleSection('transmission')}
            className="w-full p-3 flex items-center justify-between text-xs sm:text-sm font-bold text-[#2E4080] bg-[#F4EFE6]/70 hover:bg-[#F4EFE6] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5 font-serif">
              <span>Transmission</span>
              {filters.transmission && filters.transmission.length > 0 && (
                <span className="px-1.5 py-0.5 bg-[#23EBFF] text-[#2E4080] rounded-full text-[10px] font-mono font-bold">
                  {filters.transmission.length}
                </span>
              )}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${openSection.transmission ? 'rotate-180' : ''}`} />
          </button>
          {openSection.transmission && (
            <div className="p-2 space-y-1 border-t border-[#E2D8C7]/60 bg-white">
              {transmissions.map(trans => {
                const isSelected = filters.transmission?.includes(trans);
                return (
                  <button
                    key={trans}
                    onClick={() => handleTransmissionToggle(trans)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      isSelected ? 'bg-[#2E4080] text-white shadow-2xs' : 'text-[#2E4080] hover:bg-[#F4EFE6]'
                    }`}
                  >
                    <span>{trans}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#23EBFF]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Body Type Accordion */}
        <div className="border border-[#E2D8C7] rounded-xl overflow-hidden bg-[#F4EFE6]/40 shadow-2xs">
          <button
            onClick={() => toggleSection('body')}
            className="w-full p-3 flex items-center justify-between text-xs sm:text-sm font-bold text-[#2E4080] bg-[#F4EFE6]/70 hover:bg-[#F4EFE6] transition-colors cursor-pointer"
          >
            <span className="font-serif">Body Configuration</span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${openSection.body ? 'rotate-180' : ''}`} />
          </button>
          {openSection.body && (
            <div className="p-2.5 flex flex-wrap gap-1.5 border-t border-[#E2D8C7]/60 bg-white">
              {bodyStyles.map(style => {
                const isSelected = filters.bodyStyles.includes(style);
                return (
                  <button
                    key={style}
                    onClick={() => handleBodyStyleToggle(style)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#2E4080] text-white shadow-2xs'
                        : 'border border-[#E2D8C7] text-[#2E4080] hover:bg-[#F4EFE6]'
                    }`}
                  >
                    {style}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Fuel Accordion */}
        <div className="border border-[#E2D8C7] rounded-xl overflow-hidden bg-[#F4EFE6]/40 shadow-2xs">
          <button
            onClick={() => toggleSection('fuel')}
            className="w-full p-3 flex items-center justify-between text-xs sm:text-sm font-bold text-[#2E4080] bg-[#F4EFE6]/70 hover:bg-[#F4EFE6] transition-colors cursor-pointer"
          >
            <span className="font-serif">Fuel & Powertrain</span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${openSection.fuel ? 'rotate-180' : ''}`} />
          </button>
          {openSection.fuel && (
            <div className="p-2 space-y-1 border-t border-[#E2D8C7]/60 bg-white">
              {fuelTypes.map(f => {
                const isSelected = filters.fuelType?.includes(f.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => handleFuelToggle(f.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      isSelected ? 'bg-[#2E4080] text-white shadow-2xs' : 'text-[#2E4080] hover:bg-[#F4EFE6]'
                    }`}
                  >
                    <span>{f.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#23EBFF]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* City / Location Accordion */}
        <div className="border border-[#E2D8C7] rounded-xl overflow-hidden bg-[#F4EFE6]/40 shadow-2xs">
          <button
            onClick={() => toggleSection('city')}
            className="w-full p-3 flex items-center justify-between text-xs sm:text-sm font-bold text-[#2E4080] bg-[#F4EFE6]/70 hover:bg-[#F4EFE6] transition-colors cursor-pointer"
          >
            <span className="font-serif">City / Hub</span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${openSection.city ? 'rotate-180' : ''}`} />
          </button>
          {openSection.city && (
            <div className="p-2 space-y-1 border-t border-[#E2D8C7]/60 bg-white">
              {cities.map(city => {
                const isSelected = filters.searchQuery.toLowerCase() === city.toLowerCase();
                return (
                  <button
                    key={city}
                    onClick={() => setFilters(prev => ({ ...prev, searchQuery: isSelected ? '' : city }))}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      isSelected ? 'bg-[#2E4080] text-white shadow-2xs' : 'text-[#2E4080] hover:bg-[#F4EFE6]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#23EBFF]" />
                      {city}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#23EBFF]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Max Price Slider */}
        <div className="border border-[#E2D8C7] rounded-xl p-3.5 bg-[#F4EFE6]/60 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-[#2E4080] font-serif">Max Budget</span>
            <span className="font-mono font-bold text-xs text-[#2E4080] bg-[#23EBFF]/20 border border-[#23EBFF]/40 px-2 py-0.5 rounded-lg">
              {filters.maxPrice < 1000000
                ? `KES ${(filters.maxPrice / 1000).toLocaleString()}K`
                : `KES ${(filters.maxPrice / 1000000).toFixed(1)}M`}
            </span>
          </div>
          <input
            type="range"
            min="450000"
            max="60000000"
            step="500000"
            value={filters.maxPrice}
            onChange={e => setFilters(prev => ({ ...prev, maxPrice: parseFloat(e.target.value) }))}
            className="w-full accent-[#2E4080] cursor-pointer h-2 bg-[#E2D8C7] rounded-lg"
          />
        </div>

        {/* Ghost Check Verification Toggle */}
        <label className="flex items-center justify-between text-xs sm:text-sm font-bold text-[#2E4080] cursor-pointer p-3 rounded-xl bg-[#F4EFE6] border border-[#E2D8C7] shadow-2xs hover:border-[#2E4080] transition-all">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            150-Pt Inspected Vehicles
          </span>
          <input
            type="checkbox"
            checked={filters.certifiedOnly}
            onChange={e => setFilters(prev => ({ ...prev, certifiedOnly: e.target.checked }))}
            className="w-4 h-4 accent-[#2E4080] rounded cursor-pointer"
          />
        </label>
      </div>
    </aside>
  );
};


