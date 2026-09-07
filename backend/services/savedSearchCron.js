import { createNotification } from "../controllers/notificationController.js";
import { sendSavedSearchAlertEmail } from "./email.service.js";
import { sendSMS } from "../utils/sms.js";
import { logInfo, logWarn } from "../utils/logger.js";
import { findAll, findById, update } from "../db/index.js";
import { isSupabaseConnected } from "../utils/supabase.js";

const CHECK_INTERVAL = 10 * 60 * 1000;

const matches = (car, filters) => {
  if (!filters || typeof filters !== "object") return true;
  const f = filters;
  const keyword = String(f.keyword ?? f.search ?? "").trim().toLowerCase();
  const brand = String(f.brand ?? "").trim().toLowerCase();
  const model = String(f.model ?? "").trim().toLowerCase();
  const location = String(f.location ?? f.city ?? "").trim().toLowerCase();
  const body = String(f.body ?? f.bodyType ?? "").trim().toLowerCase();
  const fuel = String(f.fuel ?? "").trim().toLowerCase();
  const transmission = String(f.transmission ?? "").trim().toLowerCase();
  const color = String(f.color ?? "").trim().toLowerCase();
  const haystack = `${car.title || ""} ${car.brand || ""} ${car.model || ""}`.toLowerCase();

  if (keyword && !haystack.includes(keyword)) return false;
  if (brand && car.brand?.toLowerCase() !== brand) return false;
  if (model && car.model?.toLowerCase() !== model) return false;
  if (location && car.location?.city?.toLowerCase() !== location) return false;
  if (body && car.bodyType?.toLowerCase() !== body) return false;
  if (fuel && car.fuel?.toLowerCase() !== fuel) return false;
  if (transmission && car.transmission?.toLowerCase() !== transmission) return false;
  if (color && car.color?.toLowerCase() !== color) return false;

  const priceMin = f.priceMin ?? f.minPrice;
  const priceMax = f.priceMax ?? f.maxPrice;
  const yearMin = f.yearMin ?? f.minYear;
  const yearMax = f.yearMax ?? f.maxYear;
  const mileageMin = f.mileageMin ?? f.minMileage;
  const mileageMax = f.mileageMax ?? f.maxMileage;

  if (priceMin !== undefined && priceMin !== "" && (car.price || 0) < Number(priceMin)) return false;
  if (priceMax !== undefined && priceMax !== "" && (car.price || 0) > Number(priceMax)) return false;
  if (yearMin !== undefined && yearMin !== "" && (car.year || 0) < Number(yearMin)) return false;
  if (yearMax !== undefined && yearMax !== "" && (car.year || 0) > Number(yearMax)) return false;
  if (mileageMin !== undefined && mileageMin !== "" && (car.mileage || 0) < Number(mileageMin)) return false;
  if (mileageMax !== undefined && mileageMax !== "" && (car.mileage || 0) > Number(mileageMax)) return false;

  if (f.filter === "auction" || f.auctionOnly === true) {
    if (car.auctionStatus !== "live" && !car.allowBid) return false;
  }
  if (f.filter === "fixed") {
    if (car.allowBid || car.auctionStatus === "live") return false;
  }
  if (f.verifiedOnly === true && car.isVerifiedDealer !== true) return false;

  return true;
};

const shouldNotify = (prefs, channel) => {
  return prefs?.[channel] !== false;
};

export const startSavedSearchCron = () => {
  if (!isSupabaseConnected()) {
    logWarn("SavedSearchCron skipped: Supabase not connected");
    return;
  }

  const tick = async () => {
    try {
      const searches = await findAll("saved_searches", { filters: { notify: true } });
      if (searches.length === 0) return;

      const since = new Date(Date.now() - CHECK_INTERVAL).toISOString();
      const newCars = await findAll("cars", {
        filters: { createdAt: { $gte: since } },
        select: "title,brand,model,price,year,mileage,fuel,transmission,bodyType,color,location,auctionStatus,allowBid,isVerifiedDealer,createdAt",
      });

      if (newCars.length === 0) return;

      for (const search of searches) {
        const matched = newCars.filter((c) => matches(c, search.filters));
        if (matched.length === 0) continue;

        const lastNotified = search.lastNotifiedAt ? new Date(search.lastNotifiedAt).getTime() : 0;
        const fresh = matched.filter((c) => new Date(c.createdAt).getTime() > lastNotified);

        if (fresh.length === 0) continue;

        await update("saved_searches", search.id, { lastNotifiedAt: new Date().toISOString() });

        const user = await findById("users", search.user);
        if (!user) continue;
        const prefs = user.notifications || {};

        const titles = fresh
          .slice(0, 3)
          .map((c) => c.title || `${c.brand || ""} ${c.year || ""}`)
          .join(", ");
        const rest = fresh.length > 3 ? ` and ${fresh.length - 3} more` : "";

        if (shouldNotify(prefs, "inApp")) {
          await createNotification({
            user: search.user,
            title: `New matching vehicles: ${search.name}`,
            message: `${fresh.length} vehicle${fresh.length > 1 ? "s" : ""} added: ${titles}${rest}`,
            type: "info",
            data: { savedSearchId: search.id, count: fresh.length },
          });
        }

        if (shouldNotify(prefs, "email") && user.email) {
          sendSavedSearchAlertEmail(user, search, fresh, fresh.length).catch((e) =>
            console.warn("⚠️ Saved search email failed:", e.message),
          );
        }

        if (shouldNotify(prefs, "sms") && user.phone) {
          const msg = `Kayad: ${fresh.length} new vehicle${fresh.length > 1 ? "s" : ""} matching "${search.name}". ${titles}${rest}. View: https://www.kayad.space/saved-searches`;
          sendSMS(user.phone, msg).catch((e) => console.warn("⚠️ Saved search SMS failed:", e.message));
        }
      }
    } catch (err) {
      console.error("❌ SavedSearchCron error:", err.message);
    }
  };

  tick();
  setInterval(tick, CHECK_INTERVAL);
  logInfo(`SavedSearchCron: ${CHECK_INTERVAL / 60000}-min cycle`);
};
