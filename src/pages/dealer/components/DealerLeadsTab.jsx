import { useState, useEffect, useCallback } from 'react';
import { dealerAPI } from '../../../api/api';
import { MessageSquare, Mail, Phone, Search, X, Archive } from 'lucide-react';
import { timeAgo } from './DashboardWidgets';

const STAGE_CONFIG = {
  new:             { label: 'New',           color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  contacted:       { label: 'Contacted',     color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  negotiating:     { label: 'Negotiating',   color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  test_drive:      { label: 'Test Drive',    color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
  escrow_started:  { label: 'Escrow',         color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
  sold:            { label: 'Sold',           color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  lost:            { label: 'Lost',           color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

const SOURCE_ICONS = { chat: MessageSquare, contact_form: Mail, referral: Phone };

const STAGE_ORDER = ['new', 'contacted', 'negotiating', 'test_drive', 'escrow_started', 'sold', 'lost'];

export default function DealerLeadsTab({ toast }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchLeads = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filter) params.stage = filter;
    if (search) params.search = search;
    dealerAPI.leads(params)
      .then(res => { setLeads(res.leads || []); })
      .catch(() => toast('Failed to load leads', 'error'))
      .finally(() => setLoading(false));
    // search also drives client-side filtering below; it doesn't need to re-trigger a fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, toast]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleStageChange = async (leadId, stage) => {
    try {
      await dealerAPI.updateLeadStage(leadId, { stage });
      setLeads(p => p.map(l => l._id === leadId ? { ...l, stage } : l));
      toast(`Moved to ${STAGE_CONFIG[stage]?.label || stage}`, 'success');
    } catch {
      toast('Failed to update stage', 'error');
    }
  };

  const handleArchive = async (leadId) => {
    if (!confirm('Archive this lead?')) return;
    try {
      await dealerAPI.archiveLead(leadId);
      setLeads(p => p.filter(l => l._id !== leadId));
      toast('Lead archived', 'info');
    } catch {
      toast('Failed to archive', 'error');
    }
  };

  const filtered = search.trim()
    ? leads.filter(l => {
        const q = search.toLowerCase();
        const buyer = l.buyer || {};
        const vehicle = l.vehicle || {};
        return (buyer.name || '').toLowerCase().includes(q) || (buyer.email || '').toLowerCase().includes(q) || (buyer.phone || '').includes(q) || (vehicle.title || '').toLowerCase().includes(q);
      })
    : leads;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4rem', color: '#fff', margin: 0 }}>Leads & Inquiries</h2>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)', padding: '3px 10px', borderRadius: 6 }}>{leads.length} total</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative', width: 220 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)' }} />
            <input className="input" placeholder="Search by name, email, car..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 30, fontSize: 12, height: 34, width: '100%' }} />
            {search && <X size={13} onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'rgba(255,255,255,0.25)' }} />}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('')}
          style={{ padding: '5px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer',
            background: !filter ? 'var(--gold)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${!filter ? 'var(--gold)' : 'rgba(255,255,255,0.08)'}`,
            color: !filter ? '#000' : 'rgba(255,255,255,0.5)' }}>
          All
        </button>
        {Object.entries(STAGE_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilter(key === filter ? '' : key)}
            style={{ padding: '5px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer',
              background: filter === key ? cfg.bg : 'rgba(255,255,255,0.04)',
              border: `1px solid ${filter === key ? cfg.color + '40' : 'rgba(255,255,255,0.08)'}`,
              color: filter === key ? cfg.color : 'rgba(255,255,255,0.5)' }}>
            {cfg.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.35)' }}>
          <MessageSquare size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>No leads yet</div>
          <div style={{ fontSize: 12 }}>Inquiries from buyers will appear here once they message you about your listings.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(lead => {
            const buyer = lead.buyer || {};
            const vehicle = lead.vehicle || {};
            const stageCfg = STAGE_CONFIG[lead.stage] || STAGE_CONFIG.new;
            const img = vehicle.images?.[0]?.url || vehicle.images?.[0] || '';
            const SourceIcon = SOURCE_ICONS[lead.source] || MessageSquare;

            return (
              <div key={lead._id} style={{
                background: 'var(--card)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14, padding: '14px 18px',
                display: 'grid', gridTemplateColumns: '1fr auto', gap: 12,
              }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  {img ? (
                    <img src={img} alt={vehicle.title} loading="lazy" decoding="async"
                      style={{ width: 52, height: 40, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 52, height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.04)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessageSquare size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{buyer.name || 'Unknown Buyer'}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 4, fontSize: 9, fontWeight: 700, background: stageCfg.bg, color: stageCfg.color }}>
                        {stageCfg.label}
                      </span>
                      {lead.isHot && (
                        <span style={{ fontSize: 9, fontWeight: 900, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                          🔥 HOT
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 3 }}>
                      {buyer.email && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Mail size={10} /> {buyer.email}
                      </span>}
                      {buyer.phone && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={10} /> {buyer.phone}
                      </span>}
                    </div>
                    {vehicle.title && (
                      <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600 }}>
                        Interested in: {vehicle.title}
                      </span>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <SourceIcon size={10} /> {lead.source || 'direct'}
                      </span>
                      <span>{timeAgo(lead.createdAt)}</span>
                      {lead.totalMessages > 0 && <span>{lead.totalMessages} messages</span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <select value={lead.stage} onChange={e => handleStageChange(lead._id, e.target.value)}
                    style={{ padding: '5px 8px', borderRadius: 6, background: 'var(--card)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 10, outline: 'none', cursor: 'pointer' }}>
                    {STAGE_ORDER.map(s => (
                      <option key={s} value={s}>{STAGE_CONFIG[s]?.label || s}</option>
                    ))}
                  </select>
                  <button onClick={() => handleArchive(lead._id)} title="Archive"
                    style={{ padding: '5px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', fontSize: 10, cursor: 'pointer' }}>
                    <Archive size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}