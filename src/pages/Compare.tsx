import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, X, Trash2, ArrowRight, Calendar, Gauge, Fuel, MapPin, Settings } from 'lucide-react';
import { useCompare } from '../context/CompareContext';
import { carsAPI } from '../api/api';
import { formatKES } from '../utils/helpers';

interface CompareProps {
  setPage: (page: string) => void;
  viewCar: (car: any) => void;
}

export default function Compare({ setPage, viewCar }: CompareProps) {
  const { compareIds, removeCar, clearAll, compareCount } = useCompare();

  const [compareCars, setCompareCars] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(compareIds.map(id => carsAPI.get(id).catch(() => null)))
      .then(results => { if (!cancelled) setCompareCars(results.map((r: any) => r?.car || r?.data || r).filter(Boolean)); });
    return () => { cancelled = true; };
  }, [compareIds]);

  const specs = [
    { key: 'year', label: 'Year', icon: Calendar },
    { key: 'mileage', label: 'Mileage', icon: Gauge },
    { key: 'fuel', label: 'Fuel', icon: Fuel },
    { key: 'transmission', label: 'Transmission', icon: Settings },
    { key: 'city', label: 'Location', icon: MapPin },
  ];

  if (compareCount === 0) {
    return (
      <div className="min-h-screen bg-cream-50 pt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-20 h-20 bg-cream-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">📊</span>
          </div>
          <h1 className="font-serif text-3xl text-charcoal-900 font-bold mb-4">
            No Vehicles to Compare
          </h1>
          <p className="font-sans text-warm-500 mb-8">
            Start by adding vehicles to compare from the gallery.
            Click the compare button on any car card to add it.
          </p>
          <button
            onClick={() => setPage('gallery')}
            className="btn-gold"
          >
            Browse Vehicles <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 pt-16">
      {/* Header */}
      <div className="bg-charcoal-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="section-label text-gold-400 mb-2">Compare</p>
              <h1 className="font-serif text-3xl text-white font-bold">
                Vehicle Comparison
              </h1>
              <p className="text-white/50 text-sm mt-1">
                Comparing {compareCount} of 4 vehicles
              </p>
            </div>
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-colors"
            >
              <Trash2 size={14} /> Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
          {/* Car Headers */}
          <div className="grid gap-4 p-4 border-b border-cream-200" 
            style={{ gridTemplateColumns: `200px repeat(${compareCount}, 1fr)` }}>
            {/* Empty corner cell */}
            <div />

            {/* Car columns */}
            {compareCars.map(car => car && (
              <div key={car.id} className="relative">
                <div 
                  className="aspect-[4/3] rounded-xl overflow-hidden cursor-pointer group"
                  onClick={() => viewCar(car)}
                >
                  <img
                    src={car.image}
                    alt={`${car.make} ${car.model}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <button
                  onClick={() => removeCar(String(car.id))}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <X size={12} />
                </button>
                <p className="section-label mt-2">{car.make}</p>
                <h3 className="font-serif text-lg text-charcoal-900 font-semibold line-clamp-1">
                  {car.model}
                </h3>
                <p className="font-serif text-xl text-gold-700 font-bold mt-1">
                  {formatKES(car.price)}
                </p>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: 4 - compareCount }).map((_, idx) => (
              <div key={`empty-${idx}`} className="flex items-center justify-center border-2 border-dashed border-cream-300 rounded-xl">
                <div className="text-center text-warm-400">
                  <span className="text-3xl">+</span>
                  <p className="text-xs mt-1">Add vehicle</p>
                </div>
              </div>
            ))}
          </div>

          {/* Price Row */}
          <div className="grid gap-4 p-4 border-b border-cream-200 bg-cream-50" 
            style={{ gridTemplateColumns: `200px repeat(${compareCount}, 1fr)` }}>
            <div className="font-sans text-sm font-semibold text-warm-500 uppercase tracking-wider">
              Price
            </div>
            {compareCars.map(car => car && (
              <div key={car.id} className="font-sans text-sm font-bold text-charcoal-900">
                {formatKES(car.price)}
              </div>
            ))}
            {Array.from({ length: 4 - compareCount }).map((_, idx) => (
              <div key={`empty-price-${idx}`} />
            ))}
          </div>

          {/* Spec Rows */}
          {specs.map(spec => (
            <div key={spec.key} className="grid gap-4 p-4 border-b border-cream-200 hover:bg-cream-50 transition-colors" 
              style={{ gridTemplateColumns: `200px repeat(${compareCount}, 1fr)` }}>
              <div className="flex items-center gap-2 font-sans text-sm font-semibold text-warm-500 uppercase tracking-wider">
                <spec.icon size={14} />
                {spec.label}
              </div>
              {compareCars.map(car => car && (
                <div key={car.id} className="font-sans text-sm text-charcoal-800">
                  {(car as any)[spec.key] || '-'}
                </div>
              ))}
              {Array.from({ length: 4 - compareCount }).map((_, idx) => (
                <div key={`empty-${spec.key}-${idx}`} />
              ))}
            </div>
          ))}

          {/* Type Row */}
          <div className="grid gap-4 p-4 border-b border-cream-200 bg-cream-50" 
            style={{ gridTemplateColumns: `200px repeat(${compareCount}, 1fr)` }}>
            <div className="flex items-center gap-2 font-sans text-sm font-semibold text-warm-500 uppercase tracking-wider">
              Body Type
            </div>
            {compareCars.map(car => car && (
              <div key={car.id} className="font-sans text-sm text-charcoal-800">
                <span className="inline-flex px-3 py-1 bg-cream-200 rounded-full text-xs font-medium">
                  {car.type}
                </span>
              </div>
            ))}
            {Array.from({ length: 4 - compareCount }).map((_, idx) => (
              <div key={`empty-type-${idx}`} />
            ))}
          </div>

          {/* Badges Row */}
          <div className="grid gap-4 p-4 bg-cream-50" 
            style={{ gridTemplateColumns: `200px repeat(${compareCount}, 1fr)` }}>
            <div className="flex items-center gap-2 font-sans text-sm font-semibold text-warm-500 uppercase tracking-wider">
              Features
            </div>
            {compareCars.map(car => car && (
              <div key={car.id} className="flex flex-wrap gap-1">
                {car.badges.includes('escrow') && (
                  <span className="inline-flex px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                    Escrow
                  </span>
                )}
                {car.badges.includes('auction') && (
                  <span className="inline-flex px-2 py-0.5 bg-gold-100 text-gold-700 text-xs rounded-full">
                    Auction
                  </span>
                )}
              </div>
            ))}
            {Array.from({ length: 4 - compareCount }).map((_, idx) => (
              <div key={`empty-badges-${idx}`} />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={() => setPage('gallery')}
            className="flex items-center gap-2 text-warm-500 hover:text-charcoal-900 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Gallery
          </button>
          <Link
            to="/gallery"
            className="btn-gold"
          >
            View All Vehicles <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
