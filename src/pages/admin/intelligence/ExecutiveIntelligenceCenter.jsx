import { AlertTriangle } from 'lucide-react';

export default function ExecutiveIntelligenceCenter() {
  return (
    <section className="min-h-[400px] rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <AlertTriangle className="mt-1 text-amber-600" size={24} />
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Executive Intelligence</h1>
          <p className="mt-2 text-sm text-slate-600">No authoritative intelligence warehouse is configured. Forecasts, benchmarks, recommendations, and executive metrics are therefore unavailable.</p>
        </div>
      </div>
    </section>
  );
}
