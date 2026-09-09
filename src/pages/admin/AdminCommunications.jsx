import React, { useEffect, useState } from 'react';
import { RefreshCw, RotateCcw, Activity, FileText, ShieldCheck, Send } from 'lucide-react';
import { adminAPI } from '../../api/api.exports';

const unwrap = (x) => x?.data ?? x;
const pct = (n) => `${Number(n || 0).toFixed(1)}%`;

export default function AdminCommunications() {
  const [templates, setTemplates] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [health, setHealth] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [t, a, h, r] = await Promise.all([
        adminAPI.communicationTemplates(),
        adminAPI.communicationAnalytics({ hours: 24 }),
        adminAPI.communicationProviderHealth(),
        adminAPI.communicationHistory({ limit: 50 }),
      ]);
      setTemplates(unwrap(t) || []); setAnalytics(unwrap(a) || []); setHealth(unwrap(h) || []); setHistory(unwrap(r) || []);
    } catch (e) { setError(e?.message || 'Communications control plane could not be loaded.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const retry = async (id) => {
    setBusy(id); setError('');
    try { await adminAPI.retryCommunication(id); await load(); }
    catch (e) { setError(e?.message || 'Retry rejected by the server.'); }
    finally { setBusy(''); }
  };

  return <div className="p-6 space-y-6">
    <div className="flex items-start justify-between gap-4">
      <div><div className="text-xs uppercase tracking-[.18em] text-slate-500 font-bold">Communications Control Plane</div><h1 className="text-2xl font-black text-slate-900 mt-1">Messaging Operations</h1><p className="text-sm text-slate-500 mt-1">Templates, consent, delivery health, retries and the authoritative communication ledger.</p></div>
      <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white text-sm font-bold"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>Refresh</button>
    </div>
    {error && <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">{error}</div>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="p-4 rounded-xl bg-white border"><div className="text-xs text-slate-500">Templates</div><div className="text-2xl font-black">{templates.length}</div></div>
      <div className="p-4 rounded-xl bg-white border"><div className="text-xs text-slate-500">24h delivery groups</div><div className="text-2xl font-black">{analytics.reduce((n,x)=>n+Number(x.total||0),0)}</div></div>
      <div className="p-4 rounded-xl bg-white border"><div className="text-xs text-slate-500">Providers observed</div><div className="text-2xl font-black">{health.length}</div></div>
      <div className="p-4 rounded-xl bg-white border"><div className="text-xs text-slate-500">Failed messages</div><div className="text-2xl font-black">{history.filter(x=>x.status==='failed').length}</div></div>
    </div>
    <div className="grid lg:grid-cols-2 gap-5">
      <section className="bg-white border rounded-xl overflow-hidden"><div className="p-4 border-b flex items-center gap-2 font-black"><FileText size={17}/> Templates</div><div className="divide-y">{templates.map(t=><div key={t.id} className="p-4 flex items-center justify-between gap-3"><div><div className="font-bold text-sm">{t.name}</div><div className="text-xs text-slate-500">{t.code} · {t.channel} · {t.category}</div></div><span className={`text-xs font-bold ${t.enabled?'text-emerald-600':'text-slate-400'}`}>{t.enabled?'Enabled':'Disabled'}</span></div>)}{!templates.length&&<div className="p-6 text-sm text-slate-500">No templates returned.</div>}</div></section>
      <section className="bg-white border rounded-xl overflow-hidden"><div className="p-4 border-b flex items-center gap-2 font-black"><Activity size={17}/> Provider Health</div><div className="divide-y">{health.map(p=><div key={p.provider} className="p-4 flex items-center justify-between"><div><div className="font-bold text-sm">{p.provider}</div><div className="text-xs text-slate-500">{p.total} attempts · {p.failed} failed · {p.delivered} delivered</div></div><div className="font-black text-sm">{pct(p.successRate)}</div></div>)}{!health.length&&<div className="p-6 text-sm text-slate-500">No provider deliveries recorded.</div>}</div></section>
    </div>
    <section className="bg-white border rounded-xl overflow-hidden"><div className="p-4 border-b flex items-center gap-2 font-black"><Send size={17}/> Delivery Analytics — last 24 hours</div><div className="overflow-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-slate-500 border-b"><th className="p-3">Channel</th><th className="p-3">Category</th><th className="p-3">Total</th><th className="p-3">Delivered</th><th className="p-3">Failed</th><th className="p-3">Delivery</th></tr></thead><tbody>{analytics.map(x=><tr key={`${x.channel}-${x.category}`} className="border-b last:border-0"><td className="p-3 font-bold">{x.channel}</td><td className="p-3">{x.category}</td><td className="p-3">{x.total}</td><td className="p-3">{x.delivered}</td><td className="p-3">{x.failed}</td><td className="p-3 font-bold">{pct(x.deliveryRate)}</td></tr>)}</tbody></table></div></section>
    <section className="bg-white border rounded-xl overflow-hidden"><div className="p-4 border-b flex items-center gap-2 font-black"><ShieldCheck size={17}/> Recent Delivery Ledger</div><div className="overflow-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-slate-500 border-b"><th className="p-3">Time</th><th className="p-3">Channel</th><th className="p-3">Event</th><th className="p-3">Provider</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{history.map(x=><tr key={x.id} className="border-b last:border-0"><td className="p-3 text-xs">{x.createdAt ? new Date(x.createdAt).toLocaleString() : '—'}</td><td className="p-3">{x.channel}</td><td className="p-3">{x.eventType}</td><td className="p-3">{x.provider}</td><td className="p-3 font-bold">{x.status}</td><td className="p-3">{x.status==='failed'&&<button onClick={()=>void retry(x.id)} disabled={busy===x.id} className="inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-bold"><RotateCcw size={13}/>{busy===x.id?'Retrying':'Retry'}</button>}</td></tr>)}</tbody></table></div></section>
  </div>;
}
