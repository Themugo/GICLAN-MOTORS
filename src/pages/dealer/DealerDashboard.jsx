import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dealerAPI, carsAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  Plus, Eye, MessageSquare, DollarSign, TrendingUp, TrendingDown,
  Car, Users, Star, Settings, BarChart3, Bell, Zap, ArrowUp, ChevronRight
} from 'lucide-react';
import { DealerHub, DealerMetric, DealerAction, DealerFunnel, DealerLeadsTable, DealerInventoryCard } from '../../components/features/dealer';
import '../../styles/dealer.css';

export default function DealerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [summary, setSummary] = useState(null);
  const [cars, setCars] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [s, c, analytics] = await Promise.all([
        dealerAPI.summary().catch(() => null),
        dealerAPI.cars().catch(() => ({ cars: [], data: [] })),
        dealerAPI.analytics().catch(() => null),
      ]);
      setSummary(s);
      setCars(c.cars || c.data || []);
      // Set leads from analytics if available
      if (analytics?.leads) {
        setLeads(analytics.leads.slice(0, 5));
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadDashboard(); }, []);

  const handleDelete = async (carId) => {
    if (!confirm('Delete this listing?')) return;
    try {
      await carsAPI.remove(carId);
      setCars(prev => prev.filter(c => c._id !== carId));
      toast.success('Listing deleted');
    } catch { toast.error('Failed to delete'); }
  };

  // Pending approval state
  if (!user?.approved && user?.role === 'dealer') {
    return (
      <DealerHub>
        <div style={{ 
          maxWidth: 600, 
          margin: '80px auto', 
          textAlign: 'center',
          padding: 40,
          background: 'var(--dealer-surface)',
          borderRadius: 'var(--dealer-radius-xl)',
          border: '1px solid var(--dealer-border)',
        }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>⏳</div>
          <h2 style={{ marginBottom: 12, color: 'var(--dealer-text)' }}>Awaiting Admin Approval</h2>
          <p style={{ color: 'var(--dealer-text-muted)', marginBottom: 24 }}>
            Your dealer account is pending approval. We'll notify you once approved.
          </p>
          <p style={{ color: 'var(--dealer-text-dim)', fontSize: 13 }}>
            Need help? <Link to="/support" style={{ color: 'var(--dealer-gold)' }}>Contact support</Link>
          </p>
        </div>
      </DealerHub>
    );
  }

  // Use real data from API, with loading state
  const stats = summary || {};
  const totalViews = stats.totalViews || 0;
  const totalInquiries = stats.totalInquiries || 0;
  const totalRevenue = stats.totalRevenue || 0;
  const activeListings = stats.activeListings || cars.length;
  const pendingEscrows = stats.pendingEscrows || 0;
  const avgRating = stats.avgRating || 0;
  const responseRate = stats.responseRate || 0;
  const conversionRate = stats.conversionRate || 0;
  const totalBids = stats.totalBids || 0;

  // Funnel stages from API or defaults
  const funnelStages = summary?.funnel || [
    { type: 'new', label: 'New Leads', count: 0 },
    { type: 'contacted', label: 'Contacted', count: 0 },
    { type: 'negotiating', label: 'Negotiating', count: 0 },
    { type: 'closed', label: 'Closed Won', count: 0 },
  ];

  // Format currency for display
  const formatCurrency = (amount) => {
    if (amount >= 1000000) return `KES ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `KES ${(amount / 1000).toFixed(0)}K`;
    return `KES ${amount}`;
  };

  return (
    <DealerHub user={user}>
      {/* Welcome Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 32,
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <h1 style={{ 
            fontSize: 'var(--dealer-text-2xl)', 
            fontWeight: 800, 
            color: 'var(--dealer-text)',
            margin: 0,
          }}>
            Welcome back, {user?.businessName || user?.name || 'Dealer'} 👋
          </h1>
          <p style={{ 
            color: 'var(--dealer-text-muted)', 
            margin: '8px 0 0',
            fontSize: 'var(--dealer-text-sm)',
          }}>
            {activeListings} active listings · {totalViews.toLocaleString()} total views this month
          </p>
        </div>
        <Link to="/dealer/add-car" className="dealer-btn dealer-btn--primary">
          <Plus size={18} />
          Add Listing
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="dealer-metrics">
        <DealerMetric
          icon="👁️"
          label="Total Views"
          value={loading ? '...' : totalViews.toLocaleString()}
          trend={stats.viewsTrend}
          accent="views"
        />
        <DealerMetric
          icon="💬"
          label="Inquiries"
          value={loading ? '...' : totalInquiries.toString()}
          trend={stats.inquiriesTrend}
          accent="leads"
        />
        <DealerMetric
          icon="🎯"
          label="Conversion Rate"
          value={loading ? '...' : `${conversionRate}%`}
          trend={stats.conversionTrend}
          accent="sales"
        />
        <DealerMetric
          icon="⭐"
          label="Avg Rating"
          value={loading ? '...' : `${avgRating}/5`}
          accent="rating"
        />
        <DealerMetric
          icon="💰"
          label="Total Revenue"
          value={loading ? '...' : formatCurrency(totalRevenue)}
          trend={stats.revenueTrend}
          accent="revenue"
          trendLabel="vs last month"
        />
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ 
          fontSize: 'var(--dealer-text-lg)', 
          fontWeight: 700, 
          color: 'var(--dealer-text)',
          marginBottom: 16,
        }}>
          Quick Actions
        </h2>
        <div className="dealer-actions">
          <DealerAction
            icon={<Plus size={24} />}
            label="Add Listing"
            description="Post a new vehicle"
            to="/dealer/add-car"
            variant="gold"
          />
          <DealerAction
            icon={<BarChart3 size={24} />}
            label="Analytics"
            description="View performance"
            to="/dealer/analytics"
          />
          <DealerAction
            icon={<MessageSquare size={24} />}
            label="Inquiries"
            description={`${totalInquiries} total received`}
            to="/dealer/leads"
          />
          <DealerAction
            icon={<DollarSign size={24} />}
            label="Earnings"
            description="View transactions"
            to="/dealer/finance"
          />
          <DealerAction
            icon={<Car size={24} />}
            label="Inventory"
            description={`${activeListings} active listings`}
            to="/dealer/inventory"
          />
          <DealerAction
            icon={<Settings size={24} />}
            label="Settings"
            description="Manage account"
            to="/dealer/settings"
          />
        </div>
      </div>

      {/* Lead Funnel */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ 
          fontSize: 'var(--dealer-text-lg)', 
          fontWeight: 700, 
          color: 'var(--dealer-text)',
          marginBottom: 16,
        }}>
          Sales Pipeline
        </h2>
        <DealerFunnel stages={funnelStages} />
      </div>

      {/* Two Column Layout */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: 24,
        marginBottom: 32,
      }}>
        {/* Recent Leads */}
        <DealerLeadsTable 
          leads={leads.length > 0 ? leads : (loading ? [] : [])}
          loading={loading}
          onView={(lead) => toast.info(`Viewing lead: ${lead.name}`)}
          onContact={(lead) => toast.info(`Contacting: ${lead.name}`)}
          onConvert={(lead) => toast.success(`Converting: ${lead.name}`)}
        />

        {/* Top Performing */}
        <div className="dealer-chart">
          <div className="dealer-chart__header">
            <h3 className="dealer-chart__title">Top Performers</h3>
            <span className="dealer-chart__period">This Month</span>
          </div>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--dealer-text-muted)' }}>
              Loading...
            </div>
          ) : cars.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cars.slice(0, 4).map((car) => (
                <div key={car._id || car.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  background: 'var(--dealer-elevated)',
                  borderRadius: 'var(--dealer-radius-md)',
                }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--dealer-radius-sm)',
                    background: 'var(--dealer-card)',
                    overflow: 'hidden',
                  }}>
                    {car.images?.[0] ? (
                      <img src={car.images[0]} alt={car.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🚗</div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--dealer-text)', fontSize: 13, marginBottom: 2 }}>
                      {car.title || car.name}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--dealer-text-muted)' }}>
                      <span>👁️ {(car.views || 0).toLocaleString()}</span>
                      <span>💬 {car.inquiries || 0}</span>
                    </div>
                  </div>
                  <div style={{ 
                    fontWeight: 700, 
                    color: 'var(--dealer-gold)',
                    fontSize: 13,
                  }}>
                    {formatCurrency(car.price || 0)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--dealer-text-muted)' }}>
              No cars yet. <Link to="/dealer/add-car" style={{ color: 'var(--dealer-gold)' }}>Add your first listing</Link>
            </div>
          )}
        </div>
      </div>

      {/* Featured Inventory */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <h2 style={{ 
            fontSize: 'var(--dealer-text-lg)', 
            fontWeight: 700, 
            color: 'var(--dealer-text)',
            margin: 0,
          }}>
            Featured Inventory
          </h2>
          <Link to="/dealer/inventory" className="dealer-btn dealer-btn--ghost dealer-btn--sm">
            View All <ChevronRight size={14} />
          </Link>
        </div>
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--dealer-text-muted)' }}>
            Loading inventory...
          </div>
        ) : cars.length > 0 ? (
          <div className="dealer-inventory">
            {cars.map((car) => (
              <DealerInventoryCard
                key={car._id || car.id}
                car={{
                  id: car._id || car.id,
                  title: car.title || car.name,
                  price: car.price,
                  status: car.status,
                  views: car.views,
                  inquiries: car.inquiries,
                  days: car.daysOnMarket,
                  featured: car.featured,
                  image: car.images?.[0],
                }}
                onEdit={() => toast.info(`Edit: ${car.title}`)}
                onPromote={() => toast.success(`Promoting: ${car.title}`)}
                onDelete={() => handleDelete(car._id || car.id)}
              />
            ))}
          </div>
        ) : (
          <div style={{ padding: 32, textAlign: 'center', background: 'var(--dealer-surface)', borderRadius: 'var(--dealer-radius-lg)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚗</div>
            <h3 style={{ marginBottom: 8, color: 'var(--dealer-text)' }}>No listings yet</h3>
            <p style={{ color: 'var(--dealer-text-muted)', marginBottom: 16 }}>
              Start selling by adding your first vehicle listing
            </p>
            <Link to="/dealer/add-car" className="dealer-btn dealer-btn--primary">
              <Plus size={16} /> Add Your First Listing
            </Link>
          </div>
        )}
      </div>

      {/* AI Insights - Only show when we have real data */}
      {!loading && summary && (
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(168, 85, 247, 0.05))',
          border: '1px solid var(--dealer-border-gold)',
          borderRadius: 'var(--dealer-radius-xl)',
          padding: 24,
          marginBottom: 32,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--dealer-radius-md)',
              background: 'linear-gradient(135deg, var(--dealer-gold), var(--dealer-gold-dark))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}>
              🤖
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--dealer-text-lg)', fontWeight: 700, color: 'var(--dealer-text)' }}>
                AI Dealer Insights
              </h3>
              <p style={{ margin: 0, fontSize: 'var(--dealer-text-xs)', color: 'var(--dealer-text-muted)' }}>
                Powered by KAYAD Analytics
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {(summary.insights || []).slice(0, 3).map((insight, i) => (
              <div key={i} style={{
                padding: 16,
                background: 'var(--dealer-surface)',
                borderRadius: 'var(--dealer-radius-md)',
                border: '1px solid var(--dealer-border)',
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{insight.icon || '💡'}</div>
                <div style={{ fontWeight: 600, color: 'var(--dealer-text)', fontSize: 13, marginBottom: 4 }}>
                  {insight.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--dealer-text-muted)', lineHeight: 1.4 }}>
                  {insight.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DealerHub>
  );
}
