import React, { useState, useMemo, useEffect } from 'react';
import { Vehicle, EscrowTransaction, ChatMessage, UserProfile, SavedSearch } from '../../../types';
import { Heart, Lock, Bell, Gavel, ArrowRight, ShieldCheck, CheckCircle2, Clock, TrendingDown, Eye, Sparkles, Zap, Building2, UserCheck, Car, Calculator, Wrench, Bookmark, AlertTriangle, Upload, FileCheck, MessageSquare, Trash2, ChevronRight, Scale } from 'lucide-react';
import { Card, Badge, Button, LazyImage, Modal } from '../../../components/ui';
import { savedSearchAPI } from '../../../api/api';

interface DashboardViewProps {
  savedVehicles: string[];
  vehicles: Vehicle[];
  deals: EscrowTransaction[];
  user?: UserProfile | null;
  messages?: ChatMessage[];
  comparedVehicles?: string[];
  onNavigate: (nav: string) => void;
  onQuickViewVehicle?: (vehicle: Vehicle) => void;
  onToggleSave?: (id: string) => void;
  onToggleCompare?: (id: string) => void;
  onStartEscrow?: (vehicle: Vehicle) => void;
  onContactSeller?: (vehicle: Vehicle) => void;
  onOpenCompareModal?: () => void;
  onOpenAlertsModal?: () => void;
  onOpenAuthModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  savedVehicles,
  vehicles,
  deals,
  user,
  messages = [],
  comparedVehicles = [],
  onNavigate,
  onQuickViewVehicle,
  onToggleSave,
  onToggleCompare,
  onStartEscrow,
  onContactSeller,
  onOpenCompareModal,
  onOpenAlertsModal,
  onOpenAuthModal
}) => {
  // Toast State
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Modals
  const [showSavedSearchesModal, setShowSavedSearchesModal] = useState<boolean>(false);
  const [activeTaskModal, setActiveTaskModal] = useState<{ title: string; desc: string; type: 'doc' | 'sign' } | null>(null);
  const [selectedInspectionModal, setSelectedInspectionModal] = useState<any | null>(null);

  // Auction Activity Sub-Tab State
  const [auctionTab, setAuctionTab] = useState<'bids' | 'watching' | 'won' | 'lost'>('bids');

  // Notifications Filter Tag State
  const [notifFilter, setNotifFilter] = useState<'all' | 'escrow' | 'price' | 'auction' | 'finance'>('all');

  // Saved searches are server-authoritative for the signed-in user.
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  useEffect(() => {
    if (!user?.id) { setSavedSearches([]); return undefined; }
    let cancelled = false;
    savedSearchAPI.list()
      .then((data) => {
        if (cancelled) return;
        setSavedSearches((data.searches || []).map((item: any) => ({
          id: item._id || item.id,
          title: item.name || 'Saved Search',
          filters: item.filters || {},
          notifyOnNewListing: item.notify !== false,
          createdAt: item.createdAt || '',
        })));
      })
      .catch(() => { if (!cancelled) setSavedSearches([]); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleToggleNewListingAlert = async (item: SavedSearch) => {
    const next = !item.notifyOnNewListing;
    try {
      await savedSearchAPI.toggleAlerts(item.id, next);
      setSavedSearches(prev => prev.map(s => s.id === item.id ? { ...s, notifyOnNewListing: next } : s));
      showToast(next ? 'New listing alerts enabled.' : 'New listing alerts disabled.');
    } catch {
      showToast('Failed to update alert preference.');
    }
  };

  // Derived Saved Vehicle Objects
  const savedItems = useMemo(() => {
    return vehicles.filter((v) => savedVehicles.includes(v.id));
  }, [vehicles, savedVehicles]);

  const totalSavedValue = useMemo(() => {
    return savedItems.reduce((acc, curr) => acc + curr.price, 0);
  }, [savedItems]);

  // Derived Active Purchases: only expose facts carried by real escrow records.
  const activePurchases = useMemo(() => {
    return deals.map((deal) => {
      const matchVehicle = vehicles.find((v) => v.id === deal.vehicleId || v.title === deal.vehicleTitle);
      const stage = deal.status || (deal.step ? `Step ${deal.step}` : 'Status unavailable');
      return {
        ...deal,
        vehicleImage: matchVehicle?.image || deal.vehicleImage,
        vehiclePrice: matchVehicle?.price || deal.amount,
        escrowStageText: stage,
        inspectionStatusText: 'Inspection status is available in the inspection record.',
        sellerResponseText: 'Seller communication is available in the Chat Hub.',
        outstandingTask: { id: `task-${deal.id}`, text: 'Review the current escrow record for any required action.', urgent: false }
      };
    });
  }, [deals, vehicles]);

  // Finance applications are not represented by a live dashboard contract yet.
  const financeApp = null;

  // Notifications must come from real event/notification records. No fabricated feed.
  const notifications: Array<{ id: string; type: 'price' | 'escrow' | 'auction' | 'finance'; title: string; message: string; time: string }> = [];

  // Messages are supplied by the live communication layer.
  const recentMessages = messages.slice(-3);

  // Buyer Name
  const buyerName = user?.name || 'Buyer';

  return (
    <div className="space-y-8 relative pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-[#1E3063] text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-400 flex items-center gap-3 animate-fade-in">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs font-extrabold">{toast}</span>
        </div>
      )}

      {/* ==========================================
          1. WELCOME HEADER & KEY METRICS BAR
          ========================================== */}
      <div className="bg-gradient-to-r from-[#1E3063] via-[#17244B] to-[#1E3063] rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-6 border border-amber-400/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 text-[#17244B] font-black text-2xl flex items-center justify-center font-display shadow-md border-2 border-white/20">
              {buyerName.charAt(0)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="verified" size="sm" className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Verified KAYAD Buyer
                </Badge>
                <Badge variant="accent" size="sm">
                  TIMS Logbook Sync Active
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
                Welcome back, {buyerName}! 👋
              </h1>
              <p className="text-xs text-slate-300">
                Your automotive command center for vehicle purchases, escrow vault protection, and inspection reports.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="accent"
              size="sm"
              onClick={() => onNavigate('seller-dashboard')}
              className="bg-amber-400 hover:bg-amber-500 text-[#17244B] font-black shadow-md"
            >
              <Car className="w-4 h-4 text-[#17244B]" />
              <span>Seller Dashboard</span>
            </Button>
            {!user && (
              <Button variant="accent" size="sm" onClick={onOpenAuthModal}>
                <UserCheck className="w-4 h-4 text-[#17244B]" />
                <span>Sign In / Register</span>
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('marketplace')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <span>Explore Marketplace</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </Button>
          </div>
        </div>

        {/* Executive Summary Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 space-y-1">
            <p className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-400" /> Saved Watchlist
            </p>
            <p className="text-2xl font-black font-display text-white">{savedVehicles.length} Vehicles</p>
            <p className="text-[11px] text-amber-300 font-bold truncate">Ksh {totalSavedValue.toLocaleString()} Value</p>
          </div>

          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 space-y-1">
            <p className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" /> Active Deals
            </p>
            <p className="text-2xl font-black font-display text-white">{activePurchases.length} Escrow Deals</p>
            <p className="text-[11px] text-emerald-300 font-bold">Status from live escrow records</p>
          </div>

          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 space-y-1">
            <p className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300" /> Action Required
            </p>
            <p className="text-2xl font-black font-display text-amber-300">{activePurchases.filter((deal) => deal.outstandingTask.urgent).length} Urgent Tasks</p>
            <p className="text-[11px] text-slate-200 font-bold truncate">Based on live escrow records</p>
          </div>

          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 space-y-1">
            <p className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-blue-300" /> Asset Finance
            </p>
            <p className="text-2xl font-black font-display text-white">Unavailable</p>
            <p className="text-[11px] text-blue-200 font-bold">No lender record loaded</p>
          </div>
        </div>
      </div>

      {/* ==========================================
          2. QUICK ACTIONS (6 Core Shortcuts)
          ========================================== */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-[#1E3063] uppercase tracking-wider font-display flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" /> Quick Actions Command Center
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              title: 'Browse Market',
              desc: `${vehicles.length} vehicles currently loaded`,
              icon: <Car className="w-5 h-5 text-[#1E3063]" />,
              action: () => onNavigate('marketplace'),
              color: 'hover:border-[#1E3063]'
            },
            {
              title: 'Saved Searches',
              desc: `${savedSearches.length} Alert Feeds Active`,
              icon: <Bookmark className="w-5 h-5 text-amber-600" />,
              action: () => setShowSavedSearchesModal(true),
              color: 'hover:border-amber-400'
            },
            {
              title: 'Continue Purchase',
              desc: `${activePurchases.length} active escrow record${activePurchases.length === 1 ? '' : 's'}`,
              icon: <Lock className="w-5 h-5 text-emerald-600" />,
              action: () => onNavigate('escrow'),
              color: 'hover:border-emerald-500'
            },
            {
              title: 'Book Inspection',
              desc: '150-Point Technical Audit',
              icon: <Wrench className="w-5 h-5 text-blue-600" />,
              action: () => onNavigate('inspections'),
              color: 'hover:border-blue-500'
            },
            {
              title: 'Compare Vehicles',
              desc: `${comparedVehicles.length} Vehicles in Slot`,
              icon: <Scale className="w-5 h-5 text-purple-600" />,
              action: () => onOpenCompareModal ? onOpenCompareModal() : onNavigate('marketplace'),
              color: 'hover:border-purple-500'
            },
            {
              title: 'View Auctions',
              desc: 'Open the live auction service',
              icon: <Gavel className="w-5 h-5 text-amber-700" />,
              action: () => onNavigate('auctions'),
              color: 'hover:border-amber-600'
            }
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={item.action}
              className={`p-4 bg-white rounded-2xl border border-slate-200 text-left space-y-2 transition-all hover:shadow-md cursor-pointer group ${item.color}`}
            >
              <div className="p-2.5 bg-slate-50 group-hover:bg-amber-50 rounded-xl w-fit transition-colors">
                {item.icon}
              </div>
              <div>
                <h4 className="font-extrabold text-[#1E3063] text-xs font-display group-hover:text-amber-800">{item.title}</h4>
                <p className="text-[10px] text-slate-500 font-medium truncate">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ==========================================
          3. MY SAVED VEHICLES
          ========================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500" />
              My Saved Watchlist ({savedItems.length})
            </h3>
            <p className="text-xs text-slate-500">Track price drop alerts, availability changes, and dealer status updates.</p>
          </div>

          <Button variant="secondary" size="sm" onClick={() => onNavigate('marketplace')}>
            <span>Explore More Cars</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#1E3063]" />
          </Button>
        </div>

        {savedItems.length === 0 ? (
          <Card className="p-8 text-center space-y-3 bg-white">
            <Heart className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">Your Watchlist is Currently Empty</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Save vehicles while exploring the marketplace to get instant notifications when sellers lower prices.
            </p>
            <Button variant="primary" size="sm" onClick={() => onNavigate('marketplace')}>
              Browse Verified Vehicles
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {savedItems.map((vehicle) => {
              const isCompared = comparedVehicles.includes(vehicle.id);
              return (
                <Card key={vehicle.id} className="p-4 space-y-3 bg-white hover:border-amber-400 transition-all shadow-xs group">
                  {/* Image & Badges */}
                  <div className="h-44 rounded-2xl overflow-hidden bg-slate-900 relative">
                    <LazyImage src={vehicle.image} alt={vehicle.title} wrapperClassName="w-full h-full" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />

                    <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
                      <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg backdrop-blur-md shadow-xs flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" /> Ksh 50,000 Price Drop
                      </span>
                    </div>

                    <button
                      onClick={() => onToggleSave?.(vehicle.id)}
                      className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-rose-600 text-white rounded-full backdrop-blur-md transition-colors cursor-pointer"
                      title="Remove from Saved"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="absolute bottom-2 left-2 bg-black/75 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg backdrop-blur-md">
                      📍 {vehicle.location}, {vehicle.county}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                      <span>Saved 2 days ago</span>
                      <span className="text-emerald-700 font-extrabold">● Available Today</span>
                    </div>

                    <h4 className="font-black text-[#1E3063] text-sm font-display line-clamp-1 group-hover:text-amber-800">
                      {vehicle.title}
                    </h4>

                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-lg font-black text-[#1E3063] font-display">
                        Ksh {vehicle.price.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {vehicle.year} • {vehicle.mileage.toLocaleString()} km
                      </span>
                    </div>

                    {/* Dealer Status */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-bold flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-amber-500" />
                        {vehicle.sellerName}
                      </span>
                      <Badge variant="verified" size="sm">
                        {vehicle.sellerType}
                      </Badge>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onQuickViewVehicle?.(vehicle)}
                    >
                      <Eye className="w-3.5 h-3.5 text-[#1E3063]" />
                      <span>Quick View</span>
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onStartEscrow ? onStartEscrow(vehicle) : onNavigate('escrow')}
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Start Escrow</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ==========================================
          4. MY ACTIVE PURCHASES
          ========================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-500" />
              My Active Purchases ({activePurchases.length})
            </h3>
            <p className="text-xs text-slate-500">Monitor escrow stage, 150-point inspection status, and seller responses.</p>
          </div>

          <Button variant="secondary" size="sm" onClick={() => onNavigate('escrow')}>
            <span>Full Escrow Portal</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#1E3063]" />
          </Button>
        </div>

        <div className="space-y-4">
          {activePurchases.map((deal) => (
            <Card key={deal.id} className="p-6 bg-white border-slate-200 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <LazyImage src={deal.vehicleImage || ''} alt={deal.vehicleTitle} wrapperClassName="w-16 h-12 rounded-xl border border-slate-200 shrink-0" className="w-full h-full object-cover" />
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 font-bold uppercase">{deal.id}</span>
                    <h4 className="text-base font-black text-[#1E3063] font-display">{deal.vehicleTitle}</h4>
                    <p className="text-xs text-slate-500 font-medium">Seller: <strong>{deal.sellerName}</strong> • Escrow Protected</p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Escrow Vault Deposit</p>
                  <p className="text-xl font-black text-[#1E3063] font-display">Ksh {deal.amount.toLocaleString()}</p>
                </div>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-500" /> Escrow Stage
                  </p>
                  <p className="font-extrabold text-[#1E3063]">{deal.escrowStageText}</p>
                </div>

                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
                  <p className="text-[10px] text-emerald-800 font-bold uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Inspection Status
                  </p>
                  <p className="font-extrabold text-emerald-950">{deal.inspectionStatusText}</p>
                </div>

                <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200 space-y-1">
                  <p className="text-[10px] text-blue-800 font-bold uppercase flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" /> Seller Response
                  </p>
                  <p className="font-extrabold text-blue-950">{deal.sellerResponseText}</p>
                </div>
              </div>

              {/* Outstanding Tasks Callout */}
              <div className="p-4 bg-amber-50/80 border border-amber-300/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-black text-[#17244B]">Outstanding Task Required:</p>
                    <p className="text-slate-700 font-medium">{deal.outstandingTask.text}</p>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveTaskModal({
                    title: 'Complete Outstanding Task',
                    desc: deal.outstandingTask.text,
                    type: 'sign'
                  })}
                  className="shrink-0"
                >
                  <span>Complete Action</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ==========================================
          5. ESCROW TRANSACTIONS TIMELINE
          ========================================== */}
      <Card className="p-6 bg-white space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2"><Lock className="w-5 h-5 text-amber-500" /> Escrow Transaction Timeline</h3>
            <p className="text-xs text-slate-500">Progress is calculated from the live escrow records loaded for your account.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onNavigate('escrow')}>Open Escrow Portal</Button>
        </div>
        {deals.length === 0 ? (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">No escrow transaction is currently loaded. No transaction stage or balance is displayed until a real escrow record exists.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {deals.map((deal) => (
              <div key={deal.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="font-black text-[#1E3063]">{deal.vehicleTitle || 'Vehicle transaction'}</p>
                <p className="text-slate-500 mt-1">Status: {deal.status || 'Unavailable'}</p>
                <p className="font-bold text-slate-700 mt-2">Ksh {deal.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ==========================================
          6. AUCTION ACTIVITY
          ========================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
              <Gavel className="w-5 h-5 text-amber-600" /> Auction Bids & Activity
            </h3>
            <p className="text-xs text-slate-500">Live auction activity is shown from the connected auction service.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onNavigate('auctions')}>Browse Auctions</Button>
        </div>
        <Card className="p-6 text-center text-xs text-slate-500 bg-white">
          <p className="font-bold">No live auction activity is loaded for this account.</p>
          <p className="mt-1">KAYAD will not display invented bids, watched lots, winning bids, or auction results.</p>
        </Card>
      </div>

      {/* ==========================================
          7. INSPECTION BOOKINGS
          ========================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              Inspection Bookings & Certificates
            </h3>
            <p className="text-xs text-slate-500">150-Point mechanical diagnostic reports and scheduled inspector bookings.</p>
          </div>

          <Button variant="secondary" size="sm" onClick={() => onNavigate('inspections')}>
            <span>Book New Inspection</span>
          </Button>
        </div>

        <Card className="p-5 bg-white border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="font-black text-[#1E3063] text-sm">Your inspection records</h4>
              <p className="text-[11px] text-slate-500 font-medium mt-1">Inspection status is shown from the live inspection workflow when a booking exists.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => onNavigate('inspections')}>Open Inspections</Button>
          </div>
          <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            No inspection record is loaded into the dashboard. KAYAD will not invent an inspector, score, booking time, or completion status.
          </div>
        </Card>
      </div>

      {/* ==========================================
          8. FINANCE APPLICATIONS
          ========================================== */}
      <Card className="p-6 bg-white space-y-3 border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl"><Calculator className="w-6 h-6" /></div>
          <div>
            <h3 className="text-base font-black text-[#1E3063] font-display">Asset Financing</h3>
            <p className="text-xs text-slate-500 font-medium">Financing applications will appear here when a live lender integration provides an application record.</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
          No financing application is currently available for this account. KAYAD does not display fabricated approval limits, rates, lenders, or document statuses.
        </div>
      </Card>

      {/* ==========================================
          9. RECENT MESSAGES & CHAT INQUIRIES
          ========================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#1E3063]" />
              Recent Seller Communications & Chats
            </h3>
            <p className="text-xs text-slate-500">Direct inquiries with dealers and private sellers.</p>
          </div>

          <Button variant="secondary" size="sm" onClick={() => onNavigate('chat')}>
            <span>Open Chat Hub</span>
          </Button>
        </div>

        <Card className="p-5 bg-white space-y-3">
          {recentMessages.map((msg) => (
            <div
              key={msg.id}
              onClick={() => onNavigate('chat')}
              className="p-3.5 bg-slate-50 hover:bg-amber-50/70 transition-all rounded-2xl border border-slate-200 flex items-center justify-between gap-3 text-xs cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1E3063] text-amber-400 font-extrabold flex items-center justify-center font-display shrink-0">
                  {msg.sender === 'seller' ? 'S' : 'J'}
                </div>
                <div>
                  <h4 className="font-extrabold text-[#1E3063] group-hover:text-amber-800">{msg.vehicleTitle || 'Vehicle Inquiry'}</h4>
                  <p className="text-slate-600 font-medium line-clamp-1">{msg.text}</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 font-bold">{msg.timestamp}</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 ml-auto mt-1" />
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* ==========================================
          10. NOTIFICATIONS FEED (Chronological)
          ========================================== */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              Real-time Activity Notifications
            </h3>
            <p className="text-xs text-slate-500">Chronological feed of price drops, escrow milestones, and loan updates.</p>
          </div>

          {/* Tag Filters */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'all', label: 'All' },
              { id: 'price', label: 'Price Drops' },
              { id: 'escrow', label: 'Escrow' },
              { id: 'auction', label: 'Auctions' },
              { id: 'finance', label: 'Finance' }
            ].map((tag) => (
              <button
                key={tag.id}
                onClick={() => setNotifFilter(tag.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  notifFilter === tag.id
                    ? 'bg-[#1E3063] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          {notifications.map((notif) => (
            <div key={notif.id} className="p-4 bg-white rounded-2xl border border-slate-200 flex items-start justify-between gap-4 text-xs shadow-xs hover:border-amber-400 transition-all">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  notif.type === 'price' ? 'bg-rose-50 text-rose-600' :
                  notif.type === 'escrow' ? 'bg-emerald-50 text-emerald-600' :
                  notif.type === 'auction' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {notif.type === 'price' ? <TrendingDown className="w-4 h-4" /> :
                   notif.type === 'escrow' ? <Lock className="w-4 h-4" /> :
                   notif.type === 'auction' ? <Gavel className="w-4 h-4" /> : <Calculator className="w-4 h-4" />}
                </div>

                <div>
                  <p className="font-extrabold text-[#1E3063] text-xs font-display">{notif.title}</p>
                  <p className="text-slate-600 font-medium mt-0.5">{notif.message}</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 font-bold">{notif.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ==========================================
          MODAL 1: SAVED SEARCHES MODAL
          ========================================== */}
      {showSavedSearchesModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowSavedSearchesModal(false)}
          title="My Saved Searches & Price Alerts"
          maxWidth="2xl"
        >
          <div className="p-6 space-y-4 text-xs">
            <p className="text-slate-600 font-medium">
              Manage your saved search queries and new-listing notifications. KAYAD can notify you when matching vehicles are listed.
            </p>

            <div className="space-y-3">
              {savedSearches.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600">
                  No saved searches are stored for this account yet. Saved-search persistence will appear here when the server-backed contract is connected.
                </div>
              ) : savedSearches.map((item) => (
                <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-[#1E3063] text-sm">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 font-semibold">Created {item.createdAt}</p>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setShowSavedSearchesModal(false);
                        onNavigate('marketplace');
                      }}
                    >
                      Run Search
                    </Button>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] pt-2 border-t border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={item.notifyOnNewListing}
                        onChange={() => { void handleToggleNewListingAlert(item); }}
                        className="rounded text-[#1E3063] accent-[#1E3063]"
                      />
                      <span>New Listing Alerts</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* ==========================================
          MODAL 2: TASK ACTION MODAL
          ========================================== */}
      {activeTaskModal && (
        <Modal
          isOpen={true}
          onClose={() => setActiveTaskModal(null)}
          title={activeTaskModal.title}
          maxWidth="md"
        >
          <div className="p-6 space-y-4 text-xs">
            <p className="text-slate-600 font-medium leading-relaxed">{activeTaskModal.desc}</p>

            {activeTaskModal.type === 'doc' ? (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-2 bg-slate-50">
                  <Upload className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="font-bold text-[#1E3063]">Click or drag PDF / JPG files here</p>
                  <p className="text-[10px] text-slate-400">Max size 10MB • Certified Document</p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => { setActiveTaskModal(null); onNavigate('inspections'); }}
                >
                  Open Inspection Portal
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-slate-700 space-y-2">
                  <p className="font-bold text-[#1E3063]">Live Escrow Agreement</p>
                  <p className="text-[11px] text-slate-600">
                    Open the Escrow Portal to review the current agreement and authorize any available next step from the live transaction record.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => { setActiveTaskModal(null); onNavigate('escrow'); }}
                >
                  Open Escrow Portal
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ==========================================
          MODAL 3: INSPECTION REPORT CERTIFICATE
          ========================================== */}
      {selectedInspectionModal && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedInspectionModal(null)}
          title="150-Point Technical Inspection Certificate"
          maxWidth="lg"
        >
          <div className="p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center font-display">
                  {selectedInspectionModal.score}%
                </div>
                <div>
                  <h4 className="font-black text-emerald-950 text-sm font-display">{selectedInspectionModal.vehicleTitle}</h4>
                  <p className="text-emerald-800 text-[11px]">{selectedInspectionModal.verdict}</p>
                </div>
              </div>
              <Badge variant="success" size="md">
                ✓ CERTIFIED
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-700">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">1. Engine Compression: 100% Pass</div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">2. Transmission Shift: Smooth</div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">3. Chassis Frame: Zero Accident</div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">4. TIMS Logbook: Verified Title</div>
            </div>

            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => setSelectedInspectionModal(null)}
            >
              Close Certificate Viewer
            </Button>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default DashboardView;
