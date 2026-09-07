import '../styles/dashboard.css';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { carsAPI, escrowAPI } from '../api/api';
import { timeAgo } from '../utils/helpers';
import { EnterpriseCard, EnterpriseKPI, EnterpriseTimeline, EnterpriseQuickActions, EnterpriseTable, EnterpriseMetricRow, EnterpriseStatus, DashboardHeader } from '../components/enterprise/EnterpriseDashboard';

export default function PrivateSellerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [listings, setListings] = useState([]);
  const [escrows, setEscrows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [listingsRes, escrowsRes] = await Promise.all([
        carsAPI.list({ seller: user?._id, limit: 20 }),
        escrowAPI.mine(),
      ]);
      const carList = listingsRes.cars || listingsRes.data || [];
      const escrowList = escrowsRes.escrows || [];
      setListings(carList);
      setEscrows(escrowList);

      const activeListings = carList.filter(l => l.status === 'active' || !l.status).length;
      const soldListings = carList.filter(l => l.status === 'sold').length;
      const totalViews = carList.reduce((sum, l) => sum + (l.views || 0), 0);
      const totalInquiries = carList.reduce((sum, l) => sum + (l.inquiries || 0), 0);

      setStats({
        activeListings,
        soldListings,
        totalViews,
        totalInquiries,
        pendingEscrows: escrowList.filter(e => e.status === 'pending').length,
        completedEscrows: escrowList.filter(e => e.status === 'completed').length,
      });
    } catch (err) {
      let errorMessage = 'Could not load dashboard data';
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) errorMessage = 'Network error. Please check your connection.';
      else if (err.response?.status >= 500) errorMessage = 'Server error. Please try again later.';
      toast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

  const totalRevenue = escrows.reduce((sum, e) => sum + (e.amount || 0), 0);
  const statusColor = (status) => status === 'sold' ? '#22c55e' : status === 'active' ? '#3b82f6' : 'rgba(255,255,255,0.3)';

  return (
    <div className="page dashboard-page">
      <DashboardHeader badge="Private Seller Hub" greeting="Welcome" name={user?.name?.split(' ')[0] || 'Seller'}
        subtitle="Manage your vehicle listings and track sales"
        actions={
          <Link to="/sell" style={{ padding: '10px 20px', borderRadius: 10, background: 'var(--gold)', color: '#000', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>+ List a Vehicle</Link>
        }
      />

      <div className="dash-body">
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 28 }}>
          <EnterpriseKPI icon="🚗" label="Active Listings" value={stats?.activeListings || 0} trend={12} accent="var(--gold)" />
          <EnterpriseKPI icon="💰" label="Sold Vehicles" value={stats?.soldListings || 0} trend={8} accent="#22c55e" />
          <EnterpriseKPI icon="👁" label="Total Views" value={stats?.totalViews || 0} trend={15} accent="#3b82f6" />
          <EnterpriseKPI icon="📈" label="Total Revenue" value={`KES ${totalRevenue.toLocaleString()}`} trend={20} accent="var(--gold)" />
          <EnterpriseKPI icon="💬" label="Inquiries" value={stats?.totalInquiries || 0} accent="#8b5cf6" />
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Quick Actions</div>
          <EnterpriseQuickActions actions={[
            { to: '/sell', icon: '➕', label: 'List a Vehicle', desc: 'Sell your car in minutes' },
            { to: '/seller', icon: '🚗', label: 'My Listings', desc: 'View and manage all listings' },
            { to: '/seller/analytics', icon: '📊', label: 'View Analytics', desc: 'Performance and insights' },
            { to: '/seller/support', icon: '💬', label: 'Support', desc: 'Get help with selling' },
          ]} />
        </div>

        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 24, marginBottom: 28 }}>
          {/* Listings Performance */}
          <EnterpriseCard header="📊 Listings Performance" action={<Link to="/seller" style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>View All →</Link>}>
            <EnterpriseTable
              columns={[
                { key: 'title', label: 'Vehicle' },
                { key: 'status', label: 'Status', align: 'center' },
                { key: 'views', label: 'Views', align: 'center' },
                { key: 'inquiries', label: 'Inquiries', align: 'center' },
              ]}
              rows={listings.slice(0, 5).map(l => ({
                title: <span style={{ fontWeight: 600, color: '#fff', fontSize: 13 }}>{l.title || `${l.brand || ''} ${l.model || ''}`}</span>,
                status: <EnterpriseStatus label={l.status || 'active'} color={statusColor(l.status || 'active')} />,
                views: <span style={{ color: 'rgba(255,255,255,0.6)' }}>{(l.views || 0).toLocaleString()}</span>,
                inquiries: <span style={{ color: 'rgba(255,255,255,0.6)' }}>{l.inquiries || 0}</span>,
              }))}
              emptyMessage="No listings yet — list your first vehicle to get started"
            />
          </EnterpriseCard>

          {/* Activity Feed */}
          <EnterpriseCard header="⚡ Recent Activity">
            {listings.length > 0 ? (
              <EnterpriseTimeline items={listings.slice(0, 5).map(l => ({
                title: l.status === 'sold' ? 'Vehicle Sold' : 'Active Listing',
                description: l.title || `${l.brand || ''} ${l.model || ''}`,
                time: l.createdAt ? timeAgo(l.createdAt) : '',
                color: l.status === 'sold' ? '#22c55e' : 'var(--gold)',
              }))} />
            ) : (
              <EnterpriseTimeline items={[
                { title: 'Welcome to KAYAD', description: 'List your first vehicle to get started', color: 'var(--gold)' },
              ]} />
            )}
          </EnterpriseCard>
        </div>

        {/* Escrow & Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 28 }}>
          <EnterpriseCard header="🔒 Escrow Summary">
            <EnterpriseMetricRow items={[
              { icon: '🔒', value: stats?.pendingEscrows || 0, label: 'Pending' },
              { icon: '✅', value: stats?.completedEscrows || 0, label: 'Completed' },
              { icon: '💰', value: `KES ${totalRevenue.toLocaleString()}`, label: 'Total Value' },
            ]} />
            {escrows.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <EnterpriseTimeline items={escrows.slice(0, 3).map(e => ({
                  title: `${e.car?.title || 'Vehicle'} — KES ${(e.amount || 0).toLocaleString()}`,
                  description: `Status: ${e.status}`,
                  time: e.createdAt ? timeAgo(e.createdAt) : '',
                  color: e.status === 'completed' ? '#22c55e' : e.status === 'pending' ? '#f59e0b' : '#3b82f6',
                }))} />
              </div>
            )}
          </EnterpriseCard>

          <EnterpriseCard header="📈 Performance Metrics">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { icon: '👁', label: 'Avg Views/Listing', value: listings.length > 0 ? Math.round((stats?.totalViews || 0) / listings.length).toLocaleString() : '0' },
                { icon: '💬', label: 'Avg Inquiries/Listing', value: listings.length > 0 ? Math.round((stats?.totalInquiries || 0) / listings.length) : '0' },
                { icon: '💰', label: 'Avg Sale Price', value: stats?.soldListings > 0 ? `KES ${Math.round(totalRevenue / stats.soldListings).toLocaleString()}` : '—' },
                { icon: '✅', label: 'Sold Rate', value: listings.length > 0 ? `${Math.round(((stats?.soldListings || 0) / listings.length) * 100)}%` : '0%' },
              ].map((m, i) => (
                <div key={i} style={{ padding: 14, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{m.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 900, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: '#fff' }}>{m.value}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </EnterpriseCard>
        </div>

        {/* Recent Listings */}
        {listings.length > 0 && (
          <EnterpriseCard header="🚗 Recent Listings" action={<Link to="/seller" style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>View All →</Link>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {listings.slice(0, 4).map(car => (
                <div key={car._id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ height: 120, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {car.images?.[0]?.url || car.image
                      ? <img src={car.images?.[0]?.url || car.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      : <span style={{ fontSize: 32 }}>🚗</span>
                    }
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', marginBottom: 4 }}>{car.title || `${car.brand || ''} ${car.model || ''}`}</div>
                    <div style={{ fontFamily: 'var(--font-display)', color: 'var(--gold-light)', fontWeight: 700, fontSize: '0.95rem' }}>KES {(car.price || 0).toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{(car.views || 0).toLocaleString()} views · {car.inquiries || 0} inquiries</div>
                  </div>
                </div>
              ))}
            </div>
          </EnterpriseCard>
        )}

        {listings.length === 0 && !loading && (
          <EnterpriseCard header="🚗 Your Listings">
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>🚗</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: 700, marginBottom: 8 }}>No Listings Yet</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginBottom: 20 }}>Start selling by listing your first vehicle</div>
              <Link to="/sell" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 10, background: 'var(--gold)', color: '#000', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>List Your First Vehicle</Link>
            </div>
          </EnterpriseCard>
        )}
      </div>
    </div>
  );
}
