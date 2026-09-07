import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Globe, MapPin, RefreshCw, CheckCircle, AlertTriangle, DollarSign, Languages, Building2 } from 'lucide-react';
import { listCountries, type Country } from '../../../services/regionalConfigurationApi';

const COLORS = { navy: '#1e3a5f', soft: '#64748b', green: '#10b981', amber: '#f59e0b', red: '#ef4444' };

type Tab = 'overview' | 'countries' | 'payments' | 'compliance';

export default function RegionalDashboard() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCountries(true);
      setCountries(data);
      setSelectedCountry((current) => current || data.find((country) => country.isPrimary)?.countryCode || data[0]?.countryCode || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load regional configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const activeCountries = useMemo(() => countries.filter((country) => country.status === 'active'), [countries]);
  const selected = countries.find((country) => country.countryCode === selectedCountry) || null;
  const currencies = new Set(countries.map((country) => country.configuration?.currencyCode).filter(Boolean));
  const languages = new Set(countries.flatMap((country) => country.configuration?.supportedLanguages || []));
  const paymentProviders = countries.reduce((total, country) => total + (country.paymentProviders?.length || 0), 0);

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3"><Globe size={26} color={COLORS.navy} /><h1 className="text-2xl font-bold text-slate-900">Regional Configuration</h1></div>
            <p className="mt-1 text-sm text-slate-500">The live country, currency, language, payment and compliance configuration powering KAYAD.</p>
          </div>
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh</button>
        </header>

        {error && <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertTriangle size={18} />{error}</div>}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat icon={<MapPin size={20} />} label="Active countries" value={activeCountries.length} />
          <Stat icon={<DollarSign size={20} />} label="Currencies" value={currencies.size} />
          <Stat icon={<Languages size={20} />} label="Languages" value={languages.size} />
          <Stat icon={<Building2 size={20} />} label="Payment providers" value={paymentProviders} />
        </div>

        <div className="flex flex-wrap gap-2">
          {(['overview', 'countries', 'payments', 'compliance'] as Tab[]).map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === tab ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 shadow-sm'}`}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}
        </div>

        {loading && <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">Loading live regional configuration…</div>}

        {!loading && activeTab !== 'overview' && (
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {countries.map((country) => <CountryCard key={country.countryCode} country={country} selected={selectedCountry === country.countryCode} onSelect={() => setSelectedCountry(country.countryCode)} />)}
          </section>
        )}

        {!loading && activeTab === 'overview' && (
          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-slate-900">Regional coverage</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {countries.map((country) => <CountryCard key={country.countryCode} country={country} selected={selectedCountry === country.countryCode} onSelect={() => setSelectedCountry(country.countryCode)} compact />)}
              </div>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-slate-900">Selected country</h2>
              {selected ? <CountryDetails country={selected} /> : <p className="text-sm text-slate-500">Select a country to inspect its live configuration.</p>}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <div className="rounded-2xl bg-white p-5 shadow-sm"><div className="mb-3 text-slate-500">{icon}</div><div className="text-2xl font-bold text-slate-900">{value.toLocaleString()}</div><div className="text-xs text-slate-500">{label}</div></div>;
}

function CountryCard({ country, selected, onSelect, compact = false }: { country: Country; selected: boolean; onSelect: () => void; compact?: boolean }) {
  return <button onClick={onSelect} className={`w-full rounded-xl border p-4 text-left transition ${selected ? 'border-slate-900 shadow-sm' : 'border-slate-200 hover:border-slate-300'} bg-white`}>
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className={compact ? 'text-2xl' : 'text-3xl'}>{country.flagEmoji || '🌍'}</span><div><div className="font-semibold text-slate-900">{country.countryName}</div><div className="text-xs text-slate-500">{country.countryCode} · {country.configuration?.currencyCode || 'Currency not configured'}</div></div></div><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${country.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{country.status}</span></div>
  </button>;
}

function CountryDetails({ country }: { country: Country }) {
  const config = country.configuration;
  return <div className="space-y-4 text-sm"><div className="flex items-center gap-3"><span className="text-4xl">{country.flagEmoji || '🌍'}</span><div><div className="font-bold text-slate-900">{country.countryName}</div><div className="text-slate-500">{country.isoCode}</div></div></div><Row label="Currency" value={config ? `${config.currencyName} (${config.currencyCode})` : 'Not configured'} /><Row label="Languages" value={config?.supportedLanguages?.join(', ') || 'Not configured'} /><Row label="Timezone" value={config?.timezone || 'Not configured'} /><Row label="Phone" value={config?.phoneCountryCode || 'Not configured'} /><Row label="Payment providers" value={String(country.paymentProviders?.length || 0)} /><Row label="Tax rules" value={String(country.taxes?.length || 0)} /><Row label="Cross-border routes" value={String(country.crossBorder?.length || 0)} /><div className="flex items-center gap-2 pt-2 text-xs font-semibold text-emerald-700"><CheckCircle size={15} /> Configuration is sourced from the backend</div></div>;
}

function Row({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2"><span className="text-slate-500">{label}</span><span className="text-right font-medium text-slate-800">{value}</span></div>; }
