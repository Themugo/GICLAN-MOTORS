import { AlertTriangle } from 'lucide-react';

export default function IntegrationStudio() {
  return (
    <section className="min-h-[400px] rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <AlertTriangle className="mt-1 text-amber-600" size={24} />
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Integration Studio</h1>
          <p className="mt-2 text-sm text-slate-600">The integration registry, sandbox, webhook delivery, and certification services are not configured. No sample credentials, fake endpoints, or synthetic integration activity are shown.</p>
        </div>
      </div>
    </section>
  );
}
