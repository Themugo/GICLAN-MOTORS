# Vehicle Valuation Domain — End to End

## Canonical contract

KAYAD valuation is now calculated from real `cars` inventory comparables through `backend/services/vehicleValuation.service.js`.

The canonical public API is:

- `GET /api/valuation/:vehicleId`
- `GET /api/valuation/matrix`
- compatibility: `GET /api/cars/:id/valuation` delegates to the same valuation engine.

## Integrity rules

- No hardcoded vehicle prices are used by the valuation UI.
- Comparable vehicles are matched by brand/model and a bounded model-year window.
- Mileage and condition adjustments are explicit and persisted with each valuation snapshot.
- Confidence is derived from comparable-data availability.
- Future values are derived from the current valuation and documented depreciation assumptions.
- Valuation snapshots are immutable historical records from the application's normal API path.
- The valuation table is protected with RLS; browser roles do not receive write access.

## Frontend

`src/services/valuationApi.ts` is the canonical transport. `src/components/features/common/MarketValuationMatrix.tsx` is the canonical UI. The root component is only a compatibility re-export.
