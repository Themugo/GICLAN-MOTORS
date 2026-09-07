import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { carsAPI, auctionAdminAPI, bidsAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { CountdownDisplay } from '../../hooks/useCountdown';

export default function AdminAuctions() {
  const { toast } = useToast();
  const [cars, setCars]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('live');
  const [actionId, setActionId] = useState(null);
  const [selected, setSelected] = useState(null); // car for start-auction modal
  const [bids, setBids]       = useState({}); // carId -> bids[]
  const [startForm, setStartForm] = useState({ hours: 24 });
  const [extendForm, setExtendForm] = useState({ hours: 2 });
  const [winnerModal, setWinnerModal] = useState(null); // { car, bids }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [live, draft, ended] = await Promise.all([
        carsAPI.list({ auctionStatus: 'live',  limit: 50 }),
        carsAPI.list({ auctionStatus: 'draft', limit: 50 }),
        carsAPI.list({ auctionStatus: 'ended', limit: 50 }),
      ]);
      const all = [
        ...(live.cars  || []).map(c => ({ ...c, _tab: 'live' })),
        ...(draft.cars || []).map(c => ({ ...c, _tab: 'draft' })),
        ...(ended.cars || []).map(c => ({ ...c, _tab: 'ended' })),
      ];
      setCars(all);
    } catch { toast('Failed to load auctions', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const displayed = cars.filter(c => c._tab === tab);

  const loadBids = async (carId) => {
    if (bids[carId]) return bids[carId];
    try {
      const data = await auctionAdminAPI.bidHistory(carId);
      const b = data.bids || data.data || [];
      setBids(prev => ({ ...prev, [carId]: b }));
      return b;
    } catch { return []; }
  };

  const handleStart = async () => {
    if (!selected) return;
    setActionId(selected._id);
    try {
      const endAt = new Date(Date.now() + Number(startForm.hours) * 3600000).toISOString();
      const durationMs = Number(startForm.hours) * 3600000;
      await auctionAdminAPI.start(selected._id, { durationMs, startingBid: 0 });
      toast('🔴 Auction is now LIVE!', 'success');
      setSelected(null);
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to start auction', 'error');
    } finally { setActionId(null); }
  };

  const handleEnd = async (carId) => {
    if (!window.confirm('End this auction now?')) return;
    setActionId(carId);
    try {
      await auctionAdminAPI.end(carId);
      toast('Auction ended.', 'success');
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed', 'error');
    } finally { setActionId(null); }
  };

  const handleExtend = async (carId) => {
    setActionId(carId + '-ext');
    try {
      const hours = Number(extendForm.hours);
      await auctionAdminAPI.extend(carId, { extraMs: hours * 3600000 });
      toast(`Auction extended by ${hours}h`, 'success');
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed', 'error');
    } finally { setActionId(null); }
  };

  const openWinnerModal = async (car) => {
    const b = await loadBids(car._id);
    setWinnerModal({ car, bids: b });
  };

  const handleSetWinner = async (bidId) => {
    if (!winnerModal) return;
    setActionId(bidId);
    try {
      await auctionAdminAPI.setWinner(winnerModal.car._id, bidId);
      toast('🏆 Winner set! Escrow initiated.', 'success');
      setWinnerModal(null);
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed', 'error');
    } finally { setActionId(null); }
  };

  const liveCars  = cars.filter(c => c._tab === 'live');
  const draftCars = cars.filter(c => c._tab === 'draft');
  const endedCars = cars.filter(c => c._tab === 'ended');

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>

        <div style={{ marginBottom: 28 }}>
          <div className="section-eyebrow">Admin</div>
          <h2>Auction Control</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>
            Start, end, extend auctions and declare winners.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid-3" style={{ marginBottom: 28 }}>
          {[
            { label: 'Live Auctions', val: liveCars.length,  color: 'var(--green)', icon: '🔴' },
            { label: 'Ready to Launch', val: draftCars.length, color: 'var(--gold-light)', icon: '⏸' },
            { label: 'Completed', val: endedCars.length,     color: 'var(--text-muted)', icon: '🏁' },
          ].map(s => (
            <div key={s.label} className="stat-box">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value" style={{ color: s.color }}>{s.val}</div>
                </div>
                <span style={{ fontSize: 28 }}>{s.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs">
          {[
            { key: 'live',  label: `🔴 Live (${liveCars.length})` },
            { key: 'draft', label: `⏸ Draft (${draftCars.length})` },
            { key: 'ended', label: `🏁 Ended (${endedCars.length})` },
          ].map(t => (
            <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : displayed.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⚡</div>
            <h3>No {tab} auctions</h3>
            {tab === 'draft' && <p>Dealers need to create listings with bidding enabled first.</p>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {displayed.map(car => (
              <div key={car._id} className="card" style={{
                padding: 20,
                border: car._tab === 'live' ? '1px solid rgba(34,197,94,0.2)' : '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>

                  {/* Thumbnail */}
                  <div style={{ width: 80, height: 56, borderRadius: 6, overflow: 'hidden', background: 'var(--surface)', flexShrink: 0 }}>
                    {car.images?.[0]?.url
                      ? <img src={car.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🚗</div>
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {car._tab === 'live' && <span className="badge badge-green"><span className="live-dot" /> LIVE</span>}
                      {car._tab === 'draft' && <span className="badge badge-muted">Draft</span>}
                      {car._tab === 'ended' && <span className="badge badge-muted">Ended</span>}
                      <Link to={`/cars/${car._id}`} style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>
                        {car.title}
                      </Link>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Dealer: {car.dealer?.name || '—'} · {car.bidsCount || 0} bids
                    </div>
                  </div>

                  {/* Price + timer */}
                  <div style={{ textAlign: 'center', minWidth: 120 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {car.currentBid > 0 ? 'Current Bid' : 'Start Price'}
                    </div>
                    <div className="price-tag">{formatKES(car.currentBid || car.price)}</div>
                  </div>

                  {car._tab === 'live' && car.auctionEnd && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Ends In</div>
                      <CountdownDisplay endTime={car.auctionEnd} />
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
                    {car._tab === 'draft' && (
                      <button className="btn btn-gold btn-sm" onClick={() => setSelected(car)}>
                        ▶ Start Auction
                      </button>
                    )}

                    {car._tab === 'live' && (
                      <>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleExtend(car._id)}
                          disabled={actionId === car._id + '-ext'}
                        >
                          +2h Extend
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleEnd(car._id)}
                          disabled={actionId === car._id}
                        >
                          {actionId === car._id ? '...' : '⏹ End Now'}
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => openWinnerModal(car)}>
                          🏆 Set Winner
                        </button>
                      </>
                    )}

                    {car._tab === 'ended' && car.bidsCount > 0 && (
                      <button className="btn btn-gold btn-sm" onClick={() => openWinnerModal(car)}>
                        🏆 Declare Winner
                      </button>
                    )}

                    <Link to={`/cars/${car._id}`} className="btn btn-outline btn-sm">View</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Start Auction Modal ─── */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Start Auction</div>
                <h3 style={{ marginTop: 4 }}>{selected.title}</h3>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div style={{ background: 'var(--gold-glow)', border: '1px solid rgba(37, 99, 235,0.15)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Starting Price</div>
              <div className="price-tag" style={{ fontSize: '1.6rem' }}>{formatKES(selected.price)}</div>
            </div>

            <div className="input-group" style={{ marginBottom: 20 }}>
              <label className="input-label">Auction Duration</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[6, 12, 24, 48, 72].map(h => (
                  <button key={h}
                    className={`btn btn-sm ${startForm.hours === h ? 'btn-gold' : 'btn-outline'}`}
                    onClick={() => setStartForm({ hours: h })}
                  >
                    {h}h
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 8 }}>
                <input className="input" type="number" placeholder="Custom hours" min={1} max={168}
                  value={startForm.hours}
                  onChange={e => setStartForm({ hours: Number(e.target.value) })} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Ends: {new Date(Date.now() + startForm.hours * 3600000).toLocaleString('en-KE')}
              </div>
            </div>

            <button className="btn btn-gold btn-full btn-lg" onClick={handleStart} disabled={actionId === selected._id}>
              {actionId === selected._id ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Starting...</> : '🔴 Go Live Now'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Set Winner Modal ─── */}
      {winnerModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setWinnerModal(null)}>
          <div className="modal-box" style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Declare Winner</div>
                <h3 style={{ marginTop: 4 }}>{winnerModal.car.title}</h3>
              </div>
              <button onClick={() => setWinnerModal(null)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              Select the winning bid. The winner will be notified and an escrow will be initiated automatically.
            </p>

            {winnerModal.bids.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-icon">⚡</div>
                <h3>No bids placed</h3>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
                {winnerModal.bids.sort((a, b) => b.amount - a.amount).map((bid, i) => (
                  <div key={bid._id} style={{
                    background: i === 0 ? 'var(--gold-glow)' : 'var(--surface)',
                    border: `1px solid ${i === 0 ? 'rgba(37, 99, 235,0.3)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)', padding: '14px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {i === 0 && <span>👑</span>}
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{bid.user?.name || 'Bidder'}</span>
                        {bid.mpesaPaid && <span className="badge badge-green" style={{ fontSize: 9 }}>✓ M-Pesa Paid</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {bid.phone} · {new Date(bid.createdAt).toLocaleString('en-KE')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="price-tag">{formatKES(bid.amount)}</div>
                      <button
                        className={`btn btn-sm ${i === 0 ? 'btn-gold' : 'btn-outline'}`}
                        onClick={() => handleSetWinner(bid._id)}
                        disabled={actionId === bid._id}
                      >
                        {actionId === bid._id ? '...' : '🏆 Select'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
