import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authAPI, paymentsAPI, reviewsAPI, carsAPI, formatKES } from '../api/api';
import { timeAgo, formatDate, initials, validatePassword } from '../utils/helpers';
import { SkeletonRow, SkeletonText } from '../components/Skeleton';

const TABS = ['Profile', 'Security', 'Activity', 'Reviews'];

export default function ProfilePage() {
  const { user, setUser, isDealer } = useAuth();
  const { toast } = useToast();
  const [tab, setTab]       = useState('Profile');
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [activity, setActivity] = useState([]);
  const [reviews, setReviews]   = useState([]);
  const [myStats, setMyStats]   = useState(null);
  const [loading, setLoading]   = useState(false);

  const [form, setForm] = useState({
    name: user?.name || '', phone: user?.phone || '',
    location: user?.location || '', businessName: user?.businessName || '',
    bio: user?.bio || '',
  });
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });

  const set   = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setPw = (k, v) => setPwForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (tab === 'Activity' && !activity.length) {
      setLoading(true);
      paymentsAPI.myPayments().then(d => setActivity(d.payments || d.data || [])).finally(() => setLoading(false));
    }
    if (tab === 'Reviews' && !reviews.length) {
      setLoading(true);
      reviewsAPI.mine().then(d => setReviews(d.reviews || d.data || [])).finally(() => setLoading(false));
    }
    if (tab === 'Profile' && isDealer && !myStats) {
      carsAPI.analytics().then(d => setMyStats(d.analytics || d.data || d)).catch(() => {});
    }
  }, [tab]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await authAPI.updateProfile(form);
      setUser(data.user);
      toast('Profile updated!', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Update failed', 'error');
    } finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!validatePassword(pwForm.newPw)) { toast('Min 6 characters', 'error'); return; }
    if (pwForm.newPw !== pwForm.confirm)  { toast('Passwords do not match', 'error'); return; }
    setChangingPw(true);
    try {
      await authAPI.changePassword({ currentPassword: pwForm.current, newPassword: pwForm.newPw });
      toast('Password changed!', 'success');
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch (err) {
      toast(err.response?.data?.message || 'Failed', 'error');
    } finally { setChangingPw(false); }
  };

  const completeness = (() => {
    const fields = [form.name, form.phone, form.location, user?.email, form.bio];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  })();

  const roleColor = { admin: 'badge-red', dealer: 'badge-gold', broker: 'badge-orange', user: 'badge-blue' };

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 40, maxWidth: 780 }}>

        {/* ─── Header card ─── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 36, flexWrap: 'wrap' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, color: '#0A1628', fontWeight: 700,
            boxShadow: '0 0 0 3px var(--gold-glow-strong)',
          }}>
            {initials(user?.name)}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <h2 style={{ fontSize: '1.4rem' }}>{user?.name}</h2>
              <span className={`badge ${roleColor[user?.role] || 'badge-muted'}`}>{user?.role}</span>
              {(user?.role === 'dealer' || user?.role === 'broker') && user?.approved && <span className="badge badge-green">✓ Verified</span>}
              {(user?.role === 'dealer' || user?.role === 'broker') && !user?.approved && <span className="badge badge-orange">⏳ Pending</span>}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 6 }}>{user?.email}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              Member since {user?.createdAt ? formatDate(user.createdAt) : '—'}
            </div>
            {/* Completeness bar */}
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Profile completeness</span>
                <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600 }}>{completeness}%</span>
              </div>
              <div style={{ height: 4, background: 'var(--surface)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${completeness}%`, background: 'linear-gradient(90deg, var(--gold), var(--gold-light))', transition: 'width 0.4s' }} />
              </div>
            </div>
          </div>
          {isDealer && myStats && (
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { val: myStats.totalCars || 0,  label: 'Listed', icon: '🚗' },
                { val: myStats.totalViews || 0, label: 'Views',  icon: '👁' },
                { val: myStats.totalBids || 0,  label: 'Bids',   icon: '⚡' },
              ].map(s => (
                <div key={s.label} className="stat-box" style={{ padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18 }}>{s.icon}</div>
                  <div className="stat-value" style={{ fontSize: '1.1rem' }}>{s.val}</div>
                  <div className="stat-label" style={{ fontSize: 10 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Tabs ─── */}
        <div className="tabs">
          {TABS.map(t => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {/* ─── Profile ─── */}
        {tab === 'Profile' && (
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ marginBottom: 24 }}>Personal Details</h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <input className="input" value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Phone</label>
                  <div className="mpesa-wrap">
                    <span className="mpesa-prefix" style={{ fontSize: 12 }}>🇰🇪</span>
                    <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0712 345 678" />
                  </div>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Email (cannot change)</label>
                <input className="input" value={user?.email} disabled style={{ opacity: 0.5 }} />
              </div>
              <div className="input-group">
                <label className="input-label">Location</label>
                <input className="input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Westlands, Nairobi" />
              </div>
              {isDealer && (
                <div className="input-group">
                  <label className="input-label">Business Name</label>
                  <input className="input" value={form.businessName} onChange={e => set('businessName', e.target.value)} placeholder="TopGear Motors Ltd" />
                </div>
              )}
              <div className="input-group">
                <label className="input-label">Bio</label>
                <textarea className="input" rows={3} value={form.bio} onChange={e => set('bio', e.target.value)}
                  placeholder={isDealer ? 'Tell buyers about your dealership...' : 'A short intro...'} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-gold" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : '✓ Save Changes'}
                </button>
                {isDealer && <Link to="/dealer" className="btn btn-outline">Dealer Hub →</Link>}
              </div>
            </form>
          </div>
        )}

        {/* ─── Security ─── */}
        {tab === 'Security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card" style={{ padding: 28 }}>
              <h3 style={{ marginBottom: 6 }}>🔒 Change Password</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Min 6 characters. Use a mix of letters and numbers.</p>
              <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { key: 'current', label: 'Current Password', auto: 'current-password' },
                  { key: 'newPw',   label: 'New Password',     auto: 'new-password' },
                  { key: 'confirm', label: 'Confirm New Password', auto: 'new-password' },
                ].map(f => (
                  <div key={f.key} className="input-group">
                    <label className="input-label">{f.label}</label>
                    <input className="input" type="password" value={pwForm[f.key]}
                      onChange={e => setPw(f.key, e.target.value)} autoComplete={f.auto} />
                    {f.key === 'newPw' && pwForm.newPw && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ height: 3, background: 'var(--surface)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 2, transition: 'all 0.3s',
                            width: `${Math.min(100, pwForm.newPw.length * 10)}%`,
                            background: pwForm.newPw.length < 6 ? 'var(--red)' : pwForm.newPw.length < 10 ? 'var(--orange)' : 'var(--green)',
                          }} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                          {pwForm.newPw.length < 6 ? 'Too short' : pwForm.newPw.length < 10 ? 'Fair' : 'Strong ✓'}
                        </div>
                      </div>
                    )}
                    {f.key === 'confirm' && pwForm.confirm && pwForm.newPw !== pwForm.confirm && (
                      <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>Passwords don't match</div>
                    )}
                  </div>
                ))}
                <button className="btn btn-gold" type="submit" style={{ alignSelf: 'flex-start' }}
                  disabled={changingPw || !pwForm.current || !pwForm.newPw || pwForm.newPw !== pwForm.confirm}>
                  {changingPw ? 'Changing...' : '🔑 Update Password'}
                </button>
              </form>
            </div>
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 16 }}>Account Info</h3>
              <div className="grid-2">
                {[
                  { label: 'User ID', val: `#${user?._id?.slice(-10) || '—'}`, mono: true },
                  { label: 'Role', val: user?.role },
                  { label: 'Status', val: user?.isBanned ? '🚫 Banned' : '✅ Active' },
                  { label: 'Joined', val: user?.createdAt ? formatDate(user.createdAt) : '—' },
                ].map(r => (
                  <div key={r.label}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{r.label}</div>
                    <div style={{ fontWeight: 600, marginTop: 4, fontFamily: r.mono ? 'monospace' : undefined, fontSize: 14 }}>{r.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Activity ─── */}
        {tab === 'Activity' && (
          <div className="card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1rem' }}>💳 Transaction History</h3>
            </div>
            {loading ? (
              <div style={{ padding: 16 }}>{[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}</div>
            ) : activity.length === 0 ? (
              <div className="empty-state" style={{ padding: 48 }}>
                <div className="empty-icon">💳</div>
                <h3>No transactions yet</h3>
                <p>Your M-Pesa transactions appear here.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Car</th><th>Type</th><th>Amount</th><th>Status</th><th>Receipt</th></tr></thead>
                  <tbody>
                    {activity.map(p => (
                      <tr key={p._id}>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.createdAt ? timeAgo(p.createdAt) : '—'}</td>
                        <td style={{ fontSize: 13, fontWeight: 500 }}>{p.car?.title || '—'}</td>
                        <td><span className={`badge ${p.type === 'bid' ? 'badge-blue' : 'badge-gold'}`}>{p.type === 'bid' ? '⚡ Bid' : '💳 Buy'}</span></td>
                        <td><span className="price-tag" style={{ fontSize: '0.9rem' }}>{formatKES(p.amount)}</span></td>
                        <td>
                          <span className={`badge ${p.status === 'success' ? 'badge-green' : p.status === 'failed' ? 'badge-red' : 'badge-orange'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{p.mpesaReceiptNumber || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── Reviews ─── */}
        {tab === 'Reviews' && (
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 20 }}>⭐ Reviews About Me</h3>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface)' }} />
                      <SkeletonText lines={2} />
                    </div>
                    <div style={{ marginLeft: 42 }}><SkeletonText lines={2} /></div>
                  </div>
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-icon">⭐</div>
                <h3>No reviews yet</h3>
                <p>Reviews from buyers appear here after completed transactions.</p>
              </div>
            ) : reviews.map(r => (
              <div key={r._id} style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                      {initials(r.reviewer?.name)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{r.reviewer?.name || 'Anonymous'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{r.createdAt ? timeAgo(r.createdAt) : ''}</div>
                    </div>
                  </div>
                  <span style={{ color: 'var(--gold-light)', fontSize: 16 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>{r.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
