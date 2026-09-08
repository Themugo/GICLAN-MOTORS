import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Car, Users, TrendingUp, TrendingDown, DollarSign,
  Eye, MessageSquare, Phone, Calendar, ShoppingCart, Target, Clock,
  AlertCircle, CheckCircle2, Star, ArrowRight, Plus, Filter,
  MoreVertical, ChevronDown, ChevronRight, Zap, Bot, BarChart3,
  PieChart, Activity, Users as TeamIcon, ShoppingBag, Bell,
  Settings, FileText, Send, RefreshCw, ArrowUpRight, ArrowDownRight,
  UserPlus, Shield, Award, CreditCard, CalendarCheck, ClipboardCheck,
  Gavel, X, Loader2,
} from 'lucide-react';
import * as dealerApi from '../../../services/dealerPlatformApi';
import { getMyListings } from '../../../services/vehicleApi';

// ============================================================
// DESIGN TOKENS
// ============================================================

const colors = {
  navy: '#17244B',
  beige: '#F6F1E8',
  white: '#FFFFFF',
  emerald: '#10B981',
  terracotta: '#C77B58',
  softBlue: '#60A5FA',
  mutedOrange: '#FB923C',
  mutedCrimson: '#EF4444',
  purple: '#8B5CF6',
  amber: '#F59E0B',
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

/** Stat Card */
type DealerOperationResponse = {
  auctions?: { items?: Array<{ id: string; title: string; bidsCount?: number; views?: number; currentBid?: number; startingBid?: number; status?: string }> };
  inspections?: { items?: Array<{ id: string; vehicle?: string; status?: string }> };
  analytics?: {
    overview?: { totalRevenue?: number; totalSales?: number; totalViews?: number };
    performance?: { avgDealSize?: number };
    topVehicles?: Array<{ id: string; title?: string; views?: number }>;
  };
};

type StatCardProps = { title: string; value: React.ReactNode; change?: number; icon: React.ElementType; color?: string };

const StatCard = ({ title, value, change, icon: Icon, color = colors.navy }: StatCardProps) => (
  <div className="bg-white rounded-xl border border-slate-100 p-5 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        {change !== undefined && (
          <div className={`flex items-center gap-1 mt-2 ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span className="text-sm font-medium">{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

/** Lead Pipeline Stage */
const PipelineStage = ({ stage, count, value, color }: { stage: string; count: number; value?: number; color: string }) => (
  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100">
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: color }} />
      <span className="font-medium text-slate-700">{stage}</span>
    </div>
    <div className="text-right">
      <p className="font-bold text-slate-800">{count}</p>
    </div>
  </div>
);

/** Quick Action Button */
const QuickAction = ({ icon: Icon, label, color, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed ${color} hover:bg-opacity-10 transition-all`}
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} bg-opacity-10`}>
      <Icon className="w-6 h-6" style={{ color }} />
    </div>
    <span className="text-sm font-medium text-slate-700">{label}</span>
  </button>
);

/** Activity Item */
const ActivityItem = ({ type, message, time, icon: Icon }) => {
  const typeColors = {
    lead: colors.emerald,
    view: colors.softBlue,
    sale: colors.navy,
    listing: colors.purple,
  };
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0`} style={{ backgroundColor: `${typeColors[type]}20` }}>
        <Icon className="w-4 h-4" style={{ color: typeColors[type] }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700">{message}</p>
        <p className="text-xs text-slate-400 mt-1">{time}</p>
      </div>
    </div>
  );
};

/** Top Vehicle Card */
const TopVehicle = ({ vehicle, rank }) => (
  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100">
    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
      {rank}
    </div>
    <div className="w-12 h-12 bg-slate-100 rounded-lg flex-shrink-0">
      <Car className="w-6 h-6 text-slate-400 m-auto" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-slate-800 truncate">{vehicle.title}</p>
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{vehicle.views}</span>
        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{vehicle.leads}</span>
      </div>
    </div>
    <div className="text-right">
      <p className="font-bold text-slate-800">Ksh {(vehicle.price / 1000000).toFixed(1)}M</p>
    </div>
  </div>
);

/** AI Copilot */
const AICopilot = () => (
  <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
    <div className="p-4 bg-gradient-to-r from-purple-600 to-purple-500 text-white">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Bot className="w-5 h-5" /></div>
        <div><h3 className="font-bold">AI Dealer Copilot</h3><p className="text-xs text-purple-100">KAYAD Intelligence</p></div>
      </div>
    </div>
    <div className="p-6 text-sm text-slate-600">
      AI dealer insights are not enabled for this deployment yet. No simulated recommendations, forecasts, leads, or revenue figures are shown here.
    </div>
  </div>
);

/** Navigation Tab */
const NavTab = ({ icon: Icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
      active ? 'bg-purple-100 text-purple-700' : 'text-slate-600 hover:bg-slate-50'
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium text-sm">{label}</span>
    {badge && (
      <span className="ml-auto px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">
        {badge}
      </span>
    )}
  </button>
);

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function DealerDashboard({ user, onOpenAuth, onNavigate }) {
  const [activeSection, setActiveSection] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Fixed: the Inventory section previously never fetched anything at
  // all - every stat (38 published, 5 draft, etc.) and all 4 listed
  // vehicles were hardcoded directly in the JSX, identical for every
  // dealer regardless of what's actually in the database. Reuses the
  // same real, already-proven getMyListings endpoint built for the
  // private seller dashboards (scoped to req.user.id server-side).
  const [myListings, setMyListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState(null);
  const [listingsLoaded, setListingsLoaded] = useState(false);

  useEffect(() => {
    if (user) loadDashboard();
    else setLoading(false);
  }, [user]);

  useEffect(() => {
    if (activeSection === 'inventory' && user && !listingsLoaded) {
      setListingsLoading(true);
      setListingsError(null);
      getMyListings()
        .then((data) => { setMyListings(data); setListingsLoaded(true); })
        .catch(() => setListingsError('Could not load your inventory. Please try again.'))
        .finally(() => setListingsLoading(false));
    }
  }, [activeSection, user, listingsLoaded]);

  // Fixed: both Leads and Pipeline previously showed entirely
  // hardcoded, invented leads (fake emails, a fake "lead score" with
  // no real scoring system, fake staff assignments with no real team-
  // assignment system) - Pipeline had no content at all behind its
  // own real nav entry. Both now share this one real fetch, against
  // the real leads table (found already fully defined in the schema
  // but never actually queried).
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState(null);
  const [leadsLoaded, setLeadsLoaded] = useState(false);
  const [leadUpdating, setLeadUpdating] = useState(null);

  const loadLeads = () => {
    setLeadsLoading(true);
    setLeadsError(null);
    dealerApi.getLeads({ limit: 100 })
      .then(({ data }) => { setLeads(data.data.items); setLeadsLoaded(true); })
      .catch(() => setLeadsError('Could not load your leads. Please try again.'))
      .finally(() => setLeadsLoading(false));
  };

  useEffect(() => {
    if ((activeSection === 'leads' || activeSection === 'pipeline') && user && !leadsLoaded) {
      loadLeads();
    }
  }, [activeSection, user, leadsLoaded]);

  const advanceLeadStage = async (leadId, nextStage) => {
    setLeadUpdating(leadId);
    try {
      const { data } = await dealerApi.updateLead(leadId, { stage: nextStage });
      setLeads((prev) => prev.map((l) => l.id === leadId ? data.data : l));
    } catch {
      setLeadsError('Could not update this lead. Please try again.');
    } finally {
      setLeadUpdating(null);
    }
  };

  // Fixed: Customers previously had no real backend equivalent at all.
  // Real customers are honestly derived from this
  // dealer's own real, released escrow deals.
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState(null);
  const [customersLoaded, setCustomersLoaded] = useState(false);

  useEffect(() => {
    if (activeSection === 'customers' && user && !customersLoaded) {
      setCustomersLoading(true);
      setCustomersError(null);
      dealerApi.getCustomers()
        .then(({ data }) => { setCustomers(data.data.items); setCustomersLoaded(true); })
        .catch(() => setCustomersError('Could not load your customers. Please try again.'))
        .finally(() => setCustomersLoading(false));
    }
  }, [activeSection, user, customersLoaded]);

  // Fixed: Marketing previously showed 4 fully invented campaigns with
  // fabricated impressions/clicks/ROI numbers, and its own real
  // "create campaign" action never actually saved anything at all -
  // it just echoed back whatever was submitted. Real campaigns below,
  // genuinely persisted via a new real table - performance metrics
  // (impressions, clicks, ROI) are intentionally not shown, since no
  // real ad-tracking infrastructure exists to back them honestly.
  const [operations, setOperations] = useState<DealerOperationResponse>({});
  const [operationsLoading, setOperationsLoading] = useState(false);
  const [operationsError, setOperationsError] = useState(null);

  useEffect(() => {
    const loaders = {
      auctions: dealerApi.getAuctionInventory,
      inspections: dealerApi.getInspectionOrders,
      analytics: dealerApi.getDealerAnalytics,
    };
    const loader = loaders[activeSection];
    if (!loader || !user || operations[activeSection]) return;
    setOperationsLoading(true);
    setOperationsError(null);
    loader()
      .then((response) => setOperations((prev) => ({ ...prev, [activeSection]: response.data })))
      .catch(() => setOperationsError(`Could not load ${activeSection}. Please try again.`))
      .finally(() => setOperationsLoading(false));
  }, [activeSection, user, operations]);

  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsError, setCampaignsError] = useState(null);
  const [campaignsLoaded, setCampaignsLoaded] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  const loadCampaigns = () => {
    setCampaignsLoading(true);
    setCampaignsError(null);
    dealerApi.getMarketingCampaigns()
      .then(({ data }) => { setCampaigns(data.data.items); setCampaignsLoaded(true); })
      .catch(() => setCampaignsError('Could not load your campaigns. Please try again.'))
      .finally(() => setCampaignsLoading(false));
  };

  useEffect(() => {
    if (activeSection === 'marketing' && user && !campaignsLoaded) {
      loadCampaigns();
    }
  }, [activeSection, user, campaignsLoaded]);

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) return;
    setCreatingCampaign(true);
    try {
      await dealerApi.createCampaign({ name: newCampaignName.trim(), campaignType: 'promotion', budget: 0 });
      setNewCampaignName('');
      setCampaignsLoaded(false);
      loadCampaigns();
    } catch {
      setCampaignsError('Could not create this campaign. Please try again.');
    } finally {
      setCreatingCampaign(false);
    }
  };

  const loadDashboard = async () => {
    setLoadError(null);
    try {
      const { data } = await dealerApi.getDealerDashboard();
      setDashboard(data.data);
    } catch (error) {
      // Fixed: this previously silently substituted the exact same
      // fake numbers (47 listings, KES 187,500,000 revenue, 156
      // leads) on any real failure - a dealer would see confident,
      // invented business figures with zero indication anything had
      // gone wrong. Now shows a real, honest error state instead.
      setLoadError('Could not load your dashboard. Please try again.');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-slate-600 mb-4">Sign in to manage your dealership.</p>
          <button onClick={onOpenAuth} className="bg-[#17244B] text-white text-xs font-bold rounded-lg px-5 py-2.5">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-sm text-slate-600 mb-4">{loadError}</p>
          <button onClick={loadDashboard} className="bg-[#17244B] text-white text-xs font-bold rounded-lg px-5 py-2.5">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Car },
    { id: 'leads', label: 'Leads', icon: Users, badge: dashboard?.overview?.leads?.new },
    { id: 'pipeline', label: 'Pipeline', icon: ArrowRight },
    { id: 'customers', label: 'Customers', icon: ShoppingBag },
    { id: 'marketing', label: 'Marketing', icon: Zap },
    { id: 'auctions', label: 'Auctions', icon: Gavel },
    { id: 'finance', label: 'Finance', icon: CreditCard },
    { id: 'inspections', label: 'Inspections', icon: ClipboardCheck },
    { id: 'team', label: 'Team', icon: TeamIcon },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800">Dealer Hub</h1>
              <p className="text-xs text-slate-500">{user?.businessName || user?.name || "Dealer account"}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sections.map((section) => (
            <NavTab
              key={section.id}
              icon={section.icon}
              label={section.label}
              active={activeSection === section.id}
              onClick={() => setActiveSection(section.id)}
              badge={section.badge}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="p-4 bg-gradient-to-r from-purple-100 to-purple-50 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-purple-800">Dealer account</span>
            </div>
            <p className="text-xs text-purple-600 mb-3">Plan information is not available.</p>
            <button className="w-full py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700">
              Plan unavailable
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
              <p className="text-slate-500">Welcome back, {user?.name || "dealer"}</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
                <Bell className="w-5 h-5 text-slate-600" />
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Listing
              </button>
            </div>
          </div>

          {activeSection === 'overview' && (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                <StatCard
                  title="Total Listings"
                  value={dashboard?.overview?.totalListings ?? 0}
                  icon={Car}
                  color={colors.softBlue}
                />
                <StatCard
                  title="Total Views"
                  value={(dashboard?.overview?.totalViews ?? 0).toLocaleString()}
                  icon={Eye}
                  color={colors.purple}
                />
                <StatCard
                  title="Active Leads"
                  value={dashboard?.overview?.leads?.total ?? 0}
                  icon={Users}
                  color={colors.emerald}
                />
                <StatCard
                  title="Revenue (This Month)"
                  value={`Ksh ${((dashboard?.overview?.revenue?.total ?? 0) / 1000000).toFixed(1)}M`}
                  icon={DollarSign}
                  color={colors.navy}
                />
              </div>

              <div className="grid grid-cols-3 gap-6 mb-8">
                {/* Lead Pipeline */}
                <div className="col-span-2 bg-white rounded-xl border border-slate-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800">Lead Pipeline</h3>
                    <button className="text-sm text-purple-600 font-medium hover:text-purple-700">View All</button>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <PipelineStage stage="New" count={dashboard?.overview?.leads?.new ?? 0} color={colors.softBlue} />
                    <PipelineStage stage="Contacted" count={dashboard?.overview?.leads?.contacted ?? 0} color={colors.purple} />
                    <PipelineStage stage="Negotiating" count={dashboard?.overview?.leads?.negotiating ?? 0} color={colors.amber} />
                    <PipelineStage stage="Reserved" count={dashboard?.overview?.leads?.reserved ?? 0} color={colors.emerald} />
                  </div>
                  <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Conversion Rate</p>
                        <p className="text-2xl font-bold text-emerald-600">{dashboard?.overview?.performance?.leadConversion ?? 0}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Avg Response Rate</p>
                        <p className="text-2xl font-bold text-purple-600">{dashboard?.overview?.performance?.responseRate ?? 0}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl border border-slate-100 p-6">
                  <h3 className="font-bold text-slate-800 mb-4">Recent Activity</h3>
                  <div className="space-y-1">
                    {dashboard?.recentActivity?.map((activity, i) => (
                      <ActivityItem
                        key={i}
                        type={activity.type}
                        message={activity.message}
                        time={activity.time}
                        icon={
                          activity.type === 'lead' ? MessageSquare :
                          activity.type === 'view' ? Eye :
                          activity.type === 'sale' ? CheckCircle2 :
                          Car
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                {/* Top Performing Vehicles */}
                <div className="col-span-2 bg-white rounded-xl border border-slate-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800">Top Performing Vehicles</h3>
                    <button className="text-sm text-purple-600 font-medium hover:text-purple-700">View Inventory</button>
                  </div>
                  <div className="space-y-3">
                    {dashboard?.topPerformers?.vehicles?.map((vehicle, i) => (
                      <TopVehicle key={vehicle.id} vehicle={vehicle} rank={i + 1} />
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl border border-slate-100 p-6">
                  <h3 className="font-bold text-slate-800 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <QuickAction icon={Plus} label="Add Listing" color={colors.emerald} onClick={() => onNavigate?.('seller-platform')} />
                    <QuickAction icon={Users} label="View Leads" color={colors.purple} onClick={() => setActiveSection('leads')} />
                    <QuickAction icon={Car} label="Manage Inventory" color={colors.softBlue} onClick={() => setActiveSection('inventory')} />
                    <QuickAction icon={Calendar} label="Inspections" color={colors.amber} onClick={() => setActiveSection('inspections')} />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection === 'inventory' && (
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">Inventory Management</h3>
                <div className="flex items-center gap-3">
                  <button onClick={() => onNavigate?.('seller-platform')} className="px-4 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Listing
                  </button>
                </div>
              </div>
              {/* Fixed: this entire section previously never fetched
                  anything - every stat below and all 4 listed
                  vehicles were hardcoded directly in the JSX (the
                  same "Toyota Land Cruiser 300 GX-R" invented model
                  found earlier in this same file's now-fixed backend
                  call), identical for every dealer regardless of
                  what's actually in the database. Real counts and
                  real listings below, computed from this dealer's own
                  real inventory (getMyListings). The "Filter" button
                  had no onClick handler at all - removed rather than
                  left as dead UI, since no real filtering logic
                  exists here to wire it to. */}
              {listingsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                </div>
              ) : listingsError ? (
                <div className="text-center py-12">
                  <p className="text-sm text-slate-500 mb-3">{listingsError}</p>
                  <button onClick={() => setListingsLoaded(false)} className="text-xs font-bold text-purple-600">Try Again</button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    <div className="p-3 bg-emerald-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-emerald-600">{myListings.filter((l) => l.status === 'available' || l.status === 'active').length}</p>
                      <p className="text-xs text-emerald-600">Published</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-amber-600">{myListings.filter((l) => l.status === 'draft').length}</p>
                      <p className="text-xs text-amber-600">Draft</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-purple-600">{myListings.filter((l) => l.status === 'reserved').length}</p>
                      <p className="text-xs text-purple-600">Reserved</p>
                    </div>
                    <div className="p-3 bg-slate-100 rounded-xl text-center">
                      <p className="text-2xl font-bold text-slate-600">{myListings.filter((l) => l.status === 'sold').length}</p>
                      <p className="text-xs text-slate-600">Sold</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {myListings.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-8">You haven't listed any vehicles yet.</p>
                    ) : myListings.map((car) => {
                      const image = car.images?.[0]?.thumb || car.images?.[0]?.url;
                      return (
                        <div key={car.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                          <div className="w-16 h-12 bg-slate-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                            {image ? <img src={image} alt={car.title} className="w-full h-full object-cover" /> : <Car className="w-6 h-6 text-slate-400" />}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-800">{car.title || `${car.year} ${car.brand} ${car.model}`}</p>
                            <p className="text-sm text-slate-500">Ksh {(car.price / 1000000).toFixed(1)}M • {car.views || 0} views</p>
                          </div>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            car.status === 'available' || car.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            car.status === 'reserved' ? 'bg-purple-100 text-purple-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {car.status || 'draft'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {activeSection === 'leads' && (
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">Lead Management (CRM)</h3>
              </div>
              {/* Fixed: this whole table previously showed 5
                  entirely invented leads - fake emails, a fake "lead
                  score" and fake staff assignments with no real
                  scoring or team-assignment system anywhere in this
                  project. Removed those 2 fake columns rather than
                  fake a version of either; the rest (name, email,
                  phone, vehicle, real source, real stage, real
                  timestamp) are all genuinely real now. The dead
                  "Filter"/"Export" buttons (no onClick handler on
                  either) were removed rather than left non-functional. */}
              {leadsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                </div>
              ) : leadsError ? (
                <div className="text-center py-12">
                  <p className="text-sm text-slate-500 mb-3">{leadsError}</p>
                  <button onClick={loadLeads} className="text-xs font-bold text-purple-600">Try Again</button>
                </div>
              ) : leads.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-12">No leads yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Lead</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Vehicle</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Source</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Stage</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Last Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead) => (
                        <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-800">{lead.buyer?.name || 'Unknown'}</p>
                            <p className="text-xs text-slate-500">{lead.buyer?.email}</p>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{lead.vehicle?.title || 'Vehicle'}</td>
                          <td className="py-3 px-4 text-slate-700">{lead.source || '—'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              lead.stage === 'new' ? 'bg-blue-100 text-blue-700' :
                              lead.stage === 'contacted' ? 'bg-purple-100 text-purple-700' :
                              lead.stage === 'negotiating' ? 'bg-amber-100 text-amber-700' :
                              lead.stage === 'sold' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {(lead.stage || 'new').replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">{lead.last_activity_at ? new Date(lead.last_activity_at).toLocaleDateString() : 'Never'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeSection === 'pipeline' && (
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-6">Sales Pipeline</h3>
              {/* Fixed: this section had a real nav entry (Pipeline)
                  but zero content behind it at all - clicking it
                  showed nothing. Real, working kanban-style view now,
                  sharing the same real leads data as the table above.
                  Advancing a lead's stage genuinely persists (the
                  real backend's own updateLead previously just echoed
                  back whatever was sent without writing to the
                  database at all - fixed as part of this same pass). */}
              {leadsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                </div>
              ) : leadsError ? (
                <div className="text-center py-12">
                  <p className="text-sm text-slate-500 mb-3">{leadsError}</p>
                  <button onClick={loadLeads} className="text-xs font-bold text-purple-600">Try Again</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {['new', 'contacted', 'negotiating', 'sold'].map((stage, stageIdx) => {
                    const nextStage = ['new', 'contacted', 'negotiating', 'sold'][stageIdx + 1];
                    const stageLeads = leads.filter((l) => (l.stage || 'new') === stage);
                    return (
                      <div key={stage} className="bg-slate-50 rounded-xl p-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">{stage} ({stageLeads.length})</h4>
                        <div className="space-y-2">
                          {stageLeads.length === 0 ? (
                            <p className="text-xs text-slate-400">Empty</p>
                          ) : stageLeads.map((lead) => (
                            <div key={lead.id} className="bg-white rounded-lg p-3 border border-slate-100 shadow-xs">
                              <p className="text-xs font-bold text-slate-800">{lead.buyer?.name || 'Unknown'}</p>
                              <p className="text-[11px] text-slate-500 mb-2">{lead.vehicle?.title || 'Vehicle'}</p>
                              {nextStage && (
                                <button
                                  onClick={() => advanceLeadStage(lead.id, nextStage)}
                                  disabled={leadUpdating === lead.id}
                                  className="text-[10px] font-bold text-purple-600 disabled:opacity-50"
                                >
                                  {leadUpdating === lead.id ? 'Moving…' : `Move to ${nextStage} →`}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeSection === 'customers' && (
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-6">Customers</h3>
              {/* Fixed: this section had a real nav entry but zero
                  content behind it at all. Real customers below,
                  honestly derived from this dealer's own real,
                  released escrow deals (there is no separate real
                  "customer" entity anywhere in this project's
                  schema). */}
              {customersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                </div>
              ) : customersError ? (
                <div className="text-center py-12">
                  <p className="text-sm text-slate-500 mb-3">{customersError}</p>
                  <button onClick={() => setCustomersLoaded(false)} className="text-xs font-bold text-purple-600">Try Again</button>
                </div>
              ) : customers.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-12">No customers yet - customers appear here once a real deal completes.</p>
              ) : (
                <div className="space-y-3">
                  {customers.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div>
                        <p className="font-medium text-slate-800">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.email} • {c.vehicles.length} vehicle{c.vehicles.length === 1 ? '' : 's'}</p>
                      </div>
                      <p className="text-sm font-bold text-slate-800">Ksh {(c.totalSpent / 1000000).toFixed(2)}M</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === 'marketing' && (
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-6">Marketing</h3>
              {/* Fixed: this section had a real nav entry but zero
                  content behind it at all. Real campaigns below, with
                  a real create form - performance metrics
                  (impressions/clicks/ROI) are intentionally not shown
                  since no real ad-tracking infrastructure exists to
                  back them honestly. */}
              <div className="flex gap-2 mb-6">
                <input
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  placeholder="New campaign name"
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                />
                <button
                  onClick={handleCreateCampaign}
                  disabled={creatingCampaign || !newCampaignName.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  {creatingCampaign ? 'Creating…' : 'Create Campaign'}
                </button>
              </div>
              {campaignsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                </div>
              ) : campaignsError ? (
                <div className="text-center py-12">
                  <p className="text-sm text-slate-500 mb-3">{campaignsError}</p>
                  <button onClick={loadCampaigns} className="text-xs font-bold text-purple-600">Try Again</button>
                </div>
              ) : campaigns.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No campaigns yet.</p>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div>
                        <p className="font-medium text-slate-800">{c.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{c.campaign_type} • Budget Ksh {Number(c.budget).toLocaleString()}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        c.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        c.status === 'draft' ? 'bg-slate-100 text-slate-600' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {['auctions', 'finance', 'inspections', 'team', 'settings'].includes(activeSection) && (
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h3 className="text-xl font-bold text-slate-800 capitalize mb-2">{activeSection}</h3>
              {['finance', 'team', 'settings'].includes(activeSection) ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-slate-500">This dealer capability is not backed by a canonical dealer-scoped data contract yet.</p>
                  <p className="text-xs text-slate-400 mt-2">KAYAD will not display simulated records here.</p>
                </div>
              ) : operationsLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-purple-600 animate-spin" /></div>
              ) : operationsError ? (
                <div className="py-12 text-center"><p className="text-sm text-slate-500 mb-3">{operationsError}</p><button onClick={() => setOperations((prev) => ({ ...prev, [activeSection]: undefined }))} className="text-xs font-bold text-purple-600">Try Again</button></div>
              ) : activeSection === 'auctions' ? (
                <div className="space-y-3">
                  {(operations.auctions?.items || []).length === 0 ? <p className="py-10 text-center text-sm text-slate-400">No auctions found for this dealership.</p> : (operations.auctions.items || []).map((auction) => (
                    <div key={auction.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div><p className="font-medium text-slate-800">{auction.title}</p><p className="text-xs text-slate-500">{auction.bidsCount} bids • {auction.views} views</p></div>
                      <div className="text-right"><p className="font-bold text-slate-800">Ksh {Number(auction.currentBid || auction.startingBid || 0).toLocaleString()}</p><span className="text-xs capitalize text-slate-500">{auction.status}</span></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {(operations.inspections?.items || []).length === 0 ? <p className="py-10 text-center text-sm text-slate-400">No inspection orders found for this dealership.</p> : (operations.inspections.items || []).map((inspection) => (
                    <div key={inspection.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"><div><p className="font-medium text-slate-800">{inspection.vehicle}</p><p className="text-xs text-slate-500">{inspection.id}</p></div><span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs capitalize">{inspection.status}</span></div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === 'analytics' && (
            <div className="space-y-6">
              {operationsLoading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-purple-600 animate-spin" /></div> : operationsError ? <div className="py-12 text-center"><p className="text-sm text-slate-500 mb-3">{operationsError}</p><button onClick={() => setOperations((prev) => ({ ...prev, analytics: undefined }))} className="text-xs font-bold text-purple-600">Try Again</button></div> : <>
                <div className="grid grid-cols-4 gap-4">
                  <StatCard title="Total Revenue" value={`Ksh ${Number(operations.analytics?.overview?.totalRevenue || 0).toLocaleString()}`} icon={DollarSign} color={colors.emerald} />
                  <StatCard title="Total Sales" value={operations.analytics?.overview?.totalSales || 0} icon={ShoppingCart} color={colors.navy} />
                  <StatCard title="Avg Deal Size" value={`Ksh ${Number(operations.analytics?.performance?.avgDealSize || 0).toLocaleString()}`} icon={Target} color={colors.purple} />
                  <StatCard title="Total Views" value={operations.analytics?.overview?.totalViews || 0} icon={Eye} color={colors.amber} />
                </div>
                <div className="bg-white rounded-xl border border-slate-100 p-6"><h3 className="font-bold text-slate-800 mb-4">Top Vehicles by Views</h3>{(operations.analytics?.topVehicles || []).length ? (operations.analytics.topVehicles.map((vehicle) => <div key={vehicle.id} className="flex justify-between py-3 border-b last:border-0 border-slate-100"><span className="text-sm text-slate-700">{vehicle.title}</span><span className="text-sm font-semibold text-slate-800">{vehicle.views} views</span></div>)) : <p className="text-sm text-slate-400">No vehicle analytics yet.</p>}</div>
              </>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
