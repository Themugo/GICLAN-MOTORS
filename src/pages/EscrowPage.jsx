import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { escrowAPI, formatKES } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import { timeAgo, formatDate } from '../utils/helpers';

const STATUS_META = {
  pending:  { label: 'Pending',  badge: 'badge-orange', icon: '⏳', desc: 'Awaiting payment confirmation.' },
  funded:   { label: 'Funded',   badge: 'badge-blue',   icon: '💰', desc: 'Funds held safely in escrow. Released after car handover.' },
  released: { label: 'Released', badge: 'badge-green',  icon: '✅', desc: 'Funds released to seller. Deal complete.' },
  refunded: { label: 'Refunded', badge: 'badge-red',    icon: '↩️', desc: 'Funds returned to your account.' },
  disputed: { label: 'Disputed', badge: 'badge-red',    icon: '⚠️', desc: 'Under review by admin.' },
};

const HOW_IT_WORKS = [
  { step: '1', icon: '💳', label: 'You Pay',       desc: 'Full amount via M-Pesa into escrow' },
  { step: '2', icon: '🔒', label: 'Funds Locked',  desc: 'Admin holds payment securely' },
  { step: '3', icon: '🚗', label: 'Car Delivered',  desc: 'You inspect and confirm the car' },
  { step: '4', icon: '✅', label: 'Released',       desc: 'Funds sent to seller' },
];

export default function EscrowPage() {
  const { isAuth, user } = useAuth();
  const { toast } = useToast();
  const socket = useSocket();
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState(null);

  // Reload escrows
  const reloadEscrows = useCallback(async () => {
    if (!isAuth) return;
    try {
      const d = await escrowAPI.mine();
      setEscrows(d.escrows || d.data || []);
    } catch {
      toast('Failed to reload escrow records', 'error');
    }
  }, [isAuth, toast]);

  // Load initial data
  useEffect(() => {
    if (!isAuth) { setLoading(false); return; }
    escrowAPI.mine()
      .then(d => setEscrows(d.escrows || d.data || []))
      .catch(() => toast('Failed to load escrow records', 'error'))
      .finally(() => setLoading(false));
  }, [isAuth, toast]);

  // Socket.io real-time payment updates
  useEffect(() => {
    if (!socket?.connected || !user?.id) return;

    // Listen for payment success events
    const handlePaymentSuccess = (data) => {
      if (data.userId === user.id || data.dealerId === user.id) {
        setPaymentStatus({ type: 'success', message: `Payment received! KES ${(data.amount / 1000).toFixed(0)}K received for ${data.carTitle || 'your purchase'}` });
        toast.success(`Payment received! KES ${(data.amount / 1000).toFixed(0)}K`);
        reloadEscrows();
        // Clear status after 5 seconds
        setTimeout(() => setPaymentStatus(null), 5000);
      }
    };

    // Listen for payment failed events
    const handlePaymentFailed = (data) => {
      if (data.userId === user.id || data.dealerId === user.id) {
        setPaymentStatus({ type: 'error', message: `Payment failed: ${data.reason || 'Unknown error'}` });
        toast.error(`Payment failed: ${data.reason || 'Please try again'}`);
        setTimeout(() => setPaymentStatus(null), 5000);
      }
    };

    // Listen for escrow status updates
    const handleEscrowUpdate = (data) => {
      if (data.userId === user.id || data.dealerId === user.id) {
        toast.info(`Escrow ${data.status}: ${data.carTitle || 'Your transaction'}`);
        reloadEscrows();
      }
    };

    // Listen for fund release notifications
    const handleFundsReleased = (data) => {
      if (data.userId === user.id || data.dealerId === user.id) {
        setPaymentStatus({ type: 'success', message: `Funds released! KES ${(data.amount / 1000).toFixed(0)}K has been ${data.role === 'seller' ? 'deposited to your account' : 'refunded'}` });
        toast.success(`Funds ${data.role === 'seller' ? 'deposited!' : 'refunded!'}`);
        reloadEscrows();
        setTimeout(() => setPaymentStatus(null), 5000);
      }
    };

    // Join user's personal room for real-time updates
    socket.emit('join', { room: `user_${user.id}`, type: 'user' });

    // Subscribe to events
    socket.on('payment:success', handlePaymentSuccess);
    socket.on('payment:failed', handlePaymentFailed);
    socket.on('escrow:updated', handleEscrowUpdate);
    socket.on('escrow:released', handleFundsReleased);

    // Cleanup
    return () => {
      socket.off('payment:success', handlePaymentSuccess);
      socket.off('payment:failed', handlePaymentFailed);
      socket.off('escrow:updated', handleEscrowUpdate);
      socket.off('escrow:released', handleFundsReleased);
    };
  }, [socket, user?.id, toast, reloadEscrows]);

  const filtered = tab === 'all' ? escrows : escrows.filter(e => e.status === tab);
  const totalLocked   = escrows.filter(e => e.status === 'funded').reduce((s, e)   => s + (e.amount || 0), 0);
  const totalReleased = escrows.filter(e => e.status === 'released').reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="page">
      {/* ── Hero banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0A1628 0%, #0d1f3c 100%)',
        padding: '64px 0 48px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="section-eyebrow" style={{ justifyContent: 'center' }}>Secure Transactions</div>
          <h1 style={{ marginBottom: 16 }}>🔒 Escrow Vault</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 520, margin: '0 auto 32px', lineHeight: 1.7 }}>
            Every purchase on KAYAD is protected by M-Pesa escrow. Your money is held safely and only released when you confirm you have received the vehicle.
          </p>
          {!isAuth && (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/login" className="btn btn-gold btn-lg">Sign In to View Your Escrow</Link>
              <Link to="/register" className="btn btn-outline btn-lg">Create Account</Link>
            </div>
          )}
        </div>
      </div>

      <div className="container" style={{ paddingTop: 48, paddingBottom: 56 }}>

        {/* ── Real-time payment status banner ── */}
        {paymentStatus && (
          <div 
            data-testid="payment-status-banner"
            style={{
              padding: '16px 20px',
              marginBottom: 24,
              borderRadius: 'var(--radius)',
              background: paymentStatus.type === 'success' 
                ? 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.05))'
                : 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(220,38,38,0.05))',
              border: `1px solid ${paymentStatus.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              animation: 'slideIn 0.3s ease-out',
            }}
          >
            <span style={{ fontSize: 24 }}>
              {paymentStatus.type === 'success' ? '✅' : '❌'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: paymentStatus.type === 'success' ? 'var(--green)' : 'var(--red)' }}>
                {paymentStatus.type === 'success' ? 'Payment Confirmed!' : 'Payment Failed'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                {paymentStatus.message}
              </div>
            </div>
            <button 
              onClick={() => setPaymentStatus(null)}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: 'var(--text-muted)', 
                cursor: 'pointer',
                fontSize: 18,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ── How it works (always visible) ── */}
        <div className="card" style={{ padding: '28px 24px', marginBottom: 40 }}>
          <h3 style={{ marginBottom: 24, textAlign: 'center' }}>How Escrow Works</h3>
          <div className="grid-4" style={{ textAlign: 'center', position: 'relative' }}>
            {HOW_IT_WORKS.map((s, i) => (
              <div key={s.step} style={{ position: 'relative' }}>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div style={{
                    position: 'absolute',
                    top: 20,
                    left: '50%',
                    width: '100%',
                    height: 2,
                    background: 'linear-gradient(90deg, var(--gold-glow) 0%, var(--border) 100%)',
                    zIndex: 0,
                  }} />
                )}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: '#EFF6FF', border: '1px solid rgba(37, 99, 235,0.3)',
                  color: 'var(--gold)', fontWeight: 700, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 10px', position: 'relative', zIndex: 1,
                }}>
                  {s.step}
                </div>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Benefits (always visible) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 48 }}>
          {[
            { icon: '🛡️', title: 'Buyer Protection',   desc: 'Never lose money to a scam. Funds only leave escrow when you confirm.' },
            { icon: '⚡', title: 'Instant M-Pesa',     desc: 'Pay directly from your phone. No bank transfers or cheques.' },
            { icon: '🔍', title: 'Admin Verified',      desc: 'Every escrow is monitored by our team. Disputes resolved in 48h.' },
            { icon: '↩️', title: 'Easy Refunds',        desc: 'If the car doesn\'t match the listing, get a full refund.' },
          ].map(b => (
            <div key={b.title} className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{b.icon}</div>
              <h4 style={{ fontSize: '0.95rem', marginBottom: 6 }}>{b.title}</h4>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{b.desc}</p>
            </div>
          ))}
        </div>

        {/* ── Auth-gated section ── */}
        {!isAuth ? (
          <div className="card" style={{ padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🔐</div>
            <h3 style={{ marginBottom: 10 }}>Sign in to access your Escrow</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 380, margin: '0 auto 28px' }}>
              Track all your car purchase payments, request releases, and view your full escrow history.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/login" className="btn btn-gold btn-lg">Sign In</Link>
              <Link to="/register" className="btn btn-outline btn-lg">Create Account</Link>
            </div>
          </div>
        ) : (
          <>
            {/* ── Summary stats ── */}
            <div className="grid-3" style={{ marginBottom: 28 }}>
              {[
                { label: 'Total Escrows',    val: escrows.length,          icon: '🔒', color: 'var(--text)' },
                { label: 'Currently Locked', val: formatKES(totalLocked),  icon: '💰', color: 'var(--blue)' },
                { label: 'Total Released',   val: formatKES(totalReleased), icon: '✅', color: 'var(--green)' },
              ].map(s => (
                <div key={s.label} className="stat-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div className="stat-label">{s.label}</div>
                      <div className="stat-value" style={{ color: s.color, fontSize: '1.3rem' }}>{s.val}</div>
                    </div>
                    <span style={{ fontSize: 24 }}>{s.icon}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Tabs ── */}
            <div className="tabs">
              {['all', 'funded', 'released', 'refunded', 'disputed'].map(t => {
                const count = t === 'all' ? escrows.length : escrows.filter(e => e.status === t).length;
                return (
                  <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
                    {STATUS_META[t]?.icon || '📋'} {t.charAt(0).toUpperCase() + t.slice(1)}
                    {count > 0 && (
                      <span style={{ marginLeft: 5, background: 'var(--surface)', borderRadius: 100, padding: '1px 6px', fontSize: 10 }}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── List ── */}
            {loading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔒</div>
                <h3>No escrow records{tab !== 'all' ? ` (${tab})` : ''}</h3>
                <p>When you buy a car via M-Pesa, your payment is protected here until you receive it.</p>
                <Link to="/browse" className="btn btn-gold" style={{ marginTop: 16 }}>Browse Cars →</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {filtered.map(e => {
                  const meta = STATUS_META[e.status] || { label: e.status, badge: 'badge-muted', icon: '•', desc: '' };
                  return (
                    <div
                      key={e.id || e._id}
                      className="card"
                      style={{
                        padding: 20, cursor: 'pointer',
                        border: e.status === 'funded' ? '1px solid rgba(59,130,246,0.3)' : '1px solid var(--border)',
                        transition: 'border-color 0.2s, background 0.2s',
                      }}
                      onClick={() => setSelected(e)}
                      onMouseEnter={el => el.currentTarget.style.background = 'var(--card-hover)'}
                      onMouseLeave={el => el.currentTarget.style.background = ''}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 32, flexShrink: 0 }}>{meta.icon}</div>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <span className={`badge ${meta.badge}`}>{meta.label}</span>
                            {(e.car?.title) && (
                              <span style={{ fontWeight: 600, fontSize: 14 }}>{e.car.title}</span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{meta.desc}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                            {e.created_at || e.createdAt ? timeAgo(e.created_at || e.createdAt) : ''} · #{(e.id || e._id)?.slice(-8)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div className="price-tag" style={{ fontSize: '1.3rem' }}>{formatKES(e.amount)}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            {e.status === 'funded' && '⏳ Awaiting release'}
                            {e.status === 'released' && e.released_at && `Released ${formatDate(e.released_at)}`}
                          </div>
                        </div>
                        <div style={{ color: 'var(--text-dim)', fontSize: 20 }}>›</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Escrow Record</div>
                <h3 style={{ marginTop: 4 }}>{selected.car?.title || 'Car Purchase'}</h3>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}>✕</button>
            </div>

            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 24, textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>{STATUS_META[selected.status]?.icon}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Escrow Amount</div>
              <div className="price-tag" style={{ fontSize: '2rem' }}>{formatKES(selected.amount)}</div>
              <span className={`badge ${STATUS_META[selected.status]?.badge || 'badge-muted'}`} style={{ marginTop: 12 }}>
                {STATUS_META[selected.status]?.label}
              </span>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10 }}>
                {STATUS_META[selected.status]?.desc}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { label: 'Escrow ID', val: `#${(selected.id || selected._id)?.slice(-10)}`, mono: true },
                { label: 'Created',   val: (selected.created_at || selected.createdAt) ? formatDate(selected.created_at || selected.createdAt) : '—' },
                { label: 'Buyer',     val: selected.buyer?.name || '—' },
                { label: 'Seller',    val: selected.seller?.name || '—' },
              ].map(r => (
                <div key={r.label}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{r.label}</div>
                  <div style={{ fontWeight: 600, marginTop: 4, fontSize: 13, fontFamily: r.mono ? 'monospace' : undefined }}>{r.val}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, padding: '14px 16px', background: 'rgba(37, 99, 235,0.06)', border: '1px solid rgba(37, 99, 235,0.15)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Need help with this escrow? Contact <a href="mailto:support@kayad.co.ke" style={{ color: 'var(--gold)' }}>support@kayad.co.ke</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
