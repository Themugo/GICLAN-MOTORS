import React, { useState, useMemo } from 'react';
import { Dealer, Vehicle, BodyStyle } from '../../../types';
import { Building2, ShieldCheck, MapPin, Star, Phone, Mail, CheckCircle2, Clock, UserCheck, Lock, Award, MessageSquare, FileCheck, Share2, Heart, Navigation, Calendar, Search, X, ArrowRight, Sparkles, ChevronRight, CreditCard, Globe, Landmark, Eye, Compass, Car } from 'lucide-react';
import { Modal, Badge, Button, LazyImage } from '../../../components/ui';
import VehicleCard from '../../../components/VehicleCard';

interface DealerProfileModalProps {
  dealer: Dealer | null;
  allDealers?: Dealer[];
  vehicles: Vehicle[];
  onClose: () => void;
  onQuickViewVehicle: (v: Vehicle) => void;
  onStartEscrow: (v: Vehicle) => void;
  onContactSeller?: (v: Vehicle) => void;
}

export const DealerProfileModal: React.FC<DealerProfileModalProps> = ({
  dealer,
  allDealers = [],
  vehicles,
  onClose,
  onQuickViewVehicle,
  onStartEscrow,
  onContactSeller
}) => {
  const isPrivateSeller = dealer?.type === 'Private Seller';

  // State
  const [activeTab, setActiveTab] = useState<'inventory' | 'about' | 'trust' | 'reviews' | 'gallery' | 'location'>('inventory');
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(dealer?.followersCount || 1420);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sub-modal States
  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const [showTestDriveModal, setShowTestDriveModal] = useState<boolean>(false);
  const [showDirectionsModal, setShowDirectionsModal] = useState<boolean>(false);
  const [activeGalleryImage, setActiveGalleryImage] = useState<string | null>(null);

  // Test Drive Form State
  const [testDriveVehicleId, setTestDriveVehicleId] = useState<string>('');
  const [testDriveDate, setTestDriveDate] = useState<string>('');
  const [testDriveTime, setTestDriveTime] = useState<string>('10:00 AM');
  const [testDriveLocation, setTestDriveLocation] = useState<'showroom' | 'home'>('showroom');
  const [testDrivePhone, setTestDrivePhone] = useState<string>('');
  const [testDriveName, setTestDriveName] = useState<string>('');
  const [testDriveSubmitted, setTestDriveSubmitted] = useState<boolean>(false);

  // Reviews Sorting State
  const [reviewsSortBy, setReviewsSortBy] = useState<'recent' | 'highest' | 'lowest'>('recent');

  // Inventory Filtering State
  const [invSearch, setInvSearch] = useState<string>('');
  const [invMake, setInvMake] = useState<string>('All');
  const [invBodyStyle, setInvBodyStyle] = useState<string>('All');
  const [invFuel, setInvFuel] = useState<string>('All');
  const [invTransmission, setInvTransmission] = useState<string>('All');
  const [invMaxPrice, setInvMaxPrice] = useState<number>(25000000);
  const [invOnlyInspected, setInvOnlyInspected] = useState<boolean>(false);
  const [invOnlyEscrow, setInvOnlyEscrow] = useState<boolean>(false);
  const [invOnlyFinance, setInvOnlyFinance] = useState<boolean>(false);

  // Show Toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Dealer Vehicles Filter
  const dealerVehicles = useMemo(() => {
    if (!dealer) return [];
    return vehicles.filter((v) =>
      v.sellerName.toLowerCase().includes(dealer.name.toLowerCase()) ||
      dealer.name.toLowerCase().includes(v.sellerName.toLowerCase())
    );
  }, [vehicles, dealer?.name]);

  // Filtered Inventory
  const filteredDealerVehicles = useMemo(() => {
    return dealerVehicles.filter((v) => {
      if (invSearch) {
        const q = invSearch.toLowerCase().trim();
        const match = v.title.toLowerCase().includes(q) ||
                      v.make.toLowerCase().includes(q) ||
                      v.model.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (invMake !== 'All' && v.make.toLowerCase() !== invMake.toLowerCase()) return false;
      if (invBodyStyle !== 'All' && v.bodyStyle !== invBodyStyle) return false;
      if (invFuel !== 'All' && v.fuelType !== invFuel) return false;
      if (invTransmission !== 'All' && !v.transmission.toLowerCase().includes(invTransmission.toLowerCase())) return false;
      if (v.price > invMaxPrice) return false;
      if (invOnlyInspected && !v.inspectionPassed) return false;
      if (invOnlyEscrow && !v.escrowEligible) return false;
      if (invOnlyFinance && !v.financeAvailable) return false;
      return true;
    });
  }, [dealerVehicles, invSearch, invMake, invBodyStyle, invFuel, invTransmission, invMaxPrice, invOnlyInspected, invOnlyEscrow, invOnlyFinance]);

  // Unique Makes in this Dealer's Stock
  const dealerMakes = useMemo(() => {
    const set = Array.from(new Set(dealerVehicles.map((v) => v.make))).sort();
    return ['All', ...set];
  }, [dealerVehicles]);

  // Unique Body Styles in this Dealer's Stock
  const dealerBodyStyles = useMemo(() => {
    const set = Array.from(new Set(dealerVehicles.map((v) => v.bodyStyle).filter((b): b is BodyStyle => Boolean(b)))).sort();
    return ['All', ...set];
  }, [dealerVehicles]);

  // Years on KAYAD calculation
  const yearsOnKayad = useMemo(() => {
    if (!dealer) return '';
    const startYear = parseInt(dealer.verifiedSince) || 2019;
    const currentYear = new Date().getFullYear();
    const diff = Math.max(1, currentYear - startYear);
    return `${diff} ${diff === 1 ? 'Year' : 'Years'} on KAYAD`;
  }, [dealer?.verifiedSince]);

  // Related Verified Dealers (Same county or Enterprise dealers)
  const relatedDealers = useMemo(() => {
    if (!dealer) return [];
    return allDealers
      .filter((d) => d.id !== dealer.id && d.type !== 'Private Seller')
      .slice(0, 3);
  }, [allDealers, dealer?.id]);

  // Reviews Data
  const reviewsList = useMemo(() => {
    if (!dealer) return [];
    const base = dealer.reviews || [
      {
        id: 'r1',
        buyerName: 'Hon. Peter Njuguna',
        rating: 5,
        date: '2026-07-20',
        vehicleTitle: '2021 Toyota Land Cruiser Prado TX-L',
        comment: 'Flawless transaction through KAYAD Escrow. Logbook delivered within 48 hours. Showroom quality service.',
        verifiedPurchase: true
      },
      {
        id: 'r2',
        buyerName: 'Dr. Mary Atieno',
        rating: 5,
        date: '2026-07-14',
        vehicleTitle: '2019 Mercedes-Benz E250 AMG Line',
        comment: 'Cleanest yard on Mombasa Road. The 150-point inspection report matched every detail.',
        verifiedPurchase: true
      }
    ];

    return [...base].sort((a, b) => {
      if (reviewsSortBy === 'highest') return b.rating - a.rating;
      if (reviewsSortBy === 'lowest') return a.rating - b.rating;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [dealer?.reviews, reviewsSortBy]);

  // Rules of Hooks: every hook above this line must run unconditionally
  // on every render (this modal is always mounted by DealersView.tsx -
  // open/closed is controlled via the `dealer` prop being null or not,
  // not by conditionally rendering the whole component). The guard used
  // to sit at the very top of the component, before any hook, which
  // meant going from closed (dealer=null, 0 hooks reached) to open
  // (dealer set, 30 hooks reached) was a hooks-count mismatch between
  // renders of the same instance - exactly the same bug, and exact same
  // crash ("Minified React error #310"), found and fixed in
  // VehicleDetailModal.tsx. Moved here, after every hook, and made each
  // hook above null-safe so they're harmless no-ops when dealer is null.
  if (!dealer) return null;

  // Handlers
  const handleToggleFollow = () => {
    if (isFollowing) {
      setIsFollowing(false);
      setFollowersCount((prev) => prev - 1);
      triggerToast(`Unfollowed ${dealer.name}`);
    } else {
      setIsFollowing(true);
      setFollowersCount((prev) => prev + 1);
      triggerToast(`Following ${dealer.name}! You will receive new listing alerts.`);
    }
  };

  const handleShareDealer = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      triggerToast(`Digital Showroom link for ${dealer.name} copied to clipboard!`);
    } else {
      triggerToast(`Digital Showroom: ${dealer.name}`);
    }
  };

  const handleBookTestDriveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testDriveDate || !testDrivePhone || !testDriveName) {
      alert('Please fill in your name, contact phone, and preferred date.');
      return;
    }
    setTestDriveSubmitted(true);
    setTimeout(() => {
      setShowTestDriveModal(false);
      setTestDriveSubmitted(false);
      triggerToast(`Test drive request submitted to ${dealer.name}! A sales executive will confirm via call.`);
    }, 1200);
  };

  return (
    <Modal isOpen={!!dealer} onClose={onClose} maxWidth="5xl">
      <div className="space-y-6 relative pb-20 md:pb-0 text-slate-800">

        {/* TOAST FLOATING BANNER */}
        {toastMessage && (
          <div className="fixed top-20 right-6 z-50 bg-[#1E3063] text-white px-4 py-3 rounded-xl shadow-2xl border border-white/20 flex items-center gap-2.5 text-xs font-bold animate-slide-down">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 1. DIGITAL SHOWROOM / PRIVATE SELLER HEADER BANNER */}
        {/* ========================================================================= */}
        <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 shadow-md bg-[#1E3063]">

          {/* Background Cover Image with Sophisticated Navy Gradient */}
          <div className="h-44 sm:h-56 w-full relative">
            <LazyImage
              src={dealer.coverBanner || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1200'}
              alt={dealer.name}
              wrapperClassName="w-full h-full"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1E3063] via-[#1E3063]/85 to-transparent" />
          </div>

          {/* Header Content Overlay */}
          <div className="p-5 sm:p-6 -mt-16 sm:-mt-20 relative z-10 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">

              {/* Logo & Identity */}
              <div className="flex items-start sm:items-end gap-4">
                <div className="relative shrink-0">
                  <LazyImage
                    src={dealer.logo}
                    alt={dealer.name}
                    wrapperClassName="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white shadow-xl bg-white overflow-hidden"
                    className="w-full h-full object-cover"
                  />
                  {isPrivateSeller ? (
                    <span className="absolute -top-2 -right-2 bg-emerald-600 text-white p-1 rounded-full shadow-md" title="Identity Verified Private Seller">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                  ) : dealer.badges.some(b => b.toLowerCase().includes('gold') || b.toLowerCase().includes('enterprise')) ? (
                    <span className="absolute -top-2 -right-2 bg-emerald-600 text-white p-1 rounded-full shadow-md" title="Gold Verified Showroom">
                      <Award className="w-4 h-4" />
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1.5 text-white">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={isPrivateSeller ? "success" : "verified"} size="sm">
                      {isPrivateSeller ? (
                        <UserCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                      ) : (
                        <Building2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      )}
                      {isPrivateSeller ? 'Verified Private Seller' : (dealer.type || 'Verified Enterprise Dealer')}
                    </Badge>

                    <span className="bg-white/15 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[11px] font-bold text-amber-300 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                      {dealer.rating} ({dealer.reviewsCount} Verified Ratings)
                    </span>

                    <span className="bg-emerald-900/70 border border-emerald-400/40 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold text-emerald-300 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {isPrivateSeller ? 'National ID & TIMS Verified' : `KRA PIN Verified (${dealer.kraPin || 'P051290381Z'})`}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">
                    {dealer.name}
                  </h1>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-200 font-medium">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      {isPrivateSeller ? `Approx. ${dealer.location} (Privacy Protected)` : (dealer.address || `${dealer.location} (${dealer.county})`)}
                    </span>

                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      Response Rate: <strong className="text-white">98% ({dealer.responseTime || '< 15 mins'})</strong>
                    </span>

                    <span className="flex items-center gap-1 text-amber-200 font-bold">
                      <Calendar className="w-3.5 h-3.5" />
                      Member Since {dealer.verifiedSince}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Header Strip */}
              <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleToggleFollow}
                  className={`text-xs font-bold ${isFollowing ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : ''}`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isFollowing ? 'fill-emerald-600 text-emerald-600' : ''}`} />
                  <span>{isFollowing ? 'Saved Seller' : 'Save Seller'}</span>
                  <span className="opacity-75 text-[10px]">({followersCount})</span>
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleShareDealer}
                  className="text-xs font-bold"
                  title="Share Seller Profile"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </Button>

                {isPrivateSeller ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (dealerVehicles.length > 0) {
                        onStartEscrow(dealerVehicles[0]);
                      } else {
                        setShowContactModal(true);
                      }
                    }}
                    className="bg-[#C85A32] hover:bg-[#B44E28] text-white text-xs font-bold shadow-sm"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-300" />
                    <span>Start Secure Purchase</span>
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowContactModal(true)}
                    className="bg-[#C85A32] hover:bg-[#B44E28] text-white text-xs font-bold shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Contact Dealer</span>
                  </Button>
                )}
              </div>

            </div>

            {/* Private Seller Privacy Protection Banner */}
            {isPrivateSeller && (
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-between text-xs text-white gap-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="text-[11px] sm:text-xs">
                    <strong>KAYAD Private Seller Security:</strong> Personal phone numbers are protected. Purchase transactions, inspection bookings, and messaging are protected by Bank Escrow.
                  </span>
                </div>
                <Badge variant="escrow" size="sm" className="shrink-0 font-bold">
                  Escrow Protected
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. PRIMARY ACTION CTA BAR */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex items-center justify-between gap-2 overflow-x-auto scrollbar-none text-xs">
          <div className="flex items-center gap-2">
            {isPrivateSeller ? (
              <>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    if (dealerVehicles.length > 0) {
                      onStartEscrow(dealerVehicles[0]);
                    } else {
                      setToastMessage('Escrow initiated! Select vehicle below to proceed.');
                    }
                  }}
                  className="bg-[#C85A32] hover:bg-[#B44E28] text-white font-bold shrink-0 shadow-sm"
                >
                  <Lock className="w-4 h-4 text-amber-300" />
                  <span>Start Secure Purchase (Escrow Vault)</span>
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    if (dealerVehicles.length > 0 && onQuickViewVehicle) {
                      onQuickViewVehicle(dealerVehicles[0]);
                    } else {
                      setShowContactModal(true);
                    }
                  }}
                  className="bg-emerald-50 text-emerald-950 hover:bg-emerald-100 border border-emerald-200 font-extrabold shrink-0"
                >
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>Book Independent Pre-Purchase Inspection</span>
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setShowContactModal(true)}
                  className="text-slate-700 hover:bg-slate-50 font-bold shrink-0"
                >
                  <MessageSquare className="w-4 h-4 text-[#1E3063]" />
                  <span>Chat with Seller (Secure Platform)</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    setActiveTab('inventory');
                    const el = document.getElementById('showroom-inventory-anchor');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-[#1E3063] text-white font-bold shrink-0"
                >
                  <Car className="w-4 h-4 text-amber-300" />
                  <span>Browse Stock ({dealerVehicles.length} Vehicles)</span>
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setShowTestDriveModal(true)}
                  className="bg-amber-50 text-[#1E3063] hover:bg-amber-100 border border-amber-200 font-extrabold shrink-0"
                >
                  <Calendar className="w-4 h-4 text-[#C85A32]" />
                  <span>Book Test Drive</span>
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setShowDirectionsModal(true)}
                  className="text-slate-700 hover:bg-slate-50 font-bold shrink-0"
                >
                  <Navigation className="w-4 h-4 text-emerald-600" />
                  <span>Get Showroom Directions</span>
                </Button>
              </>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-3 text-slate-500 font-semibold px-2">
            <span className="flex items-center gap-1 text-emerald-700">
              <Lock className="w-3.5 h-3.5" /> Bank Escrow Vault Protected
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. TRUST PANEL / STATISTICS METRICS GRID */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              {isPrivateSeller ? 'Escrow Deals' : 'Vehicles Sold'}
            </p>
            <p className="text-2xl font-black text-[#1E3063] font-display">
              {dealer.completedEscrowDeals || 7} <span className="text-xs text-emerald-600 font-bold">Closed</span>
            </p>
            <p className="text-[10px] text-slate-500 font-medium">100% Protected through KAYAD</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Seller Trust Score</p>
            <p className="text-2xl font-black text-[#1E3063] font-display flex items-center gap-1">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              {dealer.rating} <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
            </p>
            <p className="text-[10px] text-slate-500 font-medium">{dealer.reviewsCount} Verified Buyer Reviews</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Verification Status</p>
            <p className="text-2xl font-black text-emerald-700 font-display flex items-center gap-1">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
              Verified
            </p>
            <p className="text-[10px] text-slate-500 font-medium">Identity & Logbook Audited</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Buyer Protection</p>
            <p className="text-2xl font-black text-[#1E3063] font-display">
              {dealer.buyerSatisfaction || 100}%
            </p>
            <p className="text-[10px] text-slate-500 font-medium">Zero-fraud guarantee</p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. DIGITAL SHOWROOM TABBED NAVIGATION */}
        {/* ========================================================================= */}
        <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-none pt-2">
          {[
            { id: 'inventory', label: `Inventory Stock (${dealerVehicles.length})`, icon: <Car className="w-4 h-4" /> },
            { id: 'about', label: 'About & Services', icon: <Building2 className="w-4 h-4" /> },
            { id: 'trust', label: 'Trust & Verification Matrix', icon: <ShieldCheck className="w-4 h-4 text-emerald-600" /> },
            { id: 'reviews', label: `Buyer Reviews (${reviewsList.length})`, icon: <Star className="w-4 h-4 text-amber-500" /> },
            { id: 'gallery', label: 'Showroom Gallery', icon: <Eye className="w-4 h-4 text-blue-600" /> },
            { id: 'location', label: 'Yard Location & Directions', icon: <MapPin className="w-4 h-4 text-[#C85A32]" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 border-b-2 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-[#1E3063] text-[#1E3063] bg-amber-50/60 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ========================================================================= */}
        {/* 5. TAB CONTENT PANELS */}
        {/* ========================================================================= */}

        {/* TAB 1: INVENTORY SHOWCASE (PRIMARY CONTENT) */}
        {activeTab === 'inventory' && (
          <div id="showroom-inventory-anchor" className="space-y-5 animate-fade-in">

            {/* Showroom Filter Controls */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                    placeholder={`Search within ${dealer.name}'s inventory...`}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E3063] focus:bg-white"
                  />
                  {invSearch && (
                    <button onClick={() => setInvSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto text-xs">
                  {/* Make Filter */}
                  <select
                    value={invMake}
                    onChange={(e) => setInvMake(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[#1E3063] focus:outline-none cursor-pointer"
                  >
                    {dealerMakes.map((m) => (
                      <option key={m} value={m}>{m === 'All' ? 'All Makes' : m}</option>
                    ))}
                  </select>

                  {/* Body Style */}
                  <select
                    value={invBodyStyle}
                    onChange={(e) => setInvBodyStyle(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[#1E3063] focus:outline-none cursor-pointer"
                  >
                    {dealerBodyStyles.map((b) => (
                      <option key={b} value={b}>{b === 'All' ? 'All Body Styles' : b}</option>
                    ))}
                  </select>

                  {/* Fuel */}
                  <select
                    value={invFuel}
                    onChange={(e) => setInvFuel(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[#1E3063] focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Fuels</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Electric">Electric</option>
                  </select>
                </div>
              </div>

              {/* Boolean Badging Quick Toggles */}
              <div className="flex flex-wrap items-center gap-4 text-xs pt-1 border-t border-slate-100 font-semibold text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-[#1E3063]">
                  <input
                    type="checkbox"
                    checked={invOnlyInspected}
                    onChange={(e) => setInvOnlyInspected(e.target.checked)}
                    className="rounded accent-[#1E3063]"
                  />
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>150-Pt Inspected</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer hover:text-[#1E3063]">
                  <input
                    type="checkbox"
                    checked={invOnlyEscrow}
                    onChange={(e) => setInvOnlyEscrow(e.target.checked)}
                    className="rounded accent-[#1E3063]"
                  />
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Escrow Eligible</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer hover:text-[#1E3063]">
                  <input
                    type="checkbox"
                    checked={invOnlyFinance}
                    onChange={(e) => setInvOnlyFinance(e.target.checked)}
                    className="rounded accent-[#1E3063]"
                  />
                  <Landmark className="w-3.5 h-3.5 text-blue-600" />
                  <span>Asset Finance Available</span>
                </label>
              </div>
            </div>

            {/* Inventory Results Grid */}
            {filteredDealerVehicles.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                <Car className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">No vehicles match your active search filters in this digital showroom.</p>
                <p className="text-xs text-slate-500">Try resetting filters or expanding price and fuel parameters.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInvSearch('');
                    setInvMake('All');
                    setInvBodyStyle('All');
                    setInvFuel('All');
                    setInvOnlyInspected(false);
                    setInvOnlyEscrow(false);
                    setInvOnlyFinance(false);
                  }}
                >
                  Reset Showroom Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredDealerVehicles.map((v) => (
                  <VehicleCard
                    key={v.id}
                    vehicle={v}
                    isSaved={false}
                    isCompared={false}
                    onToggleSave={() => {}}
                    onToggleCompare={() => {}}
                    onQuickView={onQuickViewVehicle}
                    onStartEscrow={onStartEscrow}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ABOUT & SERVICES */}
        {activeTab === 'about' && (
          <div className="space-y-6 animate-fade-in text-xs">
            {/* Description */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
              <h3 className="text-sm font-extrabold text-[#1E3063] font-display uppercase tracking-wider">
                Dealership Overview & Business Identity
              </h3>
              <p className="text-slate-700 leading-relaxed text-sm">
                {dealer.description || `${dealer.name} is a premier verified enterprise dealership operating from ${dealer.location}. Specializing in foreign direct imports, luxury SUVs, commercial fleets, and clean local trade-ins.`}
              </p>
            </div>

            {/* Specializations & Languages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-[#1E3063] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" /> Business Specializations
                </h4>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(dealer.specializations || ['Luxury SUVs', 'Japanese Direct Imports', 'German Sedans', 'Verified Commercial Fleets']).map((spec, i) => (
                    <span key={i} className="bg-slate-100 text-[#1E3063] font-bold px-3 py-1 rounded-xl border border-slate-200">
                      • {spec}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-[#1E3063] flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-blue-600" /> Languages Spoken by Sales Team
                </h4>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(dealer.languages || ['English', 'Swahili']).map((lang, i) => (
                    <span key={i} className="bg-blue-50 text-blue-900 font-bold px-3 py-1 rounded-xl border border-blue-200">
                      🗣️ {lang}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Operating Hours & Payment Methods */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-[#1E3063] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" /> Showroom Operating Hours
                </h4>
                <p className="text-slate-700 font-bold text-sm bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {dealer.operatingHours || 'Mon - Sat: 8:00 AM - 6:30 PM | Sun: By Appointment'}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-[#1E3063] flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#C85A32]" /> Accepted Payment Channels
                </h4>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(dealer.paymentMethods || ['KAYAD Escrow Vault', 'M-Pesa Business Till', 'Bank Wire (RTGS)', 'Bank Asset Finance']).map((pm, i) => (
                    <span key={i} className="bg-emerald-50 text-emerald-900 font-bold px-3 py-1 rounded-xl border border-emerald-200">
                      ✓ {pm}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Services Offered Grid */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-extrabold text-[#1E3063] uppercase tracking-wider font-display">
                Services Offered by {dealer.name}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(dealer.servicesOffered || [
                  'Trade-in Evaluations',
                  'Pre-Approved Asset Financing',
                  'Extended Warranty Plans',
                  'Service & Maintenance Plans',
                  'Custom Vehicle Sourcing',
                  'Port Direct Clearance'
                ]).map((srv, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <p className="font-extrabold text-[#1E3063] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      {srv}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TRUST & VERIFICATION MATRIX */}
        {activeTab === 'trust' && (
          <div className="space-y-6 animate-fade-in text-xs">

            {/* Top Verification Header */}
            <div className={`p-5 rounded-2xl border space-y-3 ${
              isPrivateSeller
                ? 'bg-[#1E3063] text-white border-slate-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-950'
            }`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl shadow-xs ${isPrivateSeller ? 'bg-[#C85A32] text-white' : 'bg-emerald-600 text-white'}`}>
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold font-display">
                      {isPrivateSeller ? 'Verified Private Seller Trust & Protection Matrix' : '100% KAYAD Verified Business Compliance'}
                    </h3>
                    <p className={`text-xs ${isPrivateSeller ? 'text-slate-200' : 'text-emerald-800'}`}>
                      {isPrivateSeller ? 'Transaction security & buyer protection active for all private deals' : 'Verified by KAYAD Legal Compliance & Physical Yard Auditors'}
                    </p>
                  </div>
                </div>

                <Badge variant={isPrivateSeller ? 'escrow' : 'success'} size="md">
                  <Lock className="w-3.5 h-3.5 text-amber-300" />
                  {isPrivateSeller ? 'Escrow Vault Protected' : 'KRA & TIMS Audited'}
                </Badge>
              </div>

              {/* Concise Escrow Notice */}
              {isPrivateSeller && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-400/30 rounded-xl text-amber-200 font-medium leading-relaxed">
                  <strong className="text-white font-extrabold flex items-center gap-1 mb-0.5">
                    <Lock className="w-4 h-4 text-amber-400" /> Concise KAYAD Escrow Notice:
                  </strong>
                  "This private sale is protected through KAYAD Escrow. Funds remain secure in a bank-backed vault until physical inspection and NTSA TIMS ownership transfer are successfully completed."
                </div>
              )}
            </div>

            {/* 5-Pillar Trust Indicators */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-[#1E3063] uppercase tracking-wider font-display flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                {isPrivateSeller ? '5 Core Private Transaction Trust Indicators' : 'Verification Compliance Standards'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 font-extrabold text-[#1E3063]">
                    <UserCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                    <span>1. Identity Verified</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Government National ID, KRA PIN, and verified phone cross-checked by KAYAD Trust & Safety team.
                  </p>
                  <Badge variant="success" size="sm">✓ Govt ID Audit Passed</Badge>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 font-extrabold text-[#1E3063]">
                    <Lock className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                    <span>2. Escrow Protected</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    100% of purchase deposit is stored in bank-backed KAYAD Escrow Vault. Zero risk of upfront fraud.
                  </p>
                  <Badge variant="escrow" size="sm">✓ Bank Vault Holds Funds</Badge>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 font-extrabold text-[#1E3063]">
                    <FileCheck className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                    <span>3. Independent Inspection</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Option to dispatch 150-point independent certified mechanic prior to fund release.
                  </p>
                  <Badge variant="neutral" size="sm">✓ 150-Point Audit Ready</Badge>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 font-extrabold text-[#1E3063]">
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                    <span>4. Ownership Verification</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Vehicle logbook matched against NTSA TIMS direct records to ensure clean title & zero encumbrance.
                  </p>
                  <Badge variant="verified" size="sm">✓ TIMS Logbook Checked</Badge>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-xs sm:col-span-2 md:col-span-2">
                  <div className="flex items-center gap-2 font-extrabold text-[#1E3063]">
                    <Sparkles className="w-4.5 h-4.5 text-[#C85A32] shrink-0" />
                    <span>5. TIMS Transfer Guarantee & Fraud Protection</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Funds are released to the private seller ONLY after buyer confirms physical receipt of vehicle and NTSA TIMS electronic logbook transfer approval in buyer portal.
                  </p>
                  <Badge variant="success" size="sm">✓ Guaranteed Safe Transfer</Badge>
                </div>
              </div>
            </div>

            {/* VISUAL PURCHASE PROCESS TIMELINE */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-extrabold text-[#1E3063] uppercase tracking-wider font-display flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ArrowRight className="w-4 h-4 text-[#C85A32]" />
                  Secure 6-Step Private Purchase Workflow
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                  Step-by-Step Security
                </span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { step: '1', title: 'Contact Seller', desc: 'Initiate encrypted in-platform chat to discuss vehicle details & schedule meet-up.', icon: <MessageSquare className="w-4 h-4 text-blue-600" /> },
                  { step: '2', title: 'Book Pre-Purchase Inspection', desc: 'Request 150-point independent mechanic audit at a verified public inspection hub.', icon: <FileCheck className="w-4 h-4 text-emerald-600" /> },
                  { step: '3', title: 'Escrow Deposit', desc: 'Deposit funds safely into bank-backed KAYAD Escrow Vault. Seller sees deposit locked.', icon: <Lock className="w-4 h-4 text-amber-500" /> },
                  { step: '4', title: 'Physical Inspection & Test Drive', desc: 'Meet seller at verified public hub, inspect car, test drive, and verify engine numbers.', icon: <Car className="w-4 h-4 text-[#1E3063]" /> },
                  { step: '5', title: 'Logbook Transfer', desc: 'Execute instant electronic logbook transfer via NTSA TIMS portal.', icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
                  { step: '6', title: 'Seller Paid', desc: 'Click "Release Funds" in buyer portal. Escrow releases money to seller instantly.', icon: <Sparkles className="w-4 h-4 text-[#C85A32]" /> }
                ].map((s) => (
                  <div key={s.step} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 relative group hover:border-[#1E3063] transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="w-6 h-6 rounded-full bg-[#1E3063] text-white font-extrabold text-xs flex items-center justify-center font-display">
                        {s.step}
                      </span>
                      {s.icon}
                    </div>
                    <p className="font-extrabold text-[#1E3063] text-xs pt-1">{s.title}</p>
                    <p className="text-[11px] text-slate-500 leading-normal">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* BUYER PROTECTION HIGHLIGHTS GRID */}
            <div className="bg-amber-50/70 border border-amber-200 p-5 rounded-2xl space-y-3">
              <h4 className="text-xs font-extrabold text-[#17244B] uppercase tracking-wider font-display flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                KAYAD Buyer Protection Highlights
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <div className="p-2.5 bg-white rounded-xl border border-amber-200 space-y-1">
                  <p className="font-extrabold text-[#1E3063] text-xs">Verified Ownership</p>
                  <p className="text-[10px] text-slate-500">TIMS Registry cross-checked</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-amber-200 space-y-1">
                  <p className="font-extrabold text-[#1E3063] text-xs">Inspection Marketplace</p>
                  <p className="text-[10px] text-slate-500">150-Point mechanic audit</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-amber-200 space-y-1">
                  <p className="font-extrabold text-[#1E3063] text-xs">Escrow Protection</p>
                  <p className="text-[10px] text-slate-500">Bank vault security</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-amber-200 space-y-1">
                  <p className="font-extrabold text-[#1E3063] text-xs">Fraud Prevention</p>
                  <p className="text-[10px] text-slate-500">Verified seller ID</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-amber-200 space-y-1">
                  <p className="font-extrabold text-[#1E3063] text-xs">Secure Payment</p>
                  <p className="text-[10px] text-slate-500">M-Pesa & RTGS Wire</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: BUYER REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="space-y-5 animate-fade-in text-xs">
            {/* Reviews Header & Sorting */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
              <div>
                <h3 className="text-base font-extrabold text-[#1E3063] font-display flex items-center gap-2">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  Verified Buyer Reviews ({reviewsList.length})
                </h3>
                <p className="text-slate-500 text-xs">Overall Score: <strong className="text-[#1E3063]">{dealer.rating} / 5.0</strong> based on {dealer.reviewsCount} closed escrow deals</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-bold">Sort Reviews:</span>
                <select
                  value={reviewsSortBy}
                  onChange={(e: any) => setReviewsSortBy(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[#1E3063] focus:outline-none cursor-pointer"
                >
                  <option value="recent">Most Recent</option>
                  <option value="highest">Highest Rating</option>
                  <option value="lowest">Lowest Rating</option>
                </select>
              </div>
            </div>

            {/* Reviews Cards */}
            <div className="space-y-3">
              {reviewsList.map((rev) => (
                <div key={rev.id} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-[#1E3063] text-amber-300 font-extrabold flex items-center justify-center text-xs font-display">
                        {rev.buyerName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-extrabold text-[#1E3063]">{rev.buyerName}</p>
                        <p className="text-[10px] text-slate-400">{rev.date}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {rev.verifiedPurchase && (
                        <span className="bg-emerald-100 text-emerald-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          ✓ Verified Purchase
                        </span>
                      )}
                      <div className="flex items-center text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(rev.rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {rev.vehicleTitle && (
                    <p className="text-[11px] text-amber-800 font-bold bg-amber-50 px-2.5 py-1 rounded-lg inline-block border border-amber-200">
                      Purchased: {rev.vehicleTitle}
                    </p>
                  )}

                  <p className="text-slate-700 leading-relaxed text-xs italic">
                    "{rev.comment}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: SHOWROOM GALLERY */}
        {activeTab === 'gallery' && (
          <div className="space-y-4 animate-fade-in text-xs">
            <h3 className="text-base font-extrabold text-[#1E3063] font-display flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Showroom & Yard Photo Gallery
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(dealer.galleryImages || [
                'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=800',
                'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800',
                'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=800'
              ]).map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveGalleryImage(img)}
                  className="h-48 rounded-2xl overflow-hidden border border-slate-200 shadow-sm cursor-pointer group relative"
                >
                  <LazyImage src={img} alt={`Showroom Photo ${idx + 1}`} wrapperClassName="w-full h-full" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-1 text-xs">
                    <Eye className="w-4 h-4" /> View Fullscreen
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: LOCATION & MAP */}
        {activeTab === 'location' && (
          <div className="space-y-5 animate-fade-in text-xs">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-[#1E3063] font-display flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#C85A32]" />
                    Showroom Physical Address & Yard Location
                  </h3>
                  <p className="text-slate-600 text-xs mt-1">{dealer.address || `${dealer.location} (${dealer.county})`}</p>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setShowDirectionsModal(true)}
                  className="bg-[#1E3063] text-white font-bold"
                >
                  <Navigation className="w-4 h-4 text-amber-300" /> Get GPS Directions
                </Button>
              </div>

              {/* Styled Visual Map Card */}
              <div className="h-64 rounded-2xl bg-slate-900 overflow-hidden relative border border-slate-200 flex items-center justify-center">
                <LazyImage
                  src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1000"
                  alt="Map Location"
                  wrapperClassName="w-full h-full opacity-60"
                  className="w-full h-full object-cover"
                />

                <div className="absolute z-10 bg-[#1E3063] text-white p-4 rounded-2xl shadow-2xl border border-amber-400/50 text-center space-y-2 max-w-xs">
                  <MapPin className="w-8 h-8 text-amber-400 mx-auto animate-bounce" />
                  <p className="font-extrabold text-sm">{dealer.name}</p>
                  <p className="text-[11px] text-slate-200">{dealer.landmark || dealer.address}</p>
                  <span className="inline-block bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
                    Verified Physical Yard
                  </span>
                </div>
              </div>

              {dealer.landmark && (
                <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-slate-800">
                  <p className="font-bold flex items-center gap-1.5 text-xs text-[#1E3063]">
                    <Compass className="w-4 h-4 text-[#C85A32]" /> Nearby Landmarks & Directions:
                  </p>
                  <p className="text-xs text-slate-700 mt-1">{dealer.landmark}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. RELATED VERIFIED DEALERS */}
        {/* ========================================================================= */}
        {relatedDealers.length > 0 && (
          <div className="pt-6 border-t border-slate-200 space-y-3">
            <h4 className="text-xs font-extrabold text-[#1E3063] uppercase tracking-wider font-display flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              Similar Verified Enterprise Showrooms in Kenya
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {relatedDealers.map((rel) => (
                <div
                  key={rel.id}
                  className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-2 shadow-2xs hover:border-amber-400 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <LazyImage src={rel.logo} alt={rel.name} wrapperClassName="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-200" className="w-full h-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-[#1E3063] truncate">{rel.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{rel.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-amber-700 font-bold border-t border-slate-100 pt-1.5">
                    <span>★ {rel.rating} ({rel.reviewsCount})</span>
                    <span className="text-slate-600 font-normal">{rel.activeListingsCount} Stock</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MOBILE STICKY CONTACT ACTION BAR */}
      {/* ========================================================================= */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-3 z-40 flex items-center justify-between gap-2 shadow-2xl">
        {isPrivateSeller ? (
          <>
            <button
              onClick={() => {
                if (dealerVehicles.length > 0) {
                  onStartEscrow(dealerVehicles[0]);
                } else {
                  setShowContactModal(true);
                }
              }}
              className="flex-1 py-2.5 bg-[#C85A32] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Lock className="w-3.5 h-3.5 text-amber-300" /> Start Escrow
            </button>

            <button
              onClick={() => {
                if (dealerVehicles.length > 0 && onQuickViewVehicle) {
                  onQuickViewVehicle(dealerVehicles[0]);
                } else {
                  setShowContactModal(true);
                }
              }}
              className="flex-1 py-2.5 bg-emerald-100 text-emerald-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-emerald-300"
            >
              <FileCheck className="w-3.5 h-3.5 text-emerald-700" /> Inspection
            </button>

            <button
              onClick={() => setShowContactModal(true)}
              className="flex-1 py-2.5 bg-[#1E3063] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-300" /> Secure Chat
            </button>
          </>
        ) : (
          <>
            <a
              href={`tel:${dealer.phone}`}
              className="flex-1 py-2.5 bg-slate-100 text-[#1E3063] font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-slate-200"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" /> Call
            </a>

            <button
              onClick={() => setShowTestDriveModal(true)}
              className="flex-1 py-2.5 bg-amber-100 text-[#1E3063] font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-amber-300"
            >
              <Calendar className="w-3.5 h-3.5 text-[#C85A32]" /> Test Drive
            </button>

            <button
              onClick={() => setShowContactModal(true)}
              className="flex-1 py-2.5 bg-[#1E3063] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-300" /> Chat
            </button>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SUB-MODAL 1: CONTACT OPTIONS */}
      {/* ========================================================================= */}
      {showContactModal && (
        <Modal isOpen={true} onClose={() => setShowContactModal(false)} title={`Contact ${dealer.name}`} maxWidth="md">
          <div className="space-y-4 p-2 text-xs">
            {isPrivateSeller ? (
              <>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-slate-700">
                  <div className="flex items-center gap-1.5 font-bold text-[#1E3063]">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Private Seller Privacy & Protection Policy</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Personal phone numbers are protected to prevent scamming and off-market fraud. All interactions, inspection scheduling, and escrow deposits are conducted securely within the KAYAD platform.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <button
                    onClick={() => {
                      setShowContactModal(false);
                      if (dealerVehicles.length > 0 && onContactSeller) {
                        onContactSeller(dealerVehicles[0]);
                      } else {
                        setToastMessage('Opened secure encrypted chat with seller.');
                      }
                    }}
                    className="w-full p-3.5 bg-[#1E3063] hover:bg-[#17244B] text-white rounded-xl font-bold flex items-center justify-between transition-colors shadow-sm text-left"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-amber-300" />
                      <div>
                        <p className="font-extrabold">Encrypted In-Platform Secure Chat</p>
                        <p className="text-[11px] text-slate-300">Fastest response (&lt; 15 mins) • End-to-end encrypted</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-300" />
                  </button>

                  <button
                    onClick={() => {
                      setShowContactModal(false);
                      if (dealerVehicles.length > 0) {
                        onStartEscrow(dealerVehicles[0]);
                      } else {
                        setToastMessage('Escrow vault initialized for this deal!');
                      }
                    }}
                    className="w-full p-3.5 bg-[#C85A32] hover:bg-[#B44E28] text-white rounded-xl font-bold flex items-center justify-between transition-colors shadow-sm text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-amber-300" />
                      <div>
                        <p className="font-extrabold">Start KAYAD Bank Escrow Purchase</p>
                        <p className="text-[11px] text-amber-100">Locks deposit safely in bank vault until inspection is complete</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-300" />
                  </button>

                  <button
                    onClick={() => {
                      setShowContactModal(false);
                      if (dealerVehicles.length > 0 && onQuickViewVehicle) {
                        onQuickViewVehicle(dealerVehicles[0]);
                      }
                    }}
                    className="w-full p-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-950 rounded-xl font-bold flex items-center justify-between transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <FileCheck className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="font-extrabold">Book Independent 150-Point Inspection</p>
                        <p className="text-[11px] text-emerald-800">Dispatch certified mechanic before releasing funds</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-600" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-slate-600">Connect directly with certified sales representatives at {dealer.name}:</p>

                <div className="space-y-2.5">
                  <a
                    href={`tel:${dealer.phone}`}
                    className="p-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl font-bold text-emerald-950 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="font-extrabold">Official Telephone</p>
                        <p className="text-[11px] text-emerald-800">{dealer.phone}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-600" />
                  </a>

                  <a
                    href={`https://wa.me/${dealer.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-between transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5" />
                      <div>
                        <p className="font-extrabold">Instant WhatsApp Inquiry</p>
                        <p className="text-[11px] text-emerald-100">Fastest response (&lt; 5 mins)</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </a>

                  <a
                    href={`mailto:${dealer.email}`}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-[#1E3063] flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-slate-500" />
                      <div>
                        <p className="font-extrabold">Official Email Inquiry</p>
                        <p className="text-[11px] text-slate-500">{dealer.email}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </a>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 2: BOOK TEST DRIVE FORM */}
      {/* ========================================================================= */}
      {showTestDriveModal && (
        <Modal isOpen={true} onClose={() => setShowTestDriveModal(false)} title={`Book Test Drive with ${dealer.name}`} maxWidth="md">
          <form onSubmit={handleBookTestDriveSubmit} className="space-y-4 p-2 text-xs">
            {testDriveSubmitted ? (
              <div className="p-6 text-center space-y-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="font-extrabold text-emerald-950 text-base font-display">Test Drive Request Confirmed!</p>
                <p className="text-slate-600">The team at {dealer.name} will call you shortly to verify your schedule.</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Select Vehicle for Test Drive:</label>
                  <select
                    value={testDriveVehicleId}
                    onChange={(e) => setTestDriveVehicleId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[#1E3063]"
                  >
                    <option value="">Any Vehicle / Showroom Visit</option>
                    {dealerVehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.title} (Ksh {v.price.toLocaleString()})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Preferred Date:</label>
                    <input
                      type="date"
                      required
                      value={testDriveDate}
                      onChange={(e) => setTestDriveDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Preferred Time:</label>
                    <select
                      value={testDriveTime}
                      onChange={(e) => setTestDriveTime(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                    >
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="04:00 PM">04:00 PM</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-slate-700 block">Your Contact Name:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Samuel Mwaura"
                    value={testDriveName}
                    onChange={(e) => setTestDriveName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-slate-700 block">Your Phone Number:</label>
                  <input
                    type="tel"
                    required
                    placeholder="+254 7XX XXX XXX"
                    value={testDrivePhone}
                    onChange={(e) => setTestDrivePhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>

                <Button variant="primary" size="lg" fullWidth type="submit" className="bg-[#1E3063] text-white">
                  Confirm Test Drive Booking
                </Button>
              </>
            )}
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 3: DIRECTIONS / MAP */}
      {/* ========================================================================= */}
      {showDirectionsModal && (
        <Modal isOpen={true} onClose={() => setShowDirectionsModal(false)} title={`Directions to ${dealer.name}`} maxWidth="md">
          <div className="space-y-4 p-2 text-xs">
            <div className="p-4 bg-[#1E3063] text-white rounded-2xl space-y-2">
              <p className="font-extrabold text-sm flex items-center gap-1.5 text-amber-300">
                <MapPin className="w-4 h-4" /> Yard Address:
              </p>
              <p className="text-slate-100 text-xs">{dealer.address || `${dealer.location} (${dealer.county})`}</p>
              {dealer.landmark && (
                <p className="text-[11px] text-amber-200 font-bold border-t border-white/20 pt-2">
                  Landmark: {dealer.landmark}
                </p>
              )}
            </div>

            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(dealer.address || dealer.location)}`}
              target="_blank"
              rel="noreferrer"
              className="p-3.5 bg-emerald-600 text-white rounded-xl font-extrabold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"
            >
              <Navigation className="w-4 h-4" /> Open in Google Maps GPS Navigation
            </a>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 4: FULLSCREEN GALLERY LIGHTBOX */}
      {/* ========================================================================= */}
      {activeGalleryImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <button
            onClick={() => setActiveGalleryImage(null)}
            className="absolute top-4 right-4 text-white p-2 rounded-full bg-white/10 hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </button>
          <img src={activeGalleryImage} alt="Showroom Lightbox" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
        </div>
      )}

    </Modal>
  );
};

export default DealerProfileModal;
