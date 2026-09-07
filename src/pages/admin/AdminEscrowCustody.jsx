import { useEffect, useState } from 'react';
import { adminAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { writeEscrowRulesConfig } from '../../features/Admin/hooks/escrowRulesConfig';
import { useAuth } from '../../context/AuthContext';

const EMPTY_ACCOUNT = { accountName: '', bankName: '', accountNumber: '', branch: '', currency: 'KES', isActive: true, isPrimary: false, notes: '' };
const DEFAULT_RULES = { enabled: false, privateSellerRequirement: 'mandatory', fundingMethods: ['bank_transfer'], releaseDays: 3, minimumAmount: 0, maximumAmount: '', commissionPct: 0, futureWalletEnabled: false };

export default function AdminEscrowCustody() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [accounts, setAccounts] = useState([]);
  const [account, setAccount] = useState(EMPTY_ACCOUNT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getEscrowConfig();
      setRules({ ...DEFAULT_RULES, ...(data.rules || {}) });
      setAccounts(data.accounts || []);
    } catch { toast('Failed to load escrow custody configuration', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const saveRules = async () => {
    setSaving(true);
    try {
      const nextRules = { ...rules, maximumAmount: rules.maximumAmount === '' ? null : Number(rules.maximumAmount), releaseDays: Number(rules.releaseDays), minimumAmount: Number(rules.minimumAmount), commissionPct: Number(rules.commissionPct), fundingMethods: ['bank_transfer'], futureWalletEnabled: false };
      await adminAPI.updateEscrowConfig(nextRules);
      if (user?.id) writeEscrowRulesConfig({ liveMode: !!nextRules.enabled, dealerRequirement: 'disabled', privateSellerRequirement: nextRules.privateSellerRequirement }, { id: user.id, name: user.name || user.email || 'Administrator' });
      toast('Escrow custody rules saved', 'success');
      await load();
    } catch (e) { toast(e?.response?.data?.message || 'Failed to save escrow rules', 'error'); }
    finally { setSaving(false); }
  };

  const addAccount = async () => {
    if (!account.accountName || !account.bankName || !account.accountNumber) return toast('Account name, bank name and account number are required', 'error');
    setSaving(true);
    try {
      await adminAPI.addEscrowAccount(account);
      setAccount(EMPTY_ACCOUNT);
      toast('Escrow bank account added', 'success');
      await load();
    } catch (e) { toast(e?.response?.data?.message || 'Failed to add account', 'error'); }
    finally { setSaving(false); }
  };

  const removeAccount = async (id) => {
    if (!window.confirm('Deactivate/delete this escrow account? Accounts already referenced by escrows cannot be deleted.')) return;
    try { await adminAPI.deleteEscrowAccount(id); toast('Escrow account removed', 'success'); await load(); }
    catch (e) { toast(e?.response?.data?.message || 'Account cannot be removed', 'error'); }
  };

  if (loading) return <div className="card" style={{ padding: 24 }}>Loading escrow custody configuration…</div>;

  return <div style={{ display: 'grid', gap: 20 }}>
    <div className="card" style={{ padding: 24, border: '1px solid var(--border)' }}>
      <h3 style={{ fontSize: 18, marginBottom: 8 }}>🏦 Vehicle Escrow Custody</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6, marginBottom: 18 }}>
        Vehicle escrow is for private-seller transactions only. KAYAD does <strong>not</strong> use M-Pesa STK to collect full vehicle purchase funds. Until the future KAYAD e-wallet is built, buyers fund escrow by bank transfer into an administrator-configured custody account.
      </p>
      <div style={{ display: 'grid', gap: 14, maxWidth: 720 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}><input type="checkbox" checked={!!rules.enabled} onChange={e => setRules(r => ({ ...r, enabled: e.target.checked }))} /> Enable private-seller vehicle escrow</label>
        <label>Private-seller rule<select className="input" value={rules.privateSellerRequirement} onChange={e => setRules(r => ({ ...r, privateSellerRequirement: e.target.value }))}><option value="mandatory">Mandatory</option><option value="optional">Optional</option><option value="disabled">Disabled</option></select></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label>Minimum (KES)<input className="input" type="number" min="0" value={rules.minimumAmount} onChange={e => setRules(r => ({ ...r, minimumAmount: e.target.value }))} /></label>
          <label>Maximum (KES)<input className="input" type="number" min="0" value={rules.maximumAmount ?? ''} onChange={e => setRules(r => ({ ...r, maximumAmount: e.target.value }))} placeholder="No limit" /></label>
          <label>Release window (days)<input className="input" type="number" min="0" max="90" value={rules.releaseDays} onChange={e => setRules(r => ({ ...r, releaseDays: e.target.value }))} /></label>
          <label>Escrow fee (%)<input className="input" type="number" min="0" max="50" value={rules.commissionPct} onChange={e => setRules(r => ({ ...r, commissionPct: e.target.value }))} /></label>
        </div>
        <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 8, fontSize: 12 }}><strong>Funding rail:</strong> Bank transfer only. <strong>Future:</strong> KAYAD e-wallet remains disabled and is not represented as a live funding method.</div>
        <button className="btn btn-gold" onClick={saveRules} disabled={saving}>{saving ? 'Saving…' : 'Save Escrow Rules'}</button>
      </div>
    </div>

    <div className="card" style={{ padding: 24 }}>
      <h3 style={{ fontSize: 18, marginBottom: 8 }}>Custody Accounts</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 16 }}>These are KAYAD/admin-controlled bank accounts where private-seller vehicle escrow funds are instructed to be deposited. Never enter a seller's personal account here.</p>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
        {['accountName','bankName','accountNumber','branch'].map(key => <input key={key} className="input" placeholder={key.replace(/([A-Z])/g, ' $1')} value={account[key]} onChange={e => setAccount(a => ({ ...a, [key]: e.target.value }))} />)}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={account.isPrimary} onChange={e => setAccount(a => ({ ...a, isPrimary: e.target.checked }))} /> Primary custody account</label>
        <button className="btn btn-gold" onClick={addAccount} disabled={saving}>Add Custody Account</button>
      </div>
      <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
        {accounts.map(a => <div key={a.id} style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}><div><strong>{a.accountName}</strong><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.bankName} · {a.accountNumber}{a.branch ? ` · ${a.branch}` : ''}</div></div><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{a.isPrimary && <span className="badge badge-green">PRIMARY</span>}<button className="btn btn-sm btn-outline" onClick={() => removeAccount(a.id)}>Remove</button></div></div>)}
        {!accounts.length && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No active escrow custody account configured. Escrow cannot be enabled until one is added.</div>}
      </div>
    </div>
  </div>;
}
