// ============================================================
// KAYAD INSPECTION BUSINESS CENTER - DASHBOARD SERVICE
// ============================================================

import db from '../../db/index.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo } from '../../utils/logger.js';

/**
 * Dashboard Service - Executive home and KPIs
 */
class DashboardService {
  /**
   * Get executive dashboard data
   */
  async getExecutiveDashboard(providerId) {
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get all bookings for the provider
    const allBookings = await db.find('inspection_bookings', { provider_id: providerId });

    // Get all engineers
    const engineers = await db.find('inspection_engineers', { provider_id: providerId, is_active: true });

    // Today's jobs
    const todayBookings = allBookings.filter(b => b.scheduled_date === today);
    const todaysJobs = todayBookings.filter(b => !['cancelled', 'no_show'].includes(b.status));

    // Jobs by status
    const jobsAwaitingAssignment = allBookings.filter(b => b.status === 'confirmed' && !b.assigned_staff_id).length;
    const engineerAssigned = allBookings.filter(b => b.status === 'inspector_assigned' || b.status === 'travelling').length;
    const inspectionStarted = allBookings.filter(b => b.status === 'inspection_started').length;

    // Engineers status
    const engineersOnDuty = engineers.filter(e => e.is_available && e.is_active).length;
    const engineersTravelling = todayBookings.filter(b => b.status === 'travelling').length;

    // Reports
    const reportsPending = allBookings.filter(b => b.status === 'inspection_complete').length;
    const reportsInQA = await db.count('report_versions', {
      provider_id: providerId,
      status: 'qa_review'
    });

    // Completed today
    const completedToday = todayBookings.filter(b => b.status === 'closed').length;

    // Revenue calculations
    const todaysRevenue = todayBookings
      .filter(b => b.payment_status === 'fully_paid')
      .reduce((sum, b) => sum + parseFloat(b.total_price), 0);

    const monthlyBookings = allBookings.filter(b =>
      new Date(b.paid_at || b.created_at) >= startOfMonth &&
      b.payment_status === 'fully_paid'
    );
    const monthlyRevenue = monthlyBookings.reduce((sum, b) => sum + parseFloat(b.total_price), 0);

    // Get provider for ratings
    const provider = await db.findById('inspection_providers', providerId);

    // Upcoming jobs (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingJobs = allBookings
      .filter(b =>
        b.scheduled_date > today &&
        b.scheduled_date <= nextWeek.toISOString().split('T')[0] &&
        !['cancelled', 'closed'].includes(b.status)
      )
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
      .slice(0, 10);

    // Cancelled jobs today
    const cancelledToday = todayBookings.filter(b => b.status === 'cancelled').length;

    // Get reviews for customer satisfaction
    const recentReviews = await db.find('inspection_reviews', {
      provider_id: providerId,
      is_published: true
    }, { limit: 10, sort: { created_at: -1 } });

    const avgSatisfaction = recentReviews.length > 0
      ? recentReviews.reduce((sum, r) => sum + r.overall_rating, 0) / recentReviews.length
      : 0;

    // Quality alerts (reports pending QA for > 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const qualityAlerts = await db.count('report_versions', {
      provider_id: providerId,
      status: 'qa_review',
      created_at: { $lt: yesterday }
    });

    return {
      summary: {
        todaysJobs: todaysJobs.length,
        jobsAwaitingAssignment,
        engineersOnDuty,
        engineersTravelling,
        reportsPending,
        reportsInQA,
        completedToday,
        revenueToday: todaysRevenue,
        monthlyRevenue,
        averageRating: provider?.average_rating || 0,
        customerSatisfaction: Math.round(avgSatisfaction * 10) / 10,
        cancelledToday,
        qualityAlerts,
      },
      upcomingJobs: upcomingJobs.map(b => ({
        id: b.id,
        reference: b.booking_reference,
        customerName: b.customer_name,
        vehicle: `${b.vehicle_year || ''} ${b.vehicle_make || ''} ${b.vehicle_model || ''}`.trim(),
        scheduledDate: b.scheduled_date,
        scheduledTime: b.scheduled_time,
        status: b.status,
        engineerId: b.assigned_staff_id,
        county: b.inspection_county,
      })),
      quickStats: {
        totalEngineers: engineers.length,
        totalBookings: allBookings.length,
        totalRevenue: allBookings
          .filter(b => b.payment_status === 'fully_paid')
          .reduce((sum, b) => sum + parseFloat(b.total_price), 0),
        avgInspectionTime: this.calculateAvgInspectionTime(allBookings),
      }
    };
  }

  /**
   * Calculate average inspection time
   */
  calculateAvgInspectionTime(bookings) {
    const completed = bookings.filter(b =>
      b.status === 'closed' &&
      b.started_at &&
      b.completed_at
    );

    if (completed.length === 0) return 0;

    const totalMinutes = completed.reduce((sum, b) => {
      const start = new Date(b.started_at).getTime();
      const end = new Date(b.completed_at).getTime();
      return sum + (end - start) / 60000;
    }, 0);

    return Math.round(totalMinutes / completed.length);
  }

  /**
   * Get jobs by status for kanban view
   */
  async getJobsByStatus(providerId) {
    const bookings = await db.find('inspection_bookings', { provider_id: providerId });

    const statuses = {
      new_requests: {
        label: 'New Requests',
        bookings: bookings.filter(b => b.status === 'booked'),
      },
      accepted: {
        label: 'Accepted',
        bookings: bookings.filter(b => b.status === 'confirmed'),
      },
      awaiting_customer: {
        label: 'Awaiting Customer',
        bookings: [], // Would require payment integration
      },
      scheduled: {
        label: 'Scheduled',
        bookings: bookings.filter(b =>
          ['confirmed', 'inspector_assigned'].includes(b.status) &&
          b.scheduled_date >= new Date().toISOString().split('T')[0]
        ),
      },
      engineer_assigned: {
        label: 'Engineer Assigned',
        bookings: bookings.filter(b => b.status === 'inspector_assigned'),
      },
      travelling: {
        label: 'Travelling',
        bookings: bookings.filter(b => b.status === 'travelling'),
      },
      inspection_started: {
        label: 'In Progress',
        bookings: bookings.filter(b => b.status === 'inspection_started'),
      },
      report_writing: {
        label: 'Report Writing',
        bookings: bookings.filter(b => b.status === 'inspection_complete'),
      },
      quality_review: {
        label: 'Quality Review',
        bookings: bookings.filter(b => b.status === 'report_generated'),
      },
      delivered: {
        label: 'Delivered',
        bookings: bookings.filter(b => b.status === 'customer_reviewed'),
      },
      completed: {
        label: 'Completed',
        bookings: bookings.filter(b => b.status === 'closed'),
      },
      cancelled: {
        label: 'Cancelled',
        bookings: bookings.filter(b => b.status === 'cancelled'),
      },
    };

    return statuses;
  }

  /**
   * Get jobs needing attention (prioritized queue)
   */
  async getJobsNeedingAttention(providerId) {
    const bookings = await db.find('inspection_bookings', {
      provider_id: providerId,
      status: { $nin: ['closed', 'cancelled'] }
    });

    const attentionQueue = [];

    // New requests (high priority)
    const newRequests = bookings.filter(b => b.status === 'booked');
    for (const booking of newRequests) {
      const hoursOld = (Date.now() - new Date(booking.created_at).getTime()) / 3600000;
      attentionQueue.push({
        ...this.formatBookingBrief(booking),
        priority: hoursOld > 24 ? 'urgent' : hoursOld > 4 ? 'high' : 'normal',
        reason: 'New request awaiting acceptance',
        action: 'Accept or Decline',
      });
    }

    // Awaiting assignment
    const awaitingAssignment = bookings.filter(b =>
      ['confirmed', 'booked'].includes(b.status) && !b.assigned_staff_id
    );
    for (const booking of awaitingAssignment) {
      attentionQueue.push({
        ...this.formatBookingBrief(booking),
        priority: 'high',
        reason: 'No engineer assigned',
        action: 'Assign Engineer',
      });
    }

    // Reports pending review
    const pendingReports = bookings.filter(b => b.status === 'report_generated');
    for (const booking of pendingReports) {
      const hoursSinceComplete = (Date.now() - new Date(booking.updated_at).getTime()) / 3600000;
      attentionQueue.push({
        ...this.formatBookingBrief(booking),
        priority: hoursSinceComplete > 48 ? 'urgent' : 'normal',
        reason: 'Report awaiting quality review',
        action: 'Review Report',
      });
    }

    // Sort by priority and time
    const priorityOrder = { urgent: 0, high: 1, normal: 2 };
    attentionQueue.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return attentionQueue;
  }

  /**
   * Format booking brief for lists
   */
  formatBookingBrief(booking) {
    return {
      id: booking.id,
      reference: booking.booking_reference,
      customerName: booking.customer_name,
      vehicle: `${booking.vehicle_year || ''} ${booking.vehicle_make || ''} ${booking.vehicle_model || ''}`.trim(),
      registration: booking.vehicle_registration,
      scheduledDate: booking.scheduled_date,
      scheduledTime: booking.scheduled_time,
      status: booking.status,
      price: booking.total_price,
      engineerId: booking.assigned_staff_id,
    };
  }

  /**
   * Get daily schedule for calendar view
   */
  async getDailySchedule(providerId, date) {
    const bookings = await db.find('inspection_bookings', {
      provider_id: providerId,
      scheduled_date: date,
      status: { $nin: ['cancelled'] }
    });

    const engineers = await db.find('inspection_engineers', {
      provider_id: providerId,
      is_active: true
    });

    // Group by engineer
    const schedule = {
      date,
      totalJobs: bookings.length,
      jobs: [],
      engineers: engineers.map(e => ({
        id: e.id,
        name: `${e.first_name} ${e.last_name}`,
        role: e.role,
        isAvailable: e.is_available,
        assignedJobs: bookings.filter(b => b.assigned_staff_id === e.id).length,
      })),
    };

    // Add booking details
    for (const booking of bookings.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time))) {
      const engineer = engineers.find(e => e.id === booking.assigned_staff_id);
      schedule.jobs.push({
        ...this.formatBookingBrief(booking),
        engineerName: engineer ? `${engineer.first_name} ${engineer.last_name}` : 'Unassigned',
        engineerRole: engineer?.role,
        duration: 60, // Would come from package
        startTime: booking.scheduled_time,
        endTime: booking.estimated_end_time,
      });
    }

    return schedule;
  }

  /**
   * Get weekly schedule
   */
  async getWeeklySchedule(providerId, startDate) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const bookings = await db.find('inspection_bookings', {
      provider_id: providerId,
      scheduled_date: { $gte: start.toISOString().split('T')[0], $lte: end.toISOString().split('T')[0] },
      status: { $nin: ['cancelled'] }
    });

    const days = [];
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayBookings = bookings.filter(b => b.scheduled_date === dateStr);
      days.push({
        date: dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        jobsCount: dayBookings.length,
        totalRevenue: dayBookings
          .filter(b => b.payment_status === 'fully_paid')
          .reduce((sum, b) => sum + parseFloat(b.total_price), 0),
        jobs: dayBookings.slice(0, 3).map(b => this.formatBookingBrief(b)),
      });
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      days,
      totalJobs: bookings.length,
      totalRevenue: bookings
        .filter(b => b.payment_status === 'fully_paid')
        .reduce((sum, b) => sum + parseFloat(b.total_price), 0),
    };
  }

  /**
   * Get monthly overview
   */
  async getMonthlyOverview(providerId, year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const bookings = await db.find('inspection_bookings', {
      provider_id: providerId,
      scheduled_date: { $gte: startDate.toISOString().split('T')[0], $lte: endDate.toISOString().split('T')[0] }
    });

    // Calculate metrics
    const completed = bookings.filter(b => b.status === 'closed');
    const cancelled = bookings.filter(b => b.status === 'cancelled');
    const revenue = bookings.filter(b => b.payment_status === 'fully_paid');

    return {
      year,
      month: month,
      monthName: new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' }),
      totalJobs: bookings.length,
      completedJobs: completed.length,
      cancelledJobs: cancelled.length,
      completionRate: bookings.length > 0
        ? Math.round((completed.length / bookings.length) * 100)
        : 0,
      grossRevenue: revenue.reduce((sum, b) => sum + parseFloat(b.total_price), 0),
      averageJobValue: revenue.length > 0
        ? revenue.reduce((sum, b) => sum + parseFloat(b.total_price), 0) / revenue.length
        : 0,
      byWeek: this.groupByWeek(bookings, year, month),
      byInspectionType: this.groupByInspectionType(bookings),
    };
  }

  /**
   * Group bookings by week
   */
  groupByWeek(bookings, year, month) {
    const weeks = [[], [], [], [], []];
    bookings.forEach(b => {
      const day = new Date(b.scheduled_date).getDate();
      const weekIndex = Math.min(Math.floor((day - 1) / 7), 4);
      weeks[weekIndex].push(b);
    });
    return weeks.map((week, i) => ({
      week: i + 1,
      jobs: week.length,
      revenue: week
        .filter(b => b.payment_status === 'fully_paid')
        .reduce((sum, b) => sum + parseFloat(b.total_price), 0),
    }));
  }

  /**
   * Group bookings by inspection type
   */
  groupByInspectionType(bookings) {
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
}

export const dashboardService = new DashboardService();
export default dashboardService;
