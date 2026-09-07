import { useEffect, useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import { dealerAPI } from '../../../api/api';
import { Loader, RefreshCw } from 'lucide-react';

const planColor = (id) => id === 'elite' ? 'var(--gold)' : id === 'growth' ? '#3b82f6' : id === 'enterprise' ? '#a855f7' : 'rgba(255,255,255,0.6)';

export default function DealerPackageTab({ user, listingsCount }) {
  const { toast } = useToast();
  const [plans, setPlans] = useState([]);
  const [entitlement, setEntitlement] = useState(null);
  const [upgrading, setUpgrading] = useState(null);
  const [phone, setPhone] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [{ plans: serverPlans }, { entitlement: current }] = await Promise.all([
        dealerAPI.getSubscriptionPlans(),
        dealerAPI.getSubscription(),
      ]);
      setPlans(serverPlans || []);
      setEntitlement(current || null);
    } catch (err) {
      toast(err?.response?.data?.message || 'Unable to load subscription details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpgrade = async (planId) => {
    if (!/^2547\d{8}$/.test(phone.trim())) {
      toast('Enter a valid Kenyan M-Pesa number (2547XXXXXXXX)', 'error');
      return;
    }
    setUpgrading(planId);
    try {
      const res = await dealerAPI.upgrade({ planId, phone: phone.trim() });
      toast(res.message || 'STK push sent. Enter your M-Pesa PIN.', 'success');
      setShowPhoneInput(null);
      setPhone('');
    } catch (err) {
      toast(err?.response?.data?.message || err?.message || 'Upgrade failed', 'error');
    } finally {
      setUpgrading(null);
    }
  };

  const currentPlan = entitlement?.planId || user?.dealerPackage;
  const currentLimit = entitlement?.listingMax ?? 0;
  const currentUsed = entitlement?.listingsUsed ?? listingsCount ?? 0;

  return (
    <div>
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4rem', color: '#fff', margin: '0 0 8px' }}>Your Listing Package</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Plans, limits and billing are controlled by the platform subscription service.</p>
        </div>
        <button onClick={load} disabled={loading} title="Refresh subscription" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', borderRadius: 8, padding: 8, cursor: 'pointer' }}>
          <RefreshCw size={15} className={loading ? 'spinner' : ''} />
        </button>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid rgba(37, 99, 235,0.18)', borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: 28 }}>
        {loading ? <Loader size={18} className="spinner" /> : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>Current Plan</div>
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '1.6rem', color: 'var(--gold)', textTransform: 'capitalize' }}>
                {entitlement?.planName || currentPlan || 'No Active Plan'}
              </div>
              {entitlement?.expiresAt && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                  {entitlement.status === 'cancelled' ? 'Cancelled — access until ' : 'Expires: '}
                  {new Date(entitlement.expiresAt).toLocaleDateString('en-KE', { year:'numeric', month:'long', day:'numeric' })}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              {entitlement?.status === 'active' && (
                <button onClick={async () => { try { await dealerAPI.cancelSubscription(); toast('Subscription cancelled. Access remains until expiry.', 'success'); await load(); } catch (err) { toast(err?.response?.data?.message || 'Unable to cancel subscription', 'error'); } }} style={{ marginBottom: 8, padding: '6px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: 10, cursor: 'pointer' }}>Cancel renewal</button>
              )}
              {entitlement?.status === 'cancelled' && entitlement?.expiresAt && new Date(entitlement.expiresAt) > new Date() && (
                <button onClick={async () => { try { await dealerAPI.reactivateSubscription(); toast('Subscription reactivated.', 'success'); await load(); } catch (err) { toast(err?.response?.data?.message || 'Unable to reactivate subscription', 'error'); } }} style={{ marginBottom: 8, padding: '6px 10px', borderRadius: 7, border: '1px solid rgba(34,197,94,0.25)', background: 'rgba(34,197,94,0.08)', color: '#22c55e', fontSize: 10, cursor: 'pointer' }}>Reactivate</button>
              )}
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Listings used</div>
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '1.4rem', color: '#fff' }}>
                {currentUsed} / {currentLimit || 0}
              </div>
            </div>
          </div>
        )}
      </div>

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 165px), 1fr))', gap: 14 }}>
          {plans.map(pkg => {
            const color = planColor(pkg.id);
            const isCurrent = currentPlan === pkg.id && entitlement?.status !== 'none';
            const contactSales = pkg.contactSales || pkg.price <= 0;
            return (
              <div key={pkg.id} style={{ background: 'var(--card)', border: `1px solid ${isCurrent ? color + '40' : 'rgba(255,255,255,0.07)'}`, borderRadius: 'var(--radius-lg)', padding: '20px', position: 'relative', overflow: 'hidden' }}>
                {isCurrent && <div style={{ position: 'absolute', top: 12, left: 12, background: '#22c55e', color: '#000', fontSize: 8, fontWeight: 900, borderRadius: 4, padding: '2px 7px', letterSpacing: '0.06em' }}>ACTIVE</div>}
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color, marginBottom: 8, marginTop: isCurrent ? 22 : 0 }}>{pkg.name}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '1.2rem', color: '#fff', marginBottom: 4 }}>
                  {contactSales ? 'Custom' : `KES ${Number(pkg.price).toLocaleString()}/mo`}
                </div>
                <div style={{ fontSize: 11, color, fontWeight: 700, marginBottom: 16 }}>{pkg.listingMax > 0 ? `${pkg.listingMax} listings` : 'Unlimited listings'}</div>
                {(pkg.features || []).map((feature, j) => (
                  <div key={j} style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 5 }}>✓ {String(feature).replaceAll('_', ' ')}</div>
                ))}
                <div style={{ marginTop: 18 }}>
                  {isCurrent ? (
                    <div style={{ padding: '9px', borderRadius: 9, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>Current Plan ✓</div>
                  ) : contactSales ? (
                    <a href="mailto:plans@kayad.space?subject=Enterprise Inquiry" style={{ display: 'block', padding: '9px', borderRadius: 9, background: `${color}12`, border: `1px solid ${color}30`, color, fontSize: 12, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>Contact Sales</a>
                  ) : showPhoneInput === pkg.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input className="input" placeholder="2547XXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} style={{ fontSize: 12, height: 34, textAlign: 'center' }} autoFocus />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleUpgrade(pkg.id)} disabled={upgrading === pkg.id} style={{ flex: 1, padding: '9px', borderRadius: 9, background: 'var(--gold)', border: 'none', color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          {upgrading === pkg.id ? 'Processing...' : `Pay KES ${Number(pkg.price).toLocaleString()}`}
                        </button>
                        <button onClick={() => { setShowPhoneInput(null); setPhone(''); }} style={{ padding: '9px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowPhoneInput(pkg.id)} style={{ display: 'block', width: '100%', padding: '9px', borderRadius: 9, background: `${color}12`, border: `1px solid ${color}30`, color, fontSize: 12, fontWeight: 700, textAlign: 'center', cursor: 'pointer' }}>Upgrade</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 20, padding: '14px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.7 }}>
        🔒 <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Subscription payments are separate from vehicle escrow.</strong> M-Pesa is used for dealer subscription payments; vehicle custody funds remain on the escrow custody workflow.
      </div>
    </div>
  );
}
