import { useState, useCallback, useRef, type TouchEvent, type ComponentType } from 'react';
import { ChevronLeft, ChevronRight, Star, BarChart3 } from 'lucide-react';
import { useCompare } from '../../../../context/CompareContext';

export function firstImage(car: any, idx = 0): string | null {
  const imgs = car?.images || [];
  const img = imgs[idx];
  if (!img) return null;
  return typeof img === 'string' ? img : img?.url || null;
}

interface GalleryImageProps {
  car: any;
  idx: number;
  onPrev: () => void;
  onNext: () => void;
  total: number;
  onOpenGallery?: () => void;
}

export function GalleryImage({ car, idx, onPrev, onNext, total, onOpenGallery }: GalleryImageProps) {
  const [err, setErr] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const touchX = useRef<number | null>(null);

  const src = (!err && firstImage(car, idx)) ||
    'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?q=80&w=1600&fit=crop';

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx > 50) onPrev();
    else if (dx < -50) onNext();
    touchX.current = null;
  }, [onPrev, onNext]);

  return (
    <div
      className="relative w-full aspect-video bg-charcoal-800 rounded-2xl overflow-hidden cursor-pointer"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={onOpenGallery}
    >
      {!loaded && (
        <div className="absolute inset-0 bg-charcoal-800 animate-pulse" />
      )}
      <img
        src={src}
        onError={() => setErr(true)}
        onLoad={() => setLoaded(true)}
        alt={car?.title || 'Vehicle'}
        width={800}
        height={450}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover transition-opacity duration-500"
        style={{ opacity: loaded ? 1 : 0.3 }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20 pointer-events-none" />

      {/* Navigation arrows */}
      {total > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-all z-10"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-all z-10"
          >
            <ChevronRight size={18} />
          </button>
          <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/60 text-white text-xs font-semibold rounded-full backdrop-blur-sm z-10">
            {idx + 1} / {total}
          </div>
        </>
      )}

      {/* Featured badge */}
      {car?.isPromoted && (
        <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-gold-500/90 text-charcoal-900 text-xs font-bold rounded-full z-10">
          <Star size={12} />
          FEATURED
        </div>
      )}

      {/* Demo badge */}

      {/* Live auction badge */}
      {car?.auctionStatus === 'live' && (
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-red-500/90 text-white text-xs font-bold rounded-full z-10">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          LIVE AUCTION
        </div>
      )}
    </div>
  );
}

interface GalleryThumbnailsProps {
  car: any;
  selectedIdx: number;
  onSelect: (idx: number) => void;
}

export function GalleryThumbnails({ car, selectedIdx, onSelect }: GalleryThumbnailsProps) {
  const images = car?.images || [];
  if (images.length <= 1) return null;

  return (
    <div className="flex gap-2 flex-wrap mt-4">
      {images.map((img: any, idx: number) => {
        const src = typeof img === 'string' ? img : img?.url;
        const isActive = idx === selectedIdx;
        return (
          <button
            key={idx}
            onClick={() => onSelect(idx)}
            className={`relative w-16 h-12 rounded-lg overflow-hidden transition-all ${
              isActive
                ? 'ring-2 ring-gold-500 opacity-100'
                : 'opacity-50 hover:opacity-80'
            }`}
          >
            <img
              src={src || 'https://placehold.co/64x48/1a1a1a/D4C4A8?text=Car'}
              alt={`View ${idx + 1}`}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          </button>
        );
      })}
    </div>
  );
}

interface SpecItemProps {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
  delay?: number;
}

export function SpecItem({ icon: Icon, label, value, delay = 0 }: SpecItemProps) {
  if (!value) return null;
  return (
    <div
      className="bg-white rounded-xl p-4 border border-cream-200 hover:border-gold-500/30 transition-all"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-gold-600" />
        <span className="text-[10px] text-warm-400 uppercase tracking-wider font-bold">{label}</span>
      </div>
      <div className="font-sans text-sm font-bold text-charcoal-900">{value}</div>
    </div>
  );
}

interface CompareToggleProps {
  car: any;
}

export function CompareToggle({ car }: CompareToggleProps) {
  const { compareCount, maxCompare, addCar, removeCar, isComparing } = useCompare();

  if (!car?._id && !car?.id) return null;

  const carId = car._id || String(car.id);
  const isComp = isComparing(carId);
  const full = compareCount >= maxCompare && !isComp;

  const handleClick = () => {
    if (isComp) {
      removeCar(carId);
    } else if (!full) {
      addCar(carId);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={full}
      className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-sans text-sm font-semibold transition-all ${
        isComp
          ? 'bg-gold-500/10 border border-gold-500/30 text-gold-700'
          : full
            ? 'bg-cream-100 border border-cream-200 text-warm-400 cursor-not-allowed'
            : 'bg-white border border-cream-200 text-charcoal-800 hover:border-gold-500/30'
      }`}
    >
      <BarChart3 size={16} />
      {isComp ? 'Added to Compare' : full ? `Compare full (max ${maxCompare})` : 'Add to Compare'}
    </button>
  );
}
