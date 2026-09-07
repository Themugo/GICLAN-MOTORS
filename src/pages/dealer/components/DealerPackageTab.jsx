import { useEffect, useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import { dealerAPI } from '../../../api/api';
import { Loader } from 'lucide-react';
import { getDealerSubscription } from '../../../services/dealerPlatformApi';

export default function DealerPackageTab({ user, listingsCount }) {
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState(null);
  const [phone, setPhone] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(null);
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    getDealerSubscription().then((res) => {
      setPlans(res?.data?.plans || []);
      setSubscription(res?.data?.subscription || null);
    }).catch(() => {});
  }, []);

  const handleUpgrade = async (planId) => {
    if (!phone || phone.length < 10) {
      toast('Enter a valid M-Pesa phone number', 'error');
      return;
    }
    setUpgrading(planId);
    try {
      const res = await dealerAPI.upgrade({ planId, phone });
      toast(res.message || 'Upgrade initiated. Check your phone for M-Pesa PIN.', 'success');
      setShowPhoneInput(null);
      setPhone('');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Upgrade failed';
      toast(msg, 'error');
    } finally {
      setUpgrading(null);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4rem', color: '#fff', margin: '0 0 8px' }}>Your Listing Package</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>No per-listing fees. Upgrade anytime to list more vehicles and unlock premium placement.</p>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid rgba(37, 99, 235,0.18)', borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>Current Plan</div>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '1.6rem', color: 'var(--gold)', textTransform: 'capitalize' }}>
              {user?.dealerPackage || 'No Active Plan'}
            </div>
            {user?.packageExpiresAt && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                Expires: {new Date(user.packageExpiresAt).toLocaleDateString('en-KE', { year:'numeric', month:'long', day:'numeric' })}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Listings used</div>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '1.4rem', color: '#fff' }}>
              {listingsCount} / {user?.packageListingMax || (user?.dealerPackage ? '∞' : 0)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 165px), 1fr))', gap: 14 }}>
        {plans.map((pkg, index) => {
          const colors = ['rgba(255,255,255,0.6)', '#3b82f6', 'var(--gold)', '#a855f7'];
          const pkgColor = colors[index] || 'var(--gold)';
          const isContactSales = Boolean(pkg.contactSales) || Number(pkg.price || 0) <= 0;
          const priceLabel = isContactSales ? 'Custom' : `KES ${Number(pkg.price).toLocaleString('en-KE')}/mo`;
          const limitLabel = Number(pkg.listingMax || 0) === 0 ? '∞' : pkg.listingMax;
          const perks = Array.isArray(pkg.features) ? pkg.features.map((feature) => String(feature).replace(/_/g, ' ')) : [];
          const isCurrent = user?.dealerPackage === pkg.id || subscription?.planId === pkg.id;
          return (
            <div key={pkg.id} style={{ background: 'var(--card)', border: `1px solid ${isCurrent ? pkgColor + '40' : 'rgba(255,255,255,0.07)'}`, borderRadius: 'var(--radius-lg)', padding: '20px', position: 'relative', overflow: 'hidden' }}>
              {pkg.badge && <div style={{ position: 'absolute', top: 12, right: 12, background: 'var(--gold)', color: '#000', fontSize: 8, fontWeight: 900, borderRadius: 4, padding: '2px 7px', letterSpacing: '0.08em' }}>{pkg.badge}</div>}
              {isCurrent && <div style={{ position: 'absolute', top: 12, left: 12, background: '#22c55e', color: '#000', fontSize: 8, fontWeight: 900, borderRadius: 4, padding: '2px 7px', letterSpacing: '0.06em' }}>ACTIVE</div>}
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: pkgColor, marginBottom: 8, marginTop: (isCurrent || pkg.badge) ? 22 : 0 }}>{pkg.name}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '1.2rem', color: '#fff', marginBottom: 4 }}>{priceLabel}</div>
              <div style={{ fontSize: 11, color: pkgColor, fontWeight: 700, marginBottom: 16 }}>{limitLabel} listings</div>
              {perks.map((perk, j) => (
                <div key={j} style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 5, display: 'flex', gap: 5 }}>
                  <span style={{ color: pkgColor, flexShrink: 0 }}>✓</span>{perk}
                </div>
              ))}
              <div style={{ marginTop: 18 }}>
                {isCurrent ? (
                  <div style={{ padding: '9px', borderRadius: 9, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>Current Plan ✓</div>
                ) : isContactSales ? (
                  <div style={{ padding: '9px', borderRadius: 9, background: `${pkgColor}12`, border: `1px solid ${pkgColor}30`, color: pkgColor, fontSize: 12, fontWeight: 700, textAlign: 'center' }}>Contact Sales</div>
                ) : showPhoneInput === pkg.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input className="input" placeholder="M-Pesa phone (0712...)" value={phone} onChange={e => setPhone(e.target.value)} style={{ fontSize: 12, height: 34, textAlign: 'center' }} autoFocus />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleUpgrade(pkg.id)} disabled={upgrading === pkg.id} style={{ flex: 1, padding: '9px', borderRadius: 9, background: 'var(--gold)', border: 'none', color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {upgrading === pkg.id ? <><Loader size={13} className="spinner" /> Processing...</> : `Pay KES ${Number(pkg.price).toLocaleString('en-KE')}`}
                      </button>
                      <button onClick={() => { setShowPhoneInput(null); setPhone(''); }} style={{ padding: '9px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowPhoneInput(pkg.id)} style={{ display: 'block', width: '100%', padding: '9px', borderRadius: 9, background: `${pkgColor}12`, border: `1px solid ${pkgColor}30`, color: pkgColor, fontSize: 12, fontWeight: 700, textAlign: 'center', cursor: 'pointer' }}>Upgrade</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 20, padding: '14px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.7 }}>
        🔒 <strong style={{ color: 'rgba(255,255,255,0.5)' }}>No escrow required for verified dealers.</strong> Payments processed via M-Pesa. Enterprise? Contact <a href="mailto:plans@kayad.space" style={{ color: 'var(--gold)', textDecoration: 'none' }}>plans@kayad.space</a>.
      </div>
    </div>
  );
}