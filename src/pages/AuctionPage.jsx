import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { carsAPI, formatKES } from '../api/api';
import { CountdownDisplay } from '../hooks/useCountdown';

const S = {
  heroSection: { background: 'var(--surface)', padding: '48px 0', borderBottom: '1px solid var(--border)' },
  liveIndicator: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 },
  liveText: { color: 'var(--green)', fontWeight: 600, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em' },
  heroH1: { marginBottom: 12 },
  heroDesc: { color: 'var(--text-muted)', fontSize: 15, maxWidth: 520, marginBottom: 24 },
  statsRow: { display: 'flex', gap: 24, flexWrap: 'wrap' },
  statMinWidth: { minWidth: 140 },
  statValue: { fontSize: '1.5rem' },
  contentPadding: { paddingTop: 40, paddingBottom: 40 },
  sectionMargin: { marginBottom: 24 },
  sectionTitle: { fontSize: '1.2rem', marginBottom: 4 },
  mutedText: { fontSize: 14, color: 'var(--text-muted)' },
  blockLink: { display: 'block' },
  card: { overflow: 'hidden', cursor: 'pointer' },
  carImgWrap: { position: 'relative' },
  carImg: { width: '100%', height: '100%', objectFit: 'cover' },
  liveBadge: { position: 'absolute', top: 10, left: 10 },
  countdown: { position: 'absolute', bottom: 10, right: 10, background: 'rgba(10,22,40,0.85)', backdropFilter: 'blur(4px)', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: 'white' },
  cardBody: { padding: '14px 16px' },
  cardTitle: { fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 },
  tagRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  tag: { fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: 4, padding: '2px 8px' },
  divider: { margin: '8px 0' },
  priceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  bidLabel: { fontSize: 10, color: 'var(--text-muted)' },
  priceValue: { fontSize: '1.1rem' },
  bidCount: { fontSize: 11, color: 'var(--text-muted)' },
};

export default function AuctionPage() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await carsAPI.list({ limit: 100 });
        const cars = data.cars || data.data || [];
        if (mounted) {
          setAuctions(cars.filter(c => c.isAuction || c.auction_status === 'live'));
        }
      } catch { /* show empty state below */ }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="page">
      <div style={S.heroSection}>
        <div className="container">
          <div style={S.liveIndicator}>
            <span className="live-dot" />
            <span style={S.liveText}>Live Auctions — Bidding Open Now</span>
          </div>
          <h1 style={S.heroH1}>Bid on Premium Vehicles</h1>
          <p style={S.heroDesc}>
            Real-time competitive bidding with M-Pesa escrow protection. Every vehicle is verified. Win the auction, pay securely, drive away.
          </p>
          <div style={S.statsRow}>
            {[
              { label: 'Live Auctions', value: auctions.length },
              { label: 'Total Bids', value: auctions.reduce((a, c) => a + (c.bidsCount || c.totalBids || 0), 0) },
              { label: 'Avg. Saving', value: '12%' },
            ].map((s, i) => (
              <div key={i} className="stat-box" style={S.statMinWidth}>
                <div className="stat-value" style={S.statValue}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container" style={S.contentPadding}>
        <div style={S.sectionMargin}>
          <h2 style={S.sectionTitle}>{auctions.length} Active Auctions</h2>
          <p style={S.mutedText}>Bids update in real-time. Sign in to participate.</p>
        </div>

        {loading ? (
          <div className="car-grid">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton-card" />)}
          </div>
        ) : auctions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔨</div>
            <h3>No active auctions</h3>
            <p>Check back soon — new auctions start daily</p>
          </div>
        ) : (
          <div className="car-grid">
            {auctions.map((car) => (
              <Link key={car._id || car.id} to={`/auction/${car._id || car.id}`} style={S.blockLink}>
                <div className="card" style={S.card}>
                  <div className="car-img-wrap" style={S.carImgWrap}>
                    <img src={car.images?.[0]?.url || car.images?.[0] || car.image} alt={car.title} style={S.carImg} />
                    <div style={S.liveBadge}>
                      <span className="badge badge-green"><span className="live-dot" /> LIVE</span>
                    </div>
                    <div style={S.countdown}>
                      <CountdownDisplay endTime={car.auctionEnd} />
                    </div>
                  </div>
                  <div style={S.cardBody}>
                    <h3 style={S.cardTitle}>{car.title} {car.year}</h3>
                    <div style={S.tagRow}>
                      <span style={S.tag}>{car.fuel}</span>
                      <span style={S.tag}>{car.mileage}</span>
                    </div>
                    <div className="gold-line" style={S.divider} />
                    <div style={S.priceRow}>
                      <div>
                        <div style={S.bidLabel}>Current Bid</div>
                        <div className="price-tag" style={S.priceValue}>{formatKES(car.currentBid || car.price)}</div>
                      </div>
                      <span style={S.bidCount}>{car.bidsCount || car.totalBids || 0} bids →</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
