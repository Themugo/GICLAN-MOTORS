// backend/utils/fieldMap.js
//
// Shared camelCase <-> snake_case field-name translation for the
// Postgres/Supabase data layer. The app was originally written
// against the legacy model API (camelCase field names); the real
// database uses Postgres snake_case columns, and in a handful of
// cases the column was given a genuinely different name, not just a
// different case (e.g. `brand` in the app vs `make` in the schema).
//
// Both data-access layers (models/_base.js, used by controllers via
// `Car.find()` etc., and db/index.js, used directly by ~60 service
// files) previously had their own separate, incomplete, and
// independently-buggy copies of this translation. Centralizing it
// here means a fix (or a newly-discovered rename) only needs to
// happen in one place.

export const camelToSnake = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
export const snakeToCamel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

// Explicit per-table overrides for genuine renames a case-transform
// can't fix. Add to this as more mismatches are found in other
// tables — do not duplicate this map elsewhere.
export const FIELD_ALIASES = {
  events: { user: "user_id" },
  search_analytics: { user: "user_id" },
  // Added (Final Integration Phase 3 - real auction & bidding
  // integration): found while providing the required "real, persisted
  // bid" evidence for this phase. No alias entry existed for this
  // table at all - carId/maxBid/bidderTag/checkoutRequestID all
  // already happen to convert correctly via the default camelToSnake
  // fallback (confirmed directly), but "user" (a single, already-
  // lowercase word) does not change under that fallback, while the
  // real column is user_id - reproduced the real failure directly
  // ("Could not find the 'user' column of 'bids'") calling the real
  // placeBid() controller against a real database.
  bids: {
    user: "user_id",
  },
  cars: {
    // Fixed (re-applied - this project's own earlier hardening work
    // already found and fixed this exact defect; confirmed reverted
    // when this file was rebuilt on a diverged branch, reproduced
    // failing again directly against a real database before re-
    // fixing): brand/fuel/engine were aliased to column names that do
    // not exist at all (make/fuel_type/engine_capacity) - the real
    // columns are named exactly the same as the app-level field
    // (brand/fuel/engine), so these need no alias entry at all. city
    // was aliased to "location" but the real column is
    // "location_city". This is the exact root cause of GET /api/cars
    // - the endpoint App.tsx's own real vehicle-fetch calls - throwing
    // a real Postgres error on every single request.
    drivetrain: "drive_type",
    isAuction: "has_auction",
    dealer: "dealer_id",
    city: "location_city",
    highestBidder: "highest_bidder_id",
    extensionCount: "extension_count",
    // Added (Final Integration Phase 3): found while providing the
    // required "real, persisted bid" evidence for this phase - the
    // one, sole exception on this table to the otherwise-consistent
    // snake_case convention (confirmed via a full column-name scan:
    // `SELECT column_name ... WHERE column_name ~ '[A-Z]'` returns
    // only this one column). The default camelToSnake() fallback
    // converts it to "is_paid", which does not exist, reproduced
    // directly ("Could not find the 'is_paid' column of 'cars'")
    // while tracing why a real bid's own currentBid update wasn't
    // being persisted (Car.prototype.save() writes every field,
    // including this one, on every real save).
    isPaid: "isPaid",
  },
  users: {
    logo: "avatar",
    averageRating: "rating",
    completedChecks: "inspections_completed",
    // Fixed: reproduced directly - the default camelToSnake regex
    // needs a lowercase-to-uppercase transition to detect a word
    // boundary, but "OTPExpire" has an uppercase-to-uppercase
    // transition ("P" then "E") right where the real boundary is,
    // so it silently produced "phone_otpexpire" instead of the real
    // column name. Every real phone-OTP send/verify failed
    // unconditionally as a direct result ("Could not find the
    // 'phone_otpexpire' column of 'users' in the schema cache").
    phoneOTPExpire: "phone_otp_expire",
    // Fixed: found while verifying the fix above actually completes
    // the real send-then-verify cycle end-to-end - phoneOTP itself
    // writes correctly without an alias (camelToSnake('phoneOTP')
    // already happens to produce the real column name, "phone_otp"),
    // but with no explicit alias entry, this table's reverse map
    // (auto-generated from this same object, see
    // REVERSE_FIELD_ALIASES below) had nothing for it - reading a row
    // back fell through to the plain, one-directional snakeToCamel
    // helper, which only capitalizes the single letter after an
    // underscore ("phone_otp" -> "phoneOtp", not "phoneOTP"). The
    // genuinely-saved code was silently readable only under a
    // different-cased key than every real caller
    // (phoneVerificationController.js) actually reads. Declaring the
    // alias explicitly here populates the reverse map correctly, the
    // same fix as phoneOTPExpire above.
    phoneOTP: "phone_otp",
  },
  inspector_applications: {
    user: "user_id",
  },
  // Fixed (re-applied - this project's own Phase 7 hardening work
  // already found and fixed this exact defect; confirmed reverted
  // when this file was rebuilt on a diverged branch): renamed to
  // match the real table (see _base.js's TABLE_MAP fix); buyer/
  // payment aliases were also wrong - confirmed against the real
  // columns (\d vehicle_inspections): requester_id (not
  // requested_by), payment (not payment_id, no suffix on the real
  // column at all).
  vehicle_inspections: {
    buyer: "requester_id",
    car: "car_id",
    inspector: "inspector_id",
  },
  payments: {
    user: "user_id",
    car: "car_id",
  },
  // Fixed (Final Integration - escrow views): all 4 previous aliases
  // (payment/buyer/seller/car) were wrong, confirmed directly against
  // the real, migrated table (\d escrows) - reproduced the real
  // failure first ("column escrows.buyer_id does not exist") calling
  // the real getUserEscrows() controller. Unlike most other tables in
  // this project, escrows' own real columns are already camelCase for
  // multi-word fields (sellerAmount, fundedAt, vehicleConfirmedAt,
  // etc.) - the default camelToSnake() fallback (used automatically
  // when no alias entry exists) would incorrectly convert these to
  // snake_case, which does not match the real schema. Every multi-
  // word camelCase column needs an explicit identity alias to
  // override that fallback; buyer/seller/car/payment are single-word
  // and already match their real columns exactly, needing none.
  escrows: {
    sellerAmount: "sellerAmount",
    fundedAt: "fundedAt",
    vehicleConfirmedAt: "vehicleConfirmedAt",
    deliveredAt: "deliveredAt",
    releasedAt: "releasedAt",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    lastActionKey: "lastActionKey",
    autoReleaseEligibleAt: "autoReleaseEligibleAt",
    closedAt: "closedAt",
    disputeReason: "disputeReason",
    disputedAt: "disputedAt",
    // Fixed (escrow page real-data integration): found while running
    // the real end-to-end backend verification for this pass -
    // disputedBy/refundedBy/releasedBy are real, camelCase-exception
    // columns on this same table (confirmed directly via \d escrows),
    // same as every other alias already listed here, but these three
    // were missing. Reproduced the real, direct consequence: every
    // real dispute request failed ("Could not find the 'disputed_by'
    // column of 'escrows' in the schema cache").
    disputedBy: "disputedBy",
    refundedBy: "refundedBy",
    releasedBy: "releasedBy",
  },
  // Fixed (Support page real-data integration): reproduced directly
  // - the real support_tickets table's own owner column is user_id,
  // not user (confirmed via \d support_tickets); no alias existed for
  // this table at all, so the default camelToSnake conversion left
  // "user" unmapped. Real, direct consequence: every single support
  // ticket creation and every "my tickets" list request failed
  // ("Could not find the 'user' column of 'support_tickets' in the
  // schema cache").
  support_tickets: {
    user: "user_id",
  },
  // Added (Final Integration - real data integration): found while
  // wiring the real, already-built favoriteApi.ts frontend client to
  // this project's own saved-vehicles UI (previously hardcoded fake
  // IDs, never actually connected to any backend). Reproduced
  // directly against a real database: no alias entry existed for this
  // table at all, and the real columns are user_id/car_id, not the
  // app-level user/car this controller's own code already uses
  // throughout (Favorite.find({ user: ... }), etc.).
  favorites: {
    user: "user_id",
    car: "car_id",
  },
  user_auth: {
    user: "user_id",
  },
  // Added (Phase 9 - escrow/payment safety audit): found while
  // verifying the real M-Pesa callback path end-to-end - the real
  // notifications table has no alias entry at all, and its real
  // column is user_id, not user. Confirmed directly (\d notifications)
  // and by reproducing the real error ("Could not find the 'user'
  // column of 'notifications'") when sendNotification's real caller
  // (paymentCallback.service.js, a real, non-blocking side effect of
  // a successful payment) tried to create one.
  notifications: {
    user: "user_id",
  },
  user_preferences: {
    user: "user_id",
  },
  bid_logs: {
    bid: "bid_id",
    user: "user_id",
    auction: "auction_id",
    car: "car_id",
  },
  transaction_ledger: {
    fromUser: "from_user",
    toUser: "to_user",
    car: "car_id",
    escrow: "escrow_id",
  },
};

export const REVERSE_FIELD_ALIASES = Object.fromEntries(
  Object.entries(FIELD_ALIASES).map(([table, map]) => [
    table,
    Object.fromEntries(Object.entries(map).map(([js, sql]) => [sql, js])),
  ])
);

// Which columns a Mongo-style `$text` search should run across, per
// table. Tables not listed here don't support `$text` — we skip the
// filter rather than guess at column names that may not exist.
export const SEARCHABLE_FIELDS = {
  cars: ["title", "brand", "model", "description"],
};

export function mapKeyOut(table, key) {
  if (key === "_id") return "id";
  const alias = FIELD_ALIASES[table]?.[key];
  if (alias) return alias;
  return camelToSnake(key);
}

export function mapRowIn(table, row) {
  if (!row || typeof row !== "object") return row;
  const reverse = REVERSE_FIELD_ALIASES[table] || {};
  for (const key of Object.keys(row)) {
    if (key === "id") continue;
    const camelKey = reverse[key] || snakeToCamel(key);
    if (camelKey !== key && !(camelKey in row)) {
      row[camelKey] = row[key];
    }
  }
  return row;
}

// Mongoose-style projections come as either a space-separated string
// ("title price images") or an object ({ title: 1, price: 1 }).
// Postgrest's .select() requires a comma-separated column list — a
// space-separated string is read as one (nonexistent) column name,
// and an object is nonsense to it. Normalize both into what Postgrest
// actually expects, translating each field name through the same
// table-aware alias map used everywhere else.
export function normalizeSelect(table, fields) {
  if (!fields || fields === "*") return "*";
  let names;
  if (typeof fields === "string") {
    names = fields.trim().includes(",")
      ? fields.split(",").map((s) => s.trim())
      : fields.trim().split(/\s+/);
  } else if (typeof fields === "object") {
    names = Object.entries(fields).filter(([, v]) => v).map(([k]) => k);
  } else {
    return "*";
  }
  names = names.map((n) => n.replace(/^\+/, "")).filter(Boolean).filter((n) => n !== "score"); // strip Mongoose +prefix; "score" is a $text virtual
  if (names.length === 0) return "*";
  return names.map((n) => mapKeyOut(table, n)).join(",");
}
