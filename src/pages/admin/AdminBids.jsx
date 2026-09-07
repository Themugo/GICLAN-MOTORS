import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { bidsAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { timeAgo } from '../../utils/helpers';

const FRAUD_META = {
  low:    { label: 'Low',    color: 'var(--green)',  bg: 'rgba(34,197,94,0.1)' },
  medium: { label: 'Medium', color: 'var(--orange)', bg: 'rgba(249,115,22,0.1)' },
  high:   { label: 'High',   color: 'var(--red)',    bg: 'rgba(239,68,68,0.1)' },
};

export default function AdminBids() {
  const { toast } = useToast();
  const [bids, setBids]             = useState([]);
  const [suspicious, setSuspicious] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState('all');
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [search, setSearch]         = useState('');
  const [paidFilter, setPaidFilter] = useState('all');
  const [actionId, setActionId]     = useState(null);
  const [selected, setSelected]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (paidFilter !== 'all') params.mpesaPaid = paidFilter === 'paid';
      const [allRes, suspRes] = await Promise.all([
        bidsAPI.adminAll(params),
        bidsAPI.adminSuspicious().catch(() => ({ bids: [] })),
      ]);
      setBids(allRes.bids || allRes.data || []);
      setTotal(allRes.pagination?.total || allRes.total || 0);
      setSuspicious(suspRes.bids || suspRes.data || []);
    } catch { toast('Failed to load bids', 'error'); }
    finally { setLoading(false); }
  }, [page, search, paidFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSetWinner = async (bid) => {
    if (!window.confirm(`Set ${bid.user?.name || 'this bidder'} (${formatKES(bid.amount)}) as winner?`)) return;
    setActionId(bid._id);
    try {
      await bidsAPI.adminSetWinner(bid._id);
      toast('🏆 Winner set! Escrow initiated.', 'success');
      setSelected(null);
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed', 'error');
    } finally { setActionId(null); }
  };

  const display    = tab === 'suspicious' ? suspicious : bids;
  const totalPages = Math.ceil(total / 20);

  // Summary stats
  const paidTotal   = bids.filter(b => b.mpesaPaid).reduce((s, b) => s + (b.amount || 0), 0);
  const unpaidCount = bids.filter(b => !b.mpesaPaid).length;

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>

        <div style={{ marginBottom: 24 }}>
          <div className="section-eyebrow">Admin</div>
          <h2>Bid Management</h2>
        </div>

        {/* Stats row */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          {[
            { label: 'Total Bids',    val: total.toLocaleString(),   icon: '⚡', color: 'var(--gold)' },
            { label: 'M-Pesa Paid',   val: formatKES(paidTotal),     icon: '✅', color: 'var(--green)' },
            { label: 'Unpaid Bids',   val: unpaidCount,              icon: '⏳', color: 'var(--orange)' },
            { label: 'Suspicious',    val: suspicious.length,        icon: '⚠️', color: 'var(--red)' },
          ].map(s => (
            <div key={s.label} className="stat-box">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value" style={{ color: s.color, fontSize: '1.4rem' }}>{s.val}</div>
                </div>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Suspicious alert */}
        {suspicious.length > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius)', padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: 'var(--red)', fontWeight: 700 }}>⚠️ {suspicious.length} bid{suspicious.length > 1 ? 's' : ''} flagged by fraud engine</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                High fraud scores detected. Review immediately before releasing funds.
              </div>
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => setTab('suspicious')}>Review Now</button>
          </div>
        )}

        {/* Tabs + Filters */}
        <div className="tabs">
          <button className={`tab-btn ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
            All Bids ({total})
          </button>
          <button className={`tab-btn ${tab === 'suspicious' ? 'active' : ''}`} onClick={() => setTab('suspicious')}>
            ⚠️ Suspicious ({suspicious.length})
          </button>
        </div>

        {tab === 'all' && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input className="input" placeholder="Search bidder, car..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ maxWidth: 260 }} />
            {['all', 'paid', 'unpaid'].map(f => (
              <button key={f} className={`btn btn-sm ${paidFilter === f ? 'btn-gold' : 'btn-outline'}`}
                onClick={() => { setPaidFilter(f); setPage(1); }}>
                {f === 'paid' ? '✅ Paid' : f === 'unpaid' ? '⏳ Unpaid' : 'All'}
              </button>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="card">
          <div className="table-wrap">
            {loading ? (
              <div className="loading-center" style={{ padding: 48 }}><div className="spinner" /></div>
            ) : display.length === 0 ? (
              <div className="empty-state" style={{ padding: 48 }}>
                <div className="empty-icon">⚡</div>
                <h3>No bids found</h3>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bidder</th><th>Car</th><th>Amount</th>
                    <th>M-Pesa</th><th>Commitment</th><th>Fraud</th><th>Time</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {display.map(bid => {
                    const fraudLevel = bid.fraudScore >= 70 ? 'high' : bid.fraudScore >= 40 ? 'medium' : 'low';
                    const fm = FRAUD_META[fraudLevel];
                    return (
                      <tr key={bid._id}
                        style={{ background: bid.suspicious ? 'rgba(239,68,68,0.02)' : '', cursor: 'pointer' }}
                        onClick={() => setSelected(bid)}
                      >
                        <td>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{bid.user?.name || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{bid.phone || bid.user?.phone}</div>
                        </td>
                        <td>
                          <Link to={`/cars/${bid.car?._id || bid.car}`}
                            style={{ color: 'var(--gold)', fontSize: 13, fontWeight: 500 }}
                            onClick={e => e.stopPropagation()}>
                            {bid.car?.title || `#${String(bid.car || '').slice(-6)}`}
                          </Link>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--gold-light)' }}>{formatKES(bid.amount)}</td>
                        <td>
                          <span className={`badge ${bid.mpesaPaid ? 'badge-green' : 'badge-orange'}`}>
                            {bid.mpesaPaid ? '✓ Paid' : 'Pending'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {bid.commitmentAmount ? formatKES(bid.commitmentAmount) : '—'}
                        </td>
                        <td>
                          {bid.fraudScore !== undefined ? (
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                              background: fm.bg, color: fm.color,
                            }}>
                              {fm.label} ({bid.fraudScore}%)
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                          {bid.createdAt ? timeAgo(bid.createdAt) : '—'}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <button className="btn btn-gold btn-sm" disabled={actionId === bid._id}
                            onClick={() => handleSetWinner(bid)}>
                            {actionId === bid._id ? '...' : '🏆'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {tab === 'all' && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
            <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      {/* Bid detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal-box" style={{ maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Bid Detail</div>
                <h3 style={{ marginTop: 4 }}>{selected.car?.title || 'Bid Record'}</h3>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div style={{ background: 'var(--gold-glow)', border: '1px solid rgba(37, 99, 235,0.15)', borderRadius: 'var(--radius)', padding: 16, textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bid Amount</div>
              <div className="price-tag" style={{ fontSize: '2rem' }}>{formatKES(selected.amount)}</div>
              {selected.commitmentAmount && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  M-Pesa Commitment: {formatKES(selected.commitmentAmount)}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Bidder',      val: selected.user?.name || '—' },
                { label: 'Phone',       val: selected.phone || selected.user?.phone || '—', mono: true },
                { label: 'M-Pesa Paid', val: selected.mpesaPaid ? '✅ Yes' : '⏳ Pending' },
                { label: 'Receipt',     val: selected.mpesaReceipt || '—', mono: true },
                { label: 'Fraud Score', val: selected.fraudScore !== undefined ? `${selected.fraudScore}%` : '—' },
                { label: 'Time',        val: selected.createdAt ? new Date(selected.createdAt).toLocaleString('en-KE') : '—' },
                { label: 'Bid ID',      val: `#${selected._id?.slice(-10)}`, mono: true },
                { label: 'Suspicious',  val: selected.suspicious ? '⚠️ Yes' : '✅ Clean' },
              ].map(r => (
                <div key={r.label}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{r.label}</div>
                  <div style={{ fontWeight: 600, marginTop: 4, fontSize: 13, fontFamily: r.mono ? 'monospace' : undefined, wordBreak: 'break-all' }}>{r.val}</div>
                </div>
              ))}
            </div>

            <button className="btn btn-gold btn-full" disabled={actionId === selected._id}
              onClick={() => handleSetWinner(selected)}>
              {actionId === selected._id ? 'Setting winner...' : '🏆 Declare as Auction Winner'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
