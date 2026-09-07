import { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  Gavel, 
  MapPin, 
  Gauge, 
  Fuel, 
  FileText, 
  CheckCircle2, 
  Calculator, 
  MessageSquareText, 
  Heart, 
  ChevronLeft,
  ChevronRight,
  Lock, 
  Phone,
  Sparkles,
  Wrench,
  Clock,
  ArrowRight,
  ExternalLink,
  Shield,
  Maximize2,
  ZoomIn,
  ZoomOut,
  X,
  Share2,
  Copy,
  Check,
  Eye,
  Info,
  Bell,
  BellRing,
  TrendingDown
} from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import type React from 'react';
import type { FC } from 'react';
import { NavigationBar } from '../common/NavigationBar';
import { Skeleton, VehicleDetailSkeleton } from '../ui/Skeleton';
import { PriceAlertModal } from './PriceAlertModal';

export const VehicleDetailPage: FC = () => {
  const { 
    selectedVehicle, 
    placeBid, 
    initiateEscrow, 
    navigateTo, 
    openChat, 
    savedVehicleIds, 
    toggleSaveVehicle,
    getPriceAlertForVehicle
  } = useMarketplace();

  const { user } = useAuth();

  const vehicle = selectedVehicle;

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // Price alert state
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const existingAlert = vehicle ? getPriceAlertForVehicle(vehicle.id) : undefined;

  // Formatted full title to prevent duplicate year issues
  const formattedFullTitle = vehicle
    ? (vehicle.title.startsWith(String(vehicle.year)) ? vehicle.title : `${vehicle.year} ${vehicle.title}`)
    : '';

  // Zoom and Image Loading State
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isHoverZooming, setIsHoverZooming] = useState(false);
  const [isDoubleTapZoomed, setIsDoubleTapZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  const [bidInput, setBidInput] = useState('');
  const [bidError, setBidError] = useState('');
  const [bidSuccess, setBidSuccess] = useState('');

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedVin, setCopiedVin] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Touch Swipe Handling for Image Preview
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Financing Calculator state
  const [downPayment, setDownPayment] = useState('500000');
  const [loanTerm, setLoanTerm] = useState(60); // 60 months
  const [interestRate, setInterestRate] = useState(13.0); // 13% APR for KSh auto loans

  // Helper for micro-interaction toast feedback
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Keyboard controls for Fullscreen Lightbox Modal
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
        setIsZoomed(false);
      } else if (e.key === 'ArrowRight') {
        handleNextImage();
      } else if (e.key === 'ArrowLeft') {
        handlePrevImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, activeImgIndex]);

  if (!vehicle) {
    return (
      <div className="py-20 text-center max-w-xl mx-auto space-y-4 px-4">
        <div className="w-16 h-16 rounded-3xl bg-[#2E4080]/10 text-[#2E4080] flex items-center justify-center mx-auto">
          <Info className="w-8 h-8 text-[#23EBFF]" />
        </div>
        <h2 className="text-2xl font-black text-[#2E4080] font-serif">Vehicle Not Selected</h2>
        <p className="text-slate-500 font-medium text-sm">Please select a vehicle from our showroom inventory to view full specifications and inspection reports.</p>
        <Button onClick={() => navigateTo('gallery')} className="mt-4 bg-[#2E4080] text-white font-bold hover:bg-[#1B2647]">
          Return to Showroom Inventory
        </Button>
      </div>
    );
  }

  // Ensure maximum 10 images
  const images = (vehicle.images || []).filter(Boolean).slice(0, 10);
  const totalImages = images.length;
  const hasImages = totalImages > 0;

  const selectImage = (idx: number) => {
    if (idx === activeImgIndex) return;
    setIsImageLoading(true);
    setImageFailed(false);
    setIsDoubleTapZoomed(false);
    setActiveImgIndex(idx);
  };

  const handlePrevImage = () => {
    setIsImageLoading(true);
    setImageFailed(false);
    setIsDoubleTapZoomed(false);
    setActiveImgIndex(prev => (prev === 0 ? totalImages - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setIsImageLoading(true);
    setImageFailed(false);
    setIsDoubleTapZoomed(false);
    setActiveImgIndex(prev => (prev === totalImages - 1 ? 0 : prev + 1));
  };

  // Mouse move handler for primary image zoom lens position tracking
  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 40;
    if (distance > minSwipeDistance) {
      handleNextImage(); // Swiped left -> next image
    } else if (distance < -minSwipeDistance) {
      handlePrevImage(); // Swiped right -> prev image
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const isSaved = savedVehicleIds.includes(vehicle.id);
  const currentPrice = vehicle.currentBid ?? vehicle.price;
  const minNextBid = currentPrice + 50000;

  // Monthly Payment Calculation
  const principal = Math.max(0, (vehicle.buyNowPrice ?? vehicle.price) - parseFloat(downPayment || '0'));
  const monthlyRate = interestRate / 100 / 12;
  const estimatedMonthly = monthlyRate > 0
    ? Math.round((principal * monthlyRate * Math.pow(1 + monthlyRate, loanTerm)) / (Math.pow(1 + monthlyRate, loanTerm) - 1))
    : Math.round(principal / loanTerm);

  const handleToggleSave = () => {
    toggleSaveVehicle(vehicle.id);
    if (isSaved) {
      showToast('Removed from your saved favorites');
    } else {
      showToast('Saved to your favorites!');
    }
  };

  const handleCopyVin = () => {
    navigator.clipboard.writeText(vehicle.vin);
    setCopiedVin(true);
    showToast(`VIN ${vehicle.vin} copied to clipboard!`);
    setTimeout(() => setCopiedVin(false), 2500);
  };

  const handleShareVehicle = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    showToast('Vehicle link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handlePlaceBid = (e: React.FormEvent) => {
    e.preventDefault();
    setBidError('');
    setBidSuccess('');

    const val = parseFloat(bidInput);
    if (!val || val < minNextBid) {
      setBidError(`Bid must be at least KSh ${minNextBid.toLocaleString()}`);
      return;
    }

    const ok = placeBid(vehicle.id, val, user?.name || 'Anonymous Bidder', user?.id || 'user_guest');
    if (ok) {
      setBidSuccess(`Bid placed successfully for KSh ${val.toLocaleString()}!`);
      showToast(`Bid recorded for KSh ${val.toLocaleString()}`);
      setBidInput('');
    } else {
      setBidError('Failed to record bid. Please try again.');
    }
  };

  const handleBuyNowEscrow = () => {
    if (!user) {
      navigateTo('dashboard');
      return;
    }
    initiateEscrow(vehicle, user.id, user.name);
    navigateTo('escrow');
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 bg-[#FCF9F4] pb-28 md:pb-12 text-[#2E4080] font-sans">
      
      {/* Toast Notification Floating Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-[#2E4080] text-white px-4 py-3 rounded-2xl shadow-2xl border border-[#23EBFF]/40 flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles className="w-4 h-4 text-[#23EBFF] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Left Navigation Breadcrumbs */}
      <NavigationBar currentTitle={vehicle.title.startsWith(String(vehicle.year)) ? vehicle.title : `${vehicle.year} ${vehicle.title}`} />

      {/* Top Title & Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-[#E8E1D5]">
        <div className="space-y-2.5 max-w-3xl">
          {/* Breadcrumb path */}
          <div className="flex items-center gap-2 text-xs text-[#6B7A99] font-semibold">
            <button 
              className="hover:underline hover:text-[#2E4080] cursor-pointer" 
              onClick={() => navigateTo('gallery')}
            >
              Inventory
            </button>
            <span>/</span>
            <span>{vehicle.make}</span>
            <span>/</span>
            <span className="text-[#23EBFF] font-bold">{vehicle.year} {vehicle.model}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#2E4080] tracking-tight font-serif leading-tight">
            {vehicle.title.startsWith(String(vehicle.year)) ? vehicle.title : `${vehicle.year} ${vehicle.title}`}
          </h1>

          {/* Interactive Market Status Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {/* Escrow Protected Badge */}
            <button
              onClick={() => navigateTo('escrow')}
              className="px-3 py-1.5 rounded-xl bg-[#23EBFF]/15 hover:bg-[#23EBFF]/25 text-[#2E4080] border border-[#23EBFF]/40 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer group shadow-2xs"
              title="Click to view M-Pesa Escrow Guarantee"
            >
              <Lock className="w-3.5 h-3.5 text-[#23EBFF] group-hover:scale-110 transition-transform" />
              <span>M-Pesa Escrow Protected</span>
              <ChevronRight className="w-3 h-3 text-[#2E4080]/60" />
            </button>

            {/* Auction or Fixed Price Status Badge */}
            <button
              onClick={() => navigateTo('auctions')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer group shadow-2xs ${
                vehicle.listingType === 'auction' || vehicle.listingType === 'both'
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 border-amber-400'
                  : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-900 border-emerald-400'
              }`}
              title="Click to view Live Auction Floor"
            >
              <Gavel className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
              <span>{vehicle.listingType === 'auction' ? 'Live Auction Floor' : 'Verified Fixed Price'}</span>
              <ChevronRight className="w-3 h-3 text-slate-500" />
            </button>

            {/* Pre-Inspection Badge */}
            <button
              onClick={() => navigateTo('ghost_check', vehicle.id)}
              className="px-3 py-1.5 rounded-xl bg-[#2E4080] hover:bg-[#1B2647] text-white border border-[#2E4080] text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer group shadow-2xs"
              title="Click to book 150-Point Pre-Purchase Inspection"
            >
              <Wrench className="w-3.5 h-3.5 text-[#23EBFF] group-hover:scale-110 transition-transform" />
              <span>150-Point Inspected</span>
              <ChevronRight className="w-3 h-3 text-[#23EBFF]" />
            </button>

            {/* Availability Status */}
            <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Ready for Delivery</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[#3D4F6F]">
            <span className="flex items-center gap-1 font-semibold">
              <MapPin className="w-3.5 h-3.5 text-[#23EBFF]" />
              {vehicle.location}
            </span>
            <span className="text-[#E2D8C7]">•</span>
            <span className="font-semibold flex items-center gap-1.5">
              <span>VIN:</span>
              <code className="font-mono bg-[#F6F1E8] border border-[#E2D8C7] px-2 py-0.5 rounded text-[#2E4080] font-bold">
                {vehicle.vin}
              </code>
              <button 
                onClick={handleCopyVin}
                className="p-1 text-[#6B7A99] hover:text-[#2E4080] transition-colors cursor-pointer"
                title="Copy VIN"
              >
                {copiedVin ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </span>
            <span className="text-[#E2D8C7]">•</span>
            <span className="flex items-center gap-1 text-[#6B7A99] font-medium">
              <Eye className="w-3.5 h-3.5" />
              <span>{vehicle.viewsCount != null ? `${vehicle.viewsCount} Views` : 'Views unavailable'}</span>
            </span>
          </div>
        </div>

        {/* Action Controls: Share & Favorite & Price Alert & Chat */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-1 md:pt-0">
          <button
            onClick={() => setIsAlertModalOpen(true)}
            className={`px-3.5 py-2.5 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
              existingAlert
                ? 'bg-[#2E4080] text-white border-[#2E4080] ring-2 ring-[#23EBFF]/50'
                : 'border-[#E2D8C7] bg-white text-[#2E4080] hover:border-[#23EBFF] hover:bg-[#F6F1E8]'
            }`}
            title={existingAlert ? `Price Alert Active (< KSh ${existingAlert.targetPrice.toLocaleString()})` : "Set Price Alert"}
          >
            {existingAlert ? (
              <>
                <BellRing className="w-4 h-4 text-[#23EBFF] animate-bounce" />
                <span>Alert Active</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 text-[#23EBFF]" />
                <span>Price Alert</span>
              </>
            )}
          </button>

          <button
            onClick={handleShareVehicle}
            className="p-2.5 rounded-xl border border-[#E2D8C7] bg-white text-[#2E4080] hover:border-[#2E4080] transition-all cursor-pointer shadow-2xs"
            title="Share Vehicle"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
          </button>

          <button
            onClick={handleToggleSave}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
              isSaved
                ? 'bg-[#DC3545]/10 border-[#DC3545] text-[#DC3545]'
                : 'border-[#E2D8C7] bg-white text-[#2E4080] hover:border-[#2E4080]'
            }`}
            title={isSaved ? "Remove from Favorites" : "Save to Favorites"}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={() => openChat(vehicle.id)}
            className="px-4 py-2.5 rounded-xl bg-[#23EBFF] text-[#2E4080] font-black text-xs flex items-center gap-2 shadow-xs hover:bg-[#23EBFF] transition-all uppercase tracking-wider cursor-pointer"
          >
            <MessageSquareText className="w-4 h-4" />
            <span>Chat Dealer</span>
          </button>
        </div>
      </div>

      {/* Main Gallery & Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Left 2 Cols: Main Interactive Image Gallery + Specs & Inspection */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Hero Gallery Image Frame */}
          <div className="space-y-3">
            <div 
              className="relative h-[420px] sm:h-[520px] lg:h-[580px] rounded-3xl overflow-hidden border border-[#E2D8C7] shadow-xl bg-slate-900 select-none cursor-crosshair group"
              onMouseEnter={() => setIsHoverZooming(true)}
              onMouseLeave={() => setIsHoverZooming(false)}
              onMouseMove={handleImageMouseMove}
              onClick={() => setIsDoubleTapZoomed(prev => !prev)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Image Skeleton Loader Placeholder */}
              {isImageLoading && (
                <Skeleton className="absolute inset-0 w-full h-full z-0 rounded-3xl bg-slate-800 animate-pulse" />
              )}

              {!hasImages ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-800 text-white space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center">
                    <Info className="w-8 h-8 text-[#23EBFF]" />
                  </div>
                  <h4 className="text-lg font-serif font-black">Vehicle photos unavailable</h4>
                  <p className="text-xs text-slate-300 max-w-sm">No vehicle images were supplied by the authoritative listing record.</p>
                </div>
              ) : !imageFailed ? (
                <img
                  src={images[activeImgIndex] || ''}
                  alt={`${formattedFullTitle} - Image ${activeImgIndex + 1}`}
                  width={800}
                  height={600}
                  loading="lazy"
                  decoding="async"
                  onLoad={() => setIsImageLoading(false)}
                  onError={() => {
                    setIsImageLoading(false);
                    setImageFailed(true);
                  }}
                  style={{
                    transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                    transform: isDoubleTapZoomed 
                      ? 'scale(2.5)' 
                      : isHoverZooming 
                        ? 'scale(2)' 
                        : 'scale(1)',
                  }}
                  className={`w-full h-full object-cover transition-transform duration-200 ease-out ${
                    isImageLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'
                  }`}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#2E4080] to-[#141E3F] text-white space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-[#23EBFF]/20 border border-[#23EBFF]/40 flex items-center justify-center text-[#23EBFF]">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-serif font-black">{formattedFullTitle}</h4>
                  <p className="text-xs text-slate-300 max-w-sm">Verified Showroom Vehicle • High Resolution Photography Loading</p>
                </div>
              )}

              {/* Badges Overlay */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10 pointer-events-none">
                <Badge variant="emerald" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                  Clean Title
                </Badge>
                {vehicle.inspection && (
                  <Badge variant="amber">
                    150-Pt Score: {vehicle.inspection.score}/100
                  </Badge>
                )}
                {activeImgIndex === 0 && (
                  <span className="px-2.5 py-1 rounded-xl bg-[#2E4080]/90 text-white font-mono text-[10px] font-bold border border-white/20 shadow-xs">
                    Primary Showroom Angle
                  </span>
                )}
              </div>

              {/* Image Counter & Fullscreen Trigger */}
              <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                <div className="bg-[#2E4080]/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/20 shadow-sm">
                  {activeImgIndex + 1} / {totalImages} Pictures
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasImages) setIsFullscreen(true);
                  }}
                  disabled={!hasImages}
                  className="p-2 rounded-full bg-[#2E4080]/90 backdrop-blur-md hover:bg-[#1B2647] text-white border border-white/20 shadow-sm transition-all cursor-pointer"
                  title="Fullscreen Lightbox Mode"
                >
                  <Maximize2 className="w-4 h-4 text-[#23EBFF]" />
                </button>
              </div>

              {/* Zoom Magnifier Lens Badge Indicator */}
              <div className="absolute bottom-4 left-4 bg-[#2E4080]/85 backdrop-blur-md px-3 py-1.5 rounded-2xl text-[11px] font-bold text-white border border-white/20 z-10 flex items-center gap-2 shadow-md pointer-events-none">
                <ZoomIn className="w-3.5 h-3.5 text-[#23EBFF]" />
                <span>{isDoubleTapZoomed ? 'Double Tap / Click to Reset' : 'Hover or Tap to Magnify'}</span>
              </div>

              {/* Navigation Arrows */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasImages) handlePrevImage();
                }}
                disabled={!hasImages}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-[#2E4080]/80 hover:bg-[#2E4080] text-white border border-white/20 transition-all opacity-90 group-hover:opacity-100 z-10 cursor-pointer"
                aria-label="Previous Image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasImages) handleNextImage();
                }}
                disabled={!hasImages}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-[#2E4080]/80 hover:bg-[#2E4080] text-white border border-white/20 transition-all opacity-90 group-hover:opacity-100 z-10 cursor-pointer"
                aria-label="Next Image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Thumbnails Strip (Up to 10 max) */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => selectImage(idx)}
                  className={`relative w-24 sm:w-28 h-16 sm:h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    activeImgIndex === idx
                      ? 'border-[#23EBFF] scale-105 shadow-md ring-2 ring-[#23EBFF]/30'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Thumb ${idx + 1}`} width={112} height={80} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-1 text-[9px] font-bold bg-[#2E4080]/90 text-white px-1.5 py-0.2 rounded">
                    #{idx + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Technical Specifications Matrix */}
          <div className="p-6 rounded-3xl bg-white border border-[#E2D8C7] space-y-4 shadow-xs">
            <h3 className="text-lg font-bold text-[#2E4080] font-serif flex items-center justify-between">
              <span>Technical Specifications</span>
              <span className="text-xs font-mono font-bold text-[#23EBFF]">KAYAD Verified</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#F6F1E8] border border-[#E2D8C7]">
                <span className="text-[#6B7A99] font-bold uppercase block text-[10px]">Year</span>
                <span className="text-sm font-extrabold text-[#2E4080]">{vehicle.year}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F6F1E8] border border-[#E2D8C7]">
                <span className="text-[#6B7A99] font-bold uppercase block text-[10px]">Mileage</span>
                <span className="text-sm font-extrabold text-[#2E4080]">{vehicle.mileage.toLocaleString()} km</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F6F1E8] border border-[#E2D8C7]">
                <span className="text-[#6B7A99] font-bold uppercase block text-[10px]">Fuel Type</span>
                <span className="text-sm font-extrabold text-[#2E4080]">{vehicle.fuelType}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F6F1E8] border border-[#E2D8C7]">
                <span className="text-[#6B7A99] font-bold uppercase block text-[10px]">Transmission</span>
                <span className="text-sm font-extrabold text-[#2E4080]">{vehicle.transmission}</span>
              </div>

              <div className="p-3 rounded-2xl bg-[#F6F1E8] border border-[#E2D8C7]">
                <span className="text-[#6B7A99] font-bold uppercase block text-[10px]">Engine</span>
                <span className="text-sm font-extrabold text-[#2E4080]">{vehicle.engine}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F6F1E8] border border-[#E2D8C7]">
                <span className="text-[#6B7A99] font-bold uppercase block text-[10px]">Horsepower</span>
                <span className="text-sm font-extrabold text-[#2E4080]">{vehicle.horsepower} HP</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F6F1E8] border border-[#E2D8C7]">
                <span className="text-[#6B7A99] font-bold uppercase block text-[10px]">Exterior Color</span>
                <span className="text-sm font-extrabold text-[#2E4080]">{vehicle.exteriorColor || 'Not provided'}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F6F1E8] border border-[#E2D8C7]">
                <span className="text-[#6B7A99] font-bold uppercase block text-[10px]">Condition</span>
                <span className="text-sm font-extrabold text-[#2E4080]">{vehicle.condition || 'Not provided'}</span>
              </div>
            </div>

            {/* Description */}
            <div className="pt-2 border-t border-[#E8E1D5] space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7A99]">Seller Description</h4>
              <p className="text-xs text-[#3D4F6F] leading-relaxed font-medium">
                {vehicle.description || 'The seller has not provided a description for this listing.'}
              </p>
            </div>

            {/* Installed Features */}
            <div className="pt-2 border-t border-[#E8E1D5]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7A99] mb-2">
                Installed Features & Options
              </h4>
              <div className="flex flex-wrap gap-2">
                {vehicle.features.map((feat, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-xl text-xs font-semibold bg-[#F6F1E8] text-[#2E4080] border border-[#E2D8C7]"
                  >
                    {feat}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 150-Point Inspection Section */}
          {vehicle.inspection && (
            <div className="p-6 rounded-3xl bg-[#2E4080] text-white border border-[#2E4080] space-y-4 shadow-md relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#23EBFF]/20 border border-[#23EBFF]/40 flex items-center justify-center text-[#23EBFF] shrink-0">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-white font-serif">
                        150-Point Ghost Check Certification
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase bg-[#23EBFF] text-[#2E4080]">
                        Verified
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Inspected on {vehicle.inspection.inspectedAt} by Senior Inspector {vehicle.inspection.inspectorName}
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <span className="text-3xl sm:text-4xl font-black text-[#23EBFF] font-serif block">
                    {vehicle.inspection.score}/100
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                    Grade A Pass Certificate
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 space-y-1">
                  <span className="text-[10px] text-slate-300 font-bold block uppercase tracking-wider">Engine & Powertrain</span>
                  <span className="text-xs font-extrabold text-[#3ddb72]">{vehicle.inspection.engineHealth}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 space-y-1">
                  <span className="text-[10px] text-slate-300 font-bold block uppercase tracking-wider">Body & Chassis Integrity</span>
                  <span className="text-xs font-extrabold text-[#23EBFF]">{vehicle.inspection.bodyCondition}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 space-y-1">
                  <span className="text-[10px] text-slate-300 font-bold block uppercase tracking-wider">Electronics & Systems</span>
                  <span className="text-xs font-extrabold text-[#3ddb72]">{vehicle.inspection.interiorHealth}</span>
                </div>
              </div>
            </div>
          )}

          {/* KAYAD Guarantees & Buyer Protection - Redesigned with Brand Theme Colors */}
          <div className="p-6 rounded-3xl bg-[#2E4080] text-white border border-[#2E4080] space-y-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#23EBFF]/15 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3.5 relative z-10">
              <h3 className="text-base font-bold text-white font-serif flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#23EBFF]" />
                <span>Buyer Protection & Trust Guarantees</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#23EBFF]/20 text-[#23EBFF] border border-[#23EBFF]/40">
                100% KAYAD Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs relative z-10">
              <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 flex items-start gap-3 hover:border-[#23EBFF]/40 transition-colors">
                <CheckCircle2 className="w-4 h-4 text-[#23EBFF] shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-white block">Official Title & Logbook Cleared</span>
                  <span className="text-slate-300 text-[11px] leading-relaxed">NTSA logbook ownership verified with zero outstanding encumbrances.</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 flex items-start gap-3 hover:border-[#23EBFF]/40 transition-colors">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-white block">Accident & Chassis Inspection Passed</span>
                  <span className="text-slate-300 text-[11px] leading-relaxed">Structural chassis integrity and body alignment scan passed without defect.</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 flex items-start gap-3 hover:border-[#23EBFF]/40 transition-colors">
                <Lock className="w-4 h-4 text-[#23EBFF] shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-white block">Secure M-Pesa Buyer Protection</span>
                  <span className="text-slate-300 text-[11px] leading-relaxed">Direct M-Pesa or bank transfer backed by 48-hour physical inspection.</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 flex items-start gap-3 hover:border-[#23EBFF]/40 transition-colors">
                <FileText className="w-4 h-4 text-[#23EBFF] shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-white block">Complete Service History</span>
                  <span className="text-slate-300 text-[11px] leading-relaxed">Verified franchise maintenance logbook and authentic odometer check.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Book Inspection Panel */}
          <div className="p-6 rounded-3xl bg-[#1B2647] text-white border border-white/10 space-y-4 shadow-lg relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#23EBFF]/20 border border-[#23EBFF]/40 flex items-center justify-center text-[#23EBFF] shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-extrabold uppercase text-[#23EBFF] tracking-wider">
                    GHOST CHECK VERIFICATION
                  </div>
                  <h3 className="text-lg font-black text-white font-serif">
                    Request On-Demand Physical Inspection
                  </h3>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-[#23EBFF]/20 text-[#23EBFF] text-xs font-mono font-bold border border-[#23EBFF]/30 w-fit">
                From KSh 4,500
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Want independent peace of mind before buying this <strong className="text-white">{vehicle.title.startsWith(String(vehicle.year)) ? vehicle.title : `${vehicle.year} ${vehicle.title}`}</strong>? Book an on-demand physical and mechanical scan. Our certified master engineers check 150 points, scan OBD-II fault codes, verify paint depth & test drive the vehicle.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => navigateTo('ghost_check', vehicle.id)}
                className="w-full py-3 px-4 rounded-xl bg-[#23EBFF] hover:bg-[#23EBFF] text-[#2E4080] font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all uppercase tracking-wider cursor-pointer"
              >
                <Wrench className="w-4 h-4" />
                <span>Book Inspection Now</span>
              </button>

              <button
                onClick={() => navigateTo('ghost_check', vehicle.id)}
                className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/20 transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#23EBFF]" />
                <span>See Sample Reports</span>
              </button>
            </div>
          </div>

        </div>

        {/* Right Col: Sticky Action Box, Bidding & Dealer Card */}
        <div className="space-y-6 lg:sticky lg:top-24 h-fit">
          
          {/* Purchase / Bidding Action Card */}
          <div className="p-6 rounded-3xl bg-white border border-[#E2D8C7] shadow-lg space-y-5">
            
            {/* Price Header */}
            <div className="space-y-3 border-b border-[#E8E1D5] pb-4">
              <span className="text-[10px] font-bold text-[#6B7A99] uppercase tracking-wider block">
                Listed Purchase Price
              </span>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-3xl font-black text-[#2E4080] font-serif">
                  KSh {vehicle.price.toLocaleString()}
                </span>
                <span className="text-xs text-emerald-700 font-extrabold bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 shrink-0">
                  Duty Paid
                </span>
              </div>

              {/* Buy Now Direct Protection CTA Button (Primary Action) */}
              <button
                onClick={handleBuyNowEscrow}
                className="w-full py-3.5 px-4 rounded-xl bg-[#2E4080] hover:bg-[#141E3F] text-white font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-md border border-[#2E4080] cursor-pointer mt-2"
              >
                <Lock className="w-4 h-4 text-[#23EBFF]" />
                <span>Buy Now via M-Pesa Protection</span>
              </button>

              <p className="text-[11px] text-[#6B7A99] text-center leading-normal font-medium pt-1">
                Protected by M-Pesa Direct Payment. Backup guaranteed by 48-hr physical vehicle inspection.
              </p>

              {/* Set Price Alert Callout */}
              <button
                type="button"
                onClick={() => setIsAlertModalOpen(true)}
                className={`w-full py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer mt-1 ${
                  existingAlert
                    ? 'bg-[#23EBFF]/15 text-[#2E4080] border-[#23EBFF]/40 hover:bg-[#23EBFF]/25'
                    : 'bg-[#F6F1E8] text-[#2E4080] border-[#E2D8C7] hover:bg-[#E8E1D5]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BellRing className={`w-4 h-4 ${existingAlert ? 'text-[#23EBFF] animate-pulse' : 'text-[#6B7A99]'}`} />
                  <span className="truncate">
                    {existingAlert ? `Price Alert: < KSh ${existingAlert.targetPrice.toLocaleString()}` : 'Get notified if price drops'}
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#23EBFF] underline shrink-0">
                  {existingAlert ? 'Manage' : 'Set Alert'}
                </span>
              </button>
            </div>

            {/* Auction Bidding Form (if auction or both) */}
            {(vehicle.listingType === 'auction' || vehicle.listingType === 'both') && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#6B7A99] uppercase tracking-wider">
                    Current High Bid
                  </span>
                  <Badge variant="amber" icon={<Gavel className="w-3 h-3" />}>
                    Live Auction
                  </Badge>
                </div>
                <p className="text-2xl font-black text-[#2E4080] font-serif">
                  KSh {currentPrice.toLocaleString()}
                </p>

                {bidSuccess && (
                  <p className="text-xs font-bold text-[#2E4080] bg-[#3ddb72]/20 p-2.5 rounded-xl border border-[#3ddb72]/40">
                    {bidSuccess}
                  </p>
                )}
                {bidError && (
                  <p className="text-xs font-bold text-[#DC3545] bg-[#DC3545]/10 p-2.5 rounded-xl border border-[#DC3545]/20">
                    {bidError}
                  </p>
                )}

                <form onSubmit={handlePlaceBid} className="space-y-3">
                  <Input
                    label={`Your Bid (Min: KSh ${minNextBid.toLocaleString()})`}
                    type="number"
                    placeholder={`e.g. ${minNextBid}`}
                    value={bidInput}
                    onChange={e => setBidInput(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-[#3ddb72] hover:bg-[#3ddb72] text-[#2E4080] font-extrabold text-xs tracking-wider uppercase transition-all shadow-md cursor-pointer"
                  >
                    Place Binding Bid
                  </button>
                </form>
              </div>
            )}

            {/* Buy Now Escrow Button */}
            {vehicle.buyNowPrice && (
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#6B7A99] uppercase tracking-wider">
                    Buy Now Instant Price
                  </span>
                  <span className="text-lg font-black text-[#2E4080] font-serif">
                    KSh {vehicle.buyNowPrice.toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={handleBuyNowEscrow}
                  className="w-full py-3.5 rounded-xl bg-[#2E4080] hover:bg-[#141E3F] text-white font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-md border border-[#2E4080] cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-[#23EBFF]" />
                  <span>Buy Now via M-Pesa Escrow</span>
                </button>
                <p className="text-[11px] text-[#6B7A99] text-center leading-normal font-medium">
                  Protected by M-Pesa Regulated Escrow. Funds released only after 48-hr buyer inspection.
                </p>
              </div>
            )}
          </div>

          {/* Verified Dealer Card */}
          <div className="p-6 rounded-3xl bg-[#2E4080] text-white border border-[#2E4080] space-y-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#23EBFF]/20 border border-[#23EBFF]/40 flex items-center justify-center text-[#23EBFF] shrink-0 font-bold text-xl font-serif">
                {vehicle.sellerName.charAt(0)}
              </div>
              <div>
                <p className="text-xs text-slate-300 font-semibold">Listed by {vehicle.sellerType || 'Seller'}</p>
                <h4 className="text-base font-bold text-white font-serif">{vehicle.sellerName}</h4>
                {vehicle.sellerRating > 0 ? (
                  <p className="text-xs text-[#23EBFF] font-bold">★ {vehicle.sellerRating}</p>
                ) : (
                  <p className="text-xs text-slate-300 font-medium">Seller rating not yet available</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => openChat(vehicle.id)}
                className="py-2.5 px-3 rounded-xl bg-[#23EBFF] hover:bg-[#23EBFF] text-[#2E4080] font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <MessageSquareText className="w-3.5 h-3.5" />
                <span>Chat Dealer</span>
              </button>

              {vehicle.sellerPhone ? (
                <a
                  href={`tel:${vehicle.sellerPhone}`}
                  className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 border border-white/20 transition-all cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-[#23EBFF]" />
                  <span>Call Seller</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => showToast('Seller phone number is not available for this listing.')}
                  className="py-2.5 px-3 rounded-xl bg-white/10 text-slate-300 font-extrabold text-xs flex items-center justify-center gap-1.5 border border-white/20 cursor-not-allowed"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Phone Unavailable</span>
                </button>
              )}
            </div>

            <button
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs border border-white/10 transition-all cursor-pointer"
              onClick={() => navigateTo('dealer_profile')}
            >
              View Dealer Profile & Inventory
            </button>
          </div>

          {/* Financing Estimator */}
          <div className="p-6 rounded-3xl bg-white border border-[#E2D8C7] space-y-4 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-[#2E4080] text-sm font-serif">
              <Calculator className="w-4 h-4 text-[#23EBFF]" />
              <span>Financing Calculator (KSh)</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#3D4F6F] font-bold block mb-1">Down Payment (KSh)</label>
                <input
                  type="number"
                  value={downPayment}
                  onChange={e => setDownPayment(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E8] border border-[#E2D8C7] rounded-xl font-bold text-[#2E4080] focus:outline-none focus:ring-1 focus:ring-[#23EBFF]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#3D4F6F] font-bold block mb-1">Term (Months)</label>
                  <select
                    value={loanTerm}
                    onChange={e => setLoanTerm(parseInt(e.target.value))}
                    className="w-full p-2.5 bg-[#F6F1E8] border border-[#E2D8C7] rounded-xl font-bold text-[#2E4080] focus:outline-none focus:ring-1 focus:ring-[#23EBFF]"
                  >
                    <option value={36}>36 Months</option>
                    <option value={48}>48 Months</option>
                    <option value={60}>60 Months</option>
                    <option value={72}>72 Months</option>
                  </select>
                </div>
                <div>
                  <label className="text-[#3D4F6F] font-bold block mb-1">APR Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={interestRate}
                    onChange={e => setInterestRate(parseFloat(e.target.value))}
                    className="w-full p-2.5 bg-[#F6F1E8] border border-[#E2D8C7] rounded-xl font-bold text-[#2E4080] focus:outline-none focus:ring-1 focus:ring-[#23EBFF]"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#F6F1E8] border border-[#E2D8C7] text-center">
                <span className="text-[10px] text-[#6B7A99] font-bold uppercase block">Estimated Monthly Payment</span>
                <span className="text-2xl font-black text-[#2E4080] font-serif">KSh {estimatedMonthly.toLocaleString()}/mo</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Floating Bottom Action Bar for Mobile Devices */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#2E4080]/95 backdrop-blur-lg border-t border-white/10 p-3.5 shadow-2xl flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-mono text-[#23EBFF] font-bold block uppercase">Price</span>
          <span className="text-base font-black text-white font-serif">
            KSh {(vehicle.buyNowPrice || vehicle.price).toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openChat(vehicle.id)}
            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs flex items-center justify-center cursor-pointer"
            title="Chat Dealer"
          >
            <MessageSquareText className="w-4 h-4 text-[#23EBFF]" />
          </button>

          <button
            onClick={handleBuyNowEscrow}
            className="py-3 px-4 rounded-xl bg-[#23EBFF] hover:bg-[#23EBFF] text-[#2E4080] font-black text-xs flex items-center gap-1.5 shadow-md uppercase tracking-wider cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Buy via Escrow</span>
          </button>
        </div>
      </div>

      {/* Fullscreen Lightbox Gallery Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200">
          
          {/* Modal Top Bar */}
          <div className="flex items-center justify-between text-white border-b border-white/10 pb-4">
            <div className="space-y-0.5">
              <h3 className="text-sm sm:text-base font-extrabold font-serif text-white">
                {vehicle.title}
              </h3>
              <p className="text-xs text-[#23EBFF] font-mono font-bold">
                Picture {activeImgIndex + 1} of {totalImages} • Use ← → or Esc keys
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsZoomed(!isZoomed)}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                title={isZoomed ? "Zoom Out" : "Zoom In"}
              >
                {isZoomed ? <ZoomOut className="w-5 h-5 text-[#23EBFF]" /> : <ZoomIn className="w-5 h-5 text-[#23EBFF]" />}
              </button>

              <button
                onClick={() => {
                  setIsFullscreen(false);
                  setIsZoomed(false);
                }}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                title="Close Fullscreen (Esc)"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* Modal Main Image Display */}
          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden select-none">
            <img
              src={images[activeImgIndex] || ''}
              alt={`Fullscreen ${vehicle.title} ${activeImgIndex + 1}`}
              width={800}
              height={600}
              loading="lazy"
              decoding="async"
              className={`max-h-full max-w-full object-contain transition-transform duration-300 ${
                isZoomed ? 'scale-150 cursor-grab' : 'scale-100'
              }`}
            />

            {/* Left/Right Modal Arrows */}
            <button
              onClick={handlePrevImage}
              className="absolute left-2 sm:left-6 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer"
              aria-label="Previous"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-2 sm:right-6 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer"
              aria-label="Next"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          </div>

          {/* Modal Bottom Thumbnail Bar */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto pt-3 border-t border-white/10 no-scrollbar">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImgIndex(idx)}
                className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                  activeImgIndex === idx
                    ? 'border-[#23EBFF] scale-105 shadow-lg ring-2 ring-[#23EBFF]/50'
                    : 'border-transparent opacity-50 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`Modal thumb ${idx + 1}`} width={80} height={56} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

        </div>
      )}

      {/* Price Alert Configuration Modal */}
      <PriceAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        vehicle={vehicle}
        existingAlert={existingAlert}
        onShowToast={showToast}
      />

    </div>
  );
};

