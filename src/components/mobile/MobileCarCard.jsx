/**
 * MobileCarCard - Legacy wrapper for mobile vehicles
 *
 * This component is deprecated. Please use VehicleCard with variant="horizontal" instead.
 */

import { memo } from 'react';
import VehicleCard from '../VehicleCard/VehicleCard';

const MobileCarCard = memo(({ car, onFavorite, onSwipeAction, style, ...props }) => {
  return (
    <VehicleCard
      car={car}
      variant="horizontal"
      onSave={onFavorite}
      style={style}
      {...props}
    />
  );
});

MobileCarCard.displayName = 'MobileCarCard';

// Keep skeleton for backward compatibility
export { VehicleCardSkeleton } from '../VehicleCard/VehicleCard';
export const MobileCarCardSkeleton = VehicleCardSkeleton;

export default MobileCarCard;
