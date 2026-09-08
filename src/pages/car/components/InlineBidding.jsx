import { Link } from 'react-router-dom';
import { Clock, AlertTriangle, CheckCircle, Zap, Users, TrendingUp } from 'lucide-react';

export default function InlineBidding({
  car, bidAmount, onBidAmountChange, onPlaceBid, bidPlacing, bidError, bidHistory, countdown,
  isAuth, reserveMet, showReserve, bidCount, currentBid, startingBid, onShowConfirm,
}) {
  const minBid = (currentBid || car?.currentBid || car?.startingBid || 0) + 5000;
  const bidIncrement = 5000;

  const handleQuickBid = (multiplier) => {
    const suggested = minBid + (bidIncrement * multiplier);
    onBidAmountChange(suggested);
  };

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 14 }}>
      {/* Header with Live Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="live-dot" />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Live Auction
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
            <Users size={12} />
            <span>{bidCount || 0} bids</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
            {countdown || '—'}
          </div>
        </div>
      </div>

      {/* Reserve Status */}
      {showReserve && (
        <div style={{
          marginBottom: 12, padding: '8px 12px', borderRadius: 8,
          background: reserveMet ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${reserveMet ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600,
          color: reserveMet ? '#22c55e' : '#ef4444',
        }}>
          {reserveMet ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
          <span>{reserveMet ? 'Reserve Met' : 'Reserve Not Yet Met'}</span>
        </div>
      )}

      {/* Current Bid Display */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          Current Bid
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>
          KES {Number(currentBid || car?.currentBid || car?.price || 0).toLocaleString()}
        </div>
        {startingBid && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Starting: KES {Number(startingBid).toLocaleString()}
          </div>
        )}
      </div>

      {/* Bid Input with Quick Buttons */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--gold)', fontWeight: 700, pointerEvents: 'none' }}>KES</span>
            <input
              type="number"
              value={bidAmount || ''}
              onChange={e => onBidAmountChange(Number(e.target.value))}
              min={minBid}
              step={bidIncrement}
              placeholder={`Min: ${minBid.toLocaleString()}`}
              style={{
                width: '100%', padding: '12px 12px 12px 42px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--surface)',
                color: '#fff', fontSize: 14, fontWeight: 700, outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--gold)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>
          <button
            onClick={onShowConfirm || onPlaceBid}
            disabled={bidPlacing || !isAuth}
            style={{
              padding: '12px 24px', borderRadius: 8,
              background: isAuth ? 'linear-gradient(135deg, var(--gold), var(--gold-muted))' : 'rgba(255,255,255,0.1)',
              color: isAuth ? '#000' : 'rgba(255,255,255,0.5)',
              fontWeight: 900, fontSize: 13, border: 'none', cursor: isAuth && !bidPlacing ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s', opacity: bidPlacing || !isAuth ? 0.6 : 1, whiteSpace: 'nowrap'
            }}
          >
            {bidPlacing ? 'Processing…' : !isAuth ? 'Login to Bid' : 'Place Bid'}
          </button>
        </div>

        {/* Quick Bid Buttons */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[0, 1, 2, 3].map((mult) => (
            <button
              key={mult}
              onClick={() => handleQuickBid(mult)}
              style={{
                padding: '6px 12px', borderRadius: 6,
                background: 'rgba(37, 99, 235,0.08)',
                border: '1px solid rgba(37, 99, 235,0.15)',
                color: 'var(--gold)', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(37, 99, 235,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(37, 99, 235,0.08)'}
            >
              +KES {(bidIncrement * mult).toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {bidError && (
        <div style={{
          fontSize: 11, color: 'var(--red)', marginTop: 8,
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
          background: 'rgba(239,68,68,0.08)', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)'
        }}>
          <AlertTriangle size={12} />
          {bidError}
        </div>
      )}

      {/* Bid History */}
      {bidHistory && bidHistory.length > 0 && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendingUp size={11} />
            Recent Activity
          </div>
          <div style={{ maxHeight: 140, overflowY: 'auto' }}>
            {bidHistory.slice(-5).reverse().map((b, i) => {
              const isTop = i === bidHistory.length - 1;
              return (
                <div
                  key={b._id || i}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 0', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.05)',
                    animation: 'fadeInDown 0.3s ease',
                    background: isTop ? 'rgba(37, 99, 235,0.04)' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isTop && <Zap size={10} style={{ color: 'var(--gold)' }} />}
                    <span style={{ color: isTop ? '#fff' : 'var(--text-muted)', fontWeight: isTop ? 600 : 400 }}>
                      {b.user?.name || b.bidderTag || `Bidder #${bidHistory.length - i}`}
                    </span>
                  </div>
                  <span style={{ fontWeight: 700, color: isTop ? 'var(--gold)' : 'var(--text)' }}>
                    KES {Number(b.amount || 0).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Link to Full Auction */}
      <Link
        to={`/auction/${car?._id}`}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          fontSize: 11, color: 'var(--gold)', marginTop: 12, textDecoration: 'none',
          fontWeight: 600, padding: '8px', borderRadius: 6,
          background: 'rgba(37, 99, 235,0.05)', border: '1px solid rgba(37, 99, 235,0.1)',
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(37, 99, 235,0.1)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(37, 99, 235,0.05)'}
      >
        <Clock size={12} />
        Full Auction Room →
      </Link>
    </div>
  );
}
