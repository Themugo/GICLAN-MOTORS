import { count, findAll } from '../db/index.js';

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const iso = (date) => date.toISOString();
const num = (value) => Number(value) || 0;
const sum = (rows, field) => rows.reduce((total, row) => total + num(row[field]), 0);
const groupByDay = (rows, field = 'amount') => {
  const groups = new Map();
  for (const row of rows) {
    const raw = row.createdAt || row.created_at;
    if (!raw) continue;
    const day = new Date(raw).toISOString().slice(0, 10);
    const current = groups.get(day) || { date: day, value: 0, count: 0 };
    current.value += num(row[field]);
    current.count += 1;
    groups.set(day, current);
  }
  return [...groups.values()].sort((a, b) => a.date.localeCompare(b.date));
};

export async function getExecutiveAnalytics({ days = 30 } = {}) {
  const safeDays = Math.min(Math.max(Number(days) || 30, 7), 365);
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = new Date(today.getTime() - DAY);
  const periodStart = new Date(now.getTime() - safeDays * DAY);
  const previousStart = new Date(periodStart.getTime() - safeDays * DAY);

  const [totalUsers, totalCars, totalBids, totalDealers, releasedEscrows, periodEvents, previousEvents] = await Promise.all([
    count('users'),
    count('cars'),
    count('bids'),
    count('dealers'),
    findAll('escrows', { filters: { status: 'released', createdAt: { $gte: periodStart.toISOString() } }, limit: 10000 }),
    findAll('events', { filters: { createdAt: { $gte: periodStart.toISOString() } }, limit: 20000 }),
    findAll('events', { filters: { createdAt: { $gte: previousStart.toISOString(), $lt: periodStart.toISOString() } }, limit: 20000 }),
  ]);

  const [todayEscrows, yesterdayEscrows, activeEscrows, soldCars, activeCars, periodCars, periodBids] = await Promise.all([
    findAll('escrows', { filters: { createdAt: { $gte: today.toISOString() } }, limit: 5000 }),
    findAll('escrows', { filters: { createdAt: { $gte: yesterday.toISOString(), $lt: today.toISOString() } }, limit: 5000 }),
    count('escrows', { status: 'held' }),
    count('cars', { status: 'sold' }),
    count('cars', { status: 'available' }),
    findAll('cars', { filters: { createdAt: { $gte: periodStart.toISOString() } }, select: 'id status views price dealerId dealer_id createdAt', limit: 10000 }),
    findAll('bids', { filters: { createdAt: { $gte: periodStart.toISOString() } }, select: 'id amount createdAt carId car', limit: 20000 }),
  ]);

  const gmv = sum(releasedEscrows, 'amount');
  const todayGmv = sum(todayEscrows, 'amount');
  const yesterdayGmv = sum(yesterdayEscrows, 'amount');
  const previousEventUsers = new Set(previousEvents.map((e) => e.userId || e.user || e.actorId).filter(Boolean));
  const activeEventUsers = new Set(periodEvents.map((e) => e.userId || e.user || e.actorId).filter(Boolean));
  const views = periodEvents.filter((e) => e.eventType === 'vehicle_viewed').length;
  const leads = periodEvents.filter((e) => e.eventType === 'lead_created').length;
  const sales = periodEvents.filter((e) => e.eventType === 'sale_completed').length || periodCars.filter((c) => c.status === 'sold').length;
  const returning = [...activeEventUsers].filter((id) => previousEventUsers.has(id)).length;
  const aov = releasedEscrows.length ? gmv / releasedEscrows.length : 0;
  const feeRate = 0.05;
  const revenue = gmv * feeRate;

  return {
    periodDays: safeDays,
    totals: { users: totalUsers, dealers: totalDealers, vehicles: totalCars, bids: totalBids },
    gmv: { total: gmv, today: todayGmv, yesterday: yesterdayGmv, growthPercent: yesterdayGmv ? ((todayGmv - yesterdayGmv) / yesterdayGmv) * 100 : 0 },
    revenue: { total: revenue, feeRate, averageOrderValue: aov },
    activity: { activeUsers: activeEventUsers.size, activeEscrows, soldVehicles: soldCars, activeListings: activeCars },
    conversion: { views, leads, sales, viewToLeadPercent: views ? (leads / views) * 100 : 0, leadToSalePercent: leads ? (sales / leads) * 100 : 0, viewToSalePercent: views ? (sales / views) * 100 : 0 },
    retention: { returningUsers: returning, ratePercent: activeEventUsers.size ? (returning / activeEventUsers.size) * 100 : 0 },
    trends: { dailyGmv: groupByDay(releasedEscrows), dailyEvents: groupByDay(periodEvents, 'value') },
    listings: { created: periodCars.length, sold: periodCars.filter((c) => c.status === 'sold').length, views: sum(periodCars, 'views') },
    bids: { period: periodBids.length, value: sum(periodBids, 'amount'), average: periodBids.length ? sum(periodBids, 'amount') / periodBids.length : 0 },
    generatedAt: iso(now),
  };
}

export async function getSalesAnalytics({ days = 30 } = {}) {
  const safeDays = Math.min(Math.max(Number(days) || 30, 7), 365);
  const start = new Date(Date.now() - safeDays * DAY).toISOString();
  const [escrows, cars, bids] = await Promise.all([
    findAll('escrows', { filters: { createdAt: { $gte: start } }, limit: 20000 }),
    findAll('cars', { filters: { createdAt: { $gte: start } }, select: 'id dealerId dealer_id status views clicks price createdAt', limit: 20000 }),
    findAll('bids', { filters: { createdAt: { $gte: start } }, select: 'id amount createdAt', limit: 20000 }),
  ]);
  const released = escrows.filter((e) => e.status === 'released');
  const revenueBase = sum(released, 'amount');
  const feeRate = 0.05;
  const dealers = new Map();
  for (const car of cars) {
    const dealerId = car.dealerId || car.dealer_id;
    if (!dealerId) continue;
    const item = dealers.get(dealerId) || { dealerId, listings: 0, sold: 0, views: 0, clicks: 0, inventoryValue: 0 };
    item.listings += 1; item.sold += car.status === 'sold' ? 1 : 0; item.views += num(car.views); item.clicks += num(car.clicks); item.inventoryValue += num(car.price);
    dealers.set(dealerId, item);
  }
  return {
    periodDays: safeDays,
    revenue: { grossMerchandiseValue: revenueBase, platformRevenue: revenueBase * feeRate, feeRate, averageOrderValue: released.length ? revenueBase / released.length : 0 },
    sales: { releasedTransactions: released.length, soldListings: cars.filter((c) => c.status === 'sold').length, bids: bids.length, bidValue: sum(bids, 'amount') },
    dealerPerformance: [...dealers.values()].sort((a, b) => b.sold - a.sold || b.views - a.views).slice(0, 10),
    trends: { dailyRevenue: groupByDay(released) },
  };
}
