# Search & Discovery Domain — End to End

## Canonical behavior
- `/api/search` is the canonical public vehicle search transport.
- `/api/search/autocomplete` derives suggestions from persisted available inventory; no hardcoded make/model catalogue is used.
- Search supports keyword, make/model, price/year, body/fuel/transmission/condition, city and dealer filters plus deterministic sorting and pagination.
- Search events are recorded through the existing search-insights service.
- Saved-search alert preference is persisted as `notify_on_new_match` and mapped through the shared DB field adapter.
- Saved-search listing no longer applies an unrelated car-list query validator to an authenticated resource.

## Integrity rules
- Public search only returns `cars.status = available`.
- Pagination is capped at 100 results.
- Autocomplete is bounded to eight results and cached for ten minutes.
- Suggestions are derived from live inventory and scored by prefix/substring/fuzzy distance.
- No synthetic search results are returned.
