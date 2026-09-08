import React, { useState, useEffect, useMemo } from 'react';
import { Vehicle } from '../types';
import { isEscrowApplicable, getEscrowBadgeLabel } from '../utils/escrow';
import {
  CheckCircle2,
  MapPin,
  Lock,
  MessageSquare,
  Heart,
  FileCheck,
  ShieldCheck,
  Landmark,
  Calculator,
  Gauge,
  Fuel,
  Sliders,
  Sparkles,
  Phone,
  Zap,
  Info,
  ChevronRight,
  ChevronLeft,
  Shield,
  Star,
  Award,
  Clock,
  ArrowRight,
  SearchX,
  AlertCircle,
  Gavel,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Check,
  Building2,
  UserCheck,
  Car,
  Wrench,
  Share2,
  ExternalLink,
  Eye,
  Calendar,
  Layers,
  ShieldAlert,
  PlayCircle,
  RotateCw,
  Compass,
  CheckSquare,
  Sparkle
} from 'lucide-react';
import { Modal, Badge, Button, Card, LazyImage } from './ui';

interface VehicleDetailModalProps {
  vehicle: Vehicle | null;
  notFoundId?: string | null;
  allVehicles?: Vehicle[];
  onClose: () => void;
  onStartEscrow: (vehicle: Vehicle) => void;
  onContactSeller: (vehicle: Vehicle) => void;
  onRequestInspection?: (vehicle: Vehicle) => void;
  onViewAuctionLot?: (vehicle: Vehicle) => void;
  onNavigateToFinancing?: (vehicle: Vehicle) => void;
  onViewShowroom?: (sellerName: string) => void;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onSelectVehicle?: (vehicle: Vehicle) => void;
}

export const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({
  vehicle,
  notFoundId,
  allVehicles = [],
  onClose,
  onStartEscrow,
  onContactSeller,
  onRequestInspection,
  onViewAuctionLot,
  onNavigateToFinancing,
  onViewShowroom,
  isSaved,
  onToggleSave,
  onSelectVehicle
}) => {
  // Related / Similar vehicles (matching make or bodyStyle)
  const relatedVehicles = useMemo(() => {
    if (!vehicle) return [];
    return allVehicles
      .filter((v) => v.id !== vehicle.id && (v.make === vehicle.make || v.bodyStyle === vehicle.bodyStyle))
      .slice(0, 3);
  }, [allVehicles, vehicle]);

  // Gallery State
  const allImages = useMemo(() => {
    if (!vehicle) return [];
    const set = new Set([vehicle.image, ...(vehicle.additionalImages || [])]);
    return Array.from(set);
  }, [vehicle]);

  const [activeImage, setActiveImage] = useState<string>(vehicle?.image || '');
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);
  const [testDriveBooked, setTestDriveBooked] = useState<boolean>(false);

  // Categorized Collapsible Features State
  const [openFeatureCategories, setOpenFeatureCategories] = useState<Record<string, boolean>>({
    safety: true,
    comfort: true,
    technology: true,
    utility: false
  });

  // Expandable Spec Sections State
  const [openSpecSections, setOpenSpecSections] = useState<Record<string, boolean>>({
    powertrain: true,
    chassis: false,
    registration: false
  });

  // Financing Calculator State
  const [depositPercent, setDepositPercent] = useState<number>(20);
  const [loanTermMonths, setLoanTermMonths] = useState<number>(36);

  // Sync active image when vehicle changes
  useEffect(() => {
    if (vehicle) {
      setActiveImage(vehicle.image);
      setTestDriveBooked(false);
      setShareSuccess(false);
    }
  }, [vehicle]);

  // Grouped Features Categorization.
  // MUST stay above the early returns below: React hooks may not be
  // called conditionally — with this useMemo after `if (!vehicle)
  // return null`, re-rendering the same mounted instance from closed
  // (vehicle=null) to open ran more hooks than the previous render and
  // crashed with React error #310 on the real click path.
  const featureGroups = useMemo(() => {
    if (!vehicle) {
      return { safety: [], comfort: [], technology: [], utility: [] } as Record<string, string[]>;
    }

    const rawFeatures = vehicle.features || [
      'EyeSight Driver Assist', 'Lane Departure Warning', 'ABS Brakes', 'Multiple Airbags',
      'Heated Seats', 'Dual Climate Control', 'Leather Interior', 'Sunroof',
      'Apple CarPlay', 'Bluetooth Connectivity', 'Premium Audio System', 'Reverse Camera',
      'Roof Rails', 'Power Tailgate', 'Cargo Cover', 'Alloy Wheels'
    ];

    const safety: string[] = [];
    const comfort: string[] = [];
    const technology: string[] = [];
    const utility: string[] = [];

    rawFeatures.forEach(feat => {
      const lower = feat.toLowerCase();
      if (lower.includes('eyesight') || lower.includes('lane') || lower.includes('abs') || lower.includes('airbag') || lower.includes('safety') || lower.includes('brake') || lower.includes('blind')) {
        safety.push(feat);
      } else if (lower.includes('heat') || lower.includes('climate') || lower.includes('leather') || lower.includes('seat') || lower.includes('sunroof') || lower.includes('keyless')) {
        comfort.push(feat);
      } else if (lower.includes('play') || lower.includes('bluetooth') || lower.includes('audio') || lower.includes('camera') || lower.includes('nav') || lower.includes('screen') || lower.includes('tech')) {
        technology.push(feat);
      } else {
        utility.push(feat);
      }
    });

    return {
      safety: safety.length ? safety : ['EyeSight Driver Assist', 'Lane Keep Assist', 'Anti-Lock Brakes (ABS)', 'Front & Side Airbags'],
      comfort: comfort.length ? comfort : ['Heated Front Seats', 'Dual-Zone Automatic Climate Control', 'Leather Upholstery'],
      technology: technology.length ? technology : ['Apple CarPlay & Android Auto', 'Bluetooth Audio & Hands-Free', 'Multi-View Reverse Camera'],
      utility: utility.length ? utility : ['Roof Rails & Crossbars', 'Power Tailgate', 'Retractable Cargo Cover']
    };
  }, [vehicle]);

  if (!vehicle && !notFoundId) return null;

  // 404 Vehicle Not Found State
  if (!vehicle && notFoundId) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Listing Unavailable" maxWidth="2xl">
        <div className="p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-xs">
            <SearchX className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <Badge variant="danger" size="md">
              <AlertCircle className="w-3.5 h-3.5" /> 404 Listing Not Found
            </Badge>
            <h3 className="text-2xl font-black text-[#1E3063] font-display">
              Vehicle #{notFoundId} Not Available
            </h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              This vehicle may have been sold, unlisted, or completed through the KAYAD Escrow Vault.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs text-slate-700 space-y-2 max-w-md mx-auto">
            <p className="font-bold text-[#1E3063]">Recommended Next Steps:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Explore verified inventory in the active marketplace</li>
              <li>Filter by make, model, county, or budget</li>
              <li>Contact support if you hold an active escrow deposit for this listing</li>
            </ul>
          </div>

          <div className="flex justify-center pt-2">
            <Button variant="primary" size="md" onClick={onClose}>
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Return to Marketplace</span>
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  if (!vehicle) return null;

  // Key Calculations
  const price = vehicle.price;
  const depositAmount = (price * depositPercent) / 100;
  const loanPrincipal = Math.max(0, price - depositAmount);
  const annualInterestRate = 0.13; // 13% p.a. asset financing estimate
  const monthlyInterestRate = annualInterestRate / 12;
  const monthlyPayment = loanPrincipal > 0
    ? (loanPrincipal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, loanTermMonths)) / (Math.pow(1 + monthlyInterestRate, loanTermMonths) - 1)
    : 0;

  const isPrivateSeller = vehicle.sellerType === 'Private Seller';
  const isAuction = Boolean(vehicle.isAuction);
  const isEscrowActive = isEscrowApplicable(vehicle);
  const isInspectionActive = Boolean(vehicle.inspectionPassed);
  const isFinanceActive = Boolean(vehicle.financeAvailable);

  // Fixed (Final Integration Phase 3): displayPrice previously looked
  // up the live auction session by vehicle ID for the
  // live current bid. vehicle.currentBid is already the real, current
  // value - mapped directly from the real backend by
  // mapBackendCarToVehicle (this project's own earlier Phase 3
  // hardening work already wired vehicles to fetch real data) - the
  // mock lookup was both wrong (a real vehicle's ID would never match
  // a mock session's ID) and unnecessary.
  const displayPrice = isAuction ? (vehicle.currentBid ?? vehicle.price) : vehicle.price;

  // Market Deal Analysis
  const getMarketDiff = () => {
    if (!vehicle.marketPriceAvg) return null;
    const diff = vehicle.marketPriceAvg - vehicle.price;
    return {
      amount: Math.abs(diff),
      isBelow: diff > 0,
      percentage: Math.round((Math.abs(diff) / vehicle.marketPriceAvg) * 100)
    };
  };
  const marketDiff = getMarketDiff();

  // Status Chip Generation
  const getStatusChip = () => {
    if (isAuction) return { label: 'Auction Ends Soon', variant: 'live' as const };
    if (isPrivateSeller) return { label: 'Private Sale • Direct Transfer', variant: 'neutral' as const };
    if (vehicle.condition === 'Brand New') return { label: 'Ready for Immediate Transfer', variant: 'success' as const };
    return { label: 'Available Today • Ready for Viewing', variant: 'verified' as const };
  };
  const statusChip = getStatusChip();

  // Share handler
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    }
  };

  const toggleFeatureCategory = (key: string) => {
    setOpenFeatureCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSpecSection = (key: string) => {
    setOpenSpecSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Header Title Component
  const modalTitle = (
    <div className="flex items-center justify-between w-full pr-8">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[#1E3063] font-black text-lg font-display tracking-tight">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </span>
        <span className="text-slate-400 font-medium text-xs">| Ref #{vehicle.id}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleShare}
          className="p-2 rounded-full border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Share Listing"
        >
          {shareSuccess ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
        </button>
        <button
          onClick={() => onToggleSave(vehicle.id)}
          className={`p-2 rounded-full border transition-all cursor-pointer ${
            isSaved ? 'bg-rose-50 text-rose-600 border-rose-200' : 'text-slate-500 border-slate-200 hover:bg-slate-100'
          }`}
          title={isSaved ? 'Saved in Watchlist' : 'Save to Watchlist'}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Modal isOpen={!!vehicle} onClose={onClose} title={modalTitle} maxWidth="5xl">
        <div className="space-y-10 pb-28 lg:pb-8 relative bg-white">

          {/* ==========================================
              1. HERO AREA (Near-Full First Screen Showroom)
              ========================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Gallery Column (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Primary Large Image Viewer */}
              <div
                onClick={() => setIsLightboxOpen(true)}
                className="h-80 sm:h-[420px] rounded-3xl overflow-hidden bg-slate-950 border border-slate-200 relative group shadow-lg cursor-zoom-in"
              >
                <LazyImage
                  src={activeImage}
                  alt={vehicle.title}
                  wrapperClassName="w-full h-full"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />

                {/* Overlays: Condition & Interactive Media Chips */}
                <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap z-10">
                  <Badge variant="verified" size="sm" className="shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    {vehicle.condition || 'Foreign Used'}
                  </Badge>

                  {/* 360 & Video Interactive Badges */}
                  <span className="bg-white/90 backdrop-blur-md text-[#1E3063] text-[11px] font-extrabold px-3 py-1 rounded-full border border-white/50 shadow-xs flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 text-blue-600" /> 360° View
                  </span>

                  <span className="bg-white/90 backdrop-blur-md text-[#1E3063] text-[11px] font-extrabold px-3 py-1 rounded-full border border-white/50 shadow-xs flex items-center gap-1.5">
                    <PlayCircle className="w-3.5 h-3.5 text-rose-600" /> Walkaround Video
                  </span>
                </div>

                {/* Floating Location Overlay */}
                <div className="absolute bottom-4 left-4 bg-[#1E3063]/90 text-white text-xs font-extrabold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 backdrop-blur-md shadow-md z-10">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{vehicle.location}, {vehicle.county}</span>
                </div>

                {/* Counter & Fullscreen Controls */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
                  <span className="bg-black/75 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/10">
                    📷 {allImages.indexOf(activeImage) + 1} / {allImages.length}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsLightboxOpen(true);
                    }}
                    className="p-2 bg-black/75 hover:bg-black text-white rounded-xl backdrop-blur-md transition-colors border border-white/10 cursor-pointer"
                    title="Fullscreen Lightbox"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Touch Previous / Next Controls */}
                {allImages.length > 1 && (
                  <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const currentIdx = allImages.indexOf(activeImage);
                        const prevIdx = (currentIdx - 1 + allImages.length) % allImages.length;
                        setActiveImage(allImages[prevIdx]);
                      }}
                      className="pointer-events-auto w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const currentIdx = allImages.indexOf(activeImage);
                        const nextIdx = (currentIdx + 1) % allImages.length;
                        setActiveImage(allImages[nextIdx]);
                      }}
                      className="pointer-events-auto w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Smooth Thumbnail Carousel */}
              {allImages.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(img)}
                      className={`h-20 w-28 shrink-0 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                        activeImage === img ? 'border-[#1E3063] ring-2 ring-[#1E3063]/20 scale-95 shadow-xs' : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <LazyImage src={img} alt={`Thumb ${idx + 1}`} wrapperClassName="w-full h-full" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Side: Title, Price Block, Dealer Preview & Primary Actions (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6">

              <div className="space-y-4">

                {/* Vehicle Title & Condition */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant={statusChip.variant} size="sm">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {statusChip.label}
                    </Badge>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-[#1E3063] font-display tracking-tight leading-snug">
                    {vehicle.title}
                  </h1>
                </div>

                {/* ==========================================
                    2. PREMIUM PRICE PANEL
                    ========================================== */}
                <Card className="p-5 bg-gradient-to-br from-slate-50 via-amber-50/30 to-slate-50 border-amber-300/80 shadow-xs space-y-3">
                  <div className="flex items-baseline justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        {isAuction ? 'Current Highest Bid' : 'Listed Price'}
                      </p>
                      <span className="text-3xl font-black text-[#1E3063] font-display tracking-tight">
                        Ksh {displayPrice.toLocaleString()}
                      </span>
                    </div>

                    {marketDiff && (
                      <span className={`text-xs font-extrabold px-3 py-1 rounded-xl border ${
                        marketDiff.isBelow
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {marketDiff.isBelow ? `Ksh ${marketDiff.amount.toLocaleString()} Below Market` : 'Fair Market Price'}
                      </span>
                    )}
                  </div>

                  {/* Monthly Finance Estimate Indicator */}
                  {isFinanceActive && (
                    <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-bold flex items-center gap-1.5">
                        <Landmark className="w-4 h-4 text-blue-600" /> Estimated Monthly Finance:
                      </span>
                      <span className="font-black text-[#1E3063] text-sm font-display">
                        Ksh {Math.round(monthlyPayment).toLocaleString()} / mo
                      </span>
                    </div>
                  )}
                </Card>

                {/* ==========================================
                    3. SELLER SUMMARY CARD
                    ========================================== */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#1E3063] text-amber-400 font-black flex items-center justify-center font-display text-base shadow-xs">
                        {vehicle.sellerName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-[#1E3063] text-sm font-display">{vehicle.sellerName}</h4>
                          <ShieldCheck className="w-4 h-4 text-amber-500" />
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          ★ {vehicle.sellerRating} Rating • {vehicle.sellerType} • Response: {vehicle.responseTime || '< 15 mins'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dealer Primary & Secondary CTAs */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => (onViewShowroom ? onViewShowroom(vehicle.sellerName) : onContactSeller(vehicle))}
                    >
                      <Building2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>View Showroom</span>
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onContactSeller(vehicle)}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#1E3063]" />
                      <span>Contact Dealer</span>
                    </Button>
                  </div>
                </div>

              </div>

              {/* PRIMARY PURCHASE ACTIONS */}
              <div className="space-y-2.5">
                {isAuction ? (
                  <Button
                    variant="accent"
                    size="lg"
                    fullWidth
                    onClick={() => (onViewAuctionLot ? onViewAuctionLot(vehicle) : onContactSeller(vehicle))}
                    className="shadow-md font-black text-sm"
                  >
                    <Gavel className="w-5 h-5 text-[#17244B]" />
                    <span>Place Bid / Submit Auction Offer</span>
                  </Button>
                ) : isPrivateSeller || isEscrowActive ? (
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => onStartEscrow(vehicle)}
                    className="shadow-md font-black text-sm"
                  >
                    <Lock className="w-5 h-5 text-amber-400" />
                    <span>Start Secure Escrow Purchase</span>
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => (onRequestInspection ? onRequestInspection(vehicle) : onContactSeller(vehicle))}
                    className="shadow-md font-black text-sm"
                  >
                    <MessageSquare className="w-5 h-5 text-white" />
                    <span>Book Inspection & Reserve</span>
                  </Button>
                )}
              </div>

            </div>
          </div>

          {/* ==========================================
              4. VEHICLE HIGHLIGHTS (Elegant Specification Chips)
              ========================================== */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-extrabold text-[#1E3063] uppercase tracking-wider font-display">
              Vehicle Highlights
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
              {[
                { label: 'Year', val: vehicle.year, icon: <Calendar className="w-4 h-4 text-[#1E3063]" /> },
                { label: 'Mileage', val: `${vehicle.mileage.toLocaleString()} km`, icon: <Gauge className="w-4 h-4 text-[#1E3063]" /> },
                { label: 'Fuel', val: vehicle.fuelType, icon: <Fuel className="w-4 h-4 text-[#1E3063]" /> },
                { label: 'Trans', val: vehicle.transmission.replace('Automatic', 'Auto'), icon: <Sliders className="w-4 h-4 text-[#1E3063]" /> },
                { label: 'Drive', val: vehicle.driveType || 'AWD / 4WD', icon: <Car className="w-4 h-4 text-[#1E3063]" /> },
                { label: 'Engine', val: vehicle.engineSize || '2500 cc', icon: <Zap className="w-4 h-4 text-[#1E3063]" /> },
                { label: 'Condition', val: vehicle.condition || 'Foreign Used', icon: <Award className="w-4 h-4 text-[#1E3063]" /> },
                { label: 'Logbook', val: 'TIMS Verified', icon: <ShieldCheck className="w-4 h-4 text-emerald-600" /> }
              ].map((chip, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 text-center space-y-1 transition-colors">
                  <div className="flex justify-center">{chip.icon}</div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{chip.label}</p>
                  <p className="font-black text-slate-800 text-xs truncate">{chip.val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ==========================================
              5. BUYER ASSURANCE (KAYAD Purchase Protection)
              ========================================== */}
          <div className="p-6 bg-gradient-to-r from-slate-900 via-[#1E3063] to-slate-900 text-white rounded-3xl shadow-md space-y-4 border border-amber-400/20">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-black text-amber-400 uppercase tracking-wider font-display flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" /> KAYAD Purchase Protection
              </span>
              <span className="text-xs text-slate-300 font-semibold">Max 6 Verified Safeguards</span>
            </div>

            {/* Exactly 6 Concise Trust Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              {[
                { title: '✓ TIMS Verified', desc: 'Logbook title cleared' },
                { title: '✓ Dealer Verified', desc: 'KRA & Audit passed' },
                { title: '✓ 150-Point Certified', desc: 'Mechanical audit OK' },
                { title: '✓ Finance Eligible', desc: 'Bank asset approved' },
                { title: '✓ Secure Transaction', desc: 'Escrow vault protected' },
                { title: '✓ Ownership Verified', desc: 'Zero lien encumbrance' }
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/15 space-y-0.5">
                  <p className="font-extrabold text-white text-xs">{item.title}</p>
                  <p className="text-[10px] text-slate-300 font-medium">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ==========================================
              6. VEHICLE STORY (Cards instead of raw paragraphs)
              ========================================== */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-[#1E3063] uppercase tracking-wider font-display flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-500" />
              The Vehicle Story & Detailed Assessment
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">

              <Card className="p-5 space-y-2 bg-white border-slate-200">
                <div className="flex items-center gap-2 text-[#1E3063] font-black text-sm font-display">
                  <Car className="w-4 h-4 text-amber-500" />
                  <span>Vehicle Overview</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-xs">
                  {vehicle.description || `Pristine ${vehicle.year} ${vehicle.make} ${vehicle.model} presented in immaculate mechanical state in ${vehicle.location}. Inspected for long-distance durability across East African roads.`}
                </p>
              </Card>

              <Card className="p-5 space-y-2 bg-white border-slate-200">
                <div className="flex items-center gap-2 text-[#1E3063] font-black text-sm font-display">
                  <Wrench className="w-4 h-4 text-emerald-600" />
                  <span>Maintenance History</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-xs">
                  Full service log recorded with authorized brand workshops. Fluid replacements, brake system overhaul, and brand new set of heavy-duty all-terrain tires recently fitted.
                </p>
              </Card>

              <Card className="p-5 space-y-2 bg-white border-slate-200">
                <div className="flex items-center gap-2 text-[#1E3063] font-black text-sm font-display">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Ownership History</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-xs">
                  Single non-smoking owner since import. Complete NTSA TIMS logbook documentation available with zero bank encumbrances or outstanding traffic penalties.
                </p>
              </Card>

              <Card className="p-5 space-y-2 bg-white border-slate-200">
                <div className="flex items-center gap-2 text-[#1E3063] font-black text-sm font-display">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Why This Vehicle Stands Out</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-xs">
                  Rare trim package featuring advanced driver safety assist systems, exceptional fuel efficiency, high ground clearance, and strong resale value retention in the regional market.
                </p>
              </Card>

              <Card className="p-5 space-y-2 bg-white border-slate-200 md:col-span-2 lg:col-span-2">
                <div className="flex items-center gap-2 text-[#1E3063] font-black text-sm font-display">
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                  <span>Condition Summary</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-700 font-semibold">
                  <div className="bg-slate-50 p-2 rounded-xl text-center">Engine: Excellent (100%)</div>
                  <div className="bg-slate-50 p-2 rounded-xl text-center">Transmission: Smooth</div>
                  <div className="bg-slate-50 p-2 rounded-xl text-center">Bodywork: Factory Paint</div>
                  <div className="bg-slate-50 p-2 rounded-xl text-center">Interior: Grade A Clean</div>
                </div>
              </Card>

            </div>
          </div>

          {/* ==========================================
              7. CATEGORIZED FEATURE GROUPS (Collapsible)
              ========================================== */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-[#1E3063] uppercase tracking-wider font-display">
              Categorized Factory Features & Equipment
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">

              {/* Safety Category */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <button
                  onClick={() => toggleFeatureCategory('safety')}
                  className="w-full p-4 bg-slate-50 flex items-center justify-between font-black text-xs text-[#1E3063] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-rose-600" /> Safety Systems ({featureGroups.safety.length})
                  </span>
                  {openFeatureCategories.safety ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openFeatureCategories.safety && (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-slate-200">
                    {featureGroups.safety.map((feat, i) => (
                      <div key={i} className="flex items-center gap-2 font-bold text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comfort Category */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <button
                  onClick={() => toggleFeatureCategory('comfort')}
                  className="w-full p-4 bg-slate-50 flex items-center justify-between font-black text-xs text-[#1E3063] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" /> Comfort & Interior ({featureGroups.comfort.length})
                  </span>
                  {openFeatureCategories.comfort ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openFeatureCategories.comfort && (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-slate-200">
                    {featureGroups.comfort.map((feat, i) => (
                      <div key={i} className="flex items-center gap-2 font-bold text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Technology Category */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <button
                  onClick={() => toggleFeatureCategory('technology')}
                  className="w-full p-4 bg-slate-50 flex items-center justify-between font-black text-xs text-[#1E3063] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-600" /> Technology & Infotainment ({featureGroups.technology.length})
                  </span>
                  {openFeatureCategories.technology ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openFeatureCategories.technology && (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-slate-200">
                    {featureGroups.technology.map((feat, i) => (
                      <div key={i} className="flex items-center gap-2 font-bold text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Utility Category */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <button
                  onClick={() => toggleFeatureCategory('utility')}
                  className="w-full p-4 bg-slate-50 flex items-center justify-between font-black text-xs text-[#1E3063] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" /> Utility & Exterior ({featureGroups.utility.length})
                  </span>
                  {openFeatureCategories.utility ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openFeatureCategories.utility && (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-slate-200">
                    {featureGroups.utility.map((feat, i) => (
                      <div key={i} className="flex items-center gap-2 font-bold text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ==========================================
              8. 150-POINT INSPECTION CERTIFICATE
              ========================================== */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-4 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-xs">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-emerald-950 text-base font-display">150-Point Technical Inspection Certificate</h3>
                  <p className="text-xs text-emerald-800">Verified by Certified Independent Automotive Engineers</p>
                </div>
              </div>
              <Badge variant="success" size="md">
                ✓ PASSED & CERTIFIED
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-emerald-200 space-y-1 shadow-xs">
                <p className="font-extrabold text-[#1E3063]">1. Engine & Mechanical</p>
                <p className="text-emerald-700 font-extrabold text-[11px]">100% Compression Pass</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-200 space-y-1 shadow-xs">
                <p className="font-extrabold text-[#1E3063]">2. Transmission & Drivetrain</p>
                <p className="text-emerald-700 font-extrabold text-[11px]">100% Shift Smoothness</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-200 space-y-1 shadow-xs">
                <p className="font-extrabold text-[#1E3063]">3. Structural Frame</p>
                <p className="text-emerald-700 font-extrabold text-[11px]">Accident-Free Structure</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-200 space-y-1 shadow-xs">
                <p className="font-extrabold text-[#1E3063]">4. TIMS Logbook Clear</p>
                <p className="text-emerald-700 font-extrabold text-[11px]">Zero Bank Encumbrances</p>
              </div>
            </div>
          </div>

          {/* ==========================================
              9. ASSET FINANCING ESTIMATOR MODULE
              ========================================== */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-blue-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xs">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-blue-950 text-base font-display">Financing Marketplace Estimator</h3>
                  <p className="text-xs text-blue-800">Compare pre-approval offers from multiple lenders</p>
                </div>
              </div>
              <Badge variant="success" size="md">
                Pre-Approval Ready
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4 bg-white p-5 rounded-2xl border border-blue-200 shadow-xs">
                <div className="space-y-2">
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Down Payment Deposit</span>
                    <span className="text-blue-900 font-extrabold">{depositPercent}% (Ksh {depositAmount.toLocaleString()})</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={50}
                    step={5}
                    value={depositPercent}
                    onChange={(e) => setDepositPercent(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Loan Repayment Period</span>
                    <span className="text-blue-900 font-extrabold">{loanTermMonths} Months ({(loanTermMonths / 12).toFixed(1)} Yrs)</span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={60}
                    step={6}
                    value={loanTermMonths}
                    onChange={(e) => setLoanTermMonths(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#1E3063] to-[#17244B] text-white p-6 rounded-2xl space-y-4 flex flex-col justify-between shadow-md">
                <div>
                  <p className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider">Estimated Monthly Payment</p>
                  <p className="text-3xl font-black text-white font-display mt-1">
                    Ksh {Math.round(monthlyPayment).toLocaleString()} <span className="text-xs font-normal text-slate-300">/ mo</span>
                  </p>
                  <p className="text-[11px] text-slate-300 mt-2">
                    Financed Principal: Ksh {loanPrincipal.toLocaleString()}
                  </p>
                </div>

                <Button
                  variant="accent"
                  size="md"
                  onClick={() => (onNavigateToFinancing ? onNavigateToFinancing(vehicle) : onContactSeller(vehicle))}
                  fullWidth
                >
                  <span>Compare Bank Rates for this Vehicle</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* ==========================================
              10. TECHNICAL SPECIFICATIONS (Moved Further Down)
              ========================================== */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-[#1E3063] uppercase tracking-wider font-display">
              Technical Specifications & Chassis Data
            </h3>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <button
                onClick={() => toggleSpecSection('powertrain')}
                className="w-full p-4 bg-slate-50 flex items-center justify-between font-black text-xs text-[#1E3063] cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" /> Powertrain & Engine Specifications
                </span>
                {openSpecSections.powertrain ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {openSpecSections.powertrain && (
                <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border-t border-slate-200">
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[10px]">Engine Capacity</p>
                    <p className="font-extrabold text-slate-800 mt-0.5">{vehicle.engineSize || '2500 cc'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[10px]">Transmission</p>
                    <p className="font-extrabold text-slate-800 mt-0.5">{vehicle.transmission}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[10px]">Drive System</p>
                    <p className="font-extrabold text-slate-800 mt-0.5">{vehicle.driveType || 'All-Wheel Drive'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[10px]">Fuel Type</p>
                    <p className="font-extrabold text-slate-800 mt-0.5">{vehicle.fuelType}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ==========================================
              11. SIMILAR VEHICLES SHOWROOM
              ========================================== */}
          {relatedVehicles.length > 0 && (
            <div className="pt-6 border-t border-slate-200 space-y-4">
              <h4 className="text-sm font-black text-[#1E3063] uppercase tracking-wider font-display flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Similar Verified Showroom Vehicles
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {relatedVehicles.map((rel) => (
                  <div
                    key={rel.id}
                    onClick={() => onSelectVehicle ? onSelectVehicle(rel) : null}
                    className="p-3.5 bg-slate-50 hover:bg-amber-50/80 transition-all cursor-pointer rounded-2xl border border-slate-200 text-xs flex gap-3.5 items-center group shadow-xs"
                  >
                    <LazyImage src={rel.image} alt={rel.title} wrapperClassName="w-20 h-16 rounded-xl shrink-0 overflow-hidden" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="font-extrabold text-[#1E3063] truncate group-hover:text-amber-800">{rel.title}</p>
                      <p className="text-xs font-black text-slate-800">Ksh {rel.price.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{rel.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </Modal>

      {/* ==========================================
          MOBILE STICKY BOTTOM PURCHASE BAR
          ========================================== */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 lg:hidden shadow-lg flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">{isAuction ? 'Current Highest Bid' : 'Listed Price'}</p>
          <p className="text-base font-black text-[#1E3063] font-display">
            Ksh {displayPrice.toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onContactSeller(vehicle)}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#1E3063]" />
            <span>Chat</span>
          </Button>

          {isEscrowActive ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onStartEscrow(vehicle)}
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Start Escrow</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onContactSeller(vehicle)}
            >
              <span>Contact Dealer</span>
            </Button>
          )}
        </div>
      </div>

      {/* ==========================================
          FULLSCREEN LIGHTBOX MODAL
          ========================================== */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 animate-fade-in">
          <div className="flex justify-between items-center text-white px-2 pt-2">
            <span className="font-bold text-xs">
              {vehicle.title} (Photo {allImages.indexOf(activeImage) + 1} of {allImages.length})
            </span>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 text-white hover:text-amber-400 rounded-full transition-colors cursor-pointer"
            >
              Close ✕
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-center p-4">
            <LazyImage
              src={activeImage}
              alt={vehicle.title}
              wrapperClassName="max-h-full max-w-full"
              className="max-h-[80vh] max-w-full object-contain rounded-xl"
            />

            {allImages.length > 1 && (
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIdx = allImages.indexOf(activeImage);
                    const prevIdx = (currentIdx - 1 + allImages.length) % allImages.length;
                    setActiveImage(allImages[prevIdx]);
                  }}
                  className="pointer-events-auto w-12 h-12 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIdx = allImages.indexOf(activeImage);
                    const nextIdx = (currentIdx + 1) % allImages.length;
                    setActiveImage(allImages[nextIdx]);
                  }}
                  className="pointer-events-auto w-12 h-12 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto justify-center pb-2">
            {allImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(img)}
                className={`h-16 w-24 shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                  activeImage === img ? 'border-amber-400 scale-95' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <LazyImage src={img} alt={`Thumb ${idx + 1}`} wrapperClassName="w-full h-full" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default VehicleDetailModal;
