import { Search, X, Sparkles, SlidersHorizontal, ArrowUpDown, LayoutGrid, List, CheckCircle2 } from 'lucide-react';
import type React from 'react';

export interface FilterOption {
  id: string;
  label: string;
}

export interface SortOption {
  id: string;
  label: string;
}

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resultCount?: number;
  filterOptions?: FilterOption[];
  activeFilter?: string;
  onFilterChange?: (filterId: string) => void;
  sortOptions?: SortOption[];
  activeSort?: string;
  onSortChange?: (sortId: string) => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  onMobileFilterToggle?: () => void;
  badgeLabel?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search make, model, VIN, or city...',
  resultCount,
  filterOptions,
  activeFilter,
  onFilterChange,
  sortOptions,
  activeSort,
  onSortChange,
  viewMode,
  onViewModeChange,
  onMobileFilterToggle,
  badgeLabel,
  className = '',
}) => {
  return (
    <div className={`bg-white border border-[#E2D8C7] rounded-3xl p-4 sm:p-5 shadow-sm hover:border-[#2E4080]/30 transition-all space-y-4 ${className}`}>
      {/* Primary Search Controls Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">

        {/* Main Search Input */}
        <div className="relative flex-1 min-w-0 group">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#23EBFF] group-focus-within:text-[#2E4080] transition-colors" />
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full h-12 pl-11 pr-10 bg-[#FCF9F4] border border-[#E2D8C7] focus:border-[#2E4080] focus:ring-2 focus:ring-[#23EBFF]/40 rounded-2xl text-xs sm:text-sm text-[#2E4080] font-mono font-bold placeholder:text-[#6B7A99] focus:outline-none transition-all shadow-2xs"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-[#6B7A99] hover:text-[#2E4080] hover:bg-[#E2D8C7]/50 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Controls Group */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 justify-between lg:justify-end">

          {/* Quick Format Filter Pills */}
          {filterOptions && filterOptions.length > 0 && onFilterChange && (
            <div className="flex items-center gap-1 bg-[#F6F1E8] border border-[#E2D8C7] p-1 rounded-2xl h-12 shrink-0 overflow-x-auto no-scrollbar">
              {filterOptions.map(fmt => {
                const isActive = activeFilter === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => onFilterChange(fmt.id)}
                    className={`h-10 px-4 text-xs font-mono font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 ${
                      isActive
                        ? 'bg-[#2E4080] text-white shadow-md ring-1 ring-[#23EBFF]/30'
                        : 'text-[#6B7A99] hover:text-[#2E4080] hover:bg-[#E2D8C7]/50'
                    }`}
                  >
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#23EBFF] animate-pulse" />}
                    <span>{fmt.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Mobile Filter Trigger */}
          {onMobileFilterToggle && (
            <button
              type="button"
              onClick={onMobileFilterToggle}
              className="lg:hidden h-12 px-4 rounded-2xl border border-[#E2D8C7] text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 bg-[#F6F1E8] text-[#2E4080] cursor-pointer hover:bg-[#EFE8DA]"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#23EBFF]" />
              <span>Refine</span>
            </button>
          )}

          {/* Sort Dropdown */}
          {sortOptions && sortOptions.length > 0 && onSortChange && (
            <div className="relative flex items-center h-12 bg-[#F6F1E8] border border-[#E2D8C7] hover:border-[#2E4080] rounded-2xl px-3.5 text-xs font-mono font-black uppercase tracking-wider transition-all shadow-2xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#23EBFF] shrink-0 mr-2" />
              <span className="text-[#6B7A99] hidden sm:inline mr-1">Sort:</span>
              <select
                value={activeSort}
                onChange={e => onSortChange(e.target.value)}
                className="bg-transparent focus:outline-none text-[#2E4080] font-mono font-black cursor-pointer pr-4 appearance-none text-xs"
              >
                {sortOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Grid/List View Switcher */}
          {viewMode && onViewModeChange && (
            <div className="flex items-center bg-[#F6F1E8] border border-[#E2D8C7] p-1 rounded-2xl h-12 shrink-0 gap-1">
              <button
                type="button"
                onClick={() => onViewModeChange('grid')}
                title="Grid View"
                className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[#2E4080] text-white shadow-xs'
                    : 'text-[#6B7A99] hover:text-[#2E4080]'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('list')}
                title="List View"
                className={`h-10 w-10 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[#2E4080] text-white shadow-xs'
                    : 'text-[#6B7A99] hover:text-[#2E4080]'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Badge-Style Feedback Mechanism Bar */}
      {(value || resultCount !== undefined || badgeLabel) && (
        <div className="pt-3 border-t border-[#E8E1D5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {badgeLabel && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#2E4080] text-white font-mono font-black text-[11px] uppercase tracking-wider shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-[#23EBFF]" />
                <span>{badgeLabel}</span>
              </div>
            )}

            {value && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#23EBFF]/15 border border-[#23EBFF]/40 text-[#2E4080] font-mono font-black text-[11px] uppercase tracking-wider">
                <span>Search: "{value}"</span>
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="hover:text-red-700 cursor-pointer ml-1 p-0.5"
                  title="Remove search query"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {resultCount !== undefined && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-950 font-mono font-black text-xs uppercase tracking-wider shadow-2xs self-start sm:self-auto">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{resultCount} {resultCount === 1 ? 'Vehicle Found' : 'Vehicles Found'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
