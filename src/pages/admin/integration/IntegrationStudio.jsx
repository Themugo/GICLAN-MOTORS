import { useEffect, useState } from 'react';
import { Activity, Cable, KeyRound, PlugZap, RefreshCw, Webhook } from 'lucide-react';
import { getIntegrationDashboard } from '../../../services/eipApi';

const cards = [
  ['partners', 'Partners', Cable],
  ['applications', 'Applications', PlugZap],
  ['activeCredentials', 'Active credentials', KeyRound],
  ['activeWebhooks', 'Active webhooks', Webhook],
  ['recentApiRequests', 'Recent API requests', Activity],
  ['recentWebhookDeliveries', 'Webhook deliveries', Webhook],
];

export default function IntegrationStudio() {
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const load = async () => {
    setState(s => ({ ...s, loading: true, error: '' }));
    try {
      const response = await getIntegrationDashboard();
      setState({ loading: false, error: '', data: response?.data ?? response });
    } catch (error) {
      setState({ loading: false, error: error?.message || 'Unable to load integration telemetry', data: null });
    }
  };
  useEffect(() => { load(); }, []);
  const data = state.data || {};
  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div><h1 className="text-xl font-semibold text-slate-900">Integration Studio</h1><p className="mt-1 text-sm text-slate-600">Live partner, API credential and webhook operations.</p></div>
        <button type="button" onClick={load} disabled={state.loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50"><RefreshCw size={16} className={state.loading ? 'animate-spin' : ''} /> Refresh</button>
      </header>
      {state.error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{state.error}</div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([key, label, Icon]) => <div key={key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3 text-slate-500"><Icon size={18} /><span className="text-sm">{label}</span></div><div className="mt-3 text-2xl font-semibold text-slate-900">{state.loading ? '—' : Number(data[key] || 0).toLocaleString()}</div></div>)}
      </div>
      {!state.loading && <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${data.health === 'operational' ? 'bg-emerald-500' : 'bg-amber-500'}`} /><span className="font-medium text-slate-900">Gateway health: {data.health || 'unknown'}</span></div><p className="mt-2 text-sm text-slate-600">Telemetry is derived from persisted integration records. Credentials and webhook secrets are never displayed in list views.</p></div>}
    </section>
  );
}
