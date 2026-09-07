import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { carsAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { calculateListingQualityScore, getQualityScoreColor, getQualityScoreGradient } from '../../utils/listingQualityScore';

const BRANDS  = ['Toyota','Mercedes-Benz','BMW','Land Rover','Subaru','Mazda','Nissan','Honda','Volkswagen','Lexus','Audi','Mitsubishi','Hyundai','Kia','Ford','Jeep','Peugeot','Isuzu'];
const FUELS   = ['Petrol','Diesel','Hybrid','Electric','LPG'];
const TRANS   = ['Automatic','Manual','CVT','Semi-Automatic'];
const BODIES  = ['SUV','Sedan','Hatchback','Pickup','Wagon','Van','Coupe','Convertible','Bus'];
const CITIES  = ['Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Thika','Nyeri','Machakos','Meru'];

export default function AddCarPage() {
  const { toast }  = useToast();
  const navigate   = useNavigate();
  const [loading, setLoading] = useState(false);
  const [images, setImages]   = useState([]);
  const [previews, setPreviews] = useState([]);
  const [step, setStep]       = useState(1);

  const [form, setForm] = useState({
    title: '', brand: '', model: '', year: '',
    price: '', fuel: '', transmission: '', bodyType: '', mileage: '',
    city: '', address: '', dealerPhone: '',
    allowBuy: true, allowBid: false,
    auctionStatus: 'draft', auctionEnd: '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Calculate listing quality score based on form data
  const qualityScore = useMemo(() => {
    const factors = {
      hasTitle: Boolean(form.title),
      hasBrand: Boolean(form.brand),
      hasModel: Boolean(form.model),
      hasYear: Boolean(form.year),
      hasPrice: Boolean(form.price),
      hasMileage: Boolean(form.mileage),
      hasFuel: Boolean(form.fuel),
      hasTransmission: Boolean(form.transmission),
      hasBodyType: Boolean(form.bodyType),
      hasDescription: false,
      hasLocation: Boolean(form.city),
      hasImages: images.length > 0,
      imageCount: images.length,
      hasFeatures: false,
      featureCount: 0,
      hasVin: false,
      hasLogbook: false,
      descriptionLength: 0,
    };
    return calculateListingQualityScore(factors);
  }, [form, images.length]);

  // Quality Score Component
  const QualityIndicator = () => (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Listing Quality Score</span>
        <span style={{ 
          fontSize: 24, 
          fontWeight: 800, 
          color: getQualityScoreColor(qualityScore.score),
        }}>
          {qualityScore.score}/100
        </span>
      </div>
      <div style={{
        height: 8,
        background: 'var(--border)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 12,
      }}>
        <div style={{
          height: '100%',
          width: `${qualityScore.score}%`,
          background: getQualityScoreGradient(qualityScore.score),
          borderRadius: 4,
          transition: 'width 0.3s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ 
          fontSize: 12, 
          fontWeight: 600,
          color: getQualityScoreColor(qualityScore.score),
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {qualityScore.level}
        </span>
        {qualityScore.suggestions.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            💡 {qualityScore.suggestions[0]}
          </span>
        )}
      </div>
    </div>
  );

  const handleImages = (e) => {
    const files = Array.from(e.target.files).slice(0, 8);
    setImages(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.price || !form.brand) {
      toast('Fill in title, brand and price', 'error'); return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== null) fd.append(k, v);
      });
      images.forEach(img => fd.append('images', img));

      const data = await carsAPI.create(fd);
      toast('🚗 Car listed successfully!', 'success');
      navigate('/dealer');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to create listing', 'error');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, children }) => (
    <div className="input-group">{label && <label className="input-label">{label}</label>}{children}</div>
  );

  const SelectField = ({ label, field, options }) => (
    <Field label={label}>
      <select className="input" value={form[field]} onChange={e => set(field, e.target.value)}>
        <option value="">Select {label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 800 }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div className="section-eyebrow">Dealer Hub</div>
          <h2>List a Car</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>
            Fill in the details below. Better info = more bids.
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {['Basic Info', 'Specs', 'Pricing & Mode', 'Photos'].map((s, i) => (
            <div
              key={s}
              onClick={() => setStep(i + 1)}
              style={{
                flex: 1, textAlign: 'center', padding: '10px 8px', borderRadius: 8,
                background: step === i + 1 ? 'var(--gold-glow)' : 'var(--surface)',
                border: `1px solid ${step === i + 1 ? 'var(--gold)' : 'var(--border)'}`,
                cursor: 'pointer', fontSize: 13, fontWeight: step === i + 1 ? 600 : 400,
                color: step === i + 1 ? 'var(--gold)' : 'var(--text-muted)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{i + 1}</div>
              {s}
            </div>
          ))}
        </div>

        {/* Quality Score Indicator */}
        <QualityIndicator />

        <div className="card" style={{ padding: 28, marginBottom: 20 }}>

          {/* ─ Step 1: Basic Info ─ */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ marginBottom: 4 }}>Basic Information</h3>
              <Field label="Listing Title *">
                <input className="input" placeholder="e.g. 2020 Toyota Land Cruiser V8 — Excellent Condition"
                  value={form.title} onChange={e => set('title', e.target.value)} />
              </Field>
              <div className="grid-2">
                <SelectField label="Brand *" field="brand" options={BRANDS} />
                <Field label="Model">
                  <input className="input" placeholder="e.g. Land Cruiser" value={form.model} onChange={e => set('model', e.target.value)} />
                </Field>
                <Field label="Year">
                  <input className="input" type="text" inputMode="numeric" pattern="[0-9]*"
                    value={form.year} onChange={e => set('year', e.target.value)} />
                </Field>
                <SelectField label="Body Type" field="bodyType" options={BODIES} />
              </div>
              <div className="grid-2">
                <SelectField label="City" field="city" options={CITIES} />
                <Field label="Dealer Phone">
                  <input className="input" placeholder="0712 345 678" value={form.dealerPhone} onChange={e => set('dealerPhone', e.target.value)} />
                </Field>
              </div>
              <Field label="Address (Optional)">
                <input className="input" placeholder="e.g. Ngong Road, Nairobi" value={form.address} onChange={e => set('address', e.target.value)} />
              </Field>
            </div>
          )}

          {/* ─ Step 2: Specs ─ */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ marginBottom: 4 }}>Vehicle Specs</h3>
              <div className="grid-2">
                <SelectField label="Fuel Type" field="fuel" options={FUELS} />
                <SelectField label="Transmission" field="transmission" options={TRANS} />
                <Field label="Mileage (km)">
                  <input className="input" type="text" inputMode="numeric" pattern="[0-9]*" placeholder="e.g. 45000" value={form.mileage} onChange={e => set('mileage', e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          {/* ─ Step 3: Pricing & Mode ─ */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h3 style={{ marginBottom: 4 }}>Pricing & Listing Mode</h3>
              <Field label="Asking Price (KES) *">
                <input className="input" type="text" inputMode="numeric" pattern="[0-9]*" placeholder="e.g. 3500000" value={form.price} onChange={e => set('price', e.target.value)} />
              </Field>

              {/* Listing mode */}
              <div>
                <label className="input-label" style={{ marginBottom: 12, display: 'block' }}>How do you want to sell?</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { key: 'allowBuy', icon: '💳', title: 'Direct Buy',     desc: 'Buyers can purchase at your listed price via M-Pesa.' },
                    { key: 'allowBid', icon: '⚡', title: 'Allow Bidding',  desc: 'Buyers can place bids. You choose the winner.' },
                  ].map(opt => (
                    <div
                      key={opt.key}
                      onClick={() => set(opt.key, !form[opt.key])}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        background: form[opt.key] ? 'var(--gold-glow)' : 'var(--surface)',
                        border: `2px solid ${form[opt.key] ? 'var(--gold)' : 'var(--border)'}`,
                        borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span style={{ fontSize: 28 }}>{opt.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{opt.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{opt.desc}</div>
                      </div>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: form[opt.key] ? 'var(--gold)' : 'transparent',
                        border: `2px solid ${form[opt.key] ? 'var(--gold)' : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#0A1628', fontSize: 12, fontWeight: 700,
                      }}>
                        {form[opt.key] && '✓'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Auction settings */}
              {form.allowBid && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 18 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>⚡ Auction Settings</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <Field label="Start Auction As">
                      <select className="input" value={form.auctionStatus} onChange={e => set('auctionStatus', e.target.value)}>
                        <option value="draft">Draft (start later)</option>
                        <option value="live">Live Immediately</option>
                      </select>
                    </Field>
                    {form.auctionStatus === 'live' && (
                      <Field label="Auction End Time">
                        <input className="input" type="datetime-local"
                          value={form.auctionEnd} onChange={e => set('auctionEnd', e.target.value)} />
                      </Field>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─ Step 4: Photos ─ */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ marginBottom: 4 }}>Upload Photos</h3>
              <div
                style={{
                  border: '2px dashed var(--border-soft)', borderRadius: 'var(--radius-lg)',
                  padding: 40, textAlign: 'center', cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onClick={() => document.getElementById('car-images').click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')).slice(0, 8);
                  setImages(files); setPreviews(files.map(f => URL.createObjectURL(f)));
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Drop photos here or click to browse</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Up to 8 images · JPG, PNG, WEBP</div>
                <input id="car-images" type="file" multiple accept="image/*" onChange={handleImages} style={{ display: 'none' }} />
              </div>

              {previews.length > 0 && (
                <div className="grid-4" style={{ gap: 8 }}>
                  {previews.map((src, i) => (
                    <div key={i} style={{ aspectRatio: '4/3', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                      <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {i === 0 && (
                        <div style={{
                          position: 'absolute', top: 4, left: 4, background: 'var(--gold)',
                          color: '#0A1628', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                        }}>MAIN</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          {step > 1 ? (
            <button className="btn btn-outline" onClick={() => setStep(s => s - 1)}>← Back</button>
          ) : <div />}

          {step < 4 ? (
            <button className="btn btn-gold" onClick={() => setStep(s => s + 1)}>Continue →</button>
          ) : (
            <button className="btn btn-gold btn-lg" onClick={handleSubmit} disabled={loading}>
              {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Publishing...</> : '🚗 Publish Listing'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
