import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI, carsAPI, partnersAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { DollarSign, Car, Star, Megaphone, Settings, TrendingUp, Crown, Shield } from 'lucide-react';

export default function MonetizationCenter() {
  const { toast } = useToast();
  const [config, setConfig] = useState(null);
  const [featured, setFeatured] = useState([]);
  const [_partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroCarIds, setHeroCarIds] = useState('');
  const [sponsorCarIds, setSponsorCarIds] = useState('');
  const [sponsorDealers, setSponsorDealers] = useState('');
  const [featuredDealerIds, setFeaturedDealerIds] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      adminAPI.getConfig().catch(() => ({})),
      carsAPI.list({ limit: 50, sort: '-createdAt' }).catch(() => ({ cars: [] })),
      partnersAPI.list().catch(() => []),
    ]).then(([cfg, cars, pts]) => {
      setConfig(cfg);
      setFeatured(cars.cars || cars.data || []);
      setPartners(pts);
      setHeroCarIds((cfg.heroCarIds || []).join(', '));
      setSponsorCarIds((cfg.sponsorCarIds || []).join(', '));
      setSponsorDealers((cfg.sponsorDealers || []).join(', '));
      setFeaturedDealerIds((cfg.featuredDealerIds || []).join(', '));
    }).finally(() => setLoading(false));
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const heroIds = heroCarIds.split(',').map(s => s.trim()).filter(Boolean);
      const sponsorIds = sponsorCarIds.split(',').map(s => s.trim()).filter(Boolean);
      const dealerIds = sponsorDealers.split(',').map(s => s.trim()).filter(Boolean);
      const featuredDealers = featuredDealerIds.split(',').map(s => s.trim()).filter(Boolean);
      await adminAPI.updateConfig({ ...config, heroCarIds: heroIds, sponsorCarIds: sponsorIds, sponsorDealers: dealerIds, featuredDealerIds: featuredDealers });
      toast('Monetization settings saved', 'success');
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="admin-loading"><div className="spinner" /></div>;

  const promoted = featured.filter(c => c.isPromoted);

  return (
    <div style={{ padding: '40px 28px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 36, position: 'relative' }}>
        {/* Decorative accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
          opacity: 0.5,
        }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--gold), #e6c288)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <DollarSign size={24} style={{ color: '#0A1628' }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>
              Admin Hub
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.8rem,3vw,2.4rem)', color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
              Monetization Center
            </h1>
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 12, maxWidth: 600, lineHeight: 1.6 }}>
          Manage featured content, sponsorships, and homepage promotions to drive revenue and engagement
        </p>
      </div>

      {/* Configuration Cards */}
      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', marginBottom: 32 }}>
        {[
          { icon: Star, label: 'Hero Vehicles', desc: 'Vehicle IDs shown in homepage hero slider', value: heroCarIds, onChange: setHeroCarIds, placeholder: 'carId1, carId2, carId3', color: '#F59E0B' },
          { icon: Crown, label: 'Sponsored Vehicles', desc: 'Vehicle IDs marked as sponsored', value: sponsorCarIds, onChange: setSponsorCarIds, placeholder: 'carId1, carId2', color: '#8B5CF6' },
          { icon: Shield, label: 'Sponsored Dealers', desc: 'Dealer IDs to show as sponsored', value: sponsorDealers, onChange: setSponsorDealers, placeholder: 'dealerId1, dealerId2', color: '#3B82F6' },
          { icon: Crown, label: 'Featured Dealers', desc: 'Dealer IDs shown as #1 in Top-Rated section', value: featuredDealerIds, onChange: setFeaturedDealerIds, placeholder: 'dealerId1, dealerId2', color: '#22C55E' },
        ].map((item, i) => (
          <div role="presentation" key={i} style={{
            borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.02)', padding: 20,
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(37, 99, 235,0.2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: `${item.color}20`, border: `1px solid ${item.color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <item.icon size={18} style={{ color: item.color }} />
              </div>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: '#fff' }}>
                {item.label}
              </h3>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 14px', lineHeight: 1.5 }}>
              {item.desc}
            </p>
            <input
              value={item.value}
              onChange={e => item.onChange(e.target.value)}
              placeholder={item.placeholder}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 8,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', fontSize: 13, transition: 'all 0.2s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(37, 99, 235,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            />
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button
          onClick={handleSaveConfig}
          disabled={saving}
          style={{
            padding: '12px 32px', borderRadius: 10, fontWeight: 700, fontSize: 14,
            background: 'linear-gradient(135deg, var(--gold), #e6c288)',
            color: '#0A1628', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s', opacity: saving ? 0.6 : 1,
          }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={e => { if (!saving) e.currentTarget.style.opacity = '1'; }}
        >
          {saving ? <><div className="spinner" style={{ width: 16, height: 16, display: 'inline-block', marginRight: 8 }} /> Saving...</> : 'Save Settings'}
        </button>
      </div>

      {/* Quick Links */}
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', marginTop: 40 }}>
        {[
          { icon: Megaphone, label: 'Homepage Ads', desc: 'Manage banner ads, sponsored placements, and promotional campaigns', to: '/admin/reports', color: '#8B5CF6' },
          { icon: Settings, label: 'Platform Config', desc: 'System settings, branding, and global platform configuration', to: '/admin/settings', color: '#3B82F6' },
          { icon: Car, label: 'Featured Vehicles', desc: 'Manage all vehicle listings and toggle featured status', to: '/admin/cars', color: '#22C55E' },
        ].map((item, i) => (
          <Link key={i} to={item.to} style={{ textDecoration: 'none' }}>
            <div role="presentation" style={{
              borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)', padding: 20,
              transition: 'all 0.2s', cursor: 'pointer',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${item.color}40`; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: `${item.color}20`, border: `1px solid ${item.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <item.icon size={16} style={{ color: item.color }} />
                </div>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#fff' }}>
                  {item.label}
                </h3>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>
                {item.desc} →
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Featured Vehicles Preview */}
      {promoted.length > 0 && (
        <div style={{
          borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.02)', padding: 24, marginTop: 40,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'rgba(37, 99, 235,0.15)', border: '1px solid rgba(37, 99, 235,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <TrendingUp size={18} style={{ color: 'var(--gold)' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: '#fff' }}>
                  Currently Featured
                </h3>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0 0' }}>
                  {promoted.length} vehicles promoted across the platform
                </p>
              </div>
            </div>
            <Link to="/admin/cars" style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>
              Manage All →
            </Link>
          </div>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {promoted.slice(0, 12).map(car => (
              <div role="presentation" key={car._id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px',
                borderRadius: 8, background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(37, 99, 235,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}
              >
                <div style={{ width: 56, height: 40, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                  <img src={car.images?.[0] || car.coverImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {car.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700, marginTop: 2 }}>
                    KES {(car.price || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
