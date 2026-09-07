import { useEffect, useState } from 'react';
import { Activity, KeyRound, Link2, Radio, RefreshCw, Webhook } from 'lucide-react';
import { request } from '../../../api/httpRequest';

const initial = { partners: 0, applications: 0, activeCredentials: 0, activeWebhooks: 0, webhookDeliveries: 0, apiRequests24h: 0, failedWebhookDeliveries: 0 };

export default function IntegrationStudio() {
  const [dashboard, setDashboard] = useState(initial);
  const [apis, setApis] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [d, a, w] = await Promise.all([
        request('/api/integration/dashboard'), request('/api/integration/apis'), request('/api/integration/webhooks'),
      ]);
      setDashboard(d?.data || initial); setApis(a?.data || []); setWebhooks(w?.data || []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load integration data.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const cards = [
    ['Partners', dashboard.partners, Link2], ['Applications', dashboard.applications, Activity],
    ['Active credentials', dashboard.activeCredentials, KeyRound], ['Active webhooks', dashboard.activeWebhooks, Webhook],
    ['API requests / 24h', dashboard.apiRequests24h, Radio], ['Failed deliveries', dashboard.failedWebhookDeliveries, Activity],
  ];

  return <section className="space-y-6">
    <div className="flex items-center justify-between">
      <div><h1 className="text-xl font-semibold text-slate-900">Integration Studio</h1><p className="mt-1 text-sm text-slate-600">Manage KAYAD partners, API access, webhooks and integration telemetry from persisted configuration.</p></div>
      <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>Refresh</button>
    </div>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([label,value,Icon]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><Icon size={19} className="text-slate-500"/><div className="mt-3 text-2xl font-semibold text-slate-900">{loading ? '—' : value}</div><div className="text-sm text-slate-500">{label}</div></div>)}</div>
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Radio size={18}/><h2 className="font-semibold text-slate-900">API catalog</h2></div><div className="mt-4 space-y-3">{apis.map(api => <div key={api.id} className="rounded-lg bg-slate-50 p-3"><div className="font-medium text-slate-900">{api.endpoint_name}</div><div className="text-xs text-slate-500">{api.base_path} · {api.api_version}</div></div>)}{!apis.length && <p className="text-sm text-slate-500">No API endpoints are configured.</p>}</div></div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Webhook size={18}/><h2 className="font-semibold text-slate-900">Webhook registry</h2></div><div className="mt-4 space-y-3">{webhooks.map(h => <div key={h.id} className="rounded-lg bg-slate-50 p-3"><div className="font-medium text-slate-900">{h.webhook_name || h.config_code}</div><div className="text-xs text-slate-500">{h.status} · {Array.isArray(h.subscribed_events) ? h.subscribed_events.join(', ') || 'No events' : 'Configured events'}</div></div>)}{!webhooks.length && <p className="text-sm text-slate-500">No webhooks are configured.</p>}</div></div>
    </div>
  </section>;
}
