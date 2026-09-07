import { getExecutiveAnalytics, getSalesAnalytics } from '../services/executiveAnalytics.service.js';
import { logError } from '../infrastructure/logging/index.js';

export const getExecutiveDashboard = async (req, res) => {
  try {
    res.json({ success: true, dashboard: await getExecutiveAnalytics(req.query) });
  } catch (error) {
    logError('Error getting executive dashboard', error);
    res.status(500).json({ success: false, message: 'Failed to get executive dashboard' });
  }
};

export const getRevenueBreakdown = async (req, res) => {
  try {
    const dashboard = await getExecutiveAnalytics(req.query);
    res.json({ success: true, revenue: dashboard.revenue, gmv: dashboard.gmv });
  } catch (error) {
    logError('Error getting revenue breakdown', error);
    res.status(500).json({ success: false, message: 'Failed to get revenue breakdown' });
  }
};

export const getUserGrowth = async (req, res) => {
  try {
    const dashboard = await getExecutiveAnalytics(req.query);
    res.json({ success: true, growth: { totalUsers: dashboard.totals.users, activeUsers: dashboard.activity.activeUsers, dailyGrowth: dashboard.trends.dailyEvents } });
  } catch (error) {
    logError('Error getting user growth', error);
    res.status(500).json({ success: false, message: 'Failed to get user growth' });
  }
};

export const getSalesDashboard = async (req, res) => {
  try {
    res.json({ success: true, dashboard: await getSalesAnalytics(req.query) });
  } catch (error) {
    logError('Error getting sales dashboard', error);
    res.status(500).json({ success: false, message: 'Failed to get sales dashboard' });
  }
};
