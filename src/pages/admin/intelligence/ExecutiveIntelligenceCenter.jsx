import { useEffect, useState } from 'react';
import { BarChart3, Users, Car, ShieldCheck, TrendingUp, RefreshCw } from 'lucide-react';
import { getExecutiveAnalytics } from '../../../services/executiveAnalyticsApi';

const money = (value) => `KES ${Math.round(Number(value) || 0).toLocaleString()}`;
const pct = (value) => `${(Number(value) || 0).toFixed(1)}%`;

export default function ExecutiveIntelligenceCenter() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { setData(await getExecutiveAnalytics(30)); }
    catch (err) { setError(err?.message || 'Unable to load executive analytics.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (loading) return <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">Loading live executive intelligence…</section>;
  if (error) return <section className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm"><p className="text-sm text-red-700">{error}</p><button onClick={load} className="mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><RefreshCw size={15}/> Retry</button></section>;

  const kpis = [
    ['GMV (30d)', money(data.gmv.total), TrendingUp],
    ['Platform revenue', money(data.revenue.total), BarChart3],
    ['Active users', data.activity.activeUsers.toLocaleString(), Users],
    ['Active listings', data.activity.activeListings.toLocaleString(), Car],
    ['Active escrows', data.activity.activeEscrows.toLocaleString(), ShieldCheck],
    ['Vehicles sold', data.activity.soldVehicles.toLocaleString(), Car],
  ];

  return <section className="space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-semibold text-slate-900">Executive Intelligence</h1><p className="mt-1 text-sm text-slate-500">Live platform performance from authoritative transaction, vehicle and event data.</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><RefreshCw size={15}/> Refresh</button></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{kpis.map(([label,value,Icon]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><Icon size={18} className="mb-4 text-slate-500"/><div className="text-xs uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-xl font-semibold text-slate-900">{value}</div></div>)}</div>
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Conversion</h2><div className="mt-5 grid grid-cols-3 gap-3 text-center">{[['View → Lead',data.conversion.viewToLeadPercent],['Lead → Sale',data.conversion.leadToSalePercent],['View → Sale',data.conversion.viewToSalePercent]].map(([label,value])=><div key={label} className="rounded-lg bg-slate-50 p-4"><div className="text-lg font-semibold">{pct(value)}</div><div className="mt-1 text-xs text-slate-500">{label}</div></div>)}</div></div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Retention & movement</h2><dl className="mt-5 space-y-4 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Returning users</dt><dd className="font-semibold">{data.retention.returningUsers.toLocaleString()}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Retention rate</dt><dd className="font-semibold">{pct(data.retention.ratePercent)}</dd></div><div className="flex justify-between"><dt className="text-slate-500">GMV daily change</dt><dd className="font-semibold">{pct(data.gmv.growthPercent)}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Average order value</dt><dd className="font-semibold">{money(data.revenue.averageOrderValue)}</dd></div></dl></div>
    </div>
  </section>;
}
