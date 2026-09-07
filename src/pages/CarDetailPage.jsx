import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { carsAPI } from '../api/api';
import { Button, Badge, PriceTag, Breadcrumb, Card, MapPlaceholder, Avatar, Progress, EmptyState } from '../components/ui';
import CarCard from '../components/CarCard';
import OptimizedImg from '../components/OptimizedImg';
import { formatKES } from '../api/api';
import { useAbortController } from '../hooks/useAbortController';

const TABS = [
  { id: 'specs',     label: 'Specifications', icon: '📋' },
  { id: 'features',  label: 'Features',       icon: '✨' },
  { id: 'inspection',label: 'Inspection',     icon: '🔍' },
  { id: 'history',   label: 'History',        icon: '📜' },
  { id: 'dealer',    label: 'Dealer',         icon: '🏪' },
];

const inspectionItems = [
  { label: 'Engine', score: 95 }, { label: 'Transmission', score: 90 },
  { label: 'Body & Paint', score: 85 }, { label: 'Interior', score: 92 },
  { label: 'Tyres & Brakes', score: 80 }, { label: 'Electrical', score: 88 },
];

const specRows = (car) => [
  ['Make', car.brand], ['Model', car.model || '—'], ['Year', car.year],
  ['Fuel Type', car.fuel], ['Transmission', car.transmission], ['Body Type', car.body_type || car.bodyType],
  ['Mileage', typeof car.mileage === 'number' ? `${car.mileage.toLocaleString()} km` : car.mileage || '—'],
  ['Color', car.color || '—'], ['Engine', car.engine || '—'],
  ['Drivetrain', car.drivetrain || '—'], ['Condition', car.condition || 'Used'],
];

const trustFeatures = [
  { icon: '🔒', label: 'Escrow Protected' },
  { icon: '🔍', label: 'Inspection Available' },
  { icon: '✓', label: 'Verified Dealer' },
];

function RecentlyViewed() {
  const [recent, setRecent] = useState([]);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('kayad_recently_viewed') || '[]');
      setRecent(stored);
    } catch {}
  }, []);
  if (recent.length === 0) return null;
  return (
    <div style={{ marginTop: 32 }}>
      <h3 style={{ marginBottom: 16, fontSize: '1.1rem' }}>🕐 Recently Viewed</h3>
      <div className="car-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {recent.slice(0, 4).map(c => <CarCard key={c.id} car={c} />)}
      </div>
    </div>
  );
}

export default function CarDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const getSignal = useAbortController();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [tab, setTab] = useState('specs');
  const [financing, setFinancing] = useState({ downPayment: 20, months: 60 });
  const [showInquiry, setShowInquiry] = useState(false);
  const [fav, setFav] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const fetchCar = useCallback(() => {
    let mounted = true;
    setLoading(true);
    setLoadError(false);
    carsAPI.get(id).then(d => {
      if (mounted) {
        setCar(d.car || d.data);
        setLoading(false);
      }
    }).catch(() => {
      // A vehicle detail page showing the WRONG car with no
      // indication is actively harmful in a marketplace with real
      // money and escrow — a slow or failed fetch must show a real
      // error, never silently substitute an unrelated vehicle.
      if (mounted) {
        setCar(null);
        setLoadError(true);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    return fetchCar();
  }, [fetchCar]);

  useEffect(() => {
    if (!car) return;
    try {
      const viewed = JSON.parse(localStorage.getItem('kayad_recently_viewed') || '[]');
      const filtered = viewed.filter(v => v.id !== car.id);
      filtered.unshift({ id: car.id, title: car.title, image: car.image || car.images?.[0]?.url || car.images?.[0], price: car.price, year: car.year, viewedAt: new Date().toISOString() });
      localStorage.setItem('kayad_recently_viewed', JSON.stringify(filtered.slice(0, 8)));
    } catch {}
  }, [car]);

  const images = useMemo(() => {
    if (!car) return [];
    const imgs = car.images?.map(img => typeof img === 'string' ? img : img.url).filter(Boolean) || [];
    return imgs.length > 0 ? imgs : [car.image].filter(Boolean);
  }, [car]);

  const monthlyPayment = useMemo(() => {
    if (!car) return 0;
    const principal = car.price * (1 - financing.downPayment / 100);
    const rate = 0.14 / 12;
    const n = financing.months;
    return Math.round(principal * rate * Math.pow(1 + rate, n) / (Math.pow(1 + rate, n) - 1));
  }, [car, financing]);

  const [relatedCars, setRelatedCars] = useState([]);
  useEffect(() => {
    if (!car) { setRelatedCars([]); return; }
    let mounted = true;
    carsAPI.list({ brand: car.brand, limit: 5 }).then(d => {
      if (!mounted) return;
      const cars = (d.cars || d.data || []).filter(c => (c.id || c._id) !== (car.id || car._id));
      setRelatedCars(cars.slice(0, 4));
    }).catch(() => { if (mounted) setRelatedCars([]); });
    return () => { mounted = false; };
  }, [car]);

  const viewingHistory = useMemo(() => {
    if (!car) return null;
    try {
      const stored = JSON.parse(localStorage.getItem('kayad_recently_viewed') || '[]');
      const entry = stored.find(v => v.id === car.id);
      if (!entry || !entry.viewedAt) return null;
      const viewedDate = new Date(entry.viewedAt);
      const now = new Date();
      const diffDays = Math.floor((now - viewedDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Viewed today';
      if (diffDays === 1) return 'Viewed yesterday';
      if (diffDays < 7) return `Viewed ${diffDays} days ago`;
      if (diffDays < 30) return `Viewed ${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
      return `Viewed ${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
    } catch {
      return null;
    }
  }, [car]);

  const setActiveImgSafe = useCallback((dir) => {
    setActiveImg(p => dir === 'prev'
      ? (p - 1 + images.length) % images.length
      : (p + 1) % images.length);
  }, [images.length]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: car?.title || 'Vehicle',
      text: `Check out this ${car?.year || ''} ${car?.title || 'vehicle'} on KAYAD — KES ${(car?.price || 0).toLocaleString()}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
    setShowShareMenu(true);
  }, [car]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      setShowShareMenu(false);
    } catch {}
  }, []);

  const handleWhatsAppShare = useCallback(() => {
    const text = encodeURIComponent(`Check out this ${car?.year || ''} ${car?.title || 'vehicle'} on KAYAD — KES ${(car?.price || 0).toLocaleString()}\n${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setShowShareMenu(false);
  }, [car]);

  const handleEmailShare = useCallback(() => {
    const subject = encodeURIComponent(`Check out this ${car?.title || 'vehicle'} on KAYAD`);
    const body = encodeURIComponent(`Hi,\n\nI found this vehicle on KAYAD and thought you might be interested:\n\n${car?.title || 'Vehicle'} — KES ${(car?.price || 0).toLocaleString()}\n${window.location.href}\n\nRegards`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    setShowShareMenu(false);
  }, [car]);

  const isAuction = car?.auction_status === 'live' || car?.isAuction;
  const isVerified = car?.is_verified_dealer || car?.isVerified;

  if (loading) {
    return (
      <div className="page">
        <div className="container" style={{ paddingTop: 24 }}>
          <div className="detail-grid">
            <div className="skeleton-card" style={{ height: 400 }} />
            <div className="skeleton-card" style={{ height: 400 }} />
          </div>
        </div>
      </div>
    );
  }

  if (!car && loadError) {
    return (
      <div className="page">
        <div className="container" style={{ paddingTop: 24 }}>
          <EmptyState icon="⚠️" title="Couldn't load this vehicle" desc="Something went wrong reaching our servers. Please try again."
            action={fetchCar} actionLabel="Retry" />
        </div>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="page">
        <div className="container" style={{ paddingTop: 24 }}>
          <EmptyState icon="🚗" title="Vehicle not found" desc="This listing may have been removed or sold."
            action={() => navigate('/browse')} actionLabel="Browse Cars" />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 20, paddingBottom: 0 }}>
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Browse', href: '/browse' },
          { label: car.title },
        ]} />
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 48 }}>
        <div className="detail-grid">
          <div>
            <div style={{ marginBottom: 24 }}>
              <div className="gallery-main" style={{ aspectRatio: '16/10', '--gallery-main-bg': images[activeImg] ? `url(${images[activeImg]})` : 'none' }}>
                <OptimizedImg src={images[activeImg]} alt={car.title} className="gallery-main-img" cloudinaryTransform="q_auto,f_auto,w_1200" />
                <div className="gallery-badges">
                  {isAuction && <Badge variant="live">Live Auction</Badge>}
                  {isVerified && <Badge variant="verified" icon="✓">Verified</Badge>}
                  {car.is_promoted && <Badge variant="premium" icon="★">Featured</Badge>}
                </div>
                <div className="gallery-actions">
                  <Button variant="secondary" size="sm" icon="🔄">360° View</Button>
                </div>
                {images.length > 1 && (
                  <>
                    <button className="gallery-nav gallery-nav--prev" onClick={() => setActiveImgSafe('prev')} aria-label="Previous">‹</button>
                    <button className="gallery-nav gallery-nav--next" onClick={() => setActiveImgSafe('next')} aria-label="Next">›</button>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="gallery-thumbs">
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setActiveImg(i)}
                      className={`gallery-thumb${i === activeImg ? ' gallery-thumb--active' : ''}`}>
                      <OptimizedImg src={img} alt={`View ${i + 1}`} cloudinaryTransform="q_auto,f_auto,w_150,h_100" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>{car.title}</h1>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span>📍 {car.location?.city || car.location || 'Nairobi'}</span>
                    <span>🗓 {car.year}</span>
                    <span>🛣 {typeof car.mileage === 'number' ? car.mileage.toLocaleString() + ' km' : car.mileage || 'N/A'}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {isAuction && car.currentBid > 0 ? (
                    <>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Bid</div>
                      <PriceTag value={car.currentBid} size="lg" />
                    </>
                  ) : (
                    <PriceTag value={car.price} size="lg" sub={`≈ KES ${Math.round(car.price / 60).toLocaleString()}/mo`} />
                  )}
                </div>
              </div>
              {viewingHistory && (
                <div style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  background: 'rgba(37, 99, 235, 0.08)',
                  border: '1px solid rgba(37, 99, 235, 0.15)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--gold)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span>👁</span>
                  <span>{viewingHistory}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>— We're glad you're back!</span>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 24 }}>
              <div className="ui-tabbar" style={{ marginBottom: 20 }}>
                {TABS.map(t => (
                  <button key={t.id} className={`ui-tabbar__item ${tab === t.id ? 'ui-tabbar__item--active' : ''}`} onClick={() => setTab(t.id)}>
                    <span aria-hidden="true">{t.icon}</span> {t.label}
                  </button>
                ))}
              </div>

              {tab === 'specs' && (
                <Card>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {specRows(car).map(([label, val]) => (
                      <div key={label} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                        <div style={{ fontWeight: 600, marginTop: 2 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {tab === 'features' && (
                <Card>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(car.features || ['Leather Seats', 'Sunroof', 'Reverse Camera', 'Alloy Wheels', 'Climate Control', 'Cruise Control']).map(f => (
                      <Badge key={f} variant="blue" style={{ padding: '6px 14px' }}>✓ {f}</Badge>
                    ))}
                  </div>
                </Card>
              )}

              {tab === 'inspection' && (
                <Card>
                  <div style={{ marginBottom: 16 }}>
                    <Badge variant="green" icon="✓">Inspection Passed</Badge>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {inspectionItems.map(s => (
                      <div key={s.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 13 }}>{s.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: s.score >= 85 ? 'var(--green-400)' : 'var(--orange-400)' }}>
                            {s.score}%
                          </span>
                        </div>
                        <Progress value={s.score} variant={s.score >= 85 ? 'default' : 'error'} />
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {tab === 'history' && (
                <Card>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[
                      { date: 'Jan 2026', event: 'Listed on KAYAD', icon: '📋' },
                      { date: 'Dec 2025', event: 'Inspection completed', icon: '🔍' },
                      { date: 'Sep 2025', event: 'Service at dealer', icon: '🔧' },
                      { date: 'Jan 2021', event: 'First registered in Kenya', icon: '📄' },
                    ].map((h, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-elevated)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
                        }}>{h.icon}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{h.event}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{h.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {tab === 'dealer' && (
                <Card>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
                    <Avatar size="xl" variant="gold" initials="NA" />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ fontSize: '1.1rem' }}>Nairobi Auto Hub Ltd</h3>
                        <Badge variant="verified" icon="✓">Verified</Badge>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                        📍 Industrial Area, Nairobi · ★ 4.7 (42 reviews)
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Operating Hours</div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>Mon–Sat: 8am–6pm</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Response Time</div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>~2 hours</div>
                    </div>
                  </div>
                  <MapPlaceholder label="Dealer Location" pin="📍" height={160} />
                </Card>
              )}
            </div>

            {relatedCars.length > 0 && (
              <div>
                <h3 style={{ marginBottom: 16, fontSize: '1.1rem' }}>Similar Vehicles</h3>
                <div className="car-grid">
                  {relatedCars.map(c => <CarCard key={c.id} car={c} />)}
                </div>
              </div>
            )}

            <RecentlyViewed />
          </div>

          <div className="sticky-panel">
            <Card>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                {isAuction ? (
                  <>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Bid</div>
                    <PriceTag value={car.currentBid || car.price} size="lg" />
                    <Badge variant="orange" style={{ marginTop: 8 }}>{car.totalBids || car.bids_count || 0} bids</Badge>
                  </>
                ) : (
                  <>
                    <PriceTag value={car.price} size="lg" />
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      ≈ KES {Math.round(car.price / 60).toLocaleString()}/month
                    </div>
                  </>
                )}
              </div>

              <div className="inquiry-form">
                {isAuction ? (
                  <Button variant="primary" size="lg" full icon="🔴">Place Bid</Button>
                ) : (
                  <Button variant="primary" size="lg" full icon="💳">Buy Now with Escrow</Button>
                )}
                <Link to={`/inspection?carUrl=${encodeURIComponent(window.location.href)}`}>
                  <Button variant="outline" size="lg" full icon="🔍">Book Inspection — KES 3,500</Button>
                </Link>
                <Button variant="outline" size="lg" full icon="💬" onClick={() => setShowInquiry(true)}>Message Dealer</Button>
                <div className="quick-actions">
                  <Button variant="secondary" icon={fav ? '♥' : '♡'} onClick={() => setFav(!fav)} style={{ flex: 1 }}>
                    {fav ? 'Saved' : 'Save'}
                  </Button>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Button 
                      variant="secondary" 
                      icon={linkCopied ? '✓' : '🔗'} 
                      onClick={handleShare} 
                      style={{ flex: 1, width: '100%' }}
                    >
                      {linkCopied ? 'Copied!' : 'Share'}
                    </Button>
                    {showShareMenu && (
                      <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        right: 0,
                        marginBottom: 8,
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        padding: 8,
                        minWidth: 180,
                        zIndex: 100,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      }}>
                        <button
                          onClick={handleCopyLink}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            width: '100%',
                            padding: '10px 12px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: 6,
                            color: 'var(--text)',
                            fontSize: 13,
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <span style={{ fontSize: 16 }}>🔗</span>
                          <span>Copy Link</span>
                        </button>
                        <button
                          onClick={handleWhatsAppShare}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            width: '100%',
                            padding: '10px 12px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: 6,
                            color: 'var(--text)',
                            fontSize: 13,
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <span style={{ fontSize: 16 }}>💬</span>
                          <span>WhatsApp</span>
                        </button>
                        <button
                          onClick={handleEmailShare}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            width: '100%',
                            padding: '10px 12px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: 6,
                            color: 'var(--text)',
                            fontSize: 13,
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <span style={{ fontSize: 16 }}>📧</span>
                          <span>Email</span>
                        </button>
                        <div style={{
                          borderTop: '1px solid var(--border)',
                          marginTop: 6,
                          paddingTop: 6,
                        }}>
                          <button
                            onClick={() => setShowShareMenu(false)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              width: '100%',
                              padding: '8px 12px',
                              background: 'transparent',
                              border: 'none',
                              borderRadius: 6,
                              color: 'var(--text-muted)',
                              fontSize: 12,
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {showShareMenu && (
                  <div
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 99,
                    }}
                    onClick={() => setShowShareMenu(false)}
                  />
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 20 }}>
                <h4 style={{ fontSize: 14, marginBottom: 16 }}>💳 Financing Calculator</h4>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Down Payment</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-400)' }}>{financing.downPayment}%</span>
                  </div>
                  <input type="range" className="ui-range" min={0} max={50} step={5} value={financing.downPayment}
                    onChange={e => setFinancing(p => ({ ...p, downPayment: Number(e.target.value) }))} aria-label="Down payment percentage" />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loan Term</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-400)' }}>{financing.months} months</span>
                  </div>
                  <input type="range" className="ui-range" min={12} max={72} step={6} value={financing.months}
                    onChange={e => setFinancing(p => ({ ...p, months: Number(e.target.value) }))} aria-label="Loan term in months" />
                </div>
                <div className="finance-result">
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Monthly Payment</div>
                  <div className="premium-price premium-price--lg" style={{ marginTop: 4 }}>{formatKES(monthlyPayment)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {financing.downPayment}% down · 14% p.a. · {financing.months} months
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 0 0', borderTop: '1px solid var(--border)' }}>
                {trustFeatures.map(b => (
                  <div key={b.label} className="trust-feature">
                    <span className="trust-feature__check">{b.icon}</span> {b.label}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
