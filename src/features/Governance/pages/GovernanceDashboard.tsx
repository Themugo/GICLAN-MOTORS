import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Shield } from 'lucide-react';
import { getGovernanceDashboard } from '../../../services/governanceApi';

type DashboardData = {
  summary?: {
    activePolicies?: number;
    pendingChanges?: number;
    pendingApprovals?: number;
    openRisks?: number;
    upcomingReleases?: number;
    complianceScore?: number | null;
  };
  riskOverview?: Record<string, number>;
};

export default function GovernanceDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [message, setMessage] = useState('Loading governance data…');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const response = await getGovernanceDashboard();
      const data = response?.data?.data as DashboardData;
      setDashboard(data || null);
      setMessage(data ? 'Governance data is backed by the authoritative database.' : 'No governance records are available yet.');
    } catch {
      setDashboard(null);
      setMessage('Governance data could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const summary = dashboard?.summary;
  const stats = [
    ['Active policies', summary?.activePolicies ?? 0],
    ['Pending changes', summary?.pendingChanges ?? 0],
    ['Pending approvals', summary?.pendingApprovals ?? 0],
    ['Open risks', summary?.openRisks ?? 0],
    ['Upcoming releases', summary?.upcomingReleases ?? 0],
    ['Compliance score', summary?.complianceScore == null ? '—' : `${summary.complianceScore}%`],
  ];

  return (
    <section className="min-h-[400px] rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-slate-100 p-3"><Shield className="text-slate-700" size={24} /></div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Governance & Risk</h1>
            <p className="mt-1 text-sm text-slate-600">Live governance controls derived from authoritative database records.</p>
          </div>
        </div>
        <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
          {dashboard ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertTriangle size={18} className="text-amber-600" />}
          {message}
        </div>
        {dashboard?.riskOverview && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {['critical', 'high', 'medium', 'low'].map((level) => (
              <div key={level} className="rounded-md bg-slate-50 p-3">
                <p className="text-xs capitalize text-slate-500">{level}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{dashboard.riskOverview?.[level] ?? 0}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
