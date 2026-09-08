// ============================================================
// KAYAD PRIVATE SELLER PLATFORM - GUIDED SELLING EXPERIENCE
// Sections 1-17: Step-by-step seller journey
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createCar, getMyListings, VehicleApiError, BackendCar } from '../../../services/vehicleApi';
import { getMyEscrows, BackendEscrow } from '../../../services/escrowApi';
import { calculateListingQualityScore } from '../../../utils/listingQualityScore';
import PhoneVerification from '../../../components/PhoneVerification';
import type { UserProfile } from '../../../types';
import {
  Home, Warehouse, Heart, ShoppingCart, ClipboardCheck, DollarSign, FileText, Clock,
  Bell, TrendingUp, Award, Bot, MessageSquare, Settings, ChevronRight, Menu, X,
  User, LogOut, Moon, Sun, Globe, Shield, BellRing, Search, Plus, Minus,
  Car, Camera, Image, Gauge, Wrench, Calendar, MapPin, Star, Trophy,
  CheckCircle, AlertCircle, XCircle, Clock3, Package, Truck, Key, ShieldCheck,
  Check, Circle, ArrowRight, ArrowLeft, PlusCircle, MinusCircle,
  File, FileCheck, Upload, Download, Eye, Trash2, Share2, Copy, FileUp,
  CreditCard, Building, Receipt, PiggyBank, Percent, Banknote, TrendingDown,
  BarChart3, Sparkles, ArrowUpRight, RefreshCw, DollarSign as DollarSignIcon,
  MessageCircle, Mail, Phone, Bell as BellIcon, CalendarCheck, Users,
  BadgeCheck, BadgeDollarSign, ShieldAlert, ShieldCheck as ShieldCheckVerified,
  Fingerprint, IdCard, MailCheck,
  PlusCircle as PlusCircleIcon, Settings2, ExternalLink, Filter, SortAsc, Grid, List,
  ClipboardList, ListChecks, ListOrdered, CheckSquare, Square,
  Eye as EyeIcon, Heart as HeartIcon, MessageSquare as MessageSquareIcon, Timer, TrendingUp as TrendingUpIcon,
  Lightbulb, Target, Zap,
  HelpCircle, BookOpen, AlertTriangle, Info, ExternalLink as ExternalLinkIcon,
  Phone as PhoneIcon, Mail as MailIcon,
  Calendar as CalendarIcon, MapPin as MapPinIcon, Clock as ClockIcon,
  UserCheck, CheckCircle2,
} from 'lucide-react';

// ============================================================
// TYPES & INTERFACES
// ============================================================

interface Listing {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  fuelType: string;
  transmission: string;
  color: string;
  condition: 'excellent' | 'good' | 'fair';
  description: string;
  images: string[];
  status: 'draft' | 'active' | 'pending' | 'sold' | 'withdrawn';
  views: number;
  favorites: number;
  enquiries: number;
  createdAt: string;
  verified: boolean;
  inspected: boolean;
  listedForInspection: boolean;
  escrowEnabled: boolean;
}

interface Enquiry {
  id: string;
  buyerName: string;
  buyerAvatar?: string;
  vehicleId: string;
  vehicleTitle: string;
  type: 'message' | 'viewing_request' | 'inspection_request' | 'finance_interest' | 'escrow_request' | 'offer';
  subject: string;
  message: string;
  budget?: number;
  preferredDate?: string;
  status: 'new' | 'replied' | 'converted' | 'closed';
  date: string;
}

interface ViewingAppointment {
  id: string;
  buyerName: string;
  vehicleId: string;
  vehicleTitle: string;
  date: string;
  time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  location: string;
  notes?: string;
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
}

interface EscrowTransaction {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  buyerName: string;
  salePrice: number;
  escrowAmount: number;
  depositAmount: number;
  depositPaid: boolean;
  status: 'pending' | 'deposit_received' | 'inspection_passed' | 'funds_released' | 'completed' | 'cancelled' | 'disputed';
  milestones: { name: string; completed: boolean; date?: string }[];
  createdAt: string;
  completedAt?: string;
}

interface SellerStats {
  totalListings: number;
  activeListings: number;
  draftListings: number;
  soldVehicles: number;
  totalViews: number;
  totalEnquiries: number;
  avgResponseTime: number;
  trustScore: number;
}

interface VerificationStatus {
  nationalId: { verified: boolean; date?: string };
  phone: { verified: boolean; date?: string };
  email: { verified: boolean; date?: string };
  tims: { verified: boolean; date?: string };
  ghostCheck: { completed: boolean; date?: string; grade?: string };
  profileComplete: number;
}

interface ListingDraft {
  step: number;
  vehicleInfo: {
    make: string;
    model: string;
    year: number;
    registration: string;
    vin: string;
  };
  photos: string[];
  details: {
    mileage: number;
    fuelType: string;
    transmission: string;
    color: string;
    condition: string;
    description: string;
  };
  ownership: {
    ownerName: string;
    ownerId: string;
    purchaseDate: string;
    logbookAvailable: boolean;
  };
  condition: {
    exterior: string;
    interior: string;
    engine: string;
    tyres: string;
    knownIssues: string;
    serviceHistory: string;
  };
  pricing: {
    askingPrice: number;
    negotiable: boolean;
    tradeIn: boolean;
  };
  delivery: {
    canDeliver: boolean;
    deliveryRadius: number;
  };
}

// ============================================================
// ============================================================
// THEME CONSTANTS
// ============================================================

const KAYAD_THEME = {
  navy: '#0A1628',
  navyLight: '#1e3a5f',
  gold: '#D4AF37',
  goldLight: '#F5E6B3',
  emerald: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  orange: '#F97316',
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  warmBeige: '#F5F0E8',
};

// ============================================================
// MAIN COMPONENT
// ============================================================

type PlatformSection =
  | 'home'
  | 'listing-wizard'
  | 'trust-center'
  | 'listing-quality'
  | 'escrow'
  | 'help';

interface PrivateSellerPlatformProps {
  user?: UserProfile | null;
  onOpenAuth?: () => void;
}

export default function PrivateSellerPlatform({ user, onOpenAuth }: PrivateSellerPlatformProps) {
  const [activeSection, setActiveSection] = useState<PlatformSection>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [listingDraft, setListingDraft] = useState<ListingDraft | null>(null);

  // The dashboard uses only the signed-in seller's backend listings and
  // escrow records. Unsupported seller capabilities remain unavailable
  // rather than being represented with local or synthetic records.
  const [myListings, setMyListings] = useState<BackendCar[]>([]);
  const [myEscrows, setMyEscrows] = useState<BackendEscrow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  useEffect(() => {
    if (!user) { setDataLoading(false); return; }
    let cancelled = false;
    Promise.all([
      getMyListings().catch(() => [] as BackendCar[]),
      getMyEscrows().catch(() => [] as BackendEscrow[]),
    ]).then(([listings, escrows]) => {
      if (cancelled) return;
      setMyListings(listings);
      setMyEscrows(escrows);
    }).finally(() => { if (!cancelled) setDataLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  const handleSectionChange = useCallback((section: PlatformSection) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
  }, []);

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-slate-500 mb-4">Sign in to list and manage your own vehicles.</p>
        <button onClick={onOpenAuth} className="bg-[#1E3063] text-white text-xs font-bold rounded-lg px-5 py-2.5">
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: KAYAD_THEME.warmBeige }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 sticky top-0 h-screen" style={{ backgroundColor: KAYAD_THEME.navy }}>
        <SidebarContent
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: KAYAD_THEME.navy }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <Car size={18} style={{ color: 'white' }} />
            </div>
            <span className="text-white font-bold">Sell</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            {mobileMenuOpen ? <X size={20} color="white" /> : <Menu size={20} color="white" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 pt-16"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-72 h-full p-4 overflow-y-auto"
              style={{ backgroundColor: KAYAD_THEME.navy }}
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarContent
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeSection === 'home' && <SellerHomeSection listings={myListings} loading={dataLoading} userName={user?.name} onNavigate={handleSectionChange} />}
              {activeSection === 'listing-wizard' && <ListingWizardSection draft={listingDraft} setDraft={setListingDraft} onNavigate={handleSectionChange} />}
              {activeSection === 'trust-center' && <TrustCenterSection />}
              {activeSection === 'listing-quality' && <ListingQualitySection listings={myListings} loading={dataLoading} />}
              {activeSection === 'escrow' && <EscrowCenterSection transactions={myEscrows} loading={dataLoading} />}
              {activeSection === 'help' && <HelpCenterSection />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// ============================================================
// SIDEBAR COMPONENT
// ============================================================

function SidebarContent({
  activeSection,
  onSectionChange,
}: {
  activeSection: PlatformSection;
  onSectionChange: (s: PlatformSection) => void;
}) {
  const navItems: { id: PlatformSection; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Seller Home', icon: <Home size={20} /> },
    { id: 'listing-wizard', label: 'Create Listing', icon: <PlusCircleIcon size={20} /> },
    { id: 'escrow', label: 'Escrow', icon: <Shield size={20} /> },
    { id: 'trust-center', label: 'Trust Center', icon: <BadgeCheck size={20} /> },
    { id: 'listing-quality', label: 'My Listings', icon: <CheckCircle size={20} /> },
    { id: 'help', label: 'Help', icon: <HelpCircle size={20} /> },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
            <Car size={24} color="white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">KAYAD</h1>
            <p className="text-white/60 text-xs">Private Seller</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative ${
                activeSection === item.id
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="absolute right-3 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheckVerified size={16} style={{ color: KAYAD_THEME.emerald }} />
            <span className="text-white/70 text-xs">Trust Score</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white font-bold">85%</span>
            <span className="text-white/50 text-xs">Verified Seller</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SECTION 1: SELLER HOME
// ============================================================

function SellerHomeSection({ listings, loading, userName, onNavigate }: {
  listings: BackendCar[];
  loading: boolean;
  userName?: string;
  onNavigate: (s: PlatformSection) => void;
}) {
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const activeListings = listings.filter((l) => l.status === 'available' || l.status === 'active').length;
  const soldListings = listings.filter((l) => l.status === 'sold').length;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 lg:p-8"
        style={{ background: `linear-gradient(135deg, ${KAYAD_THEME.navy} 0%, #2d4a6f 100%)` }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
              {greeting}{userName ? `, ${userName.split(' ')[0]}` : ''}
            </h1>
            <p className="text-white/70">Manage your listings and track your sales</p>
          </div>
          <button
            onClick={() => onNavigate('listing-wizard')}
            className="px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2"
            style={{ backgroundColor: KAYAD_THEME.orange }}
          >
            <PlusCircleIcon size={20} /> Create Listing
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <QuickStat icon={<Car size={20} />} value={activeListings.toString()} label="Active Listings" color={KAYAD_THEME.orange} />
          <QuickStat icon={<CheckCircle size={20} />} value={soldListings.toString()} label="Sold" color="#10B981" />
        </div>
      </motion.div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: KAYAD_THEME.navy }}>Your Listings</h2>
          <button onClick={() => onNavigate('listing-quality')} className="text-sm font-medium flex items-center gap-1" style={{ color: KAYAD_THEME.orange }}>
            View All <ChevronRight size={16} />
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-slate-400">Loading your listings…</p>
        ) : listings.length === 0 ? (
          <p className="text-sm text-slate-400">You haven't listed any vehicles yet.</p>
        ) : (
          <div className="space-y-4">
            {listings.slice(0, 5).map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} delay={i * 0.1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickStat({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div>
        <p className="text-white text-xl font-bold">{value}</p>
        <p className="text-white/60 text-xs">{label}</p>
      </div>
    </div>
  );
}

function ListingCard({ listing, delay }: { listing: BackendCar; delay: number }) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    available: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    active: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    draft: { bg: 'bg-slate-100', text: 'text-slate-600' },
    sold: { bg: 'bg-blue-100', text: 'text-blue-700' },
    pending: { bg: 'bg-amber-100', text: 'text-amber-700' },
  };
  const statusClass = statusColors[listing.status || 'draft'] || statusColors.draft;
  const image = listing.images?.[0]?.thumb || listing.images?.[0]?.url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: 'white' }}
    >
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-48 h-32 md:h-auto flex items-center justify-center" style={{ backgroundColor: KAYAD_THEME.slate[100] }}>
          {image ? (
            <img src={image} alt={listing.title} className="w-full h-full object-cover" />
          ) : (
            <Car size={48} style={{ color: KAYAD_THEME.slate[300] }} />
          )}
        </div>
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-bold" style={{ color: KAYAD_THEME.navy }}>{listing.year} {listing.brand} {listing.model}</h3>
              {listing.mileage != null && <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>{listing.mileage.toLocaleString()} km</p>}
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusClass.bg} ${statusClass.text}`}>
              {listing.status || 'draft'}
            </span>
          </div>
          <p className="text-xl font-bold mb-3" style={{ color: KAYAD_THEME.gold }}>KES {(listing.price / 1000000).toFixed(1)}M</p>
          <div className="flex flex-wrap gap-3 text-sm" style={{ color: KAYAD_THEME.slate[500] }}>
            <span className="flex items-center gap-1"><EyeIcon size={14} /> {listing.views || 0}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// SECTION 2: LISTING WIZARD (Simplified)
// ============================================================

function ListingWizardSection({ draft, setDraft, onNavigate }: {
  draft: ListingDraft | null;
  setDraft: (d: ListingDraft | null) => void;
  onNavigate: (s: PlatformSection) => void;
}) {
  const [currentStep, setCurrentStep] = useState(draft?.step || 1);
  const totalSteps = 12;
  // Added (Final Integration Phase 2): real publish state - the
  // frontend must not claim publication until the real backend
  // confirms it (this phase's own explicit instruction). No fake
  // "success" is ever shown; the real HTTP response, success or
  // failure, is what the UI reflects.
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedCarId, setPublishedCarId] = useState<string | null>(null);

  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    setPublishError(null);
    try {
      // Maps the wizard's own, existing draft state to the real
      // backend's real field names - does not invent any field the
      // wizard doesn't already declare in its own ListingDraft type.
      // title is constructed from year+make+model since the wizard
      // never collects a separate title field of its own - a direct,
      // literal combination of fields it does declare, not a new
      // input being added.
      const vehicleInfo = draft?.vehicleInfo;
      const details = draft?.details;
      const pricing = draft?.pricing;
      const title = vehicleInfo
        ? [vehicleInfo.year, vehicleInfo.make, vehicleInfo.model].filter(Boolean).join(' ').trim()
        : '';

      const result = await createCar({
        title: title || undefined,
        brand: vehicleInfo?.make,
        model: vehicleInfo?.model,
        year: vehicleInfo?.year,
        vin: vehicleInfo?.vin,
        registrationNumber: vehicleInfo?.registration,
        mileage: details?.mileage,
        fuel: details?.fuelType,
        transmission: details?.transmission,
        color: details?.color,
        condition: details?.condition,
        description: details?.description,
        price: pricing?.askingPrice,
      });

      if (result.success && result.car) {
        setPublishedCarId(result.car.id);
        setDraft(null);
      } else {
        setPublishError(result.message || 'Failed to publish listing.');
      }
    } catch (err) {
      setPublishError(err instanceof VehicleApiError ? err.message : 'Failed to publish listing. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  }, [draft, setDraft]);

  const steps = [
    { id: 1, label: 'Start' },
    { id: 2, label: 'Vehicle' },
    { id: 3, label: 'Photos' },
    { id: 4, label: 'Details' },
    { id: 5, label: 'Ownership' },
    { id: 6, label: 'Condition' },
    { id: 7, label: 'Issues' },
    { id: 8, label: 'Service' },
    { id: 9, label: 'Inspection' },
    { id: 10, label: 'Pricing' },
    { id: 11, label: 'Preview' },
    { id: 12, label: 'Publish' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Create Listing</h1>
        <button onClick={() => setDraft({ ...draft || { step: 1 } as ListingDraft, step: currentStep })} className="px-4 py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_THEME.warmBeige, color: KAYAD_THEME.navy }}>
          Save Draft
        </button>
      </div>

      <div className="rounded-xl p-4" style={{ backgroundColor: 'white' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium" style={{ color: KAYAD_THEME.navy }}>
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>
            {Math.round((currentStep / totalSteps) * 100)}% complete
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                step.id === currentStep
                  ? 'bg-orange-500 text-white'
                  : step.id < currentStep
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              {step.id < currentStep ? <CheckCircle size={14} /> : null}
              {step.label}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: 'white' }}>
        <div className="text-center py-8">
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: `${KAYAD_THEME.orange}15` }}>
            <Sparkles size={40} style={{ color: KAYAD_THEME.orange }} />
          </div>
          {publishedCarId ? (
            // Real success - only ever shown after the real backend
            // returned a real, created car record. Never shown
            // optimistically.
            <>
              <h2 className="text-2xl font-bold mb-4" style={{ color: KAYAD_THEME.navy }}>Listing Published</h2>
              <p className="text-lg mb-8 max-w-2xl mx-auto" style={{ color: KAYAD_THEME.slate[500] }}>
                Your listing has been saved to KAYAD. It is now searchable in the real marketplace.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-4" style={{ color: KAYAD_THEME.navy }}>Create Your Vehicle Listing</h2>
              <p className="text-lg mb-8 max-w-2xl mx-auto" style={{ color: KAYAD_THEME.slate[500] }}>
                We'll guide you step-by-step to create a professional listing. The process takes about 10-15 minutes.
              </p>
              {publishError && (
                // Real failure, surfaced honestly - the real backend's
                // own validation/authorization message, never
                // swallowed or replaced with a fake success state.
                <p className="text-sm mb-4 max-w-2xl mx-auto font-medium" style={{ color: '#DC2626' }}>
                  {publishError}
                </p>
              )}
              <button
                onClick={() => {
                  if (currentStep < totalSteps) {
                    setCurrentStep(currentStep + 1);
                  } else {
                    handlePublish();
                  }
                }}
                disabled={isPublishing}
                className="px-8 py-3 rounded-xl font-bold text-white disabled:opacity-60"
                style={{ backgroundColor: KAYAD_THEME.orange }}
              >
                {isPublishing
                  ? 'Publishing…'
                  : currentStep < totalSteps ? 'Start Creating Listing' : 'Publish Listing'} <ArrowRight size={20} className="inline ml-2" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


// ============================================================
// OTHER SECTIONS (Simplified for brevity)
// ============================================================

function TrustCenterSection() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Trust Center</h1>
      {/* Only backend-supported verification signals are presented here. */}
      <PhoneVerification />
      <div className="grid md:grid-cols-3 gap-4">
        {['National ID', 'Email', 'NTSA TIMS Logbook'].map((label) => (
          <div key={label} className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
            <span style={{ color: KAYAD_THEME.navy }} className="text-sm font-semibold">{label}</span>
            <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Not Yet Available</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListingQualitySection({ listings, loading }: { listings: BackendCar[]; loading: boolean }) {
  if (loading) return <p className="text-sm text-slate-400">Loading your listings…</p>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>My Listings</h1>
      {listings.length === 0 ? (
        <p className="text-sm text-slate-400">You haven't listed any vehicles yet.</p>
      ) : listings.map((l) => {
        const { score } = calculateListingQualityScore({
          hasTitle: !!l.title,
          hasBrand: !!l.brand,
          hasModel: !!l.model,
          hasYear: !!l.year,
          hasPrice: !!l.price,
          hasMileage: l.mileage != null,
          hasFuel: !!l.fuel,
          hasTransmission: !!l.transmission,
          hasBodyType: !!l.body_type,
          hasDescription: !!l.description,
          hasLocation: !!l.location_city,
          hasImages: (l.images?.length || 0) > 0,
          imageCount: l.images?.length || 0,
          hasFeatures: (l.features?.length || 0) > 0,
          featureCount: l.features?.length || 0,
          hasVin: !!l.vin,
          hasLogbook: !!l.registration_number,
          descriptionLength: l.description?.length || 0,
        });
        return (
          <div key={l.id} className="rounded-xl p-4 bg-white flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden shrink-0" style={{ backgroundColor: KAYAD_THEME.slate[100] }}>
              {l.images?.[0]?.thumb || l.images?.[0]?.url ? (
                <img src={l.images[0].thumb || l.images[0].url} alt={l.title} className="w-full h-full object-cover" />
              ) : (
                <Car size={32} style={{ color: KAYAD_THEME.slate[400] }} />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-bold" style={{ color: KAYAD_THEME.navy }}>{l.year} {l.brand} {l.model}</h3>
              <p className="text-sm" style={{ color: KAYAD_THEME.slate[500] }}>{l.status || 'draft'}</p>
            </div>
            <p className="text-2xl font-bold" style={{ color: score >= 80 ? KAYAD_THEME.emerald : KAYAD_THEME.amber }}>{score}%</p>
          </div>
        );
      })}
    </div>
  );
}

function EscrowCenterSection({ transactions, loading }: { transactions: BackendEscrow[]; loading: boolean }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6" style={{ backgroundColor: `${KAYAD_THEME.emerald}10` }}>
        <Shield size={24} style={{ color: KAYAD_THEME.emerald }} className="inline mr-2" />
        <span style={{ color: KAYAD_THEME.navy }}>KAYAD Escrow Protection - Secure transactions for private sales</span>
      </div>
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Escrow Transactions</h1>
      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : transactions.length === 0 ? (
        <div className="rounded-xl p-8 text-center bg-white">
          <Shield size={48} style={{ color: KAYAD_THEME.slate[300] }} className="mx-auto mb-4" />
          <p style={{ color: KAYAD_THEME.slate[500] }}>No active escrow transactions</p>
        </div>
      ) : transactions.map(t => (
        <div key={t.id} className="rounded-xl p-6 bg-white">
          <h3 className="font-bold mb-2" style={{ color: KAYAD_THEME.navy }}>{t.car?.title || 'Vehicle'}</h3>
          <p className="text-sm mb-4 capitalize" style={{ color: KAYAD_THEME.slate[500] }}>{t.status.replace('_', ' ')}</p>
          <p className="text-2xl font-bold" style={{ color: KAYAD_THEME.gold }}>KES {(t.amount / 1000000).toFixed(2)}M</p>
        </div>
      ))}
    </div>
  );
}

function HelpCenterSection() {
  const topics = ['How to Sell Safely', 'Avoiding Scams', 'Meeting Buyers', 'Using Escrow'];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: KAYAD_THEME.navy }}>Help Center</h1>
      {/* Fixed: each card's own "Read More →" button had no onClick
          handler at all - looked clickable, did nothing when clicked.
          No real, dedicated help-article system exists to link these
          to, so the button (a promise of functionality that isn't
          real) is removed rather than left dead; the topic titles
          themselves are honest, static content and stay. */}
      <div className="grid md:grid-cols-2 gap-4">
        {topics.map((t, i) => (
          <div key={i} className="rounded-xl p-4 bg-white">
            <h3 className="font-bold" style={{ color: KAYAD_THEME.navy }}>{t}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
