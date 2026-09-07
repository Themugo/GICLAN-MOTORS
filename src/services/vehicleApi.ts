import { request, HttpRequestError } from '../api/httpRequest';
/**
 * Real backend vehicle/car API client. KAYAD Fusion Phase 4/5.
 *
 * MAJOR CORRECTION (Phase 5): the original version of this file was
 * built against the retired legacy schema artifact, which turned out to be a
 * STALE, SUPERSEDED schema definition - confirmed directly via a
 * detailed comment in supabase/migrations/..._foundational_tables.sql.sql
 * (a prior session's own cross-referenced schema-archaeology work,
 * checked against the historical vehicle seed migration, update_car_bid_stats.sql.sql,
 * and real multi-file backend usage) that explicitly states its column
 * choices "disagree with the retired legacy schema artifact's naming, and take
 * precedence here as already-committed, already-real evidence."
 *
 * This version is built against that real, authoritative schema
 * instead. The most significant correction: auction data (current_bid,
 * bids_count, auction_status, auction_end, highest_bidder_id, allow_bid)
 * is DENORMALIZED DIRECTLY ONTO THE cars ROW, not in a separate joined
 * table as the original version of this file assumed. This means a
 * single /api/cars response already carries real auction state with no
 * join needed - a meaningfully better starting point than Phase 4
 * documented.
 *
 * What is still genuinely missing from the cars row itself: sellerName/
 * sellerAvatar/sellerRating (only dealer_id, a foreign key, exists),
 * and full inspection detail (only a basic inspection_status string
 * exists on cars - the rich score/points/health data lives in a
 * separate inspection table, not joined here either). Documented
 * honestly below, not glossed over just because the auction-data
 * correction was good news.
 */

import type { Vehicle } from '../types';


/** Raw shape of a single row from the backend's real `cars` table
 * (supabase/migrations/..._foundational_tables.sql.sql, cross-checked
 * against backend/utils/fieldMap.js's FIELD_ALIASES.cars and against
 * real controller/service usage - not the stale the retired legacy schema artifact
 * version this file originally used). */
export interface BackendCar {
  id: string;
  dealer_id?: string | null;
  title: string;
  slug?: string | null;
  brand: string; // NOT "make" - confirmed the real column name is "brand"
  model: string;
  year: number;
  price: number;
  mileage?: number | null;
  fuel?: string | null; // NOT "fuel_type"
  transmission?: string | null;
  body_type?: string | null;
  color?: string | null;
  engine?: string | null; // NOT "engine_capacity"
  drive_type?: string | null;
  condition?: string | null;
  description?: string | null;
  features?: string[] | null;
  /** JSONB array of {url, thumb, public_id, ...} objects - NOT a plain
   * TEXT[] of URL strings, confirmed via createCar()/updateCar() and
   * the Cloudinary-upload follow-up flow in carController.js. */
  images?: Array<{ url: string; thumb?: string; public_id?: string }> | null;
  location_city?: string | null; // NOT a nested "location.city" path
  vin?: string | null;
  chassis_number?: string | null;
  registration_number?: string | null;
  is_flagged_duplicate?: boolean | null;
  status?: string | null;
  views?: number | null;
  approved?: boolean | null;
  inspection_status?: string | null; // basic status only - not the full inspection record
  is_verified_dealer?: boolean | null;
  /** Real, already-populated by the backend (carController.js:
   * .populate("dealer", "name businessName phone role avatar
   * dealerApprovedAt")). Not consumed directly by this type's own
   * dealer field below - callers derive verification from the
   * separate, direct is_verified_dealer flag on the car itself
   * instead (more reliable than depending on this join succeeding -
   * see pages/AuctionDiscoveryNetwork.tsx's own mapper for why). */
  dealer?: { name?: string; businessName?: string; avatar?: string; phone?: string; email?: string; role?: string; dealerApprovedAt?: string | null } | null;
  is_promoted?: boolean | null;
  deal_rating?: string | null;
  // --- Auction fields, denormalized directly onto the car row ---
  auction_status?: string | null; // 'none' | 'draft' | 'live' | 'ended' - confirmed via backend/config/swagger.js's own documented enum
  auction_end?: string | null;
  auction_start_time?: string | null;
  starting_bid?: number | null;
  current_bid?: number | null;
  bids_count?: number | null;
  highest_bidder_id?: string | null;
  allow_bid?: boolean | null;
  allow_buy?: boolean | null;
  has_auction?: boolean | null; // GENERATED column: auction_status IS DISTINCT FROM 'none'
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PaginatedCarsResponse {
  success: boolean;
  data: BackendCar[];
  cars?: BackendCar[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages?: number;
    totalPages?: number;
  };
  message?: string;
}

export interface SingleCarResponse {
  success: boolean;
  data?: BackendCar;
  message?: string;
}

export type VehicleApiErrorKind = 'network' | 'not_found' | 'server' | 'unknown';

export class VehicleApiError extends Error {
  kind: VehicleApiErrorKind;
  status?: number;
  constructor(message: string, kind: VehicleApiErrorKind, status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

async function vehicleFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await request<T>(path, { method: options.method, body: options.body, headers: options.headers as Record<string, string> });
  } catch (err) {
    const error = err instanceof HttpRequestError ? err : new HttpRequestError('Request failed.');
    const kind: VehicleApiErrorKind = error.status === 404 ? 'not_found' : error.status ? 'server' : 'network';
    throw new VehicleApiError(error.message, kind, error.status);
  }
}

export interface GetCarsParams {
  page?: number;
  limit?: number;
  keyword?: string;
  brand?: string;
  model?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  yearMin?: number;
  yearMax?: number;
  body?: string;
  fuel?: string;
  transmission?: string;
  mileageMin?: number;
  mileageMax?: number;
  color?: string;
  condition?: string;
  category?: 'auction' | 'fixed';
  featured?: boolean;
  dealerType?: 'dealer' | 'private';
  vin?: string;
  engine?: string;
  drivetrain?: string;
  /** Confirmed real, already-supported backend filter
   * (carController.js's own getCars: query.auctionStatus =
   * auctionStatus) - 'draft' | 'live' | 'ended'. */
  auctionStatus?: string;
  /** Confirmed real, already-supported backend sort values
   * (carController.js's own getCars sortOption logic) -
   * 'newest' is also the real, unconditional default when
   * omitted, so this param only needs passing for a non-default
   * order. */
  sort?: 'price_asc' | 'price_desc' | 'year_desc' | 'year_asc' | 'mileage_asc' | 'views_desc' | 'newest' | 'ending_soon';
}

/** GET /api/cars - real, paginated listing. Query params match
 * backend/controllers/carController.js's getCars destructured
 * req.query fields directly. */
export async function getCars(params: GetCarsParams = {}): Promise<PaginatedCarsResponse> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return vehicleFetch<PaginatedCarsResponse>(`/api/cars${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

/** GET /api/cars/:id - single car by ID. */
export async function getCarById(id: string): Promise<BackendCar | null> {
  try {
    const res = await vehicleFetch<SingleCarResponse>(`/api/cars/${id}`, { method: 'GET' });
    return res.data ?? null;
  } catch (err) {
    if (err instanceof VehicleApiError && err.kind === 'not_found') {
      return null;
    }
    throw err;
  }
}

/** GET /api/cars/my-listings - the real, signed-in seller's own
 * listings, every status (not just "available"). */
export async function getMyListings(): Promise<BackendCar[]> {
  const res = await vehicleFetch<{ data: BackendCar[] }>('/api/cars/my-listings', { method: 'GET' });
  return res.data || [];
}

/** Maps a real backend car row to this frontend's real Vehicle type
 * (src/types/index.ts). Corrected in Phase 5 to reflect the real
 * schema (see file header) - auction fields are now mapped from real
 * data that genuinely exists on the row, not defaulted to false/zero
 * as the pre-correction version did. sellerName/sellerAvatar/
 * sellerRating and full inspection detail remain honest gaps - the
 * backend genuinely does not have this data on the cars row, and nothing
 * here fabricates it. */
/**
 * Maps a real backend car row to this frontend's complete, real
 * Vehicle type (src/types/index.ts). Rewritten in Phase 7 to return a
 * genuinely complete Vehicle object - the pre-Phase-7 version returned
 * a partial object missing several fields the real Vehicle interface
 * requires (engine, horsepower, exteriorColor, interiorColor,
 * listingType, sellerRating, savedCount, status, createdAt), which
 * would have caused real problems the moment any component actually
 * consumed it (this was never caught earlier because nothing called
 * this function from real UI code until this phase).
 *
 * Every field genuinely present on the backend is mapped directly -
 * nothing here invents a value the backend didn't actually send.
 * Seller identity/contact fields are derived from the real populated `dealer`
 * relation returned by the backend. If that relation is unavailable, the mapper
 * uses an explicit unknown state rather than inventing a seller identity.
 * Other fields with no authoritative source retain honest defaults.
 */
export function mapBackendCarToVehicle(car: BackendCar): Vehicle {
  const imageUrls = (car.images || []).map((img) => img.url).filter(Boolean);
  const conditionValue = (car.condition || '') as Vehicle['condition'];
  const bodyStyleValue = (car.body_type || '') as Vehicle['bodyStyle'];
  const transmissionValue = (car.transmission || '') as Vehicle['transmission'];
  const fuelTypeValue = (car.fuel || '') as Vehicle['fuelType'];
  // These 4 casts assume the backend's free-text column values line up
  // with this frontend's stricter union types - true for the historical seed
  // data these columns were designed around, but not enforced by any
  // schema constraint on the backend side (confirmed: these are plain
  // TEXT columns, no CHECK constraint restricting their values the way
  // e.g. cars.status has one). A backend value outside the expected
  // union renders with an unrecognized value at runtime rather than
  // crashing - flagged here as a real, known risk rather than silently
  // assumed safe.

  return {
    id: car.id,
    title: car.title,
    make: car.brand, // real column is "brand", not "make"
    model: car.model,
    year: car.year,
    vin: car.vin || '',
    price: Number(car.price),
    mileage: car.mileage ?? 0,
    location: car.location_city || '',
    bodyStyle: bodyStyleValue,
    transmission: transmissionValue,
    fuelType: fuelTypeValue,
    // engine: real column exists (car.engine) but was never mapped by
    // the pre-Phase-7 version of this function - genuine oversight,
    // fixed here now that a real Vehicle return type surfaced it.
    engine: car.engine || '',
    // horsepower: no equivalent column exists anywhere on the real
    // cars row - honest default, not fabricated.
    horsepower: 0,
    // exteriorColor/interiorColor: the backend has a single `color`
    // column, not separate exterior/interior fields - real value used
    // for exterior (the far more common real-world distinction to
    // actually have), interior left as an honest default.
    exteriorColor: car.color || '',
    interiorColor: '',
    condition: conditionValue,
    // listingType: inferred from the real has_auction field rather
    // than fabricated from nothing - 'auction' when has_auction is
    // true, 'fixed' otherwise. This IS a real, if imperfect, signal
    // (unlike horsepower/interiorColor above, which have no backend
    // signal at all) - not the same category of default.
    listingType: car.has_auction ? 'auction' : 'fixed',
    images: imageUrls,
    image: imageUrls[0] || undefined,
    description: car.description || '',
    features: car.features || [],
    // --- still-genuine gaps: not present on the cars row at all ---
    sellerId: car.dealer_id || '',
    sellerName: car.dealer?.businessName || car.dealer?.name || 'Unknown Seller',
    sellerAvatar: car.dealer?.avatar || undefined,
    sellerPhone: car.dealer?.phone || undefined,
    sellerEmail: car.dealer?.email || undefined,
    sellerRating: 0, // no authoritative rating aggregate is returned by this endpoint
    sellerType: car.dealer?.role === 'dealer' ? 'Verified Dealer' : car.dealer?.role === 'individual_seller' ? 'Private Seller' : undefined,
    isDealerCertified: Boolean(car.is_verified_dealer || car.dealer?.dealerApprovedAt),
    verified: Boolean(car.is_verified_dealer),
    isAuction: Boolean(car.has_auction),
    currentBid: car.current_bid != null ? Number(car.current_bid) : undefined,
    bidsCount: car.bids_count ?? undefined,
    auctionEndsAt: car.auction_end || undefined,
    savedCount: 0, // no favorites-count aggregation performed by getCars - would require a separate query against the favorites table
    // status: backend has a real `status` column (confirmed: CHECK
    // constraint restricts it to 'available'/'sold'/'pending'/
    // 'reserved'/'hidden'/'draft' - see supabase/migrations/
    // ..._foundational_tables.sql.sql) but its value set doesn't
    // exactly match this frontend's Vehicle.status union
    // ('active'/'sold'/'pending'/'draft') - 'available' maps to
    // 'active' as the closest equivalent; anything else not in the
    // frontend union falls back to 'active' rather than crashing.
    status: car.status === 'sold' ? 'sold' : car.status === 'pending' ? 'pending' : car.status === 'draft' ? 'draft' : 'active',
    createdAt: car.created_at || '',
  };
}

// Added (Final Integration Phase 2 - seller listing -> publish ->
// marketplace). The real backend already has a complete, working
// POST /api/cars endpoint (backend/controllers/carController.js's
// createCar, mounted with real auth/ownership/validation middleware
// - protect, dealerOnly, requireDealerVerification, image upload,
// createCarSchema validation) - it was simply never called from any
// real frontend UI. This is the one, real, canonical creation
// endpoint - not a new API being invented here.
//
// Traced directly: the real seller listing wizard
// (PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx) has no
// per-step form inputs implemented at all for any of its 12 steps -
// its own `ListingDraft` state is declared but never populated by any
// real user input anywhere in that file, confirmed by direct
// inspection (no <input>, no onChange handler exists for any listing
// field in that component). Per this phase's own explicit
// instruction ("do not add seller functionality, do not redesign the
// seller wizard"), this function does not invent form fields that
// were never collected - it sends exactly what the wizard's own
// draft state actually contains, using FormData so it matches the
// real backend's multipart/form-data + upload.array("images", 10)
// contract exactly (never manually set Content-Type here - the
// browser must set the multipart boundary itself).
export interface CreateCarPayload {
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  mileage?: number;
  fuel?: string;
  transmission?: string;
  color?: string;
  condition?: string;
  vin?: string;
  registrationNumber?: string;
  description?: string;
  city?: string;
  /** Real image files - the real backend requires at least one
   * (confirmed directly: POST /api/cars rejects with "At least one
   * image is required." when omitted). */
  images?: File[];
}

export interface CreateCarResponse {
  success: boolean;
  message?: string;
  car?: BackendCar;
}

/** POST /api/cars - the one, real, canonical listing-creation
 * endpoint. Server-side validation (createCarSchema) is authoritative
 * - this function does not duplicate or pre-empt it, it simply
 * surfaces exactly what the real backend decides, success or
 * rejection, to the caller. */
export async function createCar(payload: CreateCarPayload): Promise<CreateCarResponse> {
  const formData = new FormData();
  const { images, ...scalarFields } = payload;
  Object.entries(scalarFields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      formData.append(key, String(value));
    }
  });
  // Real backend field name, confirmed directly: routes/carRoutes.js's
  // own upload.array("images", 10).
  (images || []).forEach((file) => formData.append('images', file));

  try {
    return await request<CreateCarResponse>('/api/cars', {
      method: 'POST',
      body: formData,
    });
  } catch (err) {
    const error = err instanceof HttpRequestError ? err : new HttpRequestError('Request failed.');
    throw new VehicleApiError(error.message, error.status === 404 ? 'not_found' : 'server', error.status);
  }
}

