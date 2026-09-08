import React, { useState, useMemo } from 'react';
import {
  Search,
  RotateCcw,
  SlidersHorizontal,
  X,
  Check,
  Car,
  DollarSign,
  ChevronDown,
  Filter,
  MapPin,
  Calendar,
  Fuel,
  ShieldCheck,
  FileCheck,
  Gavel,
  Building2,
  Zap,
  Tag
} from 'lucide-react';
import { Vehicle } from '../types';
import { Button, Select, Input } from './ui';

export interface VehicleDiscoveryConsoleProps {
  vehicles: Vehicle[];

  // Keyword
  searchQuery: string;
  onSearchChange: (q: string) => void;

  // Make & Model
  selectedMake: string;
  onMakeChange: (make: string) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;

  // Price Range (Dual Slider)
  minPrice: number;
  maxPrice: number;
  onPriceRangeChange: (min: number, max: number) => void;

  // Advanced Filters (Progressive Disclosure)
  selectedTransmission: string;
  onTransmissionChange: (trans: string) => void;

  selectedBodyStyle: string;
  onBodyStyleChange: (body: string) => void;

  selectedFuel: string;
  onFuelChange: (fuel: string) => void;

  selectedSellerType: string;
  onSellerTypeChange: (seller: string) => void;

  selectedLocation: string;
  onLocationChange: (loc: string) => void;

  selectedCondition: string;
  onConditionChange: (cond: string) => void;

  minYear: number;
  maxYear: number;
  onYearRangeChange: (min: number, max: number) => void;

  selectedListingType: string;
  onListingTypeChange: (type: string) => void;

  onSearchSubmit: () => void;
  onResetFilters: () => void;
}

export const VehicleDiscoveryConsole: React.FC<VehicleDiscoveryConsoleProps> = ({
  vehicles,
  searchQuery,
  onSearchChange,
  selectedMake,
  onMakeChange,
  selectedModel,
  onModelChange,
  minPrice,
  maxPrice,
  onPriceRangeChange,
  selectedTransmission,
  onTransmissionChange,
  selectedBodyStyle,
  onBodyStyleChange,
  selectedFuel,
  onFuelChange,
  selectedSellerType,
  onSellerTypeChange,
  selectedLocation,
  onLocationChange,
  selectedCondition,
  onConditionChange,
  minYear,
  maxYear,
  onYearRangeChange,
  selectedListingType,
  onListingTypeChange,
  onSearchSubmit,
  onResetFilters
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Dynamic Makes from backend dataset
  const makes = useMemo(() => {
    const list = Array.from(new Set(vehicles.map((v) => v.make).filter(Boolean))).sort();
    return ['All', ...list];
  }, [vehicles]);

  // Dynamic Models (updates when Make changes)
  const models = useMemo(() => {
    const source = selectedMake === 'All'
      ? vehicles
      : vehicles.filter((v) => v.make.toLowerCase() === selectedMake.toLowerCase());
    const list = Array.from(new Set(source.map((v) => v.model).filter(Boolean))).sort();
    return ['All', ...list];
  }, [vehicles, selectedMake]);

  // Dynamic Options for Advanced Filters
  const bodyStyles = useMemo(() => {
    const list = Array.from(new Set(vehicles.map((v) => v.bodyStyle).filter(Boolean))).sort();
    return ['All', ...list];
  }, [vehicles]);

  const fuelTypes = useMemo(() => {
    const list = Array.from(new Set(vehicles.map((v) => v.fuelType).filter(Boolean))).sort();
    return ['All', ...list];
  }, [vehicles]);

  const transmissionOptions = ['All', 'Automatic', 'Manual', 'CVT', 'Semi-Automatic', 'Electric'];
  const conditionOptions = ['All', 'Foreign Used', 'Locally Used', 'Brand New'];
  const sellerTypeOptions = ['All', 'Verified Dealer', 'Private Seller'];

  const locationOptions = useMemo(() => {
    const list = Array.from(new Set(vehicles.map((v) => v.county || v.location).filter(Boolean))).sort();
    return ['All East Africa', ...list];
  }, [vehicles]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set(vehicles.map((v) => v.year).filter(Boolean));
    const yearsList = Array.from(yearsSet) as number[];
    const minAvailable = yearsList.length > 0 ? Math.min(...yearsList, 2005) : 2005;
    const maxAvailable = yearsList.length > 0 ? Math.max(...yearsList, 2026) : 2026;
    const yearsArr: number[] = [];
    for (let y = maxAvailable; y >= minAvailable; y--) {
      yearsArr.push(y);
    }
    return yearsArr;
  }, [vehicles]);

  // Price label formatter
  const formatCompactPrice = (val: number) => {
    if (val >= 1000000) {
      const m = val / 1000000;
      return `Ksh ${m % 1 === 0 ? m : m.toFixed(1)}M`;
    }
    if (val >= 1000) {
      return `Ksh ${(val / 1000).toFixed(0)}K`;
    }
    return `Ksh ${val.toLocaleString('en-KE')}`;
  };

  // Active advanced filters counter
  const activeAdvancedCount = useMemo(() => {
    let count = 0;
    if (selectedLocation !== 'All East Africa') count++;
    if (minYear > 2005 || maxYear < 2026) count++;
    if (selectedTransmission !== 'All') count++;
    if (selectedBodyStyle !== 'All') count++;
    if (selectedFuel !== 'All') count++;
    if (selectedSellerType !== 'All') count++;
    if (selectedCondition !== 'All') count++;
    if (selectedListingType !== 'All') count++;
    return count;
  }, [selectedLocation, minYear, maxYear, selectedTransmission, selectedBodyStyle, selectedFuel, selectedSellerType, selectedCondition, selectedListingType]);

  const handleSearchClick = () => {
    onSearchSubmit();
    setShowAdvanced(false);
  };

  return (
    <div className="bg-white rounded-2xl md:rounded-3xl p-4 sm:p-5 md:p-6 border border-slate-200/90 shadow-lg relative">
      {/* COMPACT HERO HEADER */}
      <div className="flex items-center justify-between gap-3 mb-3.5 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#1E3063] text-amber-400 shrink-0">
            <Car className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg md:text-xl font-black text-[#1E3063] font-display leading-tight">
              Find Your Next Certified Vehicle
            </h1>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Quickly search verified inventory across Kenya & East Africa
            </p>
          </div>
        </div>

        {/* Clear/Reset button when active filters exist */}
        {(activeAdvancedCount > 0 || searchQuery || selectedMake !== 'All' || minPrice > 50000 || maxPrice < 20000000) && (
          <button
            onClick={onResetFilters}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}
      </div>

      {/* VISIBLE QUICK SEARCH HERO CONTROLS */}
      <div className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end">
          {/* 1. Keyword Search */}
          <div className="lg:col-span-3">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
              Keyword
            </label>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Prado, Turbo, Leather..."
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E3063] focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Make Select */}
          <div className="lg:col-span-2">
            <Select
              label="Make"
              value={selectedMake}
              onChange={(e) => {
                onMakeChange(e.target.value);
                onModelChange('All');
              }}
              options={makes.map((m) => ({ value: m, label: m === 'All' ? 'All Makes' : m }))}
            />
          </div>

          {/* 3. Model Select */}
          <div className="lg:col-span-2">
            <Select
              label="Model"
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              options={models.map((m) => ({
                value: m,
                label: m === 'All' ? (selectedMake !== 'All' ? `All ${selectedMake}` : 'All Models') : m
              }))}
            />
          </div>

          {/* 4. Single Dual-Range Price Slider (No manual text boxes) */}
          <div className="lg:col-span-3 bg-slate-50/90 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500">
              <span className="uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-amber-500" />
                Budget
              </span>
              <span className="text-[#1E3063] font-black text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
                {formatCompactPrice(minPrice)} — {formatCompactPrice(maxPrice)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div>
                <input
                  type="range"
                  min={50000}
                  max={20000000}
                  step={100000}
                  value={minPrice}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val <= maxPrice) onPriceRangeChange(val, maxPrice);
                  }}
                  className="w-full accent-[#1E3063] cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  title="Minimum Price"
                />
              </div>
              <div>
                <input
                  type="range"
                  min={50000}
                  max={20000000}
                  step={250000}
                  value={maxPrice}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val >= minPrice) onPriceRangeChange(minPrice, val);
                  }}
                  className="w-full accent-[#1E3063] cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  title="Maximum Price"
                />
              </div>
            </div>
          </div>

          {/* 5. Primary Action Buttons */}
          <div className="lg:col-span-2 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`flex-1 min-h-[42px] font-extrabold text-xs transition-all ${
                showAdvanced || activeAdvancedCount > 0
                  ? 'border-[#1E3063] bg-[#1E3063]/5 text-[#1E3063]'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
              <span>Filters</span>
              {activeAdvancedCount > 0 && (
                <span className="ml-0.5 bg-[#1E3063] text-amber-300 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {activeAdvancedCount}
                </span>
              )}
            </Button>

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleSearchClick}
              className="flex-1 min-h-[42px] bg-[#1E3063] hover:bg-[#17244B] text-white font-black text-xs shadow-md transition-all px-3"
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span>Search</span>
            </Button>
          </div>
        </div>
      </div>

      {/* PROGRESSIVE DISCLOSURE: ADVANCED FILTERS PANEL (Desktop Expandable Panel) */}
      {showAdvanced && (
        <div className="hidden lg:block mt-4 pt-4 border-t border-slate-200/80 animate-fade-in space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-[#1E3063] uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-amber-500" />
              Advanced Refinements
            </p>
            <button
              onClick={() => setShowAdvanced(false)}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Close Panel
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3 text-xs">
            {/* Location / County */}
            <Select
              label="Location / Region"
              value={selectedLocation}
              onChange={(e) => onLocationChange(e.target.value)}
              options={locationOptions.map((l) => ({ value: l, label: l }))}
            />

            {/* Year Range */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Year Range
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={minYear}
                  onChange={(e) => onYearRangeChange(Number(e.target.value), maxYear)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value={2005}>Min (2005)</option>
                  {availableYears.map((y) => (
                    <option key={`desk-min-${y}`} value={y}>{y}</option>
                  ))}
                </select>
                <select
                  value={maxYear}
                  onChange={(e) => onYearRangeChange(minYear, Number(e.target.value))}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value={2026}>Max (2026)</option>
                  {availableYears.map((y) => (
                    <option key={`desk-max-${y}`} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Transmission */}
            <Select
              label="Transmission"
              value={selectedTransmission}
              onChange={(e) => onTransmissionChange(e.target.value)}
              options={transmissionOptions.map((t) => ({ value: t, label: t === 'All' ? 'All Transmissions' : t }))}
            />

            {/* Body Style */}
            <Select
              label="Body Style"
              value={selectedBodyStyle}
              onChange={(e) => onBodyStyleChange(e.target.value)}
              options={bodyStyles.map((b) => ({ value: b, label: b === 'All' ? 'All Body Styles' : b }))}
            />

            {/* Fuel Type */}
            <Select
              label="Fuel Type"
              value={selectedFuel}
              onChange={(e) => onFuelChange(e.target.value)}
              options={fuelTypes.map((f) => ({ value: f, label: f === 'All' ? 'All Fuel Types' : f }))}
            />

            {/* Seller Type */}
            <Select
              label="Seller Type"
              value={selectedSellerType}
              onChange={(e) => onSellerTypeChange(e.target.value)}
              options={sellerTypeOptions.map((s) => ({ value: s, label: s === 'All' ? 'All Sellers' : s }))}
            />

            {/* Condition */}
            <Select
              label="Condition"
              value={selectedCondition}
              onChange={(e) => onConditionChange(e.target.value)}
              options={conditionOptions.map((c) => ({ value: c, label: c === 'All' ? 'All Conditions' : c }))}
            />

            {/* Channel Category */}
            <Select
              label="Listing Category"
              value={selectedListingType}
              onChange={(e) => onListingTypeChange(e.target.value)}
              options={[
                { value: 'All', label: 'All Inventory' },
                { value: 'Verified Dealer', label: 'Verified Dealers Only' },
                { value: 'Private Seller', label: 'Private Sellers Only' },
                { value: 'Live Auction', label: 'Live Auction Units' },
                { value: 'Inspected', label: '150-Pt Inspected' },
              ]}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              onClick={onResetFilters}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset All Filters
            </button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSearchClick}
              className="bg-[#1E3063] text-white font-bold"
            >
              Apply Advanced Filters
            </Button>
          </div>
        </div>
      )}

      {/* PROGRESSIVE DISCLOSURE: MOBILE BOTTOM SHEET / FULL-SCREEN FILTER MODAL */}
      {showAdvanced && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 space-y-4 shadow-2xl animate-slide-up border-t border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 sticky top-0 bg-white z-10 pt-1">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                <h3 className="text-base font-black text-[#1E3063] font-display">
                  Advanced Vehicle Filters
                </h3>
              </div>
              <button
                onClick={() => setShowAdvanced(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Controls Grid */}
            <div className="space-y-4 text-xs">
              {/* Location */}
              <Select
                label="Location / Region"
                value={selectedLocation}
                onChange={(e) => onLocationChange(e.target.value)}
                options={locationOptions.map((l) => ({ value: l, label: l }))}
              />

              {/* Year Range */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Year Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={minYear}
                    onChange={(e) => onYearRangeChange(Number(e.target.value), maxYear)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value={2005}>Min Year (2005)</option>
                    {availableYears.map((y) => (
                      <option key={`mob-min-${y}`} value={y}>{y}</option>
                    ))}
                  </select>
                  <select
                    value={maxYear}
                    onChange={(e) => onYearRangeChange(minYear, Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value={2026}>Max Year (2026)</option>
                    {availableYears.map((y) => (
                      <option key={`mob-max-${y}`} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Transmission & Body Style */}
              <div className="grid grid-cols-2 gap-2">
                <Select
                  label="Transmission"
                  value={selectedTransmission}
                  onChange={(e) => onTransmissionChange(e.target.value)}
                  options={transmissionOptions.map((t) => ({ value: t, label: t === 'All' ? 'All Trans' : t }))}
                />
                <Select
                  label="Body Style"
                  value={selectedBodyStyle}
                  onChange={(e) => onBodyStyleChange(e.target.value)}
                  options={bodyStyles.map((b) => ({ value: b, label: b === 'All' ? 'All Styles' : b }))}
                />
              </div>

              {/* Fuel & Seller Type */}
              <div className="grid grid-cols-2 gap-2">
                <Select
                  label="Fuel Type"
                  value={selectedFuel}
                  onChange={(e) => onFuelChange(e.target.value)}
                  options={fuelTypes.map((f) => ({ value: f, label: f === 'All' ? 'All Fuels' : f }))}
                />
                <Select
                  label="Seller Type"
                  value={selectedSellerType}
                  onChange={(e) => onSellerTypeChange(e.target.value)}
                  options={sellerTypeOptions.map((s) => ({ value: s, label: s === 'All' ? 'All Sellers' : s }))}
                />
              </div>

              {/* Condition & Listing Category */}
              <div className="grid grid-cols-2 gap-2">
                <Select
                  label="Condition"
                  value={selectedCondition}
                  onChange={(e) => onConditionChange(e.target.value)}
                  options={conditionOptions.map((c) => ({ value: c, label: c === 'All' ? 'All Conditions' : c }))}
                />
                <Select
                  label="Listing Category"
                  value={selectedListingType}
                  onChange={(e) => onListingTypeChange(e.target.value)}
                  options={[
                    { value: 'All', label: 'All Inventory' },
                    { value: 'Verified Dealer', label: 'Verified Dealers' },
                    { value: 'Private Seller', label: 'Private Sellers' },
                    { value: 'Live Auction', label: 'Live Auctions' },
                    { value: 'Inspected', label: 'Inspected Units' },
                  ]}
                />
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center gap-3 pt-3 border-t border-slate-200 sticky bottom-0 bg-white pb-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={onResetFilters}
                className="flex-1 text-slate-600 font-bold"
              >
                Reset All
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleSearchClick}
                className="flex-[2] bg-[#1E3063] hover:bg-[#17244B] text-white font-black py-3 rounded-xl shadow-lg"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleDiscoveryConsole;
