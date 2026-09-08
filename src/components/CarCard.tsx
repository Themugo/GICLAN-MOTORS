import { useState } from 'react';
import { Calendar, Gauge, Fuel, MapPin, Shield, Gavel, ChevronRight, Heart, BarChart3 } from 'lucide-react';
import LazyImage from './LazyImage';
import { formatKES } from '../utils/helpers';

export interface Car {
  id: number;
  make: string;
  model: string;
  price: number;
  year: number;
  mileage: string;
  fuel: string;
  city: string;
  type: 'SUV' | 'Pickup' | 'Sedan' | 'Wagon';
  badges: ('escrow' | 'auction' | 'verified' | 'sponsored' | 'financing' | 'negotiable')[];
  image: string;
  transmission?: string;
  engine?: string;
  dealerName?: string;
  isVerified?: boolean;
  isBankOwned?: boolean;
  isNegotiable?: boolean;
  hasFinancing?: boolean;
  views?: number;
  createdAt?: string;
  currentBid?: number;
  auctionEnd?: string;
}

interface CarCardProps {
  car: Car;
  onClick?: () => void;
  onToggleCompare?: () => void;
  isComparing?: boolean;
  compareCount?: number;
  onFavorite?: (carId: number) => void;
  isFavorited?: boolean;
  showCompare?: boolean;
  listView?: boolean;
}

export default function CarCard({
  car,
  onClick,
  onToggleCompare,
  isComparing = false,
  compareCount = 0,
  onFavorite,
  isFavorited = false,
  showCompare = true,
  listView = false,
}: CarCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  // Auction status
  const now = Date.now();
  const auctionEnd = car.auctionEnd ? new Date(car.auctionEnd).getTime() : 0;
  const isOnAuction = car.badges.includes('auction') && auctionEnd > now;
  const currentPrice = isOnAuction && car.currentBid && car.currentBid > 0 ? car.currentBid : car.price;

  if (listView) {
    return (
      <div
        onClick={onClick}
        className="group flex flex-col sm:flex-row bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-cream-200 hover:border-gold-500/50"
      >
        {/* Image */}
        <div className="relative w-full sm:w-72 h-48 sm:h-auto flex-shrink-0 overflow-hidden bg-cream-100">
          <LazyImage
            src={car.image}
            alt={`${car.make} ${car.model}`}
            width={400}
            height={300}
            className="w-full h-full"
            onLoad={() => setImgLoaded(true)}
            style={{ opacity: imgLoaded ? 1 : 0 }}
          />
          {!imgLoaded && (
            <div className="absolute inset-0 bg-cream-200 animate-pulse" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {isOnAuction && (
              <span className="card-badge bg-red-500/90 text-white backdrop-blur-sm">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE
              </span>
            )}
            {car.badges.includes('escrow') && (
              <span className="card-badge bg-charcoal-900/90 text-white backdrop-blur-sm">
                <Shield size={10} />
                ESCROW
              </span>
            )}
            {car.isVerified && (
              <span className="card-badge bg-emerald-500/90 text-white backdrop-blur-sm">
                ✓ VERIFIED
              </span>
            )}
          </div>

          {/* Compare button */}
          {showCompare && onToggleCompare && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleCompare(); }}
              className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all hover:scale-110 border ${
                isComparing
                  ? 'bg-gold-500 text-white border-gold-500 opacity-100'
                  : 'bg-black/60 text-white border-white/20 hover:border-gold-500 opacity-0 group-hover:opacity-100'
              }`}
              title={isComparing ? 'Remove from compare' : 'Add to compare'}
            >
              <BarChart3 size={15} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <p className="section-label mb-1">{car.make}</p>
              <h3 className="font-serif text-xl text-charcoal-900 font-semibold mb-2 group-hover:text-gold-600 transition-colors">
                {car.model}
              </h3>

              {/* Specs */}
              <div className="flex flex-wrap gap-3 text-sm text-warm-500">
                {car.year && <span>{car.year}</span>}
                {car.mileage && <span>· {car.mileage}</span>}
                {car.fuel && <span>· {car.fuel}</span>}
                {car.transmission && <span>· {car.transmission}</span>}
                {car.engine && <span>· {car.engine}</span>}
              </div>

              {/* Location */}
              <div className="flex items-center gap-1.5 text-sm text-warm-400 mt-2">
                <MapPin size={14} />
                <span>{car.city}</span>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-[10px] font-sans font-semibold tracking-widest text-warm-400 uppercase mb-1">
                {isOnAuction ? (car.currentBid ? 'Current Bid' : 'Starting Bid') : 'Price'}
              </p>
              <p className="font-serif text-2xl text-charcoal-900 font-semibold">
                {formatKES(currentPrice)}
              </p>
              {car.isNegotiable && (
                <span className="text-xs text-warm-400">Negotiable</span>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-4 border-t border-cream-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {car.dealerName && (
                <span className="text-sm text-warm-400">
                  {car.isBankOwned ? '🏦 ' : ''}{car.dealerName}
                </span>
              )}
              {car.views && (
                <span className="text-xs text-warm-300">{car.views} views</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onFavorite && (
                <button
                  onClick={(e) => { e.stopPropagation(); onFavorite(car.id); }}
                  className="p-2 rounded-full hover:bg-cream-100 transition-colors"
                >
                  <Heart
                    size={18}
                    className={isFavorited ? 'fill-red-500 text-red-500' : 'text-warm-400'}
                  />
                </button>
              )}
              <span className="text-gold-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                View →
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid View
  return (
    <div
      onClick={onClick}
      className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-cream-200 hover:border-gold-500/50 hover:-translate-y-1"
    >
      {/* Image */}
      <div className="relative overflow-hidden aspect-[4/3]">
        <LazyImage
          src={car.image}
          alt={`${car.make} ${car.model}`}
          width={400}
          height={300}
          className="w-full h-full"
          onLoad={() => setImgLoaded(true)}
          style={{ opacity: imgLoaded ? 1 : 0 }}
        />
        {!imgLoaded && (
          <div className="absolute inset-0 bg-cream-200 animate-pulse" />
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Badges - Top Left */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {isOnAuction && (
            <span className="card-badge bg-red-500/90 text-white backdrop-blur-sm">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          )}
          {car.badges.includes('escrow') && (
            <span className="card-badge bg-charcoal-900/90 text-white backdrop-blur-sm">
              <Shield size={10} />
              ESCROW
            </span>
          )}
          {car.isVerified && (
            <span className="card-badge bg-emerald-500/90 text-white backdrop-blur-sm">
              ✓
            </span>
          )}
        </div>

        {/* Badges - Top Right */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          {onFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onFavorite(car.id); }}
              className="p-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full transition-all hover:scale-110"
            >
              <Heart
                size={18}
                className={isFavorited ? 'fill-red-500 text-red-500' : 'text-white'}
              />
            </button>
          )}
        </div>

        {/* Compare button */}
        {showCompare && onToggleCompare && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleCompare(); }}
            className={`absolute top-3 right-14 p-2 rounded-full backdrop-blur-md transition-all hover:scale-110 border ${
              isComparing
                ? 'bg-gold-500 text-white border-gold-500'
                : 'bg-black/60 text-white border-white/20 hover:border-gold-500 opacity-0 group-hover:opacity-100'
            }`}
            title={isComparing ? 'Remove from compare' : 'Add to compare'}
          >
            <BarChart3 size={15} />
          </button>
        )}

        {/* Type pill */}
        <div className="absolute bottom-3 right-3">
          <span className="bg-white/90 backdrop-blur-sm text-warm-600 text-xs font-sans font-semibold px-3 py-1 rounded-full">
            {car.type}
          </span>
        </div>

        {/* Year badge */}
        {car.year && (
          <div className="absolute bottom-3 left-3">
            <span className="bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-lg">
              {car.year}
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-5">
        <p className="section-label mb-1">{car.make}</p>
        <h3 className="font-serif text-xl text-charcoal-900 font-semibold mb-2 line-clamp-1 group-hover:text-gold-600 transition-colors duration-200">
          {car.model}
        </h3>

        {/* Quick Specs */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-xs px-2.5 py-1 bg-cream-100 rounded-md text-warm-500">
            {car.mileage}
          </span>
          <span className="text-xs px-2.5 py-1 bg-cream-100 rounded-md text-warm-500">
            {car.fuel}
          </span>
          {car.transmission && (
            <span className="text-xs px-2.5 py-1 bg-cream-100 rounded-md text-warm-500">
              {car.transmission}
            </span>
          )}
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-sm text-warm-400 mb-3">
          <MapPin size={14} />
          <span>{car.city}</span>
        </div>

        {/* Dealer */}
        {car.dealerName && (
          <div className="flex items-center gap-1.5 text-xs text-warm-400 mb-3">
            {car.isBankOwned && <span>🏦</span>}
            <span>{car.dealerName}</span>
            {car.isVerified && <span className="text-emerald-500">✓</span>}
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-gold-500/20 my-3" />

        {/* Price */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-sans font-semibold tracking-widest text-warm-400 uppercase">
              {isOnAuction ? (car.currentBid ? 'Current Bid' : 'Starting Bid') : 'Price'}
            </p>
            <p className="font-serif text-2xl text-charcoal-900 font-semibold tracking-wide">
              {formatKES(currentPrice)}
            </p>
            {car.isNegotiable && (
              <span className="text-xs text-warm-400">Negotiable</span>
            )}
          </div>

          <span className="text-gold-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
            View →
          </span>
        </div>
      </div>
    </div>
  );
}
