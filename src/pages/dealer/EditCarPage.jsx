import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { carsAPI, auctionAdminAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';


export default function EditCarPage() {
  const { id }     = useParams();
  const { toast }  = useToast();
  const { user, isAdmin } = useAuth();
  const navigate   = useNavigate();
  const [car, setCar]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm]     = useState({});
  const [auctionAction, setAuctionAction] = useState(null);
  const [extendHours, setExtendHours]     = useState(2);
  const [ownershipError, setOwnershipError] = useState(false);
  const [newImages, setNewImages] = useState([]);
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    carsAPI.get(id).then(d => {
      const c = d.car || d.data || d;
      // Ownership check — only the listing owner can edit
      if (c?.dealer?._id && c.dealer._id !== user?._id) {
        setOwnershipError(true);
        setCar(c);
        return;
      }
      setCar(c);
      setForm({
        title: c.title || '', brand: c.brand || '', model: c.model || '',
        year: String(c.year || ''), price: String(c.price || ''),
        fuel: c.fuel || '', transmission: c.transmission || '',
        bodyType: c.bodyType || '', mileage: String(c.mileage || ''),
        dealerPhone: c.dealerPhone || '',
        allowBuy: c.allowBuy ?? true, allowBid: c.allowBid ?? false,
        auctionEnd: c.auctionEnd ? new Date(c.auctionEnd).toISOString().slice(0, 16) : '',
      });
    }).finally(() => setLoading(false));
  }, [id]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleImages = (e) => {
    const files = Array.from(e.target.files).slice(0, 8);
    setNewImages(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (newImages.length > 0) {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => {
          if (v !== '' && v !== null) fd.append(k, v);
        });
        newImages.forEach(img => fd.append('images', img));
        await carsAPI.update(id, fd);
      } else {
        await carsAPI.update(id, form);
      }
      toast('Listing updated!', 'success');
      navigate('/dealer');
    } catch { toast('Failed to update', 'error'); }
    finally { setSaving(false); }
  };

  const handleAuctionStart = async () => {
    if (!form.auctionEnd) { toast('Set an auction end time first', 'error'); return; }
    setAuctionAction('starting');
    try {
      await auctionAdminAPI.start(id, { auctionEnd: form.auctionEnd });
      toast('🔴 Auction is now LIVE!', 'success');
      setCar(prev => ({ ...prev, auctionStatus: 'live' }));
    } catch (err) { toast(err.response?.data?.message || 'Failed', 'error'); }
    finally { setAuctionAction(null); }
  };

  const handleAuctionEnd = async () => {
    if (!confirm('End this auction now?')) return;
    setAuctionAction('ending');
    try {
      await auctionAdminAPI.end(id);
      toast('Auction ended.', 'info');
      setCar(prev => ({ ...prev, auctionStatus: 'ended' }));
    } catch { toast('Failed', 'error'); }
    finally { setAuctionAction(null); }
  };

  const handleExtend = async () => {
    setAuctionAction('extending');
    try {
      await auctionAdminAPI.extend(id, { hours: extendHours });
      toast(`Auction extended by ${extendHours}h`, 'success');
    } catch { toast('Failed', 'error'); }
    finally { setAuctionAction(null); }
  };

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;
  if (!car) return <div className="page loading-center"><h3>Car not found</h3></div>;
  if (ownershipError) return (
    <div className="page loading-center" style={{ flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🚫</div>
      <h3>Access Denied</h3>
      <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: 400 }}>
        You can only edit your own listings. This car was listed by <strong>{car.dealer?.name}</strong>.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button className="btn btn-outline" onClick={() => navigate(-1)}>← Go Back</button>
        <button className="btn btn-gold" onClick={() => navigate('/dealer')}>My Listings</button>
      </div>
    </div>
  );

  const Field = ({ label, children }) => (
    <div className="input-group"><label className="input-label">{label}</label>{children}</div>
  );

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 760 }}>
        <div style={{ marginBottom: 32 }}>
          <div className="section-eyebrow">Dealer Hub</div>
          <h2>Edit: {car.title}</h2>
        </div>

        <div style={{ display: 'grid', gap: 20 }}>

          {/* Main form */}
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ marginBottom: 20 }}>Listing Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Title">
                <input className="input" value={form.title} onChange={e => set('title', e.target.value)} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Brand">
                  <input className="input" value={form.brand} onChange={e => set('brand', e.target.value)} />
                </Field>
                <Field label="Model">
                  <input className="input" value={form.model} onChange={e => set('model', e.target.value)} />
                </Field>
                <Field label="Year">
                  <input className="input" type="text" inputMode="numeric" pattern="[0-9]*" value={form.year} onChange={e => set('year', e.target.value)} />
                </Field>
                <Field label="Price (KES)">
                  <input className="input" type="text" inputMode="numeric" pattern="[0-9]*" value={form.price} onChange={e => set('price', e.target.value)} />
                </Field>
                <Field label="Fuel">
                  <input className="input" value={form.fuel} onChange={e => set('fuel', e.target.value)} />
                </Field>
                <Field label="Transmission">
                  <input className="input" value={form.transmission} onChange={e => set('transmission', e.target.value)} />
                </Field>
                <Field label="Mileage (km)">
                  <input className="input" type="text" inputMode="numeric" pattern="[0-9]*" value={form.mileage} onChange={e => set('mileage', e.target.value)} />
                </Field>
                <Field label="Dealer Phone">
                  <input className="input" value={form.dealerPhone} onChange={e => set('dealerPhone', e.target.value)} />
                </Field>
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { key: 'allowBuy', label: '💳 Allow Direct Buy' },
                  { key: 'allowBid', label: '⚡ Allow Bidding' },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => set(t.key, !form[t.key])}
                    className={`btn btn-sm ${form[t.key] ? 'btn-gold' : 'btn-outline'}`}
                  >
                    {form[t.key] ? '✓ ' : ''}{t.label}
                  </button>
                ))}
              </div>

              <button className="btn btn-gold" onClick={handleSave} disabled={saving} style={{ alignSelf: 'flex-start' }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Auction Controls */}
          {form.allowBid && (
            <div className="card" style={{ padding: 28 }}>
              <h3 style={{ marginBottom: 8 }}>⚡ Auction Controls</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span className={`badge ${car.auctionStatus === 'live' ? 'badge-green' : car.auctionStatus === 'ended' ? 'badge-muted' : 'badge-orange'}`}>
                  {car.auctionStatus === 'live' && <span className="live-dot" />}
                  {car.auctionStatus}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {car.bidsCount || 0} bids · Current: {formatKES(car.currentBid || car.price)}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {car.auctionStatus !== 'live' && (
                  <>
                    <Field label="Auction End Time">
                      <input className="input" type="datetime-local" value={form.auctionEnd}
                        onChange={e => set('auctionEnd', e.target.value)} />
                    </Field>
                    <button className="btn btn-gold" onClick={handleAuctionStart} disabled={!!auctionAction}>
                      {auctionAction === 'starting' ? '...' : '🔴 Start Live Auction'}
                    </button>
                  </>
                )}

                {car.auctionStatus === 'live' && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn btn-danger" onClick={handleAuctionEnd} disabled={!!auctionAction}>
                      🏁 End Auction Now
                    </button>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select className="input" value={extendHours} onChange={e => setExtendHours(Number(e.target.value))}
                        style={{ width: 100 }}>
                        {[1, 2, 4, 6, 12, 24].map(h => <option key={h} value={h}>+{h}h</option>)}
                      </select>
                      <button className="btn btn-outline" onClick={handleExtend} disabled={!!auctionAction}>
                        Extend
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Images ─── */}
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ marginBottom: 16 }}>Photos ({car.images?.length || 0})</h3>
            {car.images?.length > 0 && (
              <div className="grid-4" style={{ gap: 8, marginBottom: 16 }}>
                {car.images.map((img, i) => (
                  <div key={i} style={{ aspectRatio: '4/3', borderRadius: 8, overflow: 'hidden', position: 'relative', background: 'var(--surface)' }}>
                    <img src={img.url || img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {i === 0 && (
                      <div style={{ position: 'absolute', top: 4, left: 4, background: 'var(--gold)', color: '#0A1628', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>MAIN</div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div
              style={{ border: '2px dashed var(--border-soft)', borderRadius: 'var(--radius-lg)', padding: 24, textAlign: 'center', cursor: 'pointer' }}
              onClick={() => document.getElementById('edit-car-images').click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')).slice(0, 8);
                setNewImages(files); setPreviews(files.map(f => URL.createObjectURL(f)));
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
              <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>{newImages.length > 0 ? `${newImages.length} new image(s) selected` : 'Tap to replace / add photos'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Up to 8 images · JPG, PNG, WEBP</div>
              <input id="edit-car-images" type="file" multiple accept="image/*" onChange={handleImages} style={{ display: 'none' }} />
            </div>
            {previews.length > 0 && (
              <div className="grid-4" style={{ gap: 8, marginTop: 12 }}>
                {previews.map((src, i) => (
                  <div key={i} style={{ aspectRatio: '4/3', borderRadius: 8, overflow: 'hidden', background: 'var(--surface)' }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Views', val: car.views || 0, icon: '👁' },
              { label: 'Bids', val: car.bidsCount || 0, icon: '⚡' },
              { label: 'Saved', val: car.favoritesCount || 0, icon: '❤️' },
              { label: 'Trust Score', val: `${car.trustScore || 100}%`, icon: '✅' },
            ].map(s => (
              <div key={s.label} className="stat-box" style={{ padding: 16 }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                <div className="stat-value" style={{ fontSize: '1.4rem' }}>{s.val}</div>
                <div className="stat-label" style={{ fontSize: 11 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
