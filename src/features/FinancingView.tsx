import React from 'react';
import { FinanceMarketplace } from './FinancePlatform';
import type { Vehicle } from '../types';

/**
 * Compatibility entry point for the historical financing navigation.
 * The canonical financing experience now lives in FinanceMarketplace.
 * Keeping this adapter avoids two competing application flows.
 */
interface FinancingViewProps {
  vehicles?: Vehicle[];
  onQuickViewVehicle?: (vehicle: Vehicle) => void;
}

export const FinancingView: React.FC<FinancingViewProps> = () => (
  <FinanceMarketplace />
);

export default FinancingView;
