import { count, aggregate, findAll } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";

export const getPlatformAnalytics = async () => {
  const [totalCars, totalBids, totalUsers] = await Promise.all([
    count("cars"), count("bids"), count("users"),
  ]);

  const avgBidResult = await aggregate("bids", [{ $group: { _id: null, avg: { $avg: "$amount" } } }]);
  const avgBid = avgBidResult[0]?.avg || 0;

  const totalValueResult = await aggregate("bids", [{ $group: { _id: null, total: { $sum: "$amount" } } }]);
  const totalBidValue = totalValueResult[0]?.total || 0;

  const last7Days = new Date(Date.now() - 7 * 86400000).toISOString();

  const dailyBids = await aggregate("bids", [
    { $match: { createdAt: { $gte: last7Days } } },
    { $group: { _id: { day: { $dayOfMonth: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
    { $sort: { "_id.day": 1 } },
  ]);

  const topCars = await aggregate("bids", [
    { $group: { _id: "$car", bidCount: { $sum: 1 } } },
    { $sort: { bidCount: -1 } },
    { $limit: 5 },
  ]);

  const avgBidsPerCar = totalCars > 0 ? totalBids / totalCars : 0;

  return {
    totalCars,
    totalBids,
    totalUsers,
    avgBid,
    totalBidValue,
    avgBidsPerCar,
    dailyBids,
    topCars,
  };
};
