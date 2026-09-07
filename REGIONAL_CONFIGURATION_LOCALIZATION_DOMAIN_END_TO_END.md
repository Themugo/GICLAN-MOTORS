# KAYAD Regional Configuration & Localization Domain — End to End

## Canonical ownership
- `backend/services/regionalConfiguration.service.js` owns country metadata, country configuration and configured currency conversion.
- `backend/services/localization.service.js` owns persisted translations.
- `src/services/regionalConfigurationApi.ts` and `src/services/localizationApi.ts` are the canonical frontend transports.
- `src/features/MultiCountry/pages/RegionalDashboard.tsx` consumes live backend configuration and contains no regional analytics fixtures.

## Integrity rules
- Country status is constrained to active, inactive, maintenance or suspended.
- Currency conversion never uses hardcoded exchange rates; a configured active rate is required.
- Exchange rates have a unique currency-pair boundary and positive-rate constraint.
- Localization keys are unique per locale + namespace.
- Country/configuration/payment/tax/cross-border/FX/localization tables use RLS; server service-role access is authoritative.
- The legacy country service remains only as a compatibility facade and contains no second implementation.
- The legacy localization model is mapped to `localization_strings`, while business operations use the canonical service.

## Routes
- `GET /api/countries`
- `GET /api/countries/:countryCode`
- `GET /api/countries/currency-rate?from=KES&to=UGX`
- `POST /api/countries/currency-convert` (authenticated)
- `GET /api/countries/currency-rates` (admin)
- `PUT /api/countries/currency-rates` (admin)
- `PATCH /api/countries/:countryCode/status` (admin)
- Existing `/api/localization/*` routes now use the canonical localization service.

## Verification
- Regional configuration validator: 15/15 PASS.
- Backend syntax checks passed for all new/changed JavaScript modules.
- Full frontend build/Vitest was not claimed because this extracted environment does not contain `node_modules`.
