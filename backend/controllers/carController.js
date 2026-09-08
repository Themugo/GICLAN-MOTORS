import Car from "../models/Car.js";
import User from "../models/User.js";
import PlatformConfig from "../models/PlatformConfig.js";
import { cacheDelPattern } from "../utils/cache.js";
import { uploadMultiple, deleteImage } from "../config/cloudinary.js";
import { cleanupFiles } from "../middleware/upload.js";
import { logWarn, logError } from "../utils/logger.js";
import { logActionFromReq } from "../utils/securityLogger.js";
import * as path from "path";
import { STAFF_ROLES, SELLER_ROLES } from "../config/roles.js";
import { detectDuplicates, flagDuplicate } from "../services/duplicateVehicleService.js";
import { logVehicleCreated, logVehicleEdited, logVehicleDeleted } from "../services/auditService.js";
import { getDealerEntitlement, assertDealerCanCreateListing } from "../services/dealerSubscription.service.js";

const DEALER_ROLES = SELLER_ROLES; // backward compat

// =============================
// 🧠 SAFE NUMBER PARSER
// =============================
const toNumber = (val, def) => {
  const n = Number(val);
  return isNaN(n) ? def : n;
};

// =============================
// 📦 GET ALL CARS (SERVER-SIDE FILTERING + PAGINATION)
// =============================
export const getCars = async (req, res) => {
  // Fixed (re-applied - this project's own earlier hardening work
  // already found and fixed this exact defect; confirmed reverted):
  // query/pageNum/limitNum/sortOption were all declared with
  // const/let inside the try block below, but the catch block at the
  // bottom of this function references all four for error logging -
  // a real ReferenceError (reproduced directly against a real
  // database), since JS does not expose try-block-scoped bindings to
  // their own catch block. This masks whatever the original error
  // actually is: any real failure inside the try (such as the wrong-
  // column-name bug fixed in fieldMap.js) throws a second, unrelated
  // ReferenceError from this catch block's own logging code, hiding
  // the real cause. Hoisted here so the catch block can safely
  // reference them.
  let query = {};
  let pageNum = 1;
  let limitNum = 12;
  let sortOption = {};
  try {
    const {
      keyword,
      brand,
      model,
      city,
      minPrice,
      maxPrice,
      yearMin,
      yearMax,
      body,
      fuel,
      transmission,
      color,
      condition,
      mileageMin,
      mileageMax,
      category,
      sort,
      featured,
      auctionStatus,
      dealerType,
      vin,
      engine,
      drivetrain,
      page = 1,
      limit = 12,
    } = req.query;

    pageNum = Math.max(toNumber(page, 1), 1);
    // Hard cap: clamp limit to 1..100 so a request like ?limit=999999 can
    // never trigger an unbounded query (pagination cap — Issue: security test).
    limitNum = Math.min(Math.max(toNumber(limit, 12), 1), 100);

    query = { status: "available" };

    if (keyword) {
      const trimmed = keyword.trim();
      if (trimmed.length >= 3) {
        // Use indexed full-text search for 3+ character queries.
        query.$text = { $search: trimmed };
      } else {
        // Short queries: fall back to regex (text index needs full tokens)
        const safe = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        query.$or = [{ title: { $regex: safe, $options: "i" } }, { brand: { $regex: safe, $options: "i" } }];
      }
    }

    if (brand) query.brand = { $in: brand.split(",") };
    if (model) {
      const safeModel = model.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.model = { $regex: `^${safeModel}$`, $options: "i" };
    }
    if (city) {
      const safeCity = city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query["location.city"] = { $regex: `^${safeCity}$`, $options: "i" };
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = toNumber(minPrice, 0);
      if (maxPrice) query.price.$lte = toNumber(maxPrice, 999999999);
    }

    if (yearMin || yearMax) {
      query.year = {};
      if (yearMin) query.year.$gte = toNumber(yearMin, 0);
      if (yearMax) query.year.$lte = toNumber(yearMax, 9999);
    }

    const exactText = (value) => ({
      $regex: `^${String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      $options: "i",
    });
    if (body) query.bodyType = exactText(body);
    if (fuel) query.fuel = exactText(fuel);
    if (transmission) query.transmission = exactText(transmission);
    if (color) query.color = exactText(color);
    if (condition) query.condition = exactText(condition);

    if (mileageMin || mileageMax) {
      query.mileage = {};
      if (mileageMin) query.mileage.$gte = toNumber(mileageMin, 0);
      if (mileageMax) query.mileage.$lte = toNumber(mileageMax, 9999999);
    }

    if (vin) {
      const safeVin = vin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.vin = { $regex: safeVin, $options: "i" };
    }
    if (engine) {
      const safeEngine = engine.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.engine = { $regex: `^${safeEngine}$`, $options: "i" };
    }
    if (drivetrain) query.drivetrain = exactText(drivetrain);
    if (dealerType === "dealer") {
      const dealerIds = await User.find({ role: "dealer" }).distinct("_id").lean();
      query.dealer = { $in: dealerIds };
    } else if (dealerType === "private") {
      const sellerIds = await User.find({ role: "individual_seller" }).distinct("_id").lean();
      query.dealer = { $in: sellerIds };
    }

    if (category === "auction") {
      const categoryOr = [{ auctionStatus: "live" }, { allowBid: true }];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: categoryOr }];
        delete query.$or;
      } else {
        query.$or = categoryOr;
      }
    } else if (category === "fixed") {
      query.auctionStatus = { $ne: "live" };
      query.allowBid = { $ne: true };
    }

    if (featured === "true" || featured === true) {
      query.isPromoted = true;
    }

    if (auctionStatus) {
      query.auctionStatus = auctionStatus;
    }

    sortOption = {};
    if (query.$text && !sort) {
      // When using text search without explicit sort, rank by relevance
      sortOption = { score: { $meta: "textScore" }, createdAt: -1 };
    } else if (sort === "price_asc") sortOption = { price: 1 };
    else if (sort === "price_desc" || sort === "-price") sortOption = { price: -1 };
    else if (sort === "year_desc" || sort === "-year") sortOption = { year: -1 };
    else if (sort === "year_asc") sortOption = { year: 1 };
    else if (sort === "mileage_asc") sortOption = { mileage: 1 };
    else if (sort === "views_desc" || sort === "-views") sortOption = { views: -1 };
    else if (sort === "-createdAt" || sort === "createdAt_desc" || sort === "newest") sortOption = { createdAt: -1 };
    else if (sort === "createdAt_asc") sortOption = { createdAt: 1 };
    else if (sort === "ending_soon") sortOption = { auctionEnd: 1 };
    else sortOption = { createdAt: -1 };

    const skip = (pageNum - 1) * limitNum;

    // Build the query chain — add text score projection if using $text
    let findQuery = Car.find(query);
    if (query.$text) {
      findQuery = findQuery.select({
        score: { $meta: "textScore" },
        title: 1,
        price: 1,
        images: 1,
        coverImage: 1,
        brand: 1,
        year: 1,
        model: 1,
        // Fixed (re-applied): "location" is not a real field/alias -
        // the real column is location_city, reached via the "city"
        // app-level alias.
        city: 1,
        fuel: 1,
        transmission: 1,
        mileage: 1,
        bodyType: 1,
        color: 1,
        condition: 1,
        description: 1,
        allowBid: 1,
        allowBuy: 1,
        auctionStatus: 1,
        currentBid: 1,
        bidsCount: 1,
        views: 1,
        trustScore: 1,
        dealRating: 1,
        createdAt: 1,
        dealer: 1,
        isVerifiedDealer: 1,
        ntsaVerified: 1,
        dutyStatus: 1,
        isPromoted: 1,
      });
    } else {
      findQuery = findQuery.select(
        "title price images coverImage brand year model city fuel transmission mileage bodyType color condition description allowBid allowBuy auctionStatus currentBid bidsCount views trustScore dealRating createdAt dealer isVerifiedDealer ntsaVerified dutyStatus isPromoted",
      );
    }

    // Fixed (Auction page real-data integration): reproduced directly
    // - "logo" and "verified" are not real columns on the users
    // table (confirmed: only "avatar" exists; there is no plain
    // boolean "verified" field, only the real, honest signal
    // dealer_approved_at being non-null). This entire populate call
    // was silently failing on every single request (population is
    // best-effort and swallows its own error), so car.dealer was
    // always just the raw, unpopulated foreign key - never the real
    // dealer object - on every real car fetch, not just auctions.
    findQuery = findQuery.populate("dealer", "name businessName phone role avatar dealerApprovedAt");

    const [cars, total] = await Promise.all([
      findQuery.sort(sortOption).skip(skip).limit(limitNum).lean(),

      Car.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: cars || [],
      cars: cars || [], // Include both for frontend compatibility
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    logError("FETCH ERROR", {
      message: err.message,
      name: err.name,
      code: err.code,
      query: JSON.stringify(query),
      sort: JSON.stringify(sortOption),
      page: pageNum,
      limit: limitNum,
    });
    res.status(500).json({ success: false, message: "Failed to fetch cars", data: [] });
  }
};

// =============================
// 📋 GET MY LISTINGS (real, signed-in seller's own inventory, every
// status - not the public "available only" default GET /cars uses)
// =============================
// Fixed: PrivateSellerPlatform.tsx's own dashboard previously called
// a completely fake backend endpoint (dealerPlatformController.js's
// getInventory) that returned 7 hardcoded, invented vehicles
// regardless of who called it or what's actually in the database - a
// backend-side fake, not just a frontend display issue. This is a
// real query, scoped to req.user.id directly (never a client-
// supplied id, since GET /cars itself is fully public with no auth -
// a client-suppliable sellerId filter that bypassed the public
// status:"available" default would let anyone view any other user's
// private draft/pending listings without authentication).
export const getMyListings = async (req, res) => {
  try {
    const cars = await Car.find({ dealer: req.user.id })
      .populate("dealer", "name businessName avatar")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: cars });
  } catch (err) {
    logError("Error fetching my listings:", err);
    res.status(500).json({ success: false, message: "Failed to fetch your listings" });
  }
};

// =============================
// ➕ CREATE CAR
// =============================
export const createCar = async (req, res) => {
  try {
    const seller = await User.findById(req.user.id).select(
      "+trialStartedAt +trialListingsUsed +firstVehicleUsed dealerPackage packageListingMax packageExpiresAt listingCount role status",
    );

    if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });

    // ── PACKAGE / TRIAL ENFORCEMENT ─────────────────────────
    const config = await PlatformConfig.findOne().lean();
    const pkgs = config?.packages || [];
    const isDealer = seller.role === "dealer";
    const isSeller = seller.role === "individual_seller";

    // The platform free-market switch applies only to private sellers.
    // Dealer commercial access is always determined by the authoritative
    // dealer_subscriptions entitlement service; a missing configuration must
    // never accidentally turn dealer inventory into a free unlimited plan.
    const monetisationOff = config?.freeMarket !== false || config?.waivePayments === true;
    const currentListingCount = await Car.countDocuments({ dealer: req.user.id });

    // Determine if user is allowed to create a listing (without incrementing yet)
    let shouldIncrementListingCount = false;

    if (isDealer) {
      // Dealer monetisation never bypasses the entitlement contract, even
      // while the public/private-seller market switch is in free mode.
      await assertDealerCanCreateListing(req.user.id);
      shouldIncrementListingCount = true;
    } else if (monetisationOff) {
      // Free-market mode is intentionally limited to individual sellers.
      shouldIncrementListingCount = true;
    }

    if (!monetisationOff && isSeller) {
      const sellerPkg = pkgs.find((p) => p.id === seller.dealerPackage) || null;

      if (!seller.firstVehicleUsed || currentListingCount === 0) {
        shouldIncrementListingCount = true;
      } else if (sellerPkg && !sellerPkg.isFree) {
        if (sellerPkg.listingMax > 0 && currentListingCount >= sellerPkg.listingMax) {
          return res.status(402).json({
            success: false,
            message: `You've reached your plan limit of ${sellerPkg.listingMax} listings.`,
            code: "LISTING_LIMIT_REACHED",
          });
        }
        shouldIncrementListingCount = true;
      } else if (!sellerPkg) {
        return res.status(402).json({
          success: false,
          message: "Your free listing has been used. Subscribe to a seller plan to list more vehicles.",
          code: "FREE_VEHICLE_USED",
        });
      } else {
        shouldIncrementListingCount = true;
      }
    }

    // ── ESCROW ENFORCEMENT ─────────────────────────────────
    // individual_seller: escrow is always enabled (enforced in payment)
    // dealer: if escrowForced -> auto-enable; if not approved/forced -> disable
    if (isDealer) {
      const dealerUser = seller; // seller is the dealer
      if (dealerUser.escrowForced) {
        req.body.escrowEnabled = true;
      } else if (!dealerUser.escrowApproved && !dealerUser.escrowForced) {
        req.body.escrowEnabled = false;
      }
    }

    const body = {
      ...req.body,
      dealer: req.user.id,
      views: 0,
      bidsCount: 0,
      trustScore: 0,
      status: seller.status === "approved" ? "available" : "pending",
      isVerifiedDealer: seller.status === "approved",
    };
    // `city` is the correct app-level alias for the real
    // location_city column (confirmed and fixed in this project's own
    // earlier hardening work - utils/fieldMap.js's cars.city ->
    // location_city alias). This block previously built body.location
    // instead - a real, reproduced failure ("Could not find the
    // 'location' column of 'cars'"), since no such column or alias
    // exists at all. Every display site across the app already reads
    // car.location as a plain string (a frontend-level naming choice,
    // separate from the real backend column) - that mapping is
    // handled by mapBackendCarToVehicle, not here.
    if (!body.city) {
      body.city = [body.city || seller.location || "", body.address || ""]
        .filter(Boolean)
        .join(", ");
    }
    delete body.address;

    // ── PROCESS UPLOADED IMAGES ───────────────────────────────
    const cloudinaryConfigured =
      process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

    if (!cloudinaryConfigured && req.files && req.files.length > 0) {
      return res.status(500).json({
        success: false,
        message: "Cloud storage not configured. Please set CLOUDINARY credentials.",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one image is required.",
      });
    }

    let pendingFiles = null;
    body.images = req.files.map((f, i) => ({
      url: `/uploads/${path.basename(f.path)}`,
      thumb: `/uploads/${path.basename(f.path)}`,
      public_id: null,
      _pending: true,
    }));
    pendingFiles = req.files;

    // Set coverImage: use user selection if valid, otherwise default to 0
    const totalImages = (body.images || []).length;
    const requestedCover = Number(body.coverImage);
    body.coverImage =
      !isNaN(requestedCover) && requestedCover >= 0 && requestedCover < totalImages ? requestedCover : 0;

    // ── CREATE CAR (before incrementing listing count for atomicity) ──
    const car = await Car.create(body);

    // ── INCREMENT LISTING COUNT (only after successful Car.create) ──
    if (shouldIncrementListingCount) {
      const updateOps = { $inc: { listingCount: 1 } };
      if (isSeller && !seller.firstVehicleUsed) {
        updateOps.firstVehicleUsed = true;
      }
      await User.findByIdAndUpdate(req.user.id, updateOps);
    }

    await cacheDelPattern("cars:list:*");

    await logActionFromReq(req, "create_car", {
      target: car._id,
      targetModel: "Car",
      details: { title: car.title, price: car.price },
    });

    // Log vehicle creation to audit trail
    await logVehicleCreated(car, req.user, req);

    // ── DUPLICATE DETECTION (Non-blocking) ──
    setImmediate(async () => {
      try {
        const detectionData = await detectDuplicates(
          {
            vin: car.vin,
            chassisNumber: car.chassisNumber,
            registrationNumber: car.registrationNumber,
            brand: car.brand,
            model: car.model,
            year: car.year,
            price: car.price,
            mileage: car.mileage,
          },
          req.user.id,
        );

        if (detectionData.hasDuplicates) {
          await flagDuplicate(car._id, detectionData, req.user.id);
        }
      } catch (err) {
        // Duplicate detection failure should not affect listing creation
        logWarn("Duplicate detection failed", { error: err.message });
      }
    });

    res.status(201).json({ success: true, data: car });

    // ── BACKGROUND: Upload images to Cloudinary after response ──
    if (pendingFiles && cloudinaryConfigured) {
      setImmediate(async () => {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const uploaded = await uploadMultiple(pendingFiles, "kayad/cars");
            await Car.findByIdAndUpdate(car._id, { $set: { images: uploaded } });
            cleanupFiles(pendingFiles);
            break;
          } catch (e) {
            logWarn(`Cloudinary upload attempt ${attempt}/3 failed:`, { error: e.message });
            if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 2000));
          }
        }
      });
    }
  } catch (err) {
    logError("CREATE ERROR", { error: err.message });
    cleanupFiles(req.files);
    const isDev = process.env.NODE_ENV === "development";
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to create car",
        ...(isDev && { error: err.message }),
      });
    }
  }
};

// =============================
// ✏️ UPDATE CAR
// =============================
export const updateCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    // Snapshot before any mutation so the audit trail records the real
    // before/after state rather than two identical post-save objects.
    const oldData = car.toObject();

    const isStaff = STAFF_ROLES.includes(req.user.role);
    const isDealer = DEALER_ROLES.includes(req.user.role);
    const isOwner = car.dealer?.toString() === req.user.id;

    // Permission rules: owners, staff, or the appropriate authorized seller/dealer may edit.
    const canEdit = isOwner || isStaff;
    if (!canEdit) {
      return res.status(403).json({ success: false, message: "Not authorized to edit this listing" });
    }

    // ── ESCROW ENFORCEMENT ON UPDATE ─────────────────────
    // When a dealer updates a car, enforce escrow rules
    const updaterIsDealer = req.user.role === "dealer";
    if (updaterIsDealer || isOwner) {
      const seller = await User.findById(req.user.id).select("role escrowApproved escrowForced");
      if (seller) {
        if (seller.escrowForced) {
          car.escrowEnabled = true;
        } else if (!seller.escrowApproved && !seller.escrowForced) {
          car.escrowEnabled = false;
        }
      }
    }

    // Preserve existing coverImage if caller didn't explicitly send one
    const incomingCover = req.body.coverImage;
    const hadExplicitCover = incomingCover !== undefined && incomingCover !== null && incomingCover !== "";

    // Track price change
    const newPrice = Number(req.body.price);
    if (!isNaN(newPrice) && newPrice !== car.price) {
      car.priceHistory.push({ price: car.price || 0, date: new Date() });
    }

    const allowedFields = [
      "title",
      "brand",
      "model",
      "year",
      "price",
      "city",
      "address",
      "fuel",
      "transmission",
      "mileage",
      "bodyType",
      "color",
      "condition",
      "description",
      "features",
      "images",
      "coverImage",
      "status",
      "allowBuy",
      "allowBid",
      "escrowEnabled",
      "auctionStartTime",
      "auctionEnd",
      "startingBid",
      "reservePrice",
      "reserveMode",
      "isPromoted",
      "promotionExpiresAt",
      "dealerPhone",
      "ntsaVerified",
      "dutyStatus",
      "logbookVerified",
    ];
    // The real cars column is location_city. `city` is the application
    // field mapped to that column; `address` is not a cars column. Keep
    // the edit path on the same contract as createCar instead of writing
    // a nonexistent `location` field.
    if (req.body.city || req.body.address) {
      const existingCity = car.city || "";
      const cityPart = req.body.city ?? existingCity;
      const addressPart = req.body.address ?? "";
      req.body.city = [cityPart, addressPart].filter(Boolean).join(", ");
    }
    for (const key of Object.keys(req.body)) {
      if (key === "city" || key === "address") continue; // folded into location above
      if (allowedFields.includes(key) || key === "location") {
        car.set(key, req.body[key]);
      }
    }

    // ── SMART COVER IMAGE AUTO-SELECTION ────────────────────
    // Helper: find first index with a real URL
    const findFirstValidIdx = (images) => {
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const url = typeof img === "string" ? img : img?.url;
        if (url && url.startsWith("http")) return i;
      }
      return 0; // fallback to index 0
    };

    const totalImages = (car.images || []).length;
    if (totalImages === 0) {
      car.coverImage = 0;
    } else if (!hadExplicitCover) {
      // No explicit cover sent — keep existing if still valid, else auto-pick
      if (isNaN(car.coverImage) || car.coverImage < 0 || car.coverImage >= totalImages) {
        car.coverImage = findFirstValidIdx(car.images);
      }
      // else: keep the existing coverImage value untouched
    } else {
      // Explicit cover sent — validate it's in range
      const idx = Number(incomingCover);
      car.coverImage = !isNaN(idx) && idx >= 0 && idx < totalImages ? idx : findFirstValidIdx(car.images);
    }

    await car.save();

    await cacheDelPattern("cars:list:*");

    await logActionFromReq(req, "update_car", {
      target: car._id,
      targetModel: "Car",
      details: { title: car.title, price: car.price },
    });

    // Log vehicle edit to audit trail
    await logVehicleEdited(car, oldData, req.user, req);

    res.json({ success: true, data: car });
  } catch (err) {
    logError("UPDATE ERROR", { error: err.message });
    res.status(500).json({ success: false, message: "Failed to update car" });
  }
};

// =============================
// ❌ DELETE CAR
// =============================
export const deleteCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    const isStaff = STAFF_ROLES.includes(req.user.role);
    const isDealer = DEALER_ROLES.includes(req.user.role);
    const isOwner = car.dealer?.toString() === req.user.id;
    if (!isOwner && !isStaff) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this listing" });
    }

    await Car.softDelete(req.params.id, req.user.id);

    // Decrement listing counts
    if (car.dealer) {
      const owner = await User.findById(car.dealer).select("listingCount");
      if (owner && owner.listingCount > 0) {
        // listingCount represents currently retained listings.
        // trialListingsUsed is historical entitlement consumption and must
        // not be refunded when a trial listing is later deleted.
        await User.findByIdAndUpdate(car.dealer, { listingCount: owner.listingCount - 1 });
      }
    }

    await cacheDelPattern("cars:list:*");

    await logActionFromReq(req, "delete_car", {
      target: req.params.id,
      targetModel: "Car",
      details: { title: car.title },
    });

    // Log vehicle deletion to audit trail
    await logVehicleDeleted(car, req.user, req);

    res.json({
      success: true,
      message: "Deleted",
    });
  } catch (err) {
    logError("DELETE ERROR", { error: err.message });
    res.status(500).json({ success: false, message: "Failed to fetch cars", data: [] });
  }
};

// =============================
// 🖼 DELETE IMAGE FROM CAR
// =============================
export const deleteCarImage = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    const isStaff = STAFF_ROLES.includes(req.user.role);
    const isDealer = DEALER_ROLES.includes(req.user.role);
    const isOwner = car.dealer?.toString() === req.user.id;
    if (!isOwner && !isStaff) {
      return res.status(403).json({ success: false, message: "Not authorized to edit this listing" });
    }

    const imageIndex = Number(req.params.imageIndex);
    if (isNaN(imageIndex) || imageIndex < 0 || imageIndex >= (car.images || []).length) {
      return res.status(400).json({ success: false, message: "Invalid image index" });
    }

    const removedImage = car.images[imageIndex];

    // Delete from Cloudinary if it has a public_id
    if (removedImage?.public_id) {
      await deleteImage(removedImage.public_id);
    }

    // Remove from array
    car.images.splice(imageIndex, 1);

    // Adjust coverImage if needed
    if (car.images.length === 0) {
      car.coverImage = 0;
    } else if (imageIndex < car.coverImage) {
      car.coverImage -= 1;
    } else if (imageIndex === car.coverImage) {
      car.coverImage = 0;
    }

    await car.save();
    await cacheDelPattern("cars:list:*");

    await logActionFromReq(req, "delete_car_image", {
      target: car._id,
      targetModel: "Car",
      details: { imageIndex, removedPublicId: removedImage?.public_id },
    });

    res.json({ success: true, data: { images: car.images, coverImage: car.coverImage } });
  } catch (err) {
    logError("DELETE IMAGE ERROR", { error: err.message });
    res.status(500).json({ success: false, message: "Failed to delete image" });
  }
};

// =============================
// 📤 ADD IMAGES TO CAR
// =============================
export const addCarImages = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    const isStaff = STAFF_ROLES.includes(req.user.role);
    const isDealer = DEALER_ROLES.includes(req.user.role);
    const isOwner = car.dealer?.toString() === req.user.id;
    if (!isOwner && !isStaff) {
      return res.status(403).json({ success: false, message: "Not authorized to edit this listing" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No images provided" });
    }

    const maxImages = 20;
    const currentCount = (car.images || []).length;
    if (currentCount + req.files.length > maxImages) {
      cleanupFiles(req.files);
      return res.status(400).json({
        success: false,
        message: `Maximum ${maxImages} images allowed. You have ${currentCount}, trying to add ${req.files.length}.`,
      });
    }

    const cloudinaryConfigured =
      process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

    if (!cloudinaryConfigured) {
      cleanupFiles(req.files);
      return res.status(500).json({
        success: false,
        message: "Cloud storage not configured. Please set CLOUDINARY credentials.",
      });
    }

    const newImages = await uploadMultiple(req.files, "kayad/cars");
    cleanupFiles(req.files);

    car.images = [...(car.images || []), ...newImages];
    await car.save();
    await cacheDelPattern("cars:list:*");

    await logActionFromReq(req, "add_car_images", {
      target: car._id,
      targetModel: "Car",
      details: { addedCount: newImages.length, totalImages: car.images.length },
    });

    res.json({ success: true, data: { images: car.images } });
  } catch (err) {
    logError("ADD IMAGES ERROR", { error: err.message });
    res.status(500).json({ success: false, message: "Failed to add images" });
  }
};

// =============================
// 📦 GET SINGLE CAR
// =============================
export const getCar = async (req, res) => {
  try {
    // Fixed (Auction page real-data integration): reproduced the
    // same real defect found in the other dealer populate() call
    // above - "visibility" and "approved" are not real columns on
    // the users table (confirmed directly). Removed "visibility" (no
    // real equivalent found) and corrected "approved" to the real,
    // honest signal (dealerApprovedAt being non-null means the dealer
    // is approved) - this populate call was silently failing on
    // every single vehicle-detail-page view.
    const car = await Car.findById(req.params.id)
      .populate("dealer", "_id name email phone location businessName bio dealerRating dealerApprovedAt role")
      .lean();

    if (!car) {
      return res.status(404).json({ success: false, message: "Car not found" });
    }

    const isOwner = req.user && String(car.dealer?._id) === String(req.user.id);
    const isAdmin = req.user && STAFF_ROLES.includes(req.user.role);
    if (car.status !== "available" && car.status !== "sold" && !isOwner && !isAdmin) {
      return res.status(404).json({ success: false, message: "Car not found" });
    }

    if (car.dealer?.visibility) {
      const vis = car.dealer.visibility;
      if (!vis.showPhone) {
        car.dealerPhone = undefined;
        if (car.dealer) car.dealer.phone = undefined;
      }
      if (!vis.showEmail) {
        if (car.dealer) car.dealer.email = undefined;
      }
      if (!vis.showLocation) {
        if (car.dealer) car.dealer.location = undefined;
      }
      if (!vis.chatEnabled) {
        car.chatDisabled = true;
      }
      delete car.dealer?.visibility;
    }

    // ── VIEW COUNT (Issue #5) ─────────────────────────────────
    // Use Redis atomic counter to prevent lost updates under concurrency.
    // A background flush syncs Redis counters to the primary database.
    // Falls back to fire-and-forget $inc when Redis is unavailable.
    try {
      const { isRedisConnected } = await import("../utils/cache.js");
      if (isRedisConnected()) {
        const redisClient = (await import("../config/redis.js")).default;
        await redisClient.hIncrBy("kayad:view_counts", String(car._id), 1);
      } else {
        Car.updateMany({ id: car.id }, { $inc: { views: 1 } }).catch((e) => logWarn("View count increment failed", { error: e.message }));
      }
    } catch {
      Car.updateMany({ id: car.id }, { $inc: { views: 1 } }).catch((e) => logWarn("View count increment failed (fallback)", { error: e.message }));
    }

    res.json({ success: true, data: car });
  } catch (err) {
    logError("GET ONE ERROR", { error: err.message });
    res.status(500).json({ success: false, message: "Failed to fetch car" });
  }
};

// =============================
// ⚡ PLACE BID
// =============================
export const placeBid = async (req, res) => {
  try {
    const { amount } = req.body;

    const car = await Car.findById(req.params.id);

    if (!car || !car.allowBid) {
      return res.status(400).json({ success: false, message: "Car not available for bidding" });
    }

    if (Number(amount) <= (car.currentBid || 0)) {
      return res.status(400).json({
        success: false,
        message: "Bid too low",
      });
    }

    car.currentBid = Number(amount);
    car.bidsCount += 1;

    await car.save();

    await logActionFromReq(req, "place_bid", {
      target: car._id,
      targetModel: "Car",
      details: { amount: Number(amount), bidsCount: car.bidsCount },
    });

    res.json({
      success: true,
      data: {
        currentBid: car.currentBid,
        bidsCount: car.bidsCount,
      },
    });
  } catch (err) {
    logError("BID ERROR", { error: err.message });
    res.status(500).json({ success: false, message: "Bid failed" });
  }
};

// (getDemoCars removed — demo data eliminated)
