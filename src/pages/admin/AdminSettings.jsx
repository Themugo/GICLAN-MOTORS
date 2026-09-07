import { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api/api';
import AdminSettingsBranding from './AdminSettingsBranding';

const DEFAULTS = {
  platformName: 'Giclan Motors',
  supportEmail: 'support@giclanmotors.co.ke',
  supportPhone: '254700100200',
  dealerCommission: 5,
  bidCommitmentPct: 5,
  escrowReleaseDays: 3,
  maxListingImages: 8,
  allowGuestBrowsing: true,
  requireDealerApproval: true,
};

// Default branding with green theme
const DEFAULT_BRANDING = {
  logoType: 'icon',
  logoText: 'KAYAD',
  logoUrl: '',
  brandTagline: 'Premium Automotive Marketplace',
  primaryColor: '#16C4A4',
  primaryLight: '#2DD9BE',
  primaryDark: '#0C7B68',
  primaryGlow: 'rgba(22, 196, 164, 0.25)',
  accentColor: '#3B82F6',
  backgroundColor: '#FDFAF5',
  surfaceColor: '#F7F2E8',
  cardColor: '#FFFFFF',
  textColor: '#2E2B28',
  textMutedColor: '#9A9088',
  textDimColor: '#C8BFB0',
  borderColor: '#E0D8C8',
  successColor: '#10B981',
  dangerColor: '#EF4444',
  warningColor: '#F59E0B',
  infoColor: '#3B82F6',
};

export default function AdminSettings() {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Platform config
  const [config, setConfig] = useState(DEFAULTS);
  const [daraja, setDaraja] = useState({ environment: 'sandbox', consumerKey: '', consumerSecret: '', passkey: '', shortCode: '' });
  const [bank, setBank] = useState({ bankName: '', accountName: '', accountNumber: '', branch: '', swiftCode: '', reconciliationEmail: '' });
  const [reconcile, setReconcile] = useState({ autoReconcile: true, matchThresholdMins: 1440, schedule: 'every 6 hours', notifyOnMismatch: true, defaultNarration: '' });

  // Branding state
  const [branding, setBranding] = useState(DEFAULT_BRANDING);

  // Test payment state
  const [testPhone, setTestPhone] = useState('254708374149');
  const [testAmount, setTestAmount] = useState(1);
  const [testingMpesa, setTestingMpesa] = useState(false);

  // Audit log
  const [auditLog, setAuditLog] = useState([]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { config: c } = await adminAPI.getConfig();
      if (c) {
        setConfig({
          platformName: c.platformName || DEFAULTS.platformName,
          supportEmail: c.supportEmail || DEFAULTS.supportEmail,
          supportPhone: c.supportPhone || DEFAULTS.supportPhone,
          dealerCommission: c.dealerCommission ?? DEFAULTS.dealerCommission,
          bidCommitmentPct: c.bidCommitmentPct ?? DEFAULTS.bidCommitmentPct,
          escrowReleaseDays: c.escrowReleaseDays ?? DEFAULTS.escrowReleaseDays,
          maxListingImages: c.maxListingImages ?? DEFAULTS.maxListingImages,
          allowGuestBrowsing: c.allowGuestBrowsing ?? DEFAULTS.allowGuestBrowsing,
          requireDealerApproval: c.requireDealerApproval ?? DEFAULTS.requireDealerApproval,
        });
        if (c.daraja) setDaraja(c.daraja);
        if (c.bank) setBank(c.bank);
        if (c.reconciliation) setReconcile(c.reconciliation);
        // Load branding config
        if (c.branding) {
          setBranding({ ...DEFAULT_BRANDING, ...c.branding });
        }
      }
    } catch { /* keep server-backed defaults when configuration is unavailable */ }

    try {
      const { entries } = await adminAPI.getAuditLog({ limit: 100 });
      setAuditLog(entries || []);
    } catch { /* ignore */ }

    setLoading(false);
  };

  useEffect(() => { loadConfig(); }, []);

  const saveConfig = async (section) => {
    setSaving(true);
    try {
      const body = {};
      if (!section || section === 'general') {
        Object.assign(body, {
          platformName: config.platformName,
          supportEmail: config.supportEmail,
          supportPhone: config.supportPhone,
          dealerCommission: Number(config.dealerCommission),
          bidCommitmentPct: Number(config.bidCommitmentPct),
          escrowReleaseDays: Number(config.escrowReleaseDays),
          maxListingImages: Number(config.maxListingImages),
          allowGuestBrowsing: config.allowGuestBrowsing,
          requireDealerApproval: config.requireDealerApproval,
        });
      }
      if (!section || section === 'payments') {
        body.daraja = daraja;
        body.bank = bank;
      }
      if (!section || section === 'reconciliation') {
        body.reconciliation = reconcile;
      }
      if (!section || section === 'branding') {
        body.branding = branding;
      }
      await adminAPI.updateConfig(body);
      toast('Settings saved', 'success');
      await loadConfig();
    } catch {
      toast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const testMpesa = async () => {
    if (!testPhone || !testAmount) {
      toast('Phone and amount required', 'error');
      return;
    }
    setTestingMpesa(true);
    try {
      await adminAPI.testMpesa({ phone: testPhone, amount: Number(testAmount) });
      toast(`STK push sent to ${testPhone} for KES ${testAmount}`, 'success');
    } catch {
      toast('M-Pesa test failed — check Daraja config', 'error');
    } finally {
      setTestingMpesa(false);
    }
  };



  const Field = ({ label, hint, children }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>
        {label}
        {hint && <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>{hint}</div>}
      </label>
      {children}
    </div>
  );

  const tabs = useMemo(() => {
    const all = [
      { id: 'general', label: '⚙ General' },
      { id: 'branding', label: '🎨 Branding' },
      { id: 'payments', label: '💳 Payments' },
      { id: 'reconciliation', label: '🔄 Reconciliation' },
      { id: 'audit', label: '📋 Audit Log' },
    ];
    return isSuperAdmin ? all : all.slice(0, 3);
  }, [isSuperAdmin]);

  if (loading) {
    return (
      <div className="page">
        <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 900 }}>
          <div className="loading-center"><div className="spinner" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 900 }}>
        <div style={{ marginBottom: 24 }}>
          <div className="section-eyebrow">Admin</div>
          <h2>Settings</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Platform config, payment gateways, reconciliation, and sub-admin management</p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`btn btn-sm ${tab === t.id ? 'btn-gold' : 'btn-outline'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══ BRANDING ═══ */}
        {tab === 'branding' && (
          <AdminSettingsBranding
            branding={branding}
            setBranding={setBranding}
            config={config}
            setConfig={setConfig}
            saveConfig={saveConfig}
            saving={saving}
          />
        )}

        {/* ═══ GENERAL ═══ */}
        {tab === 'general' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>Platform Info</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { key: 'platformName', label: 'Platform Name', type: 'text' },
                  { key: 'supportEmail', label: 'Support Email', type: 'email' },
                  { key: 'supportPhone', label: 'Support Phone', type: 'text' },
                ].map(f => (
                  <div key={f.key} className="input-group">
                    <label className="input-label">{f.label}</label>
                    <input className="input" type={f.type} value={config[f.key]}
                      onChange={e => setConfig(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>Fees & Limits</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { key: 'dealerCommission', label: 'Dealer Commission (%)', type: 'number', min: 0, max: 50 },
                  { key: 'bidCommitmentPct', label: 'Bid Commitment (%)', type: 'number', min: 0, max: 100 },
                  { key: 'escrowReleaseDays', label: 'Escrow Release (days)', type: 'number', min: 1, max: 30 },
                  { key: 'maxListingImages', label: 'Max Listing Images', type: 'number', min: 1, max: 20 },
                ].map(f => (
                  <div key={f.key} className="input-group">
                    <label className="input-label">{f.label}</label>
                    <input className="input" type={f.type} min={f.min} max={f.max} value={config[f.key]}
                      onChange={e => setConfig(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>Toggle Options</h3>
              {[
                { key: 'allowGuestBrowsing', label: 'Allow Guest Browsing' },
                { key: 'requireDealerApproval', label: 'Require Dealer Approval' },
              ].map(f => (
                <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '8px 0' }}>
                  <input type="checkbox" checked={config[f.key]} onChange={e => setConfig(p => ({ ...p, [f.key]: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: 'var(--gold)' }} />
                  <span style={{ fontSize: 14 }}>{f.label}</span>
                </label>
              ))}
              <div style={{ marginTop: 16 }}>
                <button className="btn btn-gold" onClick={() => saveConfig('general')} disabled={saving} style={{ width: '100%' }}>
                  {saving ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Saving...</> : '💾 Save General Settings'}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ═══ PAYMENTS ═══ */}
        {tab === 'payments' && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18 }}>📱 Daraja / M-Pesa</h3>
                <span className={`badge ${daraja.environment === 'production' ? 'badge-orange' : 'badge-green'}`} style={{ textTransform: 'uppercase' }}>
                  {daraja.environment}
                </span>
              </div>

              <div style={{ display: 'grid', gap: 16, maxWidth: 700 }}>
                <Field label="Environment">
                  <select className="input" value={daraja.environment}
                    onChange={e => setDaraja(p => ({ ...p, environment: e.target.value }))}
                    style={{ width: 180, height: 38 }}>
                    <option value="sandbox">Sandbox</option>
                    <option value="production">Production</option>
                  </select>
                </Field>

                <Field label="Consumer Key" hint="Safaricom Daraja API consumer key">
                  <input className="input" type="text" value={daraja.consumerKey}
                    onChange={e => setDaraja(p => ({ ...p, consumerKey: e.target.value }))}
                    style={{ width: 280, height: 38 }} />
                </Field>

                <Field label="Consumer Secret">
                  <input className="input" type="password" value={daraja.consumerSecret}
                    onChange={e => setDaraja(p => ({ ...p, consumerSecret: e.target.value }))}
                    style={{ width: 280, height: 38 }} />
                </Field>

                <Field label="Passkey" hint="Online passkey for STK Push">
                  <input className="input" type="password" value={daraja.passkey}
                    onChange={e => setDaraja(p => ({ ...p, passkey: e.target.value }))}
                    style={{ width: 280, height: 38 }} />
                </Field>

                <Field label="Short Code" hint="Paybill/Till number">
                  <input className="input" type="text" value={daraja.shortCode}
                    onChange={e => setDaraja(p => ({ ...p, shortCode: e.target.value }))}
                    style={{ width: 180, height: 38 }} />
                </Field>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <h4 style={{ fontSize: 14, marginBottom: 12 }}>🧪 Test M-Pesa Payment</h4>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div>
                      <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Test Phone (254...)</label>
                      <input className="input" type="text" value={testPhone}
                        onChange={e => setTestPhone(e.target.value)}
                        style={{ width: 180, height: 38 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Amount (KES)</label>
                      <input className="input" type="number" min={1} max={1000} value={testAmount}
                        onChange={e => setTestAmount(Number(e.target.value))}
                        style={{ width: 100, height: 38 }} />
                    </div>
                    <button className="btn btn-gold" onClick={testMpesa} disabled={testingMpesa} style={{ height: 38 }}>
                      {testingMpesa ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Sending...</> : '💳 Send Test Payment'}
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                    Sends a real STK Push to the test phone via Daraja.
                  </p>
                </div>

                <div style={{ marginTop: 8 }}>
                  <button className="btn btn-gold" onClick={() => saveConfig('payments')} disabled={saving}>
                    {saving ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Saving...</> : '💾 Save Payment Settings'}
                  </button>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 18, marginBottom: 20 }}>🏦 Bank Transfer</h3>
              <div style={{ display: 'grid', gap: 16, maxWidth: 700 }}>
                {[
                  { key: 'bankName', label: 'Bank Name' },
                  { key: 'accountName', label: 'Account Name' },
                  { key: 'accountNumber', label: 'Account Number' },
                  { key: 'branch', label: 'Branch' },
                  { key: 'swiftCode', label: 'SWIFT Code' },
                ].map(f => (
                  <Field key={f.key} label={f.label}>
                    <input className="input" type="text" value={bank[f.key]}
                      onChange={e => setBank(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width: 280, height: 38 }} />
                  </Field>
                ))}
                <Field label="Reconciliation Email" hint="Bank statement email for auto-reconciliation">
                  <input className="input" type="email" value={bank.reconciliationEmail}
                    onChange={e => setBank(p => ({ ...p, reconciliationEmail: e.target.value }))}
                    style={{ width: 280, height: 38 }} />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* ═══ RECONCILIATION ═══ */}
        {tab === 'reconciliation' && (
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 18, marginBottom: 20 }}>🔄 Auto-Reconciliation</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Automatically match M-Pesa and bank deposits to platform transactions.
            </p>
            <div style={{ display: 'grid', gap: 20, maxWidth: 700 }}>
              <Field label="Auto-Reconciliation">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={reconcile.autoReconcile}
                    onChange={e => setReconcile(p => ({ ...p, autoReconcile: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: 'var(--gold)' }} />
                  <span style={{ fontSize: 13 }}>Enabled</span>
                </label>
              </Field>

              <Field label="Match Threshold (minutes)" hint="Max time diff to match payment to transaction">
                <input className="input" type="number" min={60} max={10080} value={reconcile.matchThresholdMins}
                  onChange={e => setReconcile(p => ({ ...p, matchThresholdMins: Number(e.target.value) }))}
                  style={{ width: 120, height: 38 }} />
              </Field>

              <Field label="Schedule">
                <select className="input" value={reconcile.schedule}
                  onChange={e => setReconcile(p => ({ ...p, schedule: e.target.value }))}
                  style={{ width: 180, height: 38 }}>
                  <option value="every hour">Every hour</option>
                  <option value="every 6 hours">Every 6 hours</option>
                  <option value="every 12 hours">Every 12 hours</option>
                  <option value="daily">Daily</option>
                </select>
              </Field>

              <Field label="Default Narration" hint="Narration to match in bank statements">
                <input className="input" type="text" value={reconcile.defaultNarration}
                  onChange={e => setReconcile(p => ({ ...p, defaultNarration: e.target.value }))}
                  style={{ width: 280, height: 38 }} />
              </Field>

              <Field label="Notify on Mismatch">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={reconcile.notifyOnMismatch}
                    onChange={e => setReconcile(p => ({ ...p, notifyOnMismatch: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: 'var(--gold)' }} />
                  <span style={{ fontSize: 13 }}>Send email alert</span>
                </label>
              </Field>
            </div>
            <div style={{ marginTop: 20 }}>
              <button className="btn btn-gold" onClick={() => saveConfig('reconciliation')} disabled={saving}>
                {saving ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Saving...</> : '💾 Save Reconciliation Settings'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ AUDIT LOG ═══ */}
        {tab === 'audit' && isSuperAdmin && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem' }}>Immutable Audit Log</h3>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{auditLog.length} entries</span>
            </div>
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Action</th>
                    <th>Admin</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No audit entries yet</td></tr>
                  ) : auditLog.map((entry, i) => (
                    <tr key={entry._id || i}>
                      <td style={{ color: 'var(--text-dim)', fontFamily: 'monospace', fontSize: 12 }}>{auditLog.length - i}</td>
                      <td style={{ fontSize: 13 }}>{entry.action}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{entry.admin}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        {entry.createdAt ? new Date(entry.createdAt).toLocaleString('en-KE') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
