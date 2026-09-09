import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, RefreshCw, ShieldCheck, Siren, TrendingUp } from 'lucide-react';
import { getControlPlaneSnapshot, getLiveActivity } from '../../../services/commandCenterApi';
// getMissionControl remains available as the legacy read alias; snapshot is now canonical.

import { useSocket } from '../../../context/SocketContext';

const tone = (status = '') => {
  if (['healthy', 'good', 'low', 'completed'].includes(String(status).toLowerCase())) return 'text-emerald-700 bg-emerald-50';
  if (['warning', 'elevated', 'acknowledged'].includes(String(status).toLowerCase())) return 'text-amber-700 bg-amber-50';
  return 'text-rose-700 bg-rose-50';
};

function Metric({ icon: Icon, label, value, hint }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between"><span className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</span><Icon size={18} className="text-slate-400" /></div>
    <div className="mt-3 text-2xl font-semibold text-slate-950">{value ?? '—'}</div>
    {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
  </div>;
}

export default function EnterpriseCommandCenter() {
  const socket = useSocket();
  const [data, setData] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [snapshot, live] = await Promise.all([getControlPlaneSnapshot(), getLiveActivity({ limit: 50 })]);
      setData(snapshot?.data?.data || snapshot?.data || null);
      setActivity(live?.data?.data?.events || live?.data?.events || []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.response?.data?.error || 'Unable to load command-center telemetry.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { const ch=socket.joinControlPlane?.({onUpdate:()=>{void load();}}); return () => { if(ch) socket.leaveChannel(ch); }; }, [socket]);

  const metrics = useMemo(() => {
    const overall = {};
    const business = data?.counts || {};
    return [
      { icon: Activity, label: 'Platform health', value: data ? 'Live' : '—', hint: overall.riskLevel ? `Risk: ${overall.riskLevel}` : 'Live system assessment' },
      { icon: TrendingUp, label: 'Active users', value: business.users ?? '—', hint: 'Current platform population' },
      { icon: Siren, label: 'Open incidents', value: data?.queues?.openIncidents ?? 0, hint: 'Active operational incidents' },
      { icon: AlertTriangle, label: 'Open alerts', value: data?.queues?.openAlerts ?? 0, hint: 'Alerts requiring attention' },
    ];
  }, [data]);

  if (loading && !data) return <section className="p-8"><div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading live command center…</div></section>;

  return <section className="space-y-6 p-6 md:p-8">
    <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-lg md:flex-row md:items-center md:justify-between">
      <div><div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400"><ShieldCheck size={15} /> Enterprise operations</div><h1 className="mt-2 text-2xl font-semibold">Command Center</h1><p className="mt-1 max-w-2xl text-sm text-slate-300">Live, evidence-backed operational state across the KAYAD platform. No synthetic KPIs or arbitrary execution.</p></div>
      <button type="button" onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh</button>
    </header>

    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(m => <Metric key={m.label} {...m} />)}</div>

    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="font-semibold text-slate-950">Control-plane state</h2><p className="text-xs text-slate-500">Authoritative Supabase-backed queues</p></div><CheckCircle2 size={18} className="text-slate-400" /></div>
        <div className="grid grid-cols-2 gap-3 p-5 text-sm">
          <div className="rounded-xl bg-slate-50 p-4">Users <strong className="float-right">{data?.counts?.users ?? 0}</strong></div>
          <div className="rounded-xl bg-slate-50 p-4">Listings <strong className="float-right">{data?.counts?.cars ?? 0}</strong></div>
          <div className="rounded-xl bg-slate-50 p-4">Dealers <strong className="float-right">{data?.counts?.dealers ?? 0}</strong></div>
          <div className="rounded-xl bg-slate-50 p-4">Escrows <strong className="float-right">{data?.counts?.escrows ?? 0}</strong></div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-semibold text-slate-950">Priority queues</h2><p className="text-xs text-slate-500">Current actionable state</p></div><div className="divide-y divide-slate-100">
        {[['Open incidents',data?.queues?.openIncidents],['Open alerts',data?.queues?.openAlerts],['Disputed escrows',data?.queues?.disputedEscrows],['Pending payments',data?.queues?.pendingPayments]].map(([label,value])=><div key={label} className="flex justify-between p-4 text-sm"><span>{label}</span><strong>{value ?? 0}</strong></div>)}
      </div></div>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><div className="flex items-center gap-2"><Clock3 size={18} className="text-slate-400" /><h2 className="font-semibold text-slate-950">Live activity</h2></div></div><div className="divide-y divide-slate-100">{activity.slice(0, 20).map(event => <div key={`${event.type}-${event.id}-${event.createdAt}`} className="flex items-center justify-between gap-4 p-4"><div><div className="font-medium text-slate-900">{event.title}</div><div className="mt-1 text-xs capitalize text-slate-500">{event.type}{event.status ? ` · ${event.status}` : ''}</div></div><time className="shrink-0 text-xs text-slate-400">{event.createdAt ? new Date(event.createdAt).toLocaleString() : '—'}</time></div>)}{!activity.length && <div className="p-8 text-sm text-slate-500">No recent activity is available.</div>}</div></div>
  </section>;
}
