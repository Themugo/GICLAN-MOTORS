import { getSalesAnalytics } from '../services/executiveAnalytics.service.js';
import { findAll } from '../db/index.js';
import { logError } from '../utils/logger.js';

export const getSalesDashboard = async (req, res) => {
  try { res.json({ success: true, dashboard: await getSalesAnalytics(req.query) }); }
  catch (error) { logError('Error getting sales dashboard', error); res.status(500).json({ success: false, message: 'Failed to get sales dashboard' }); }
};

export const getDealerPerformance = async (req, res) => {
  try {
    const cars = await findAll('cars', { filters: req.params.dealerId ? { dealerId: req.params.dealerId } : {}, select: 'id dealerId dealer_id status views clicks price', limit: 10000 });
    const byDealer = new Map();
    for (const car of cars) {
      const dealerId = car.dealerId || car.dealer_id; if (!dealerId) continue;
      const item = byDealer.get(dealerId) || { dealerId, totalListings: 0, totalViews: 0, totalClicks: 0, soldCount: 0, activeCount: 0, totalValue: 0 };
      item.totalListings++; item.totalViews += Number(car.views) || 0; item.totalClicks += Number(car.clicks) || 0; item.soldCount += car.status === 'sold' ? 1 : 0; item.activeCount += car.status === 'available' ? 1 : 0; item.totalValue += Number(car.price) || 0;
      byDealer.set(dealerId, item);
    }
    res.json({ success: true, performance: [...byDealer.values()].sort((a,b) => b.soldCount-a.soldCount) });
  } catch (error) { logError('Error getting dealer performance', error); res.status(500).json({ success: false, message: 'Failed to get dealer performance' }); }
};

export const getRevenueMetrics = async (req, res) => {
  try { const dashboard = await getSalesAnalytics(req.query); res.json({ success: true, revenue: dashboard.revenue }); }
  catch (error) { logError('Error getting revenue metrics', error); res.status(500).json({ success: false, message: 'Failed to get revenue metrics' }); }
};
