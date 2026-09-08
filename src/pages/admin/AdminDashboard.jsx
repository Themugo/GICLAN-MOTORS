import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { adminAPI } from "../../api/api";
import {
  EnterpriseCard, EnterpriseKPI, EnterpriseRevenue, EnterpriseTimeline,
  EnterpriseNotifications, EnterpriseChart, EnterpriseDonut,
  EnterpriseTable, EnterpriseBadge,
  EnterpriseMetricRow, DashboardHeader, EnterpriseTabs,
  EnterpriseProgress, EnterpriseQuickActions,
  EnterpriseTokens
} from "../../components/enterprise/EnterpriseDashboard";

const MONTHLY_REVENUE = [
  { label: "Jan", value: 18500000 },
  { label: "Feb", value: 22000000 },
  { label: "Mar", value: 19800000 },
  { label: "Apr", value: 24500000 },
  { label: "May", value: 26200000 },
  { label: "Jun", value: 28500000 },
];

const LISTINGS_TREND = [
  { label: "Mon", value: 45 },
  { label: "Tue", value: 52 },
  { label: "Wed", value: 48 },
  { label: "Thu", value: 61 },
  { label: "Fri", value: 55 },
  { label: "Sat", value: 38 },
  { label: "Sun", value: 32 },
];

const PLATFORM_HEALTH = [
  { label: "Escrows", count: 34, total: 45, color: EnterpriseTokens.success },
  { label: "Inspections", count: 89, total: 100, color: EnterpriseTokens.info },
  { label: "Approvals", count: 12, total: 20, color: EnterpriseTokens.warning },
];

const RECENT_ACTIVITY = [
  { title: "New dealer registered", description: "Mombasa Motors Ltd submitted application", time: "5m ago", color: EnterpriseTokens.info },
  { title: "Escrow released", description: "KES 12.5M - Mercedes GLE 350d", time: "12m ago", color: EnterpriseTokens.success },
  { title: "Vehicle approved", description: "Toyota Land Cruiser 300 - Nairobi Auto Hub", time: "25m ago", color: EnterpriseTokens.gold },
  { title: "Dispute resolved", description: "Escrow #4021 - Buyer confirmed delivery", time: "1h ago", color: EnterpriseTokens.purple },
  { title: "Inspection completed", description: "BMW X5 - 94/100 score", time: "2h ago", color: EnterpriseTokens.success },
  { title: "Listing flagged", description: "Suspected duplicate - under review", time: "3h ago", color: EnterpriseTokens.warning },
];

const NOTIFICATIONS = [
  { icon: "👤", title: "New dealer registration", description: "Coast Motors Ltd - pending verification", time: "15m ago", unread: true, color: EnterpriseTokens.info },
  { icon: "🚗", title: "Listing requires moderation", description: "Suspicious pricing detected - Toyota Land Cruiser", time: "1h ago", unread: true, color: EnterpriseTokens.warning },
  { icon: "💰", title: "High-value transaction", description: "Escrow KES 18.5M released successfully", time: "2h ago", unread: false, color: EnterpriseTokens.success },
  { icon: "🔧", title: "Inspection scheduled", description: "12 vehicles pending inspection", time: "3h ago", unread: false, color: EnterpriseTokens.purple },
];

const TOP_DEALERS = [
  { name: "Nairobi Auto Hub", cars: 124, revenue: "KES 890M", rating: 4.9, status: "Active" },
  { name: "Premium Auto KE", cars: 98, revenue: "KES 720M", rating: 4.8, status: "Active" },
  { name: "Highland Cars", cars: 76, revenue: "KES 540M", rating: 4.7, status: "Active" },
  { name: "Mombasa Motors", cars: 52, revenue: "KES 380M", rating: 4.6, status: "Review" },
  { name: "Coast Autos", cars: 45, revenue: "KES 320M", rating: 4.5, status: "Active" },
];

const TABLE_COLUMNS = [
  { key: "name", label: "Dealer" },
  { key: "cars", label: "Listings", align: "right" },
  { key: "revenue", label: "Revenue", align: "right" },
  { key: "rating", label: "Rating", align: "center" },
  { key: "status", label: "Status" },
];

const PLATFORM_QUICK_ACTIONS = [
  { icon: "👥", label: "Manage Dealers", desc: "156 registered", to: "/admin/sellers" },
  { icon: "🚗", label: "Moderate Listings", desc: "8 pending review", to: "/admin/cars" },
  { icon: "💰", label: "Escrow Overview", desc: "34 active", to: "/admin/escrows" },
  { icon: "🔍", label: "Inspection Queue", desc: "12 scheduled", to: "/admin/inspections" },
  { icon: "🎫", label: "Support Tickets", desc: "23 open", to: "/admin/support" },
  { icon: "📊", label: "Analytics", desc: "View reports", to: "/admin/reports" },
];

export default function AdminDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({
    totalUsers: 0, totalDealers: 0, totalCars: 0, activeListings: 0,
    activeEscrows: 0, supportTickets: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    adminAPI.stats()
      .then(d => {
        const s = d.stats || {};
        setStats({
          totalUsers: s.totalUsers || 0,
          totalDealers: s.totalDealers || 0,
          totalCars: s.totalCars || 0,
          activeListings: s.activeListings || 0,
          activeEscrows: s.openEscrows || 0,
          supportTickets: s.supportQueue || 0,
        });
      })
      .catch(() => toast('Failed to load dashboard stats', 'error'))
      .finally(() => setStatsLoading(false));
  }, []);

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "dealers", label: "Dealers", icon: "👥", count: stats.totalDealers },
    { id: "listings", label: "Listings", icon: "🚗", count: stats.activeListings },
    { id: "finances", label: "Finances", icon: "💰" },
  ];

  return (
    <div style={{ background: EnterpriseTokens.bg, minHeight: "100vh" }}>
      <DashboardHeader
        badge="Platform Owner"
        greeting="Platform Overview"
        subtitle="2,847 users · 156 dealers · 1,842 vehicles"
        actions={
          <Link to="/admin/settings" style={{
            padding: "8px 16px",
            borderRadius: 10,
            background: EnterpriseTokens.goldBg,
            border: "1px solid " + EnterpriseTokens.goldBorder,
            color: EnterpriseTokens.gold,
            fontSize: 11,
            fontWeight: 700,
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}>
            ⚙ Settings
          </Link>
        }
      />

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 28px" }}>
        <EnterpriseTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

        {activeTab === "overview" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
              <EnterpriseKPI icon="👥" label="Total Users" value={stats.totalUsers.toLocaleString()} trend={12} accent={EnterpriseTokens.info} />
              <EnterpriseKPI icon="🏪" label="Dealers" value={stats.totalDealers} trend={5} accent={EnterpriseTokens.purple} />
              <EnterpriseKPI icon="🚗" label="Total Vehicles" value={stats.totalCars.toLocaleString()} trend={8} accent={EnterpriseTokens.gold} />
              <EnterpriseKPI icon="✅" label="Active Listings" value={stats.activeListings} accent={EnterpriseTokens.success} />
              <EnterpriseKPI icon="🔒" label="Active Escrows" value={stats.activeEscrows} accent={EnterpriseTokens.warning} />
              <EnterpriseKPI icon="🎫" label="Open Tickets" value={stats.supportTickets} accent={EnterpriseTokens.danger} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <EnterpriseRevenue label="Monthly Revenue" value="KES 28.5M" sub="+18% vs last month" period="June 2026" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24 }}>
              <EnterpriseCard header="Revenue Trend" icon="📈">
                <EnterpriseChart data={MONTHLY_REVENUE} height={180} showLabels color={EnterpriseTokens.gold} />
              </EnterpriseCard>

              <EnterpriseCard header="Platform Health" icon="💚">
                <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 20 }}>
                  {PLATFORM_HEALTH.map((item, i) => (
                    <EnterpriseDonut key={i} value={item.count} max={item.total} label={item.label} color={item.color} />
                  ))}
                </div>
                <EnterpriseProgress value={92} max={100} label="Overall Health Score" color={EnterpriseTokens.success} showPercent />
              </EnterpriseCard>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 24 }}>
              <EnterpriseCard header="Recent Activity" icon="🔔">
                <EnterpriseTimeline items={RECENT_ACTIVITY} maxHeight={320} />
              </EnterpriseCard>

              <EnterpriseCard header="Notifications" icon="📨">
                <EnterpriseNotifications items={NOTIFICATIONS} />
              </EnterpriseCard>

              <EnterpriseCard header="Quick Actions" icon="⚡">
                <EnterpriseQuickActions actions={PLATFORM_QUICK_ACTIONS} cols={2} />
              </EnterpriseCard>
            </div>

            <EnterpriseCard header="Top Performing Dealers" icon="🏆" action={{ label: "View All", to: "/admin/sellers" }}>
              <EnterpriseTable
                columns={TABLE_COLUMNS}
                data={TOP_DEALERS.map((d) => ({
                  name: d.name,
                  cars: d.cars,
                  revenue: d.revenue,
                  rating: d.rating + " ★",
                  status: d.status,
                }))}
                onRowClick={() => toast("Opening dealer profile...")}
              />
            </EnterpriseCard>
          </>
        )}

        {activeTab === "dealers" && (
          <EnterpriseCard header="All Dealers" icon="👥">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {TOP_DEALERS.map((dealer, i) => (
                <div key={i} style={{
                  padding: 20,
                  background: EnterpriseTokens.surface,
                  borderRadius: 12,
                  border: "1px solid " + EnterpriseTokens.border,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: EnterpriseTokens.textPrimary }}>{dealer.name}</div>
                      <div style={{ fontSize: 11, color: EnterpriseTokens.textMuted }}>{dealer.cars} listings</div>
                    </div>
                    <EnterpriseBadge label={dealer.status} color={dealer.status === "Active" ? EnterpriseTokens.success : EnterpriseTokens.warning} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 12, color: EnterpriseTokens.textMuted }}>Revenue</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: EnterpriseTokens.gold }}>{dealer.revenue}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: EnterpriseTokens.textPrimary }}>
                      <span style={{ color: "#FFB800" }}>★</span> {dealer.rating}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </EnterpriseCard>
        )}

        {activeTab === "listings" && (
          <EnterpriseCard header="Listings Overview" icon="🚗">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
              <EnterpriseMetricRow icon="📊" label="Total Listings" value="1,842" color={EnterpriseTokens.info} />
              <EnterpriseMetricRow icon="✅" label="Active" value="892" color={EnterpriseTokens.success} />
              <EnterpriseMetricRow icon="⏳" label="Pending Review" value="28" color={EnterpriseTokens.warning} />
              <EnterpriseMetricRow icon="🗑️" label="Sold/Removed" value="922" color={EnterpriseTokens.textMuted} />
            </div>
            <div style={{ marginTop: 24 }}>
              <EnterpriseChart data={LISTINGS_TREND} label="New Listings This Week" height={120} showLabels color={EnterpriseTokens.info} />
            </div>
          </EnterpriseCard>
        )}

        {activeTab === "finances" && (
          <EnterpriseCard header="Financial Overview" icon="💰">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              <EnterpriseKPI icon="💎" label="Platform Revenue" value="KES 456.8M" trend={22} accent={EnterpriseTokens.gold} />
              <EnterpriseKPI icon="📊" label="Monthly Average" value="KES 38.1M" trend={18} accent={EnterpriseTokens.success} />
              <EnterpriseKPI icon="🔒" label="Escrow Volume" value="KES 892M" trend={12} accent={EnterpriseTokens.purple} />
            </div>
          </EnterpriseCard>
        )}
      </div>
    </div>
  );
}
