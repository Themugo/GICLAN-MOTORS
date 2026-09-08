/**
 * VehicleCard - Premium unified vehicle card component
 *
 * @example
 * import VehicleCard, { VehicleCardSkeleton } from './VehicleCard';
 *
 * // Basic usage
 * <VehicleCard car={carData} />
 *
 * // With all options
 * <VehicleCard
 *   car={carData}
 *   variant="compact"
 *   featured
 *   verified
 *   showDealer
 *   showTrust
 *   showActions
 *   showCompare
 *   onSave={(car, saved) => handleSave(car, saved)}
 *   onCompare={(car, selected) => handleCompare(car, selected)}
 * />
 *
 * // Loading state
 * <VehicleCardSkeleton />
 */

export { default } from './VehicleCard';
export { VehicleCardSkeleton } from './VehicleCard';
export { default as VehicleCardBadge } from './VehicleCard';
export { default as VehicleCardSpec } from './VehicleCard';
