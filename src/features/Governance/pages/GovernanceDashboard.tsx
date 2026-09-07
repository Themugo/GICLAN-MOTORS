import { useEffect, useState } from 'react';
import { AlertTriangle, Shield } from 'lucide-react';
import { getGovernanceDashboard } from '../../../services/governanceApi';

export default function GovernanceDashboard() {
  const [message, setMessage] = useState('Checking governance data availability…');

  useEffect(() => {
    getGovernanceDashboard()
      .then(() => setMessage('Governance data is available.'))
      .catch((error) => {
        const code = error?.response?.data?.code;
        setMessage(code === 'GOVERNANCE_NOT_CONFIGURED'
          ? 'Governance records are not yet configured in the authoritative database.'
          : 'Governance data could not be loaded.');
      });
  }, []);

  return (
    <section className="min-h-[400px] rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-slate-100 p-3"><Shield className="text-slate-700" size={24} /></div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Governance & Risk</h1>
          <p className="mt-1 text-sm text-slate-600">Production governance data is shown only when backed by the authoritative database.</p>
        </div>
      </div>
      <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex gap-3"><AlertTriangle size={20} className="mt-0.5 shrink-0" /><span>{message}</span></div>
      </div>
    </section>
  );
}
