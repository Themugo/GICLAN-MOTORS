import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { formatKES } from '../../../utils/helpers';
import { getValuationMatrix, type ValuationMatrixRow } from '../../../services/valuationApi';

interface Props { vehicle?: { make?: string; model?: string; year?: number; price?: number } }

export default function MarketValuationMatrix({ vehicle }: Props) {
  const [rows, setRows] = useState<ValuationMatrixRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getValuationMatrix({ brand: vehicle?.make, model: vehicle?.model, limit: 20 })
      .then((response) => { if (active) setRows(response.data || []); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Unable to load valuation data'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [vehicle?.make, vehicle?.model]);

  const current = useMemo(() => rows.find((row) => row.make.toLowerCase() === vehicle?.make?.toLowerCase() && row.model.toLowerCase() === vehicle?.model?.toLowerCase()), [rows, vehicle]);
  const trend = (row: ValuationMatrixRow) => vehicle?.price && row.avgPrice ? ((row.avgPrice - vehicle.price) / vehicle.price) * 100 : 0;

  return <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
    <div className="p-5 border-b border-cream-200 flex items-center justify-between"><div><h3 className="font-serif text-lg text-charcoal-900 font-bold">Market Valuation</h3><p className="font-sans text-xs text-warm-400 mt-0.5">Calculated from KAYAD vehicle inventory</p></div><Info size={16} className="text-warm-400" /></div>
    {loading ? <div className="p-6 text-sm text-warm-500">Loading live market data…</div> : error ? <div className="p-6 text-sm text-red-600">{error}</div> : rows.length === 0 ? <div className="p-6 text-sm text-warm-500">No comparable KAYAD inventory is available yet.</div> : <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-cream-50">{['Vehicle','Avg. Price','Range','Trend','Listings'].map((h) => <th key={h} className="px-4 py-3 text-right first:text-left font-sans text-[10px] text-warm-400 font-bold uppercase tracking-wider">{h}</th>)}</tr></thead><tbody>{rows.map((row) => { const change = trend(row); const isMatch = current === row; return <tr key={`${row.make}-${row.model}-${row.year}`} className={`border-b border-cream-100 hover:bg-cream-50 ${isMatch ? 'bg-gold-500/5' : ''}`}><td className="px-4 py-3"><p className="font-sans text-sm font-semibold text-charcoal-900">{row.make} {row.model}</p><p className="font-sans text-xs text-warm-400">{row.year}</p></td><td className="px-4 py-3 text-right font-sans text-sm font-semibold text-charcoal-900">{formatKES(row.avgPrice)}</td><td className="px-4 py-3 text-right font-sans text-xs text-warm-500">{formatKES(row.minPrice)} - {formatKES(row.maxPrice)}</td><td className="px-4 py-3 text-right"><span className="inline-flex items-center gap-1 text-xs font-semibold">{change > 2 ? <TrendingUp size={14} /> : change < -2 ? <TrendingDown size={14} /> : <Minus size={14} />}{change > 0 ? '+' : ''}{change.toFixed(1)}%</span></td><td className="px-4 py-3 text-right font-sans text-xs text-warm-500">{row.listingsCount}</td></tr>; })}</tbody></table></div>}
    <div className="px-4 py-3 bg-cream-50 border-t border-cream-200"><p className="font-sans text-[10px] text-warm-400 text-center">Live KAYAD inventory comparables · No hardcoded valuation figures</p></div>
  </div>;
}
