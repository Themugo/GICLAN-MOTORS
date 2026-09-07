# Vehicle Marketplace Domain — End-to-End Hardening

## Scope

This initiative treats the vehicle marketplace read and listing boundary as one domain: public discovery, showroom/browse, vehicle detail, comparison, seller inventory, dealer profile inventory, listing creation/update/deletion transport, and favourites.

## Changes

- Converged public vehicle reads on `src/services/vehicleApi.ts`.
- Converged vehicle detail and comparison reads on `getCarById`.
- Converged seller analytics and private-seller dashboard inventory on the authenticated `GET /api/cars/my-listings` boundary instead of client-supplied seller filters.
- Added real `dealer` and `seller` filtering support to the public vehicle query contract.
- Corrected the city filter to use the canonical `city` application field rather than the obsolete `location.city` path.
- Added explicit `status=active` compatibility mapping to the public marketplace's canonical `available` status.
- Added canonical `updateCar` and `deleteCar` transport methods.
- Removed the obsolete unauthenticated `/api/cars/:id/favorite` counter endpoint and its compatibility export; authenticated favourites remain under `/api/favorites`.
- Hardened favourite-count decrement so repeated removal cannot drive the denormalized counter below zero.
- Migrated dealer add/edit listing flows to the canonical vehicle service boundary where the existing backend contract is unchanged.
- Migrated the mobile browse, home, showroom, dealer profile, similar-vehicle, and compare surfaces away from the legacy `carsAPI` read path.

## Intentional compatibility

`src/api/api.exports.ts` remains as a compatibility layer for domains not yet fully migrated. The remaining `carsAPI` reference inside that file is an internal platform-stats compatibility calculation; it is not a UI consumer. The goal is not to delete the compatibility layer prematurely.

## Verification

- Vehicle marketplace domain gate: 13/13 PASS.
- Backend syntax checks: PASS for affected controller, route, and query-validation modules.
- Full Vitest/build was not claimed in the extracted environment because repository dependencies/runtime requirements are not installed/matched there.
