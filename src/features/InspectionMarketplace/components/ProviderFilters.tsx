// ============================================================
// KAYAD INSPECTION MARKETPLACE - PROVIDER FILTERS
// ============================================================

import { SearchProvidersParams } from '../services/api';
import { VEHICLE_TYPES } from '../types/inspection';

const KAYAD_COLORS = {
  lightNavy: '#1e3a5f',
  warmBeige: '#f5f0e8',
  white: '#ffffff',
  emerald: '#10b981',
  mutedTerracotta: '#c4a484',
  softBlue: '#64748b',
};

interface ProviderFiltersProps {
  filters: SearchProvidersParams;
  onChange: (filters: Partial<SearchProvidersParams>) => void;
}

export default function ProviderFilters({ filters, onChange }: ProviderFiltersProps) {
  return (
    <div
      className="rounded-xl p-6 shadow-md"
      style={{ backgroundColor: KAYAD_COLORS.white }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Location */}
        <FilterGroup label="Location">
          <div className="space-y-2">
            <input
              type="text"
              placeholder="County"
              value={filters.county || ''}
              onChange={(e) => onChange({ county: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border outline-none focus:border-emerald-500"
              style={{ borderColor: KAYAD_COLORS.softBlue }}
            />
            <input
              type="text"
              placeholder="Town"
              value={filters.town || ''}
              onChange={(e) => onChange({ town: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border outline-none focus:border-emerald-500"
              style={{ borderColor: KAYAD_COLORS.softBlue }}
            />
          </div>
        </FilterGroup>

        {/* Service Type */}
        <FilterGroup label="Service Type">
          <div className="space-y-2">
            <Checkbox
              label="Mobile Inspectors"
              checked={filters.mobileOnly || false}
              onChange={(checked) => onChange({ mobileOnly: checked })}
            />
            <Checkbox
              label="Workshop Inspections"
              checked={filters.workshopOnly || false}
              onChange={(checked) => onChange({ workshopOnly: checked })}
            />
            <Checkbox
              label="Same Day Available"
              checked={filters.sameDayAvailable || false}
              onChange={(checked) => onChange({ sameDayAvailable: checked })}
            />
            <Checkbox
              label="Weekend Available"
              checked={filters.weekendAvailable || false}
              onChange={(checked) => onChange({ weekendAvailable: checked })}
            />
          </div>
        </FilterGroup>

        {/* Vehicle Types */}
        <FilterGroup label="Vehicle Types">
          <div className="space-y-2">
            {VEHICLE_TYPES.map((type) => (
              <Checkbox
                key={type.value}
                label={type.label}
                checked={filters.vehicleTypes?.includes(type.value) || false}
                onChange={(checked) => {
                  const current = filters.vehicleTypes || [];
                  const updated = checked
                    ? [...current, type.value]
                    : current.filter((t) => t !== type.value);
                  onChange({ vehicleTypes: updated });
                }}
              />
            ))}
          </div>
        </FilterGroup>

        {/* Specializations */}
        <FilterGroup label="Specializations">
          <div className="space-y-2">
            <Checkbox
              label="Commercial Vehicles"
              checked={filters.commercialVehicles || false}
              onChange={(checked) => onChange({ commercialVehicles: checked })}
            />
            <Checkbox
              label="Electric Vehicles"
              checked={filters.electricVehicles || false}
              onChange={(checked) => onChange({ electricVehicles: checked })}
            />
            <Checkbox
              label="Luxury Vehicles"
              checked={filters.luxuryVehicles || false}
              onChange={(checked) => onChange({ luxuryVehicles: checked })}
            />
          </div>
        </FilterGroup>
      </div>

      {/* Rating Filter */}
      <div className="mt-6 pt-6 border-t" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
        <FilterGroup label="Minimum Rating">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => onChange({ minRating: rating === 5 ? undefined : rating })}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  (filters.minRating || 0) >= rating && filters.minRating !== undefined
                    ? 'text-white'
                    : ''
                }`}
                style={{
                  backgroundColor:
                    (filters.minRating || 0) >= rating && filters.minRating !== undefined
                      ? KAYAD_COLORS.mutedTerracotta
                      : KAYAD_COLORS.warmBeige,
                  color:
                    (filters.minRating || 0) >= rating && filters.minRating !== undefined
                      ? KAYAD_COLORS.white
                      : KAYAD_COLORS.lightNavy,
                }}
              >
                {rating}+ ★
              </button>
            ))}
          </div>
        </FilterGroup>
      </div>

      {/* Reset Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => onChange({
            county: undefined,
            town: undefined,
            mobileOnly: undefined,
            workshopOnly: undefined,
            sameDayAvailable: undefined,
            weekendAvailable: undefined,
            vehicleTypes: undefined,
            commercialVehicles: undefined,
            electricVehicles: undefined,
            luxuryVehicles: undefined,
            minRating: undefined,
          })}
          className="px-4 py-2 rounded-lg font-medium transition-colors"
          style={{
            backgroundColor: KAYAD_COLORS.warmBeige,
            color: KAYAD_COLORS.lightNavy
          }}
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="block text-sm font-medium mb-2"
        style={{ color: KAYAD_COLORS.lightNavy }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className="flex items-center gap-2 cursor-pointer"
      style={{ color: KAYAD_COLORS.softBlue }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-emerald-500"
      />
      {label}
    </label>
  );
}
