// ============================================================
// KAYAD INSPECTION BUSINESS CENTER - BUSINESS ANALYTICS SERVICE
// ============================================================

import db from '../../db/index.js';
import { AppError } from '../../utils/AppError.js';

/**
 * Business Analytics Service - Performance and growth metrics
 */
class BusinessAnalyticsService {
  /**
   * Get comprehensive business analytics
   */
  async getBusinessAnalytics(providerId, period = 'monthly') {
    let startDate = new Date();
    let comparisonStart;

    if (period === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
      comparisonStart = new Date(startDate);
      comparisonStart.setDate(comparisonStart.getDate() - 7);
    } else if (period === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
      comparisonStart = new Date(startDate);
      comparisonStart.setMonth(comparisonStart.getMonth() - 1);
    } else {
      startDate.setFullYear(startDate.getFullYear() - 1);
      comparisonStart = new Date(startDate);
      comparisonStart.setFullYear(comparisonStart.getFullYear() - 1);
    }

    // Get current period data
    const currentBookings = await this.getBookingsInPeriod(providerId, startDate);
    const previousBookings = await this.getBookingsInPeriod(providerId, comparisonStart);

    // Calculate metrics
    const completedJobs = currentBookings.filter(b => b.status === 'closed');
    const revenue = currentBookings.filter(b => b.payment_status === 'fully_paid');
    const previousRevenue = previousBookings.filter(b => b.payment_status === 'fully_paid');

    const currentGross = revenue.reduce((sum, b) => sum + parseFloat(b.total_price), 0);
    const previousGross = previousRevenue.reduce((sum, b) => sum + parseFloat(b.total_price), 0);

    // Engineer metrics
    const engineers = await db.find('inspection_engineers', { provider_id: providerId, is_active: true });
    const completedWithTime = completedJobs.filter(b => b.started_at && b.completed_at);

    return {
      overview: {
        period,
        totalJobs: currentBookings.length,
        completedJobs: completedJobs.length,
        cancelledJobs: currentBookings.filter(b => b.status === 'cancelled').length,
        grossRevenue: currentGross,
        averageJobValue: completedJobs.length > 0
          ? currentGross / completedJobs.length
          : 0,
        revenueGrowth: previousGross > 0
          ? Math.round(((currentGross - previousGross) / previousGross) * 100)
          : 0,
        jobGrowth: previousBookings.length > 0
          ? Math.round(((currentBookings.length - previousBookings.length) / previousBookings.length) * 100)
          : 0,
      },
      jobs: {
        completedJobs: completedJobs.length,
        averageInspectionTime: this.calculateAvgInspectionTime(completedWithTime),
        completionRate: currentBookings.length > 0
          ? Math.round((completedJobs.length / currentBookings.length) * 100)
          : 0,
        byStatus: this.groupByStatus(currentBookings),
        byType: this.groupByType(currentBookings),
        byCounty: this.groupByCounty(currentBookings),
        trend: this.calculateJobTrend(currentBookings, previousBookings),
      },
      revenue: {
        grossRevenue: currentGross,
        netRevenue: currentGross * 0.85, // After commission (would calculate properly)
        averageJobValue: completedJobs.length > 0 ? currentGross / completedJobs.length : 0,
        revenueByType: this.groupRevenueByType(currentBookings),
        revenueByDay: this.groupRevenueByDay(currentBookings),
        comparison: {
          current: currentGross,
          previous: previousGross,
          change: currentGross - previousGross,
          changePercent: previousGross > 0 ? ((currentGross - previousGross) / previousGross) * 100 : 0,
        },
      },
      engineers: {
        totalEngineers: engineers.length,
        utilizationRate: this.calculateUtilizationRate(engineers, currentBookings),
        topPerformers: await this.getTopEngineers(providerId, 5),
        workloadDistribution: this.getWorkloadDistribution(engineers, currentBookings),
      },
      customers: {
        newCustomers: await this.countNewCustomers(providerId, startDate),
        repeatCustomers: await this.countRepeatCustomers(providerId, startDate),
        averageRating: await this.getAverageRating(providerId),
        customerByType: await this.groupCustomersByType(providerId),
      },
      quality: {
        averageScore: await this.getAverageQualityScore(providerId),
        reportsApproved: await this.countApprovedReports(providerId, startDate),
        reportsRejected: await this.countRejectedReports(providerId, startDate),
        approvalRate: 0, // Would calculate
      },
    };
  }

  /**
   * Get bookings in period
   */
  async getBookingsInPeriod(providerId, startDate) {
    return db.find('inspection_bookings', {
      provider_id: providerId,
      created_at: { $gte: startDate }
    });
  }

  /**
   * Calculate average inspection time
   */
  calculateAvgInspectionTime(bookings) {
    if (bookings.length === 0) return 0;

    const totalMinutes = bookings.reduce((sum, b) => {
      const start = new Date(b.started_at).getTime();
      const end = new Date(b.completed_at).getTime();
      return sum + (end - start) / 60000;
    }, 0);

    return Math.round(totalMinutes / bookings.length);
  }

  /**
   * Group bookings by status
   */
  groupByStatus(bookings) {
    const groups = {};
    bookings.forEach(b => {
      const status = b.status || 'unknown';
      if (!groups[status]) groups[status] = 0;
      groups[status]++;
    });
    return groups;
  }

  /**
   * Group bookings by type
   */
  groupByType(bookings) {
    const groups = {};
    bookings.forEach(b => {
      const type = b.inspection_type || 'other';
      if (!groups[type]) groups[type] = { type, count: 0, revenue: 0 };
      groups[type].count++;
      if (b.payment_status === 'fully_paid') {
        groups[type].revenue += parseFloat(b.total_price);
      }
    });
    return Object.values(groups).sort((a, b) => b.count - a.count);
  }

  /**
   * Group bookings by county
   */
  groupByCounty(bookings) {
    const groups = {};
    bookings.forEach(b => {
      const county = b.inspection_county || 'Unknown';
      if (!groups[county]) groups[county] = { county, count: 0 };
      groups[county].count++;
    });
    return Object.values(groups).sort((a, b) => b.count - a.count).slice(0, 10);
  }

  /**
   * Calculate job trend
   */
  calculateJobTrend(current, previous) {
    const currentDaily = this.groupByDayOfWeek(current);
    const previousDaily = this.groupByDayOfWeek(previous);

    return Object.keys(currentDaily).map(day => ({
      day,
      current: currentDaily[day] || 0,
      previous: previousDaily[day] || 0,
    }));
  }

  /**
   * Group by day of week
   */
  groupByDayOfWeek(bookings) {
    const groups = {};
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    bookings.forEach(b => {
      const day = days[new Date(b.scheduled_date).getDay()];
      if (!groups[day]) groups[day] = 0;
      groups[day]++;
    });
    return groups;
  }

  /**
   * Group revenue by type
   */
  groupRevenueByType(bookings) {
    const groups = {};
    bookings.filter(b => b.payment_status === 'fully_paid').forEach(b => {
      const type = b.inspection_type || 'other';
      if (!groups[type]) groups[type] = 0;
      groups[type] += parseFloat(b.total_price);
    });
    return groups;
  }

  /**
   * Group revenue by day
   */
  groupRevenueByDay(bookings) {
    const groups = {};
    bookings.filter(b => b.payment_status === 'fully_paid').forEach(b => {
      const date = b.scheduled_date;
      if (!groups[date]) groups[date] = 0;
      groups[date] += parseFloat(b.total_price);
    });
    return Object.entries(groups)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate engineer utilization rate
   */
  calculateUtilizationRate(engineers, bookings) {
    if (engineers.length === 0) return 0;

    const totalSlots = engineers.length * 8 * 5; // Assume 5 day week, 8 hours
    const bookedSlots = bookings.filter(b => b.status === 'closed').length * 1.5; // 1.5 hours per job

    return totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;
  }

  /**
   * Get top performing engineers
   */
  async getTopEngineers(providerId, limit = 5) {
    const engineers = await db.find('inspection_engineers', {
      provider_id: providerId,
      is_active: true
    }, {
      sort: { average_rating: -1 },
      limit
    });

    return engineers.map(e => ({
      id: e.id,
      name: `${e.first_name} ${e.last_name}`,
      role: e.role,
      completedInspections: e.inspection_count,
      averageRating: e.average_rating,
      qualityScore: e.quality_score,
    }));
  }

  /**
   * Get workload distribution
   */
  getWorkloadDistribution(engineers, bookings) {
    const distribution = engineers.map(e => {
      const assigned = bookings.filter(b => b.assigned_staff_id === e.id).length;
      return {
        engineerId: e.id,
        name: `${e.first_name} ${e.last_name}`,
        jobsAssigned: assigned,
        percentage: engineers.length > 0
          ? Math.round((assigned / bookings.length) * 100)
          : 0,
      };
    });
    return distribution.sort((a, b) => b.jobsAssigned - a.jobsAssigned);
  }

  /**
   * Count new customers
   */
  async countNewCustomers(providerId, since) {
    const customers = await db.find('inspection_customers', {
      provider_id: providerId,
      created_at: { $gte: since }
    });
    return customers.length;
  }

  /**
   * Count repeat customers
   */
  async countRepeatCustomers(providerId, since) {
    const customers = await db.find('inspection_customers', {
      provider_id: providerId,
      total_inspections: { $gt: 1 }
    });
    return customers.length;
  }

  /**
   * Get average rating
   */
  async getAverageRating(providerId) {
    const reviews = await db.find('inspection_reviews', {
      provider_id: providerId,
      is_published: true
    });

    if (reviews.length === 0) return 0;

    const total = reviews.reduce((sum, r) => sum + r.overall_rating, 0);
    return Math.round((total / reviews.length) * 10) / 10;
  }

  /**
   * Group customers by type
   */
  async groupCustomersByType(providerId) {
    const customers = await db.find('inspection_customers', {
      provider_id: providerId,
      is_active: true
    });

    const groups = {};
    customers.forEach(c => {
      const type = c.customer_type || 'other';
      if (!groups[type]) groups[type] = { type, count: 0, totalSpent: 0 };
      groups[type].count++;
      groups[type].totalSpent += parseFloat(c.total_spent) || 0;
    });
    return Object.values(groups);
  }

  /**
   * Get average quality score
   */
  async getAverageQualityScore(providerId) {
    const reports = await db.find('inspection_reports', {
      provider_id: providerId
    });

    if (reports.length === 0) return 0;

    const total = reports.reduce((sum, r) => sum + (r.quality_score || 100), 0);
    return Math.round((total / reports.length) * 10) / 10;
  }

  /**
   * Count approved reports
   */
  async countApprovedReports(providerId, since) {
    const versions = await db.find('report_versions', {
      provider_id: providerId,
      status: 'approved',
      approved_at: { $gte: since }
    });
    return versions.length;
  }

  /**
   * Count rejected reports
   */
  async countRejectedReports(providerId, since) {
    const versions = await db.find('report_versions', {
      provider_id: providerId,
      status: 'corrections_requested',
      reviewed_at: { $gte: since }
    });
    return versions.length;
  }

  /**
   * Get geographic demand
   */
  async getGeographicDemand(providerId) {
    const bookings = await db.find('inspection_bookings', {
      provider_id: providerId,
      status: 'closed'
    });

    const demand = {};
    bookings.forEach(b => {
      const key = `${b.inspection_county || 'Unknown'}-${b.inspection_town || ''}`;
      if (!demand[key]) {
        demand[key] = {
          county: b.inspection_county || 'Unknown',
          town: b.inspection_town,
          count: 0,
          revenue: 0,
        };
      }
      demand[key].count++;
      if (b.payment_status === 'fully_paid') {
        demand[key].revenue += parseFloat(b.total_price);
      }
    });

    return Object.values(demand).sort((a, b) => b.count - a.count);
  }

  /**
   * Get most requested packages
   */
  async getMostRequestedPackages(providerId) {
    const bookings = await db.find('inspection_bookings', {
      provider_id: providerId
    });

    const packages = await db.find('inspection_packages', {
      provider_id: providerId,
      is_active: true
    });

    const counts = {};
    bookings.forEach(b => {
      if (!counts[b.package_id]) counts[b.package_id] = 0;
      counts[b.package_id]++;
    });

    return packages
      .map(p => ({
        id: p.id,
        name: p.name,
        type: p.inspection_type,
        price: p.price,
        timesOrdered: counts[p.id] || 0,
      }))
      .filter(p => p.timesOrdered > 0)
      .sort((a, b) => b.timesOrdered - a.timesOrdered);
  }
}

export const businessAnalyticsService = new BusinessAnalyticsService();
export default businessAnalyticsService;
