import React, { useState } from 'react';
import { Vehicle } from '../types';
import { isEscrowApplicable, getEscrowBadgeLabel } from '../utils/escrow';
import { X, Lock, ArrowRightLeft, Sparkles, CheckCircle2, ShieldCheck, Tag } from 'lucide-react';
import { Modal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button, Badge, LazyImage } from './ui';

interface CompareModalProps {
  vehicles: Vehicle[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onStartEscrow: (vehicle: Vehicle) => void;
  onQuickViewVehicle?: (vehicle: Vehicle) => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  vehicles,
  onClose,
  onRemove,
  onStartEscrow,
  onQuickViewVehicle
}) => {
  const [highlightDifferences, setHighlightDifferences] = useState<boolean>(false);

  if (vehicles.length === 0) return null;

  // Calculate lowest price for best value tag
  const lowestPrice = Math.min(...vehicles.map((v) => v.price));

  // Helper function to check if values differ across columns
  const areValuesDifferent = (extractor: (v: Vehicle) => any) => {
    if (vehicles.length < 2) return false;
    const firstVal = extractor(vehicles[0]);
    return vehicles.some((v) => extractor(v) !== firstVal);
  };

  const title = (
    <div className="flex items-center justify-between w-full pr-8">
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="w-5 h-5 text-amber-500" />
        <span>Vehicle Comparison Matrix ({vehicles.length} Selected)</span>
      </div>

      <button
        onClick={() => vehicles.forEach((v) => onRemove(v.id))}
        className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
      >
        <X className="w-3.5 h-3.5" /> Clear All
      </button>
    </div>
  );

  return (
    <Modal isOpen={vehicles.length > 0} onClose={onClose} title={title} maxWidth="5xl">
      <div className="space-y-4">
        {/* Toggle Highlight Differences Bar */}
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-600 font-medium">
            Comparing specifications side-by-side across East Africa certified inventory
          </span>

          <label className="flex items-center gap-2 font-bold text-[#1E3063] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={highlightDifferences}
              onChange={(e) => setHighlightDifferences(e.target.checked)}
              className="accent-[#1E3063] w-4 h-4 rounded"
            />
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Highlight Differences</span>
          </label>
        </div>

        {/* Comparison Matrix Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44 bg-slate-100 font-bold text-slate-700">Specification</TableHead>
                {vehicles.map((v) => (
                  <TableHead key={v.id} className="min-w-[220px] bg-slate-50">
                    <div className="space-y-2 relative pt-2">
                      <button
                        onClick={() => onRemove(v.id)}
                        className="absolute top-0 right-0 p-1 bg-slate-200 hover:bg-rose-500 hover:text-white text-slate-600 rounded-full transition-colors"
                        title="Remove vehicle from compare"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      <div
                        className="h-32 rounded-lg overflow-hidden border border-slate-200 relative group cursor-pointer"
                        onClick={() => onQuickViewVehicle?.(v)}
                        title="View vehicle details"
                      >
                        <LazyImage src={v.image} alt={v.title} wrapperClassName="h-full w-full" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                        {v.price === lowestPrice && vehicles.length > 1 && (
                          <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded shadow">
                            Lowest Price
                          </span>
                        )}
                      </div>

                      <div
                        className="cursor-pointer group"
                        onClick={() => onQuickViewVehicle?.(v)}
                      >
                        <p className="font-extrabold text-[#1E3063] line-clamp-1 text-xs font-display group-hover:text-amber-600 transition-colors">{v.title}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{v.location} ({v.county})</p>
                      </div>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {/* Row: Price */}
              <TableRow className={highlightDifferences && areValuesDifferent((v) => v.price) ? 'bg-amber-50/70' : ''}>
                <TableCell className="font-bold text-slate-600 bg-slate-50/50">Price (Ksh)</TableCell>
                {vehicles.map((v) => (
                  <TableCell key={v.id} className="font-black text-base text-[#1E3063] font-display">
                    Ksh {v.price.toLocaleString()}
                    {v.marketPriceAvg && (
                      <span className="block text-[10px] text-slate-400 font-normal line-through">
                        Avg: Ksh {v.marketPriceAvg.toLocaleString()}
                      </span>
                    )}
                  </TableCell>
                ))}
              </TableRow>

              {/* Row: Year & Mileage */}
              <TableRow className={highlightDifferences && areValuesDifferent((v) => `${v.year}-${v.mileage}`) ? 'bg-amber-50/70' : ''}>
                <TableCell className="font-bold text-slate-600 bg-slate-50/50">Year / Mileage</TableCell>
                {vehicles.map((v) => (
                  <TableCell key={v.id} className="font-bold text-slate-800">
                    {v.year} • {v.mileage.toLocaleString()} km
                  </TableCell>
                ))}
              </TableRow>

              {/* Row: Fuel & Transmission */}
              <TableRow className={highlightDifferences && areValuesDifferent((v) => `${v.fuelType}-${v.transmission}`) ? 'bg-amber-50/70' : ''}>
                <TableCell className="font-bold text-slate-600 bg-slate-50/50">Fuel & Transmission</TableCell>
                {vehicles.map((v) => (
                  <TableCell key={v.id} className="font-medium text-slate-700">
                    {v.fuelType} ({v.transmission})
                  </TableCell>
                ))}
              </TableRow>

              {/* Row: Engine & Drive */}
              <TableRow className={highlightDifferences && areValuesDifferent((v) => `${v.engineSize}-${v.driveType}`) ? 'bg-amber-50/70' : ''}>
                <TableCell className="font-bold text-slate-600 bg-slate-50/50">Engine / Drive</TableCell>
                {vehicles.map((v) => (
                  <TableCell key={v.id} className="font-medium text-slate-700">
                    {v.engineSize || 'N/A'} • {v.driveType || '2WD'}
                  </TableCell>
                ))}
              </TableRow>

              {/* Row: Body Style & Condition */}
              <TableRow className={highlightDifferences && areValuesDifferent((v) => `${v.bodyStyle}-${v.condition}`) ? 'bg-amber-50/70' : ''}>
                <TableCell className="font-bold text-slate-600 bg-slate-50/50">Body & Condition</TableCell>
                {vehicles.map((v) => (
                  <TableCell key={v.id} className="font-medium text-slate-700">
                    {v.bodyStyle || 'N/A'} ({v.condition || 'Used'})
                  </TableCell>
                ))}
              </TableRow>

              {/* Row: Seller & Rating */}
              <TableRow className={highlightDifferences && areValuesDifferent((v) => v.sellerName) ? 'bg-amber-50/70' : ''}>
                <TableCell className="font-bold text-slate-600 bg-slate-50/50">Seller & Rating</TableCell>
                {vehicles.map((v) => (
                  <TableCell key={v.id} className="font-semibold text-slate-800">
                    <p>{v.sellerName}</p>
                    <p className="text-amber-600 font-bold text-[11px] flex items-center gap-1 mt-0.5">
                      ★ {v.sellerRating} <span className="text-slate-400 font-normal">({v.sellerType})</span>
                    </p>
                  </TableCell>
                ))}
              </TableRow>

              {/* Row: 150-Point Inspection */}
              <TableRow className={highlightDifferences && areValuesDifferent((v) => v.inspectionPassed) ? 'bg-amber-50/70' : ''}>
                <TableCell className="font-bold text-slate-600 bg-slate-50/50">150-Point Inspection</TableCell>
                {vehicles.map((v) => (
                  <TableCell key={v.id}>
                    <Badge variant={v.inspectionPassed ? 'success' : 'neutral'}>
                      {v.inspectionPassed ? '✓ Certified Passed' : 'Pending'}
                    </Badge>
                  </TableCell>
                ))}
              </TableRow>

              {/* Row: Escrow Protection */}
              <TableRow className={highlightDifferences && areValuesDifferent((v) => isEscrowApplicable(v)) ? 'bg-amber-50/70' : ''}>
                <TableCell className="font-bold text-slate-600 bg-slate-50/50">Escrow Protection</TableCell>
                {vehicles.map((v) => {
                  const escrowActive = isEscrowApplicable(v);
                  return (
                    <TableCell key={v.id}>
                      <Badge variant={escrowActive ? 'escrow' : 'neutral'}>
                        {escrowActive ? `✓ ${getEscrowBadgeLabel(v)}` : 'Standard Deal'}
                      </Badge>
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Row: Financing Availability */}
              <TableRow className={highlightDifferences && areValuesDifferent((v) => v.financeAvailable) ? 'bg-amber-50/70' : ''}>
                <TableCell className="font-bold text-slate-600 bg-slate-50/50">Financing</TableCell>
                {vehicles.map((v) => (
                  <TableCell key={v.id}>
                    <Badge variant={v.financeAvailable ? 'success' : 'neutral'}>
                      {v.financeAvailable ? '✓ Asset Finance Ready' : 'Cash Deal'}
                    </Badge>
                  </TableCell>
                ))}
              </TableRow>

              {/* Row: Response Time & Freshness */}
              <TableRow className={highlightDifferences && areValuesDifferent((v) => `${v.responseTime}-${v.listingFreshness}`) ? 'bg-amber-50/70' : ''}>
                <TableCell className="font-bold text-slate-600 bg-slate-50/50">Response & Freshness</TableCell>
                {vehicles.map((v) => (
                  <TableCell key={v.id} className="text-[11px] font-medium text-slate-700">
                    <p className="font-bold text-amber-700">{v.responseTime || '< 15 mins'}</p>
                    <p className="text-slate-400">{v.listingFreshness}</p>
                  </TableCell>
                ))}
              </TableRow>

              {/* Row: CTA Actions */}
              <TableRow>
                <TableCell className="font-bold text-slate-600 bg-slate-50/50">Purchase Option</TableCell>
                {vehicles.map((v) => (
                  <TableCell key={v.id}>
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => {
                        onClose();
                        onStartEscrow(v);
                      }}
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      Buy with Escrow
                    </Button>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </Modal>
  );
};

export default CompareModal;
