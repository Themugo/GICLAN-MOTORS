import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dealerAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { Users, Mail, Shield, ChevronDown, Trash2, Plus, RefreshCw, Settings, Eye, Edit3, DollarSign, MessageCircle } from 'lucide-react';

const ROLES = [
  { id: 'manager',         label: 'Manager',         desc: 'Full business access, can manage team',       color: '#a855f7' },
  { id: 'sales_agent',     label: 'Sales Agent',     desc: 'List and edit cars, chat with buyers',         color: 'var(--gold)' },
  { id: 'lot_agent',       label: 'Lot Agent',       desc: 'Upload and manage car photos & listings',      color: '#3b82f6' },
  { id: 'finance_officer', label: 'Finance Officer', desc: 'View earnings and payment records',             color: '#22c55e' },
  { id: 'viewer',          label: 'Viewer',          desc: 'Read-only access to listings and analytics',   color: 'rgba(255,255,255,0.45)' },
];

const ROLE_DEFAULTS = {
  manager:         { canListCars:true,  canEditCars:true,  canDeleteCars:true,  canViewEarnings:true,  canManageTeam:true,  canApproveDeals:true,  canChatBuyers:true,  canEditSettings:true  },
  sales_agent:     { canListCars:true,  canEditCars:true,  canDeleteCars:false, canViewEarnings:false, canManageTeam:false, canApproveDeals:false, canChatBuyers:true,  canEditSettings:false },
  lot_agent:       { canListCars:true,  canEditCars:true,  canDeleteCars:false, canViewEarnings:false, canManageTeam:false, canApproveDeals:false, canChatBuyers:false, canEditSettings:false },
  finance_officer: { canListCars:false, canEditCars:false, canDeleteCars:false, canViewEarnings:true,  canManageTeam:false, canApproveDeals:false, canChatBuyers:false, canEditSettings:false },
  viewer:          { canListCars:false, canEditCars:false, canDeleteCars:false, canViewEarnings:false, canManageTeam:false, canApproveDeals:false, canChatBuyers:false, canEditSettings:false },
};

const PERMISSIONS = [
  { key: 'canListCars',     label: 'List Cars',        icon: Plus },
  { key: 'canEditCars',     label: 'Edit Cars',        icon: Edit3 },
  { key: 'canDeleteCars',   label: 'Delete Cars',      icon: Trash2 },
  { key: 'canViewEarnings', label: 'View Earnings',    icon: DollarSign },
  { key: 'canManageTeam',   label: 'Manage Team',      icon: Users },
  { key: 'canApproveDeals', label: 'Approve Deals',    icon: Shield },
  { key: 'canChatBuyers',   label: 'Chat with Buyers', icon: MessageCircle },
  { key: 'canEditSettings', label: 'Edit Settings',    icon: Settings },
];

function RoleBadge({ role }) {
  const r = ROLES.find(x => x.id === role) || ROLES[1];
  return (
    <span style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: `${r.color}14`, border: `1px solid ${r.color}35`, color: r.color, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
      {r.label}
    </span>
  );
}

function StatusDot({ status }) {
  const color = status === 'active' ? '#22c55e' : status === 'invited' ? 'var(--gold)' : '#ef4444';
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />;
}

export default function DealerTeam() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [inviting, setInviting]     = useState(false);

  const [invite, setInvite] = useState({ email: '', role: 'sales_agent' });
  const [customPerms, setCustomPerms] = useState({});

  const load = () => {
    setLoading(true);
    dealerAPI.getTeam().then(d => setMembers(d.members || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async () => {
    if (!invite.email) { toast('Enter an email address', 'error'); return; }
    setInviting(true);
    try {
      await dealerAPI.inviteMember({ email: invite.email, role: invite.role, permissions: customPerms });
      toast(`Invite sent to ${invite.email}`, 'success');
      setInvite({ email: '', role: 'sales_agent' });
      setCustomPerms({});
      setShowInvite(false);
      load();
    } catch (e) {
      toast(e?.response?.data?.message || 'Failed to send invite', 'error');
    } finally { setInviting(false); }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await dealerAPI.updateMember(memberId, { role: newRole, permissions: ROLE_DEFAULTS[newRole] });
      setMembers(p => p.map(m => m._id === memberId ? { ...m, role: newRole, permissions: ROLE_DEFAULTS[newRole] } : m));
      toast('Role updated', 'success');
    } catch { toast('Failed', 'error'); }
  };

  const handlePermToggle = async (memberId, permKey, current) => {
    try {
      await dealerAPI.updateMember(memberId, { permissions: { [permKey]: !current } });
      setMembers(p => p.map(m => m._id === memberId ? { ...m, permissions: { ...m.permissions, [permKey]: !current } } : m));
    } catch { toast('Failed', 'error'); }
  };

  const handleRemove = async (memberId, name) => {
    if (!confirm(`Remove ${name} from your team?`)) return;
    try {
      await dealerAPI.removeMember(memberId);
      setMembers(p => p.filter(m => m._id !== memberId));
      toast('Removed from team', 'info');
    } catch { toast('Failed', 'error'); }
  };

  const handleSuspend = async (memberId, current) => {
    try {
      const next = current === 'active' ? 'suspended' : 'active';
      await dealerAPI.updateMember(memberId, { status: next });
      setMembers(p => p.map(m => m._id === memberId ? { ...m, status: next } : m));
      toast(next === 'suspended' ? 'Member suspended' : 'Member reinstated', 'info');
    } catch { toast('Failed', 'error'); }
  };

  return (
    <div style={{ background: '#050505', minHeight: '100vh' }}>
      {/* HEADER */}
      <div style={{ background: 'linear-gradient(180deg, rgba(212,196,168,0.04) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '36px 0 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 6 }}>Dealer Hub</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.6rem,3vw,2.2rem)', color: '#fff', margin: 0 }}>
              My <span style={{ color: 'var(--gold)' }}>Team</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 6 }}>
              You are the admin of your dealership. Invite staff, assign roles, and control access.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={load} style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button onClick={() => setShowInvite(true)} style={{ padding: '10px 20px', borderRadius: 10, background: 'var(--gold)', border: 'none', color: '#000', fontSize: 12, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <Plus size={14} /> Invite Member
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 32px' }}>

        {/* INVITE MODAL */}
        {showInvite && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4rem', color: '#fff', margin: 0 }}>Invite Team Member</h2>
                <button onClick={() => setShowInvite(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8 }}>Email Address</label>
                <input placeholder="colleague@example.com" value={invite.email} onChange={e => setInvite(p => ({ ...p, email: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(212,196,168,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 10 }}>Role</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ROLES.map(r => (
                    <div key={r.id} onClick={() => { setInvite(p => ({ ...p, role: r.id })); setCustomPerms(ROLE_DEFAULTS[r.id]); }}
                      style={{ padding: '12px 16px', borderRadius: 10, border: `1px solid ${invite.role === r.id ? r.color + '50' : 'rgba(255,255,255,0.07)'}`, background: invite.role === r.id ? `${r.color}0a` : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.15s' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: invite.role === r.id ? r.color : 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: invite.role === r.id ? '#fff' : 'rgba(255,255,255,0.65)' }}>{r.label}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{r.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom permissions */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 10 }}>
                  Fine-tune Permissions
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {PERMISSIONS.map(p => {
                    const on = customPerms[p.key] ?? ROLE_DEFAULTS[invite.role]?.[p.key] ?? false;
                    return (
                      <div key={p.key} onClick={() => setCustomPerms(prev => ({ ...prev, [p.key]: !on }))}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, border: `1px solid ${on ? 'rgba(212,196,168,0.25)' : 'rgba(255,255,255,0.06)'}`, background: on ? 'rgba(212,196,168,0.06)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.15s' }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, background: on ? 'var(--gold)' : 'rgba(255,255,255,0.08)', border: `1px solid ${on ? 'var(--gold)' : 'rgba(255,255,255,0.12)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {on && <span style={{ color: '#000', fontSize: 10, fontWeight: 900 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 12, color: on ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: on ? 600 : 400 }}>{p.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowInvite(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleInvite} disabled={inviting || !invite.email} style={{ flex: 2, padding: '12px', borderRadius: 10, background: invite.email ? 'var(--gold)' : 'rgba(255,255,255,0.05)', border: 'none', color: invite.email ? '#000' : 'rgba(255,255,255,0.2)', fontSize: 13, fontWeight: 900, cursor: invite.email ? 'pointer' : 'default', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {inviting ? 'Sending…' : 'Send Invite'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TEAM MEMBERS TABLE */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>
        ) : members.length === 0 ? (
          <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>👥</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.3rem', color: '#fff', marginBottom: 8 }}>No Team Members Yet</h3>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, maxWidth: 380, margin: '0 auto 24px', lineHeight: 1.7 }}>
              Invite your sales agents, lot managers, and finance officers to collaborate in your dealership dashboard.
            </p>
            <button onClick={() => setShowInvite(true)} style={{ padding: '12px 28px', background: 'var(--gold)', border: 'none', borderRadius: 9999, color: '#000', fontSize: 12, fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Invite First Member
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {members.map(m => {
              const isEditing = editingId === m._id;
              const memberUser = m.member || {};
              const name = memberUser.name || m.inviteEmail || 'Invited User';
              return (
                <div key={m._id} style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                  {/* Member row */}
                  <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    {/* Avatar */}
                    <div style={{ width: 44, height: 44, borderRadius: 11, background: 'linear-gradient(135deg, rgba(212,196,168,0.3), rgba(212,196,168,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 900, color: 'var(--gold)', flexShrink: 0, fontFamily: 'var(--font-display)' }}>
                      {name[0]?.toUpperCase()}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{name}</span>
                        <StatusDot status={m.status} />
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'capitalize' }}>{m.status}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{memberUser.email || m.inviteEmail}</div>
                    </div>

                    {/* Role selector */}
                    <div style={{ position: 'relative' }}>
                      <select value={m.role} onChange={e => handleRoleChange(m._id, e.target.value)}
                        style={{ padding: '7px 28px 7px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: '#111', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none', appearance: 'none' }}>
                        {ROLES.map(r => <option key={r.id} value={r.id} style={{ background: '#111' }}>{r.label}</option>)}
                      </select>
                      <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }} />
                    </div>
                    <RoleBadge role={m.role} />

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => setEditingId(isEditing ? null : m._id)}
                        style={{ padding: '7px 14px', borderRadius: 8, background: isEditing ? 'rgba(212,196,168,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isEditing ? 'rgba(212,196,168,0.3)' : 'rgba(255,255,255,0.09)'}`, color: isEditing ? 'var(--gold)' : 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        {isEditing ? 'Done' : 'Permissions'}
                      </button>
                      <button onClick={() => handleSuspend(m._id, m.status)}
                        style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: m.status === 'active' ? 'rgba(249,115,22,0.75)' : '#22c55e', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        {m.status === 'active' ? 'Suspend' : 'Reinstate'}
                      </button>
                      <button onClick={() => handleRemove(m._id, name)}
                        style={{ padding: '7px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.14)', color: 'rgba(239,68,68,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Permission expander */}
                  {isEditing && (
                    <div style={{ padding: '0 20px 18px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', margin: '14px 0 12px' }}>Fine-grained Permissions</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 165px), 1fr))', gap: 8 }}>
                        {PERMISSIONS.map(p => {
                          const on = m.permissions?.[p.key] ?? false;
                          return (
                            <div key={p.key} onClick={() => handlePermToggle(m._id, p.key, on)}
                              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 12px', borderRadius: 8, border: `1px solid ${on ? 'rgba(212,196,168,0.22)' : 'rgba(255,255,255,0.06)'}`, background: on ? 'rgba(212,196,168,0.06)' : 'transparent', cursor: 'pointer', transition: 'all 0.15s' }}>
                              <div style={{ width: 15, height: 15, borderRadius: 4, background: on ? 'var(--gold)' : 'rgba(255,255,255,0.08)', border: `1px solid ${on ? 'var(--gold)' : 'rgba(255,255,255,0.12)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {on && <span style={{ color: '#000', fontSize: 9, fontWeight: 900 }}>✓</span>}
                              </div>
                              <span style={{ fontSize: 11, color: on ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)', fontWeight: on ? 600 : 400 }}>{p.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ROLES LEGEND */}
        <div style={{ marginTop: 32, background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.25)', marginBottom: 14 }}>Role Guide</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 148px), 1fr))', gap: 12 }}>
            {ROLES.map(r => (
              <div key={r.id}>
                <RoleBadge role={r.id} />
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6, lineHeight: 1.5 }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
