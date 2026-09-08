import '../styles/dashboard.css';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { favoritesAPI, escrowAPI, paymentsAPI, carsAPI, chatAPI, bidsAPI, savedSearchAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { EnterpriseCard, EnterpriseKPI, EnterpriseTimeline, EnterpriseQuickActions, EnterpriseTable, EnterpriseMetricRow, DashboardHeader } from '../components/enterprise/EnterpriseDashboard';

export default function BuyerDashboard() {
  const { user, isDealer, isAdmin } = useAuth();
  const { connected } = useSocket();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [escrows, setEscrows] = useState([]);
  const [payments, setPayments] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [chats, setChats] = useState([]);
  const [trending, setTrending] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);

  useEffect(() => {
    if (isDealer) { navigate('/dealer', { replace: true }); return; }
    if (isAdmin) { navigate('/admin', { replace: true }); return; }
  }, [isDealer, isAdmin, navigate]);

  useEffect(() => {
    let hadError = false;
    const withFallback = (p, fallback) => p.catch(() => { hadError = true; return fallback; });
    Promise.all([
      withFallback(favoritesAPI.list(), { favorites: [] }),
      withFallback(escrowAPI.mine(), { escrows: [] }),
      withFallback(paymentsAPI.myPayments(), { payments: [] }),
      withFallback(chatAPI.inbox(), { chats: [] }),
    ]).then(([fav, esc, pay, chatRes]) => {
      setFavorites(fav.favorites || []);
      setEscrows(esc.escrows || []);
      setPayments(pay.payments || []);
      setChats(chatRes.chats || []);
      if (hadError) toast('Some data failed to load', 'warning');
    }).finally(() => setLoading(false));
  }, [toast]);

  // Load recently viewed cars for personalization
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('kayad_recently_viewed') || '[]');
      setRecentlyViewed(stored.slice(0, 10));
    } catch {
      setRecentlyViewed([]);
    }
  }, []);

  // Generate personalized recommendations based on browsing history
  useEffect(() => {
    const generateRecommendations = async () => {
      try {
        // Get user's preferred brands from recently viewed and favorites
        const preferredBrands = {};
        [...recentlyViewed, ...favorites].forEach(car => {
          if (car.brand) {
            preferredBrands[car.brand] = (preferredBrands[car.brand] || 0) + 1;
          }
        });

        // Sort brands by preference
        const sortedBrands = Object.entries(preferredBrands)
          .sort((a, b) => b[1] - a[1])
          .map(([brand]) => brand)
          .slice(0, 3);

        if (sortedBrands.length > 0) {
          // Fetch cars matching preferred brands
          const recs = [];
          for (const brand of sortedBrands) {
            const data = await carsAPI.list({ brand, limit: 4 });
            if (data.cars) {
              recs.push(...data.cars.filter(c =>
                !favorites.some(f => f._id === c._id) &&
                !recentlyViewed.some(r => r.id === c.id)
              ));
            }
          }
          setRecommendations(recs.slice(0, 6));
        }
      } catch {
        setRecommendations([]);
      }
    };

    if (favorites.length > 0 || recentlyViewed.length > 0) {
      generateRecommendations();
    }
  }, [favorites, recentlyViewed]);

  useEffect(() => {
    carsAPI.list({ sort: 'views', limit: 6 })
      .then(data => setTrending(data.cars || []))
      .catch(() => setTrending([]))
      .finally(() => setTrendingLoading(false));
  }, []);

  useEffect(() => {
    const tryFetchBids = async () => {
      try {
        const data = await bidsAPI.myBids();
        if (data) setMyBids(data.bids || data.data || data || []);
      } catch {}
    };
    tryFetchBids();
  }, []);

  // Saved searches are server-authoritative for authenticated buyers.
  useEffect(() => {
    let cancelled = false;
    savedSearchAPI.list()
      .then((data) => {
        if (!cancelled) setSavedSearches(data.searches || []);
      })
      .catch(() => {
        if (!cancelled) setSavedSearches([]);
      });
    return () => { cancelled = true; };
  }, []);

  const handleDeleteSavedSearch = async (search) => {
    const id = search?._id || search?.id;
    if (!id) { toast('Saved search cannot be removed because its server ID is unavailable', 'error'); return; }
    try {
      await savedSearchAPI.remove(id);
      setSavedSearches(prev => prev.filter(item => (item._id || item.id) !== id));
      toast('Saved search removed', 'info');
    } catch {
      toast('Failed to remove saved search', 'error');
    }
  };

  const handleRunSavedSearch = (search) => {
    const params = new URLSearchParams();
    const filters = search.filters && typeof search.filters === 'object' ? search.filters : search;
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).length > 0 && value !== 'All') {
        params.set(key, String(value));
      }
    });
    navigate(`/browse?${params.toString()}`);
  };

  if (isDealer || isAdmin) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const totalSpent = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const activeEscrows = escrows.filter(e => e.status === 'pending' || e.status === 'active').length;
  const wonAuctions = myBids.filter(b => b.status === 'won').length;

  return (
    <div className="page dashboard-page">
      <DashboardHeader badge="Buyer Dashboard" greeting={greeting} name={user?.name?.split(' ')[0] || 'Buyer'}
        subtitle="Browse, bid, and buy with escrow protection"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#22c55e' : '#ef4444', display: 'inline-block' }} />
            <span style={{ fontSize: 9, color: connected ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)', fontWeight: 600 }}>{connected ? 'Connected' : 'Offline'}</span>
          </div>
        }
      />

      <div className="dash-body">
        {loading ? (
          <div className="dash-loading-center"><div className="spinner" /></div>
        ) : (
          <>
            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 28 }}>
              <EnterpriseKPI icon="💰" label="Total Spent" value={`KES ${totalSpent.toLocaleString()}`} accent="var(--gold)" />
              <EnterpriseKPI icon="🛡️" label="Active Escrows" value={activeEscrows} accent="#22c55e" />
              <EnterpriseKPI icon="⚡" label="Won Auctions" value={wonAuctions} accent="#3b82f6" />
              <EnterpriseKPI icon="❤️" label="Saved Vehicles" value={favorites.length} accent="var(--gold)" />
              <EnterpriseKPI icon="💬" label="Messages" value={chats.length} accent="#8b5cf6" />
            </div>

            {/* Quick Actions */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Quick Actions</div>
              <EnterpriseQuickActions actions={[
                { to: '/browse', icon: '🚗', label: 'Browse Showroom', desc: 'Explore all vehicles' },
                { to: '/auctions', icon: '⚡', label: 'Live Auctions', desc: 'Bid in real-time' },
                { to: '/favorites', icon: '❤️', label: 'My Favorites', desc: 'Saved vehicles' },
                { to: '/inspection', icon: '🔍', label: 'Book Inspection', desc: 'Pre-purchase vehicle check' },
              ]} />
            </div>

            {/* Personalized Recommendations */}
            {recommendations.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>For You</div>
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Based on Your Browsing</h3>
                  </div>
                  <Link to="/browse" style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>See All →</Link>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                  {recommendations.slice(0, 4).map(car => (
                    <Link key={car._id} to={`/cars/${car._id}`} style={{
                      display: 'block',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      overflow: 'hidden',
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-muted)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                    >
                      <div style={{ height: 130, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {car.images?.[0]?.url || car.image
                          ? <img src={car.images?.[0]?.url || car.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                          : <span style={{ fontSize: 32 }}>🚗</span>
                        }
                      </div>
                      <div style={{ padding: 14 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{car.title || car.name || 'Vehicle'}</div>
                        <div style={{ color: 'var(--gold-light)', fontWeight: 700, fontSize: '0.95rem' }}>
                          KES {(car.price || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                          {car.year} · {car.mileage ? `${car.mileage.toLocaleString()} km` : ''}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Recently Viewed */}
            {recentlyViewed.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>History</div>
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Recently Viewed</h3>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                  {recentlyViewed.slice(0, 6).map(car => (
                    <Link key={car.id} to={`/cars/${car.id}`} style={{
                      flexShrink: 0,
                      width: 160,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      overflow: 'hidden',
                      textDecoration: 'none',
                    }}>
                      <div style={{ height: 100, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {car.image
                          ? <img src={car.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                          : <span style={{ fontSize: 24 }}>🚗</span>
                        }
                      </div>
                      <div style={{ padding: 10 }}>
                        <div style={{ fontWeight: 600, fontSize: 11, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{car.title}</div>
                        <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 12, marginTop: 2 }}>KES {(car.price || 0).toLocaleString()}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 24, marginBottom: 28 }}>
              {/* Trending Vehicles */}
              <EnterpriseCard header="🔥 Trending Vehicles">
                {trendingLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><div className="spinner" /></div>
                ) : trending.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                    {trending.slice(0, 4).map(car => (
                      <Link key={car._id} to={`/cars/${car._id}`} style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', textDecoration: 'none', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(37, 99, 235,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}>
                        <div style={{ width: 80, height: 56, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                          <img src={car.images?.[0] || car.coverImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: 12, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{car.title}</div>
                          <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>KES {(car.price || 0).toLocaleString()}</div>
                          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>👁 {(car.views || 0).toLocaleString()} views</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No trending vehicles</div>
                )}
              </EnterpriseCard>

              {/* At a Glance */}
              <EnterpriseCard header="📊 At a Glance">
                <EnterpriseMetricRow items={[
                  { icon: '💬', value: chats.length, label: 'Messages' },
                  { icon: '🔍', value: savedSearches.length, label: 'Saved Searches' },
                  { icon: '❤️', value: favorites.length, label: 'Favorites' },
                  { icon: '⚡', value: myBids.length, label: 'Active Bids' },
                ]} />
                <div style={{ marginTop: 20 }}>
                  <EnterpriseTimeline items={[
                    { title: `${wonAuctions} auction${wonAuctions !== 1 ? 's' : ''} won`, description: 'Congratulations on your successful bids!', color: '#22c55e' },
                    { title: `${activeEscrows} escrow${activeEscrows !== 1 ? 's' : ''} active`, description: 'Payments currently protected', color: '#3b82f6' },
                    { title: `${favorites.length} saved vehicle${favorites.length !== 1 ? 's' : ''}`, description: 'Ready to compare and buy', color: 'var(--gold)' },
                    { title: `${chats.length} active conversation${chats.length !== 1 ? 's' : ''}`, description: 'Chat with dealers and sellers', color: '#8b5cf6' },
                  ]} />
                </div>
              </EnterpriseCard>
            </div>

            {/* Saved Searches Section */}
            {savedSearches.length > 0 && (
              <EnterpriseCard header="🔔 Saved Searches" action={<Link to="/browse" style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>Browse All →</Link>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {savedSearches.slice(0, 5).map((search) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: 10,
                      gap: 12,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {search.name || search.search || `${search.filters?.brand || 'All brands'} ${search.filters?.bodyType || ''}`.trim()}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {search.filters?.brand && search.filters.brand !== 'All' && (
                            <span style={{ fontSize: 11, color: 'var(--gold)', background: 'rgba(37, 99, 235,0.1)', padding: '2px 6px', borderRadius: 4 }}>{search.filters.brand}</span>
                          )}
                          {search.filters?.bodyType && search.filters.bodyType !== 'All' && (
                            <span style={{ fontSize: 11, color: 'var(--gold)', background: 'rgba(37, 99, 235,0.1)', padding: '2px 6px', borderRadius: 4 }}>{search.filters.bodyType}</span>
                          )}
                          {search.filters?.priceMax && (
                            <span style={{ fontSize: 11, color: 'var(--gold)', background: 'rgba(37, 99, 235,0.1)', padding: '2px 6px', borderRadius: 4 }}>Under KES {(Number(search.filters.priceMax) / 1000000).toFixed(0)}M</span>
                          )}
                          {search.filters?.fuel && search.filters.fuel !== 'All' && (
                            <span style={{ fontSize: 11, color: 'var(--gold)', background: 'rgba(37, 99, 235,0.1)', padding: '2px 6px', borderRadius: 4 }}>{search.filters.fuel}</span>
                          )}
                          {search.filters?.transmission && search.filters.transmission !== 'All' && (
                            <span style={{ fontSize: 11, color: 'var(--gold)', background: 'rgba(37, 99, 235,0.1)', padding: '2px 6px', borderRadius: 4 }}>{search.filters.transmission}</span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => handleRunSavedSearch(search)}
                          style={{
                            padding: '6px 12px',
                            background: 'var(--gold)',
                            border: 'none',
                            borderRadius: 6,
                            color: '#0A1628',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Run
                        </button>
                        <button
                          onClick={() => handleDeleteSavedSearch(search)}
                          style={{
                            padding: '6px 8px',
                            background: 'transparent',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: 6,
                            color: '#ef4444',
                            fontSize: 14,
                            cursor: 'pointer',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {savedSearches.length > 5 && (
                  <div style={{ textAlign: 'center', marginTop: 12 }}>
                    <Link to="/browse" style={{ color: 'var(--gold)', fontSize: 12, textDecoration: 'none' }}>
                      View all {savedSearches.length} saved searches →
                    </Link>
                  </div>
                )}
              </EnterpriseCard>
            )}

            {savedSearches.length === 0 && !loading && (
              <EnterpriseCard header="🔔 Saved Searches">
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>🔔</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 16 }}>Save your search criteria to get notified when matching vehicles are listed</div>
                  <Link to="/browse" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 10, background: 'var(--gold)', color: '#000', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>Browse Vehicles</Link>
                </div>
              </EnterpriseCard>
            )}

            {/* Favorites Section */}
            {favorites.length > 0 && (
              <EnterpriseCard header="❤️ Your Favorites" action={<Link to="/favorites" style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>View All →</Link>}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                  {favorites.slice(0, 4).map(car => (
                    <div key={car._id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ height: 120, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {car.images?.[0]?.url || car.image
                          ? <img src={car.images?.[0]?.url || car.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                          : <span style={{ fontSize: 32 }}>🚗</span>
                        }
                      </div>
                      <div style={{ padding: 14 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', marginBottom: 4 }}>{car.title || car.name || 'Vehicle'}</div>
                        <div style={{ fontFamily: 'var(--font-display)', color: 'var(--gold-light)', fontWeight: 700, fontSize: '0.95rem' }}>
                          KES {(car.price || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </EnterpriseCard>
            )}

            {favorites.length === 0 && !loading && (
              <EnterpriseCard header="❤️ Favorites">
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>❤️</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 16 }}>Save vehicles to your favorites to track them here</div>
                  <Link to="/browse" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 10, background: 'var(--gold)', color: '#000', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>Browse Vehicles</Link>
                </div>
              </EnterpriseCard>
            )}
          </>
        )}
      </div>
    </div>
  );
}
