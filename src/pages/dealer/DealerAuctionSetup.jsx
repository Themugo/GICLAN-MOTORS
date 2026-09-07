import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gavel, Play, Clock, RefreshCw } from 'lucide-react';
import { dealerAPI, dealerAuctionAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import DealerAuctionDraftCard from './components/DealerAuctionDraftCard';
import DealerAuctionLiveCard from './components/DealerAuctionLiveCard';
import DealerAuctionEndedCard from './components/DealerAuctionEndedCard';

export default function DealerAuctionSetup() {
  const { toast } = useToast();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab] = useState('draft');
  const [actionLoading, setActionLoading] = useState({});

  const fetchCars = useCallback(async () => {
    setLoading(true);
    try {
      const carsRes = await dealerAPI.cars({ limit: 300 });
      const allCars = carsRes.cars || carsRes.data || [];
      setCars(allCars.map((car) => ({
        ...car,
        _startingBid: car.currentBid || car.price || '',
        _reservePrice: car.reservePrice || '',
        _reserveMode: car.reserveMode || 'none',
        _durationHours: 24,
        _extendHours: '',
        _extendCount: car.extensionCount || 0,
      })));
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to load auction cars', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchCars(); }, [fetchCars]);

  const groupedCars = useMemo(() => {
    const now = Date.now();
    return cars.reduce((groups, car) => {
      const end = car.auctionEnd ? new Date(car.auctionEnd).getTime() : 0;
      const isEnded = car.auctionStatus === 'ended' || (end > 0 && end <= now);
      const isLive = !isEnded && (car.auctionStatus === 'live' || end > now);
      if (isLive) groups.live.push(car);
      else if (isEnded) groups.ended.push(car);
      else groups.draft.push(car);
      return groups;
    }, { draft: [], live: [], ended: [] });
  }, [cars]);

  const tabs = [
    { key: 'draft', label: 'Setup', icon: Play, count: groupedCars.draft.length },
    { key: 'live', label: 'Live', icon: Gavel, count: groupedCars.live.length },
    { key: 'ended', label: 'Ended', icon: Clock, count: groupedCars.ended.length },
  ];

  const styles = useMemo(() => ({
    container: { background: '#F8FAFC', minHeight: '100vh' },
    headerBar: {
      background: 'linear-gradient(180deg, rgba(37, 99, 235,0.045) 0%, transparent 100%)',
      borderBottom: '1px solid rgba(15, 23, 42, 0.06)', padding: '30px 0 0',
    },
    inner: { maxWidth: 1180, margin: '0 auto', padding: '0 32px' },
    contentInner: { maxWidth: 1180, margin: '0 auto', padding: '30px 32px 64px' },
    card: { background: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.075)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 18px 50px rgba(0,0,0,0.18)' },
    cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, padding: '17px 20px', flexWrap: 'wrap' },
    configPanel: { borderTop: '1px solid rgba(15, 23, 42, 0.06)', padding: 20, background: 'rgba(15, 23, 42, 0.015)' },
    panelHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 },
    sectionKicker: { fontSize: 9, color: 'var(--gold)', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 5 },
    sectionTitle: { fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: '1.25rem', color: '#0F172A', margin: 0 },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 18 },
    timeline: { display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) 48px minmax(140px, 1fr) 48px minmax(140px, 1fr)', alignItems: 'center', gap: 10, padding: 16, borderRadius: 10, border: '1px solid rgba(37, 99, 235,0.13)', background: 'rgba(37, 99, 235,0.045)', marginBottom: 16, overflowX: 'auto' },
    timelineRule: { height: 1, background: 'rgba(37, 99, 235,0.28)' },
    timelineLabel: { fontSize: 9, color: 'rgba(15, 23, 42, 0.38)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 5 },
    timelineValue: { color: '#0F172A', fontSize: 13, fontWeight: 800 },
    livePanel: { display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', padding: '4px 20px 20px' },
    liveMetaGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(120px, 1fr))', gap: 10, flex: '1 1 420px' },
    metaBox: { padding: 13, borderRadius: 9, background: 'rgba(15, 23, 42, 0.035)', border: '1px solid rgba(15, 23, 42, 0.07)' },
    actionsRow: { borderTop: '1px solid rgba(15, 23, 42, 0.06)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
    metricLabel: { fontSize: 9, fontWeight: 800, color: 'rgba(15, 23, 42, 0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 },
    goldValue: { fontSize: 15, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic', whiteSpace: 'nowrap' },
    whiteValue: { fontSize: 13, color: '#0F172A', fontWeight: 800, whiteSpace: 'nowrap' },
    primaryButton: { padding: '11px 18px', background: 'var(--gold)', border: 'none', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.06em' },
    secondaryButton: { padding: '10px 14px', background: 'rgba(15, 23, 42, 0.045)', border: '1px solid rgba(15, 23, 42, 0.1)', borderRadius: 8, color: '#0F172A', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' },
    blueButton: { padding: '10px 16px', background: 'rgba(59,130,246,0.11)', border: '1px solid rgba(59,130,246,0.24)', borderRadius: 8, color: '#60a5fa', fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 7 },
    dangerButton: { padding: '10px 16px', background: 'rgba(239,68,68,0.11)', border: '1px solid rgba(239,68,68,0.24)', borderRadius: 8, color: '#ef4444', fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 7 },
    errorNote: { marginBottom: 14, padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: 12, fontWeight: 700 },
  }), []);

  const updateCar = (id, field, value) => {
    setCars((previous) => previous.map((car) => (car._id === id ? { ...car, [field]: value } : car)));
  };

  const handleStartAuction = async (car) => {
    const startingBid = Number(car._startingBid);
    const reservePrice = car._reservePrice ? Number(car._reservePrice) : undefined;
    const reserveMode = car._reserveMode || 'none';
    const durationHours = (() => { const p = Number(car._durationHours); return Number.isFinite(p) && p > 0 ? p : 24; })();

    if (!startingBid || startingBid < 1000) { toast('Starting bid must be at least KES 1,000', 'error'); return; }
    if (durationHours < 24) { toast('Auction duration must be at least 24 hours', 'error'); return; }
    if (reservePrice !== undefined && reservePrice < startingBid) { toast('Reserve price must be >= starting bid', 'error'); return; }

    setActionLoading((previous) => ({ ...previous, [car._id]: 'starting' }));
    try {
      await dealerAuctionAPI.start(car._id, {
        durationMs: durationHours * 60 * 60 * 1000, startingBid,
        ...(reservePrice !== undefined && { reservePrice }),
        reserveMode,
      });
      toast('Auction is live and countdown has started', 'success');
      setExpandedId(null);
      setActiveTab('live');
      await fetchCars();
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to start auction', 'error');
    } finally { setActionLoading((previous) => ({ ...previous, [car._id]: null })); }
  };

  const handleEndAuction = async (carId) => {
    if (!window.confirm('End this auction now?')) return;
    setActionLoading((previous) => ({ ...previous, [carId]: 'ending' }));
    try { await dealerAuctionAPI.end(carId); toast('Auction ended', 'info'); await fetchCars(); }
    catch (err) { toast(err?.response?.data?.message || 'Failed to end auction', 'error'); }
    finally { setActionLoading((previous) => ({ ...previous, [carId]: null })); }
  };

  const handleExtendAuction = async (carId, hours) => {
    const car = cars.find((item) => item._id === carId);
    const currentExtends = car?._extendCount || car?.extensionCount || 0;
    if (currentExtends >= 3) { toast('Maximum 3 extensions reached', 'error'); return; }
    if (!hours || hours < 1) { toast('Choose an extension time first', 'error'); return; }

    setActionLoading((previous) => ({ ...previous, [carId]: 'extending' }));
    try { await dealerAuctionAPI.extend(carId, hours); toast(`Auction countdown extended by ${hours}h`, 'success'); await fetchCars(); }
    catch (err) { toast(err?.response?.data?.message || 'Failed to extend auction', 'error'); }
    finally { setActionLoading((previous) => ({ ...previous, [carId]: null })); }
  };

  const activeCars = groupedCars[activeTab] || [];

  return (
    <div style={styles.container}>
      <div style={styles.headerBar}>
        <div style={styles.inner}>
          <div style={styles.sectionKicker}>Dealer Auctions</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.65rem,3vw,2.35rem)', color: '#0F172A', margin: 0 }}>Auction Setup</h1>
              <p style={{ margin: '8px 0 0', color: 'rgba(15, 23, 42, 0.48)', fontSize: 13 }}>Configure starting bids, reserve prices, countdown duration, live extensions, and auction endings.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={fetchCars} style={styles.secondaryButton}><RefreshCw size={14} /> Refresh</button>
              <Link to="/dealer" style={{ ...styles.secondaryButton, textDecoration: 'none' }}>Back to Dashboard</Link>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 18px', background: selected ? 'rgba(37, 99, 235,0.08)' : 'none', border: 'none', borderBottom: `2px solid ${selected ? 'var(--gold)' : 'transparent'}`, color: selected ? '#0F172A' : 'rgba(15, 23, 42, 0.42)', fontSize: 13, fontWeight: 850, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <Icon size={15} /> {tab.label}
                  <span style={{ minWidth: 22, height: 22, padding: '0 7px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: selected ? 'var(--gold)' : 'rgba(15, 23, 42, 0.08)', color: selected ? '#000' : 'rgba(15, 23, 42, 0.55)', fontSize: 11, fontWeight: 900 }}>{tab.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={styles.contentInner}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}><div className="spinner" /></div>
        ) : activeCars.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', background: '#FFFFFF', borderRadius: 10, border: '1px solid rgba(15, 23, 42, 0.07)' }}>
            <Gavel size={42} style={{ color: 'rgba(15, 23, 42, 0.14)', marginBottom: 14 }} />
            <div style={{ fontSize: 15, color: '#0F172A', fontWeight: 850, marginBottom: 6 }}>No {activeTab} auctions</div>
            <div style={{ fontSize: 12, color: 'rgba(15, 23, 42, 0.42)' }}>
              {activeTab === 'draft' ? 'Add or edit a listing, then return here to configure its auction.' : 'Auctions will appear here after they move into this state.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {activeTab === 'draft' && activeCars.map((car) => (
              <DealerAuctionDraftCard key={car._id} car={car} expanded={expandedId === car._id}
                isLoading={actionLoading[car._id]} onToggle={() => setExpandedId(expandedId === car._id ? null : car._id)}
                onChange={(field, value) => updateCar(car._id, field, value)}
                onStart={() => handleStartAuction(car)} styles={styles} />
            ))}
            {activeTab === 'live' && activeCars.map((car) => (
              <DealerAuctionLiveCard key={car._id} car={car} isLoading={actionLoading[car._id]}
                onEnd={handleEndAuction} onExtend={handleExtendAuction}
                onExtendHoursChange={(id, hours) => updateCar(id, '_extendHours', hours)} styles={styles} />
            ))}
            {activeTab === 'ended' && activeCars.map((car) => (
              <DealerAuctionEndedCard key={car._id} car={car} styles={styles} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
