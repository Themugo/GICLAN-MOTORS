import { useState } from 'react';
import type { FC } from 'react';
import {
  Heart,
  ShieldCheck,
  Tag,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Gauge,
  Fuel,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  MapPin,
  Eye
} from 'lucide-react';
import { Vehicle } from '../../types';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Skeleton } from '../ui/Skeleton';
import type React from 'react';

interface VehicleCardProps {
  vehicle: Vehicle;
  viewMode?: 'grid' | 'list';
}

export const VehicleCard: FC<VehicleCardProps> = ({ vehicle, viewMode = 'grid' }) => {
  const { savedVehicleIds, toggleSaveVehicle, navigateTo } = useMarketplace();
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isImgLoading, setIsImgLoading] = useState(true);
  const [imgFailed, setImgFailed] = useState(false);

  const isSaved = savedVehicleIds.includes(vehicle.id);

  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!vehicle.images || vehicle.images.length === 0) return;
    setIsImgLoading(true);
    setImgFailed(false);
    setCurrentImgIndex(prev => (prev + 1) % vehicle.images.length);
  };

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!vehicle.images || vehicle.images.length === 0) return;
    setIsImgLoading(true);
    setImgFailed(false);
    setCurrentImgIndex(prev => (prev - 1 + vehicle.images.length) % vehicle.images.length);
  };

  // Format price in KES (Kenyan Shillings)
  const priceVal = vehicle.currentBid || vehicle.price;
  const formattedKESPrice = `KES ${priceVal.toLocaleString()}`;

  const isAuction = vehicle.listingType === 'auction' || vehicle.listingType === 'both';

  const fullTitle = vehicle.title
    ? (vehicle.title.startsWith(String(vehicle.year)) ? vehicle.title : `${vehicle.year} ${vehicle.title}`)
    : `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  return (
    <div
      onClick={() => navigateTo('vehicle_detail', vehicle.id)}
      className={`group bg-white border border-[#E2D8C7] rounded-3xl p-3 sm:p-3.5 shadow-xs hover:border-[#2E4080] hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between h-full ${
        viewMode === 'list' ? 'md:flex-row md:items-center md:gap-6' : 'space-y-3'
      }`}
    >
      {/* Image Container with Badges */}
      <div className={`relative rounded-2xl overflow-hidden bg-[#2E4080] border border-[#E2D8C7] group shrink-0 ${
        viewMode === 'list' ? 'md:w-72 h-48' : 'w-full aspect-[16/11] sm:aspect-[16/11]'
      }`}>
        {isImgLoading && !imgFailed && (
          <Skeleton className="absolute inset-0 w-full h-full bg-[#2E4080]" />
        )}

        {imgFailed ? (
          <div className="w-full h-full bg-gradient-to-br from-[#2E4080] via-[#1B2647] to-[#141E3F] flex flex-col items-center justify-center p-4 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#23EBFF]/15 border border-[#23EBFF]/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[#23EBFF]" />
            </div>
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[#23EBFF]">
              KAYAD VERIFIED ASSET
            </span>
            <span className="text-[11px] font-serif font-bold text-slate-200 line-clamp-1">
              {fullTitle}
            </span>
          </div>
        ) : (
          <img
            src={vehicle.images?.[currentImgIndex] || 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=800&q=80'}
            alt={fullTitle}
            width={400}
            height={300}
            loading="lazy"
            decoding="async"
            onLoad={() => setIsImgLoading(false)}
            onError={() => {
              setImgFailed(true);
              setIsImgLoading(false);
            }}
            className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ${
              isImgLoading ? 'opacity-0' : 'opacity-100'
            }`}
          />
        )}

        {/* Carousel Arrow Controls */}
        {!imgFailed && vehicle.images && vehicle.images.length > 1 && (
          <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button
              onClick={prevImg}
              className="p-1.5 rounded-full bg-[#2E4080]/90 text-[#23EBFF] hover:bg-[#23EBFF] hover:text-[#2E4080] transition-colors shadow-md cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextImg}
              className="p-1.5 rounded-full bg-[#2E4080]/90 text-[#23EBFF] hover:bg-[#23EBFF] hover:text-[#2E4080] transition-colors shadow-md cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top Left Badges */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1.5">
          {isAuction ? (
            <span className="px-2.5 py-1 rounded-xl bg-[#2E4080]/95 backdrop-blur-md text-[#23EBFF] font-mono font-black text-[10px] uppercase shadow-md border border-[#23EBFF]/40 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#23EBFF]" />
              LIVE AUCTION LOT
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-xl bg-[#2E4080]/95 backdrop-blur-md text-[#3ddb72] font-mono font-black text-[10px] uppercase shadow-md border border-[#3ddb72]/40 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#3ddb72]" />
              150-PT AUDITED
            </span>
          )}
        </div>

        {/* Top Right Year Badge */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <span className="px-2.5 py-1 rounded-xl bg-[#2E4080]/90 backdrop-blur-md text-white font-mono font-black text-xs shadow-md border border-white/20">
            {vehicle.year}
          </span>
        </div>

        {/* Favorite Heart Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleSaveVehicle(vehicle.id);
          }}
          className={`absolute bottom-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-all z-10 cursor-pointer ${
            isSaved
              ? 'bg-rose-600 text-white shadow-lg'
              : 'bg-[#2E4080]/80 text-[#23EBFF] hover:bg-rose-600 hover:text-white border border-[#23EBFF]/30'
          }`}
          title={isSaved ? 'Remove from Saved' : 'Save Vehicle'}
        >
          <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Card Details */}
      <div className="flex-1 flex flex-col justify-between space-y-3 min-w-0">
        <div className="space-y-1.5">
          {/* Make / Brand & Location Header */}
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#6B7A99] gap-2">
            <span className="uppercase tracking-wider truncate">{vehicle.make}</span>
            <span className="flex items-center gap-1 shrink-0">
              <MapPin className="w-3 h-3 text-[#23EBFF] shrink-0" />
              <span className="truncate">{vehicle.location ? vehicle.location.split(',')[0] : 'Nairobi'}</span>
            </span>
          </div>

          {/* Model Title */}
          <h3 className="text-base sm:text-lg font-serif font-black text-[#2E4080] group-hover:text-[#23EBFF] transition-colors leading-snug line-clamp-2 min-h-[2.5rem]">
            {fullTitle}
          </h3>

          {/* Specs Row */}
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#6B7A99] pt-0.5 gap-2">
            <span className="flex items-center gap-1 shrink-0">
              <Gauge className="w-3.5 h-3.5 text-[#2E4080] shrink-0" />
              {vehicle.mileage ? vehicle.mileage.toLocaleString() : '18,000'} km
            </span>
            <span className="flex items-center gap-1 truncate min-w-0 justify-end">
              <Fuel className="w-3.5 h-3.5 text-[#23EBFF] shrink-0" />
              <span className="truncate">{vehicle.transmission || 'Automatic'}</span>
            </span>
          </div>

          {/* Sleek Price Box */}
          <div className="px-3 py-2 rounded-xl bg-[#F6F1E8] border border-[#E2D8C7]/80 flex items-center justify-between gap-2 overflow-hidden">
            <span className="text-[#6B7A99] font-mono font-bold uppercase text-[10px] tracking-wider truncate min-w-0">
              {isAuction ? 'Current High Bid' : 'Verified Price'}
            </span>
            <span className="text-base sm:text-lg font-serif font-black text-[#2E4080] whitespace-nowrap shrink-0">
              {formattedKESPrice}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-0.5">
          <button
            onClick={() => navigateTo('vehicle_detail', vehicle.id)}
            className="w-full py-2.5 px-3 rounded-xl bg-[#2E4080] hover:bg-[#141E3F] text-white text-xs font-mono font-black uppercase tracking-wider transition-all text-center flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span>{isAuction ? 'Place Bid / View Lot' : 'Inspect & Buy'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#23EBFF]" />
          </button>
        </div>
      </div>
    </div>
  );
};



