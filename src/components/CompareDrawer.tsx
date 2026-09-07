import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, X, Eye } from 'lucide-react';
import { useCompare } from '../context/CompareContext';
import { carsAPI } from '../api/api';


export default function CompareDrawer() {
  const { compareIds, compareCount, maxCompare, removeCar, clearAll } = useCompare();
  const [cars, setCars] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(compareIds.map(id => carsAPI.get(id).catch(() => null)))
      .then(results => { if (!cancelled) setCars(results.map((r: any) => r?.car || r?.data || r).filter(Boolean)); });
    return () => { cancelled = true; };
  }, [compareIds]);

  if (compareIds.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] bg-charcoal-950/95 border border-gold-500/25 rounded-full px-3 py-2 flex items-center gap-3 shadow-xl backdrop-blur-md max-w-[calc(100vw-2rem)]">
      {/* Icon and count */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <BarChart3 size={14} className="text-gold-400" />
        <span className="text-xs font-bold text-gold-400">
          Compare {compareCount}/{maxCompare}
        </span>
      </div>

      {/* Car thumbnails */}
      <div className="flex gap-1.5">
        {cars.slice(0, maxCompare).map(car => (
          <div key={car.id} className="relative w-10 h-7 rounded overflow-hidden border border-gold-500/25 bg-charcoal-800 flex-shrink-0">
            <img
              src={car.image}
              alt={car.model}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <button
              onClick={() => removeCar(String(car.id))}
              aria-label="Remove"
              className="absolute top-0 right-0 w-3.5 h-3.5 rounded-bl bg-black/75 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
            >
              <X size={8} />
            </button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={clearAll}
          className="bg-transparent border-none text-white/45 text-xs font-semibold cursor-pointer px-1 hover:text-white transition-colors"
        >
          Clear
        </button>
        <Link
          to="/compare"
          className={`inline-flex items-center gap-1 bg-gold-500 rounded-full px-3 py-1.5 text-charcoal-950 text-xs font-bold no-underline transition-all ${
            compareCount < 2 ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <Eye size={12} /> Compare
        </Link>
      </div>
    </div>
  );
}
