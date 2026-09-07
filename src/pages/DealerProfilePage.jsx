import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button, Badge, Card, Avatar, Breadcrumb, MapPlaceholder, StatCard, EmptyState, Skeleton } from '../components/ui';
import CarCard from '../components/CarCard';
import { carsAPI } from '../api/api';

export default function DealerProfilePage() {
  const { id } = useParams();
  const [tab, setTab] = useState('inventory');
  const [sort, setSort] = useState('newest');
  const [inventory, setInventory] = useState([]);
  const [dealer, setDealer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    carsAPI.list({ dealer: id, limit: 50 }).then(d => {
      if (!mounted) return;
      const cars = d.cars || d.data || [];
      setInventory(cars);
      // No dedicated public "dealer profile" endpoint exists yet — the
      // dealer's real info comes from the populated `dealer` field on
      // their own listings, which is the same real data the backend
      // already resolves for car detail pages.
      const dlr = cars[0]?.dealer;
      if (dlr) {
        setDealer(dlr);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }).catch(() => {
      if (mounted) { setNotFound(true); setLoading(false); }
    });
    return () => { mounted = false; };
  }, [id]);

  const sortedInventory = useMemo(() => {
    const arr = [...inventory];
    if (sort === 'price-low') arr.sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (sort === 'price-high') arr.sort((a, b) => (b.price || 0) - (a.price || 0));
    else arr.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return arr;
  }, [inventory, sort]);

  if (loading) {
    return (
      <div className="page">
        <div className="container" style={{ paddingTop: 24 }}>
          <Skeleton height={200} style={{ marginBottom: 24 }} />
          <div className="car-grid">
            {[...Array(4)].map((_, i) => <Skeleton key={i} height={220} />)}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !dealer) {
    return (
      <div className="page">
        <div className="container" style={{ paddingTop: 24 }}>
          <EmptyState icon="🏪" title="Dealer not found" desc="This dealer profile doesn't exist or has no active listings yet."
            action={() => window.history.back()} actionLabel="Go Back" />
        </div>
      </div>
    );
  }

  const displayName = dealer.businessName || dealer.name || 'Dealer';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const phoneDigits = (dealer.phone || '').replace(/[^\d+]/g, '');

  return (
    <div className="page">
      {/* Breadcrumb */}
      <div className="container" style={{ paddingTop: 20 }}>
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Dealers', href: '/browse' },
          { label: displayName },
        ]} />
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 48 }}>
        {/* ── Dealer Header Card ── */}
        <Card style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
          <div style={{
            height: 120,
            background: 'linear-gradient(135deg, var(--bg-elevated), var(--surface))',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at 30% 50%, rgba(37,99,235,0.08), transparent 70%)',
            }} />
          </div>
          <div style={{ padding: '0 24px 24px', marginTop: -48 }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <Avatar size="xl" variant="gold" initials={initials}
                className="avatar-ring" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 200, paddingBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '1.4rem' }}>{displayName}</h1>
                  {dealer.verified && <Badge variant="verified" icon="✓">Verified Dealer</Badge>}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)', marginTop: 6, flexWrap: 'wrap' }}>
                  {dealer.location && <span>📍 {dealer.location}</span>}
                  {dealer.rating && <span>★ {dealer.rating}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, paddingBottom: 4 }}>
                {phoneDigits && (
                  <Button variant="outline" icon="📞" onClick={() => window.open(`tel:${phoneDigits}`)}>Call</Button>
                )}
                {phoneDigits && (
                  <Button variant="primary" icon="📱" onClick={() => window.open(`https://wa.me/${phoneDigits.replace('+', '')}`, '_blank')}>WhatsApp</Button>
                )}
              </div>
            </div>

            {dealer.bio && (
              <p style={{ marginTop: 20, fontSize: 14, color: 'var(--text-muted)', maxWidth: 600, lineHeight: 1.6 }}>
                {dealer.bio}
              </p>
            )}

            <div className="stats-grid" style={{ marginTop: 24 }}>
              <StatCard icon="🚗" iconVariant="gold" label="Active Listings" value={inventory.length} />
              {dealer.rating != null && <StatCard icon="⭐" iconVariant="gold" label="Rating" value={dealer.rating} />}
            </div>
          </div>
        </Card>

        {/* ── Tabs ── */}
        <div className="ui-tabbar" style={{ marginBottom: 24 }}>
          <button className={`ui-tabbar__item ${tab === 'inventory' ? 'ui-tabbar__item--active' : ''}`} onClick={() => setTab('inventory')}>
            🚗 Inventory ({inventory.length})
          </button>
          <button className={`ui-tabbar__item ${tab === 'about' ? 'ui-tabbar__item--active' : ''}`} onClick={() => setTab('about')}>
            🏪 About
          </button>
        </div>

        {/* ── Inventory Tab ── */}
        {tab === 'inventory' && (
          <div>
            {inventory.length === 0 ? (
              <EmptyState icon="🚗" title="No active listings" desc="This dealer doesn't have any vehicles listed right now." />
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{inventory.length} vehicles available</span>
                  <select value={sort} onChange={e => setSort(e.target.value)} className="ui-input" style={{ width: 'auto', padding: '6px 12px' }} aria-label="Sort">
                    <option value="newest">Newest First</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                </div>
                <div className="car-grid">
                  {sortedInventory.map(car => <CarCard key={car.id || car._id} car={car} />)}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── About Tab ── */}
        {tab === 'about' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'start' }}>
            <Card>
              <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>📍 Location & Contact</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
                {dealer.location && <div><span style={{ color: 'var(--text-muted)' }}>Address:</span> {dealer.location}</div>}
                {dealer.phone && <div><span style={{ color: 'var(--text-muted)' }}>Phone:</span> {dealer.phone}</div>}
                {dealer.email && <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> {dealer.email}</div>}
              </div>
              {dealer.location && (
                <div style={{ marginTop: 16 }}>
                  <MapPlaceholder label={dealer.location} pin="📍" height={180} />
                </div>
              )}
            </Card>

            <Card>
              <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>ℹ About This Dealer</h3>
              {dealer.bio ? (
                <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>{dealer.bio}</p>
              ) : (
                <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 16 }}>This dealer hasn't added a bio yet.</p>
              )}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <Link to={`/register?role=dealer&redirect=${encodeURIComponent(window.location.pathname)}`}>
                  <Button variant="outline" size="sm" full icon="🏪">Become a Dealer Like This</Button>
                </Link>
              </div>
            </Card>

            <Card>
              <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>💬 Contact This Dealer</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Reach out directly — no in-app messaging system connects to this dealer yet, so calling or WhatsApp gets the fastest response.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {phoneDigits ? (
                  <>
                    <Button variant="primary" icon="📞" full onClick={() => window.open(`tel:${phoneDigits}`)}>Call {dealer.phone}</Button>
                    <Button variant="outline" icon="📱" full onClick={() => window.open(`https://wa.me/${phoneDigits.replace('+', '')}`, '_blank')}>Message on WhatsApp</Button>
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>No contact number available for this dealer yet.</p>
                )}
                {dealer.email && (
                  <Button variant="outline" icon="✉️" full onClick={() => window.open(`mailto:${dealer.email}`)}>Email</Button>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
