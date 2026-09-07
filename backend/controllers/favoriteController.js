// backend/controllers/favoriteController.js
// Uses the Favorite collection (separate model — no embedded User.favorites needed)
import Favorite from "../models/Favorite.js";
import Car from "../models/Car.js";
import { logError } from "../infrastructure/logging/index.js";

// GET /api/favorites
export const getFavorites = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      Favorite.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "car",
          // Fixed (Final Integration - real data integration): was
          // "location" - confirmed by reproducing the real failure
          // directly that this is not a valid field/alias at all
          // (this project's own earlier hardening work already
          // established the real alias is "city", mapping to the
          // real location_city column). Since this specific select
          // string caused a real Supabase query error inside
          // runPopulates()'s own best-effort catch, the entire
          // populate silently failed and left the raw car_id string
          // in place instead of the populated car object - exactly
          // the "no error surfaced, wrong data shown" failure mode
          // this phase's own instructions warn against.
          select:
            "title price images brand model year fuel transmission mileage city auctionStatus currentBid bidsCount views favoritesCount isPromoted isVerifiedDealer",
        })
        .lean(),
      Favorite.countDocuments({ user: req.user.id }),
    ]);

    const items = favorites
      .map((f) => ({
        ...(f.car || {}),
        _favoriteId: f._id,
        notifyOnPriceDrop: f.notifyOnPriceDrop,
      }))
      .filter(Boolean);
    res.json({
      success: true,
      favorites: items,
      total,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logError("❌ getFavorites error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch favourites" });
  }
};

// POST /api/favorites/:carId
export const addFavorite = async (req, res) => {

  try {
    const { carId } = req.params;
    const car = await Car.findById(carId).select("title price images brand");
    if (!car) {
      return res.status(404).json({ success: false, message: "Car not found" });
    }

    const existing = await Favorite.findOne({ user: req.user.id, car: carId });
    if (existing) {
      return res.json({
        success: true,
        favorited: true,
        notifyOnPriceDrop: existing.notifyOnPriceDrop === true,
        message: "Already in favourites",
      });
    }

    await Favorite.create({
      user: req.user.id,
      car: carId,
      carSnapshot: {
        title: car.title,
        price: car.price,
        brand: car.brand,
        image: car.images?.[0]?.url || car.images?.[0] || null,
      },
    });

    await Car.findByIdAndUpdate(carId, { $inc: { favoritesCount: 1 } });

    return res.json({ success: true, favorited: true, notifyOnPriceDrop: false, message: "Added to favourites" });
  } catch (err) {
    if (err.code === 11000) return res.json({ success: true, favorited: true, message: "Already in favourites" });
    logError("❌ addFavorite error:", err.message);
    res.status(500).json({ success: false, message: "Failed to add favourite" });
  }
};

// PUT /api/favorites/:carId/price-alert — toggle notifyOnPriceDrop
export const updateFavoritePriceAlert = async (req, res) => {
  try {
    const { carId } = req.params;
    const { notifyOnPriceDrop } = req.body;

    const existing = await Favorite.findOne({ user: req.user.id, car: carId });
    if (!existing) return res.status(404).json({ success: false, message: "Favorite not found" });

    existing.notifyOnPriceDrop = notifyOnPriceDrop === true;
    await existing.save();

    res.json({ success: true, notifyOnPriceDrop: existing.notifyOnPriceDrop });
  } catch (err) {
    logError("❌ updateFavoritePriceAlert error:", err.message);
    res.status(500).json({ success: false, message: "Failed to update price alert" });
  }
};

// DELETE /api/favorites/:carId
export const removeFavorite = async (req, res) => {

  try {
    const { carId } = req.params;
    const deleted = await Favorite.findOneAndDelete({ user: req.user.id, car: carId });
    if (deleted) {
      await Car.findByIdAndUpdate(carId, { $inc: { favoritesCount: -1 } });
    }
    res.json({ success: true, favorited: false, message: "Removed from favourites" });
  } catch (err) {
    logError("❌ removeFavorite error:", err.message);
    res.status(500).json({ success: false, message: "Failed to remove favourite" });
  }
};

// POST /api/favorites/:carId/toggle
export const toggleFavorite = async (req, res) => {

  try {
    const { carId } = req.params;
    const car = await Car.findById(carId).select("title price images brand");
    if (!car) {
      return res.status(404).json({ success: false, message: "Car not found" });
    }

    const existing = await Favorite.findOne({ user: req.user.id, car: carId });

    if (existing) {
      await existing.deleteOne();
      await Car.findByIdAndUpdate(carId, { $inc: { favoritesCount: -1 } });
      return res.json({ success: true, favorited: false, message: "Removed from favourites" });
    }

    await Favorite.create({
      user: req.user.id,
      car: carId,
      carSnapshot: {
        title: car.title,
        price: car.price,
        brand: car.brand,
        image: car.images?.[0]?.url || car.images?.[0] || null,
      },
    });
    await Car.findByIdAndUpdate(carId, { $inc: { favoritesCount: 1 } });


    return res.json({ success: true, favorited: true, notifyOnPriceDrop: false, message: "Added to favourites" });
  } catch (err) {
    logError("❌ toggleFavorite error:", err.message);
    res.status(500).json({ success: false, message: "Failed to toggle favourite" });
  }
};
