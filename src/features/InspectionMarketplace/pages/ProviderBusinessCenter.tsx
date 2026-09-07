// ============================================================
// KAYAD INSPECTION MARKETPLACE - PROVIDER BUSINESS CENTER
// ============================================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  DollarSign, 
  Star, 
  Clock, 
  FileText, 
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Settings,
  Plus,
  Eye,
  Download,
} from 'lucide-react';
import { inspectionApi } from '../services/api';
import type { ProviderDashboard, Booking, EarningsSummary, BookingStatus } from '../types/inspection';

const KAYAD_COLORS = {
  lightNavy: '#1e3a5f',
  warmBeige: '#f5f0e8',
  white: '#ffffff',
  emerald: '#10b981',
  mutedTerracotta: '#c4a484',
  softBlue: '#64748b',
};

interface ProviderBusinessCenterProps {
  providerId: string;
}

type TabType = 'dashboard' | 'bookings' | 'reports' | 'earnings' | 'settings';

export default function ProviderBusinessCenter({ providerId }: ProviderBusinessCenterProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [dashboard, setDashboard] = useState<ProviderDashboard | null>(null);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
    fetchEarnings();
  }, [providerId]);

  const fetchDashboard = async () => {
    try {
      const data = await inspectionApi.getProviderDashboard(providerId);
      setDashboard(data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEarnings = async () => {
    try {
      const data = await inspectionApi.getProviderEarnings(providerId);
      setEarnings(data);
    } catch (error) {
      console.error('Failed to fetch earnings:', error);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
        <div className="animate-spin rounded-full h-12 w-12 border-4" style={{ borderColor: KAYAD_COLORS.emerald, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
      {/* Header */}
      <header 
        className="sticky top-0 z-10 py-4 px-6 shadow-md"
        style={{ backgroundColor: KAYAD_COLORS.lightNavy }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 
              className="text-2xl font-bold"
              style={{ color: KAYAD_COLORS.white }}
            >
              Business Center
            </h1>
            <p style={{ color: KAYAD_COLORS.mutedTerracotta }}>
              Manage your inspection business
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              className="px-4 py-2 rounded-lg font-medium flex items-center gap-2"
              style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}
            >
              <Plus size={16} />
              New Booking
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: activeTab === tab.id ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.white,
                color: activeTab === tab.id ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
              }}
            >
              <tab.icon size={16} className="inline mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 pb-12">
        {activeTab === 'dashboard' && (
          <DashboardTab dashboard={dashboard} earnings={earnings} />
        )}
        {activeTab === 'bookings' && (
          <BookingsTab providerId={providerId} />
        )}
        {activeTab === 'reports' && (
          <ReportsTab providerId={providerId} />
        )}
        {activeTab === 'earnings' && (
          <EarningsTab earnings={earnings} providerId={providerId} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab providerId={providerId} />
        )}
      </main>
    </div>
  );
}

// Dashboard Tab
function DashboardTab({ dashboard, earnings }: { dashboard: ProviderDashboard | null; earnings: EarningsSummary | null }) {
  if (!dashboard) return null;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Calendar className="text-blue-500" />}
          label="Today's Bookings"
          value={dashboard.overview.todayBookings}
          trend={null}
        />
        <StatCard
          icon={<TrendingUp className="text-emerald-500" />}
          label="Monthly Revenue"
          value={`KES ${dashboard.overview.monthlyRevenue.toLocaleString()}`}
          trend={null}
        />
        <StatCard
          icon={<Star className="text-yellow-500" />}
          label="Average Rating"
          value={dashboard.overview.averageRating.toFixed(1)}
          trend={null}
        />
        <StatCard
          icon={<FileText className="text-purple-500" />}
          label="Pending Reports"
          value={dashboard.overview.pendingReports}
          trend={null}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Bookings */}
        <div className="lg:col-span-2 rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
              Upcoming Bookings
            </h2>
            <a href="#" style={{ color: KAYAD_COLORS.emerald }}>View All</a>
          </div>
          
          {dashboard.upcomingBookings.length === 0 ? (
            <div className="text-center py-8" style={{ color: KAYAD_COLORS.softBlue }}>
              <Calendar size={48} className="mx-auto mb-4 opacity-50" />
              <p>No upcoming bookings</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dashboard.upcomingBookings.slice(0, 5).map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          {/* Earnings Summary */}
          <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>
              Earnings Summary
            </h2>
            <div className="space-y-3">
              <EarningsRow label="Total Earnings" value={`KES ${earnings?.totalEarnings.toLocaleString() || '0'}`} />
              <EarningsRow label="Commission" value={`KES ${earnings?.totalCommission.toLocaleString() || '0'}`} isNegative />
              <EarningsRow label="Net Earnings" value={`KES ${earnings?.netEarnings.toLocaleString() || '0'}`} isBold />
              <div className="pt-3 border-t" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                <EarningsRow 
                  label="Pending Payout" 
                  value={`KES ${earnings?.totalPending.toLocaleString() || '0'}`} 
                  highlight 
                />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>
              Quick Actions
            </h2>
            <div className="space-y-2">
              <QuickAction icon={<Plus size={16} />} label="Add Package" href="#" />
              <QuickAction icon={<Users size={16} />} label="Manage Staff" href="#" />
              <QuickAction icon={<MessageSquare size={16} />} label="Messages" href="#" badge={dashboard.unreadMessages} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Bookings Tab
function BookingsTab({ providerId }: { providerId: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchBookings();
  }, [providerId, filter]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (filter !== 'all') params.status = filter;
      const response = await inspectionApi.getProviderBookings(providerId, params);
      setBookings(response.items);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusFilters = [
    { value: 'all', label: 'All' },
    { value: 'booked', label: 'New' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'inspection_started', label: 'In Progress' },
    { value: 'report_generated', label: 'Reports Ready' },
    { value: 'closed', label: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto">
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
              filter === f.value ? 'text-white' : ''
            }`}
            style={{
              backgroundColor: filter === f.value ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.white,
              color: filter === f.value ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12 rounded-xl" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <Calendar size={48} className="mx-auto mb-4" style={{ color: KAYAD_COLORS.softBlue }} />
            <p style={{ color: KAYAD_COLORS.softBlue }}>No bookings found</p>
          </div>
        ) : (
          bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} showActions />
          ))
        )}
      </div>
    </div>
  );
}

// Reports Tab
function ReportsTab({ providerId }: { providerId: string }) {
  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
      <h2 className="text-lg font-bold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>
        Inspection Reports
      </h2>
      <div className="text-center py-12" style={{ color: KAYAD_COLORS.softBlue }}>
        <FileText size={48} className="mx-auto mb-4" />
        <p>Reports will be generated after inspections are completed.</p>
      </div>
    </div>
  );
}

// Earnings Tab
function EarningsTab({ earnings, providerId }: { earnings: EarningsSummary | null; providerId: string }) {
  const [period, setPeriod] = useState('monthly');

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        {['weekly', 'monthly', 'yearly'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg font-medium capitalize ${
              period === p ? 'text-white' : ''
            }`}
            style={{
              backgroundColor: period === p ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.white,
              color: period === p ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
          <p className="text-sm mb-1" style={{ color: KAYAD_COLORS.softBlue }}>Total Earnings</p>
          <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
            KES {earnings?.totalEarnings.toLocaleString() || '0'}
          </p>
        </div>
        <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
          <p className="text-sm mb-1" style={{ color: KAYAD_COLORS.softBlue }}>Commission Paid</p>
          <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.mutedTerracotta }}>
            KES {earnings?.totalCommission.toLocaleString() || '0'}
          </p>
        </div>
        <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
          <p className="text-sm mb-1" style={{ color: KAYAD_COLORS.softBlue }}>Net Earnings</p>
          <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.emerald }}>
            KES {earnings?.netEarnings.toLocaleString() || '0'}
          </p>
        </div>
        <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
          <p className="text-sm mb-1" style={{ color: KAYAD_COLORS.softBlue }}>Pending Payout</p>
          <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
            KES {earnings?.totalPending.toLocaleString() || '0'}
          </p>
        </div>
      </div>

      {/* Settlements */}
      <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
        <h2 className="text-lg font-bold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>
          Settlements
        </h2>
        <div className="text-center py-8" style={{ color: KAYAD_COLORS.softBlue }}>
          <DollarSign size={48} className="mx-auto mb-4" />
          <p>Settlement history will appear here.</p>
        </div>
      </div>
    </div>
  );
}

// Settings Tab
function SettingsTab({ providerId }: { providerId: string }) {
  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
      <h2 className="text-lg font-bold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>
        Business Settings
      </h2>
      <div className="text-center py-12" style={{ color: KAYAD_COLORS.softBlue }}>
        <Settings size={48} className="mx-auto mb-4" />
        <p>Configure your business profile, packages, and team.</p>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ icon, label, value, trend }: { icon: React.ReactNode; label: string; value: string | number; trend: any }) {
  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{value}</p>
    </div>
  );
}

function BookingCard({ booking, showActions = false }: { booking: Booking; showActions?: boolean }) {
  const statusColors: Record<string, string> = {
    booked: '#3b82f6',
    confirmed: '#8b5cf6',
    inspector_assigned: '#8b5cf6',
    travelling: '#f59e0b',
    inspection_started: '#10b981',
    inspection_complete: '#10b981',
    report_generated: '#10b981',
    closed: '#6b7280',
    cancelled: '#ef4444',
  };

  return (
    <div 
      className="rounded-lg p-4 flex items-center justify-between"
      style={{ backgroundColor: KAYAD_COLORS.warmBeige }}
    >
      <div className="flex items-center gap-4">
        <div 
          className="w-2 h-12 rounded-full"
          style={{ backgroundColor: statusColors[booking.status] || KAYAD_COLORS.softBlue }}
        />
        <div>
          <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>
            {booking.vehicle?.year} {booking.vehicle?.make} {booking.vehicle?.model}
          </p>
          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
            {booking.vehicle?.registration} • {booking.reference}
          </p>
          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
            {new Date(booking.scheduledDate).toLocaleDateString()} at {booking.scheduledTime}
          </p>
        </div>
      </div>
      
      <div className="text-right">
        <p className="font-bold" style={{ color: KAYAD_COLORS.emerald }}>
          KES {booking.totalPrice.toLocaleString()}
        </p>
        <span 
          className="text-xs px-2 py-1 rounded-full capitalize"
          style={{ backgroundColor: statusColors[booking.status] + '20', color: statusColors[booking.status] }}
        >
          {booking.status.replace('_', ' ')}
        </span>
        
        {showActions && (
          <div className="flex gap-2 mt-2 justify-end">
            <button className="p-2 rounded" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <Eye size={16} style={{ color: KAYAD_COLORS.lightNavy }} />
            </button>
            <button className="p-2 rounded" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <Download size={16} style={{ color: KAYAD_COLORS.lightNavy }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EarningsRow({ label, value, isBold = false, isNegative = false, highlight = false }: any) {
  return (
    <div className="flex justify-between">
      <span style={{ color: KAYAD_COLORS.softBlue }}>{label}</span>
      <span 
        className={`font-medium ${isBold ? 'font-bold text-lg' : ''}`}
        style={{ 
          color: isNegative 
            ? KAYAD_COLORS.mutedTerracotta 
            : highlight 
              ? KAYAD_COLORS.emerald 
              : KAYAD_COLORS.lightNavy 
        }}
      >
        {value}
      </span>
    </div>
  );
}

function QuickAction({ icon, label, href, badge }: { icon: React.ReactNode; label: string; href: string; badge?: number }) {
  return (
    <a
      href={href}
      className="flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-gray-50"
      style={{ color: KAYAD_COLORS.lightNavy }}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      {badge && (
        <span 
          className="px-2 py-0.5 rounded-full text-xs text-white"
          style={{ backgroundColor: KAYAD_COLORS.emerald }}
        >
          {badge}
        </span>
      )}
    </a>
  );
}
