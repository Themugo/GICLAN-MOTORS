import React, { useState, useCallback, useMemo, useEffect, Suspense } from 'react';
import Navbar from './components/Navbar';
import VehicleMarketplace from './features/VehicleMarketplace';
import TopNoticeStrip from './components/TopNoticeStrip';
import VehicleDetailModal from './components/VehicleDetailModal';
import CompareModal from './components/CompareModal';
import AuthModal from './components/AuthModal';
import PriceAlertsModal from './components/PriceAlertsModal';

import { getCars, getCarById, mapBackendCarToVehicle, VehicleApiError } from './services/vehicleApi';
import { useVehicleCollections } from './hooks/useVehicleCollections';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { SocketProvider } from './context/SocketContext';
import { CompareProvider, useCompare } from './context/CompareContext';
import { Vehicle, UserProfile } from './types';
import { getVehicleIdFromUrl, setVehicleDetailUrl } from './utils/navigation';

// Views
// Heavy authenticated/admin surfaces are loaded on demand. This keeps the
// public marketplace shell small while preserving existing navigation and
// component contracts.
const AuctionsView = React.lazy(() => import('./features/AuctionsView'));
const EscrowView = React.lazy(() => import('./features/EscrowView'));
const InspectionsView = React.lazy(() => import('./features/InspectionsView'));
const FinancingView = React.lazy(() => import('./features/FinancingView'));
const DealersView = React.lazy(() => import('./features/DealersView'));
const DashboardView = React.lazy(() => import('./features/DashboardView'));
const PrivateSellerDashboardView = React.lazy(() => import('./features/PrivateSellerDashboardView'));
const ChatView = React.lazy(() => import('./features/ChatView'));
const AdminView = React.lazy(() => import('./features/AdminView'));
const SupportView = React.lazy(() => import('./features/SupportView'));
const PaymentHistoryView = React.lazy(() => import('./features/PaymentHistoryView'));
const AuctionDiscoveryNetwork = React.lazy(() => import('./pages/AuctionDiscoveryNetwork'));
const KAYADLive = React.lazy(() => import('./pages/KAYADLive'));
const BuyerPlatform = React.lazy(() => import('./features/OwnershipPlatform').then((m) => ({ default: m.BuyerPlatform })));
const PrivateSellerPlatform = React.lazy(() => import('./features/PrivateSellerPlatform'));
const DealerDashboard = React.lazy(() => import('./pages/dealer/dashboard/DealerDashboard'));
const FinanceMarketplace = React.lazy(() => import('./features/FinancePlatform').then((m) => ({ default: m.FinanceMarketplace })));
const InspectionMarketplacePage = React.lazy(() => import('./features/InspectionMarketplace/pages/InspectionMarketplacePage'));

// Fixed (Final Integration - real data integration): App() previously
// held its own, disconnected local user state directly - re-applying
// this project's own earlier hardening fix (Phase 2), confirmed lost
// on this branch: useAuth() requires an AuthProvider ancestor, so
// App() is now a thin wrapper providing that, with the real logic in
// AppInner().
function AppInner() {
  const [activeNav, setActiveNav] = useState<string>('marketplace');
  const [selectedCounty, setSelectedCounty] = useState<string>('All East Africa');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fixed (Final Integration - real data integration): this was
  // useState<UserProfile | null>(null) - a second, disconnected
  // source of truth for "who is logged in," never wired to the real,
  // HttpOnly-cookie-based session at all. Confirmed reverted from
  // this project's own earlier hardening work. Now consumes the one,
  // real, authoritative user directly from AuthProvider via
  // useAuth().
  //
  // authUser (from AuthContext) and the UserProfile shape the rest of
  // this app's component tree expects are two different types -
  // AuthContext's User has broader, all-optional fields matching
  // exactly what the real backend returns; UserProfile is this app's
  // own, stricter, required-fields shape. This adapter bridges the
  // two honestly: no field is invented that the backend doesn't
  // provide, except isVerified (backend has no such field - mapped
  // from the real, existing emailVerified boolean).
  const { user: authUser, logout: authLogout, isAdmin } = useAuth();
  const user: UserProfile | null = useMemo(() => {
    if (!authUser) return null;
    const id = authUser.id || authUser._id;
    if (!id) return null;
    return {
      id,
      email: authUser.email || '',
      name: authUser.name || '',
      // This narrow role union is UserProfile's own, pre-existing
      // contract in src/types.ts - not something this fix changes or
      // widens.
      role: (authUser.role || 'user') as UserProfile['role'],
      phone: authUser.phone || '',
      avatar: authUser.avatar || '',
      isVerified: Boolean(authUser.emailVerified),
    };
  }, [authUser]);

  // Interactive States
  // Fixed (Final Integration - production mock-data dependencies):
  // - the exact same mock-on-every-load defect originally found and
  // fixed in this project's own earlier hardening work (Phase 3),
  // confirmed to have been lost when this file was rebuilt on a
  // diverged branch. Re-applying the same, already-proven fix: starts
  // empty + loading, fetches real data from the already-existing,
  // already-correct services/vehicleApi.ts (getCars/
  // mapBackendCarToVehicle - neither needed any changes, both were
  // still intact). A failed fetch produces an explicit error state,
  // never a silent fallback to mock data.
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState<boolean>(true);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    setVehiclesLoading(true);
    setVehiclesError(null);
    try {
      const res = await getCars({ limit: 50 });
      const real = (res.data || res.cars || []).map(mapBackendCarToVehicle);
      setVehicles(real);
    } catch (err) {
      setVehiclesError(
        err instanceof VehicleApiError
          ? err.message
          : 'Something went wrong loading vehicles. Please try again.'
      );
    } finally {
      setVehiclesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Modal Trigger States
  const [quickViewVehicle, setQuickViewVehicle] = useState<Vehicle | null>(null);
  const [invalidVehicleId, setInvalidVehicleId] = useState<string | null>(null);
  const resolvedVehicleIds = React.useRef(new Set<string>());
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showAlertsModal, setShowAlertsModal] = useState<boolean>(false);
  const [selectedChatVehicle, setSelectedChatVehicle] = useState<Vehicle | null>(null);

  // Central Navigation Handler: Opens Vehicle Details & Updates URL
  const handleOpenVehicleDetails = useCallback((vehicleOrId: Vehicle | string) => {
    if (typeof vehicleOrId !== 'string') {
      setQuickViewVehicle(vehicleOrId);
      setInvalidVehicleId(null);
      setVehicleDetailUrl(vehicleOrId.id);
      return;
    }

    const found = vehicles.find((v) => v.id === vehicleOrId);
    if (found) {
      setQuickViewVehicle(found);
      setInvalidVehicleId(null);
      setVehicleDetailUrl(found.id);
      return;
    }

    // A valid vehicle can be outside the currently loaded inventory slice.
    // Resolve the ID from the authoritative backend before declaring it missing.
    setVehicleDetailUrl(vehicleOrId);
    setQuickViewVehicle(null);
    setInvalidVehicleId(null);
    void getCarById(vehicleOrId).then((car) => {
      resolvedVehicleIds.current.add(vehicleOrId);
      if (car) {
        setQuickViewVehicle(mapBackendCarToVehicle(car));
        setInvalidVehicleId(null);
      } else {
        setInvalidVehicleId(vehicleOrId);
      }
    }).catch(() => {
      resolvedVehicleIds.current.add(vehicleOrId);
      setInvalidVehicleId(vehicleOrId);
    });
  }, [vehicles]);

  // Central Close Handler: Clears Vehicle Details & Removes URL Param
  const handleCloseVehicleDetails = useCallback(() => {
    setQuickViewVehicle(null);
    setInvalidVehicleId(null);
    setVehicleDetailUrl(null);
  }, []);

  // Listen for initial URL vehicle parameter and popstate (browser back/forward)
  useEffect(() => {
    let cancelled = false;

    const handleUrlSync = () => {
      const urlVehicleId = getVehicleIdFromUrl();
      if (!urlVehicleId) {
        setQuickViewVehicle(null);
        setInvalidVehicleId(null);
        return;
      }

      const found = vehicles.find((v) => v.id === urlVehicleId);
      if (found) {
        setQuickViewVehicle(found);
        setInvalidVehicleId(null);
        return;
      }

      // Browser refreshes and shared URLs must resolve against the backend,
      // not only the first inventory page currently held in memory.
      setQuickViewVehicle(null);
      setInvalidVehicleId(null);
      if (resolvedVehicleIds.current.has(urlVehicleId)) return;

      resolvedVehicleIds.current.add(urlVehicleId);
      void getCarById(urlVehicleId).then((car) => {
        if (cancelled) return;
        if (car) {
          setQuickViewVehicle(mapBackendCarToVehicle(car));
          setInvalidVehicleId(null);
        } else {
          setInvalidVehicleId(urlVehicleId);
        }
      }).catch(() => {
        if (!cancelled) setInvalidVehicleId(urlVehicleId);
      });
    };

    handleUrlSync();
    window.addEventListener('popstate', handleUrlSync);
    return () => {
      cancelled = true;
      window.removeEventListener('popstate', handleUrlSync);
    };
  }, [vehicles]);

  // Saved vehicles are server-authoritative for authenticated users.
  const {
    savedVehicles,
    savedVehiclesList,
    handleToggleSave,
  } = useVehicleCollections(vehicles, user?.id ?? null);

  // Phase 47: comparison is client-owned state, but it must still have one
  // authoritative client source. CompareContext already persists IDs to
  // localStorage, so App consumes that instead of maintaining a second,
  // non-persisted comparedVehicles array inside useVehicleCollections.
  const { compareIds: comparedVehicles, toggleCar: handleToggleCompare, removeCar: removeComparedVehicle } = useCompare();
  const [resolvedComparedVehicles, setResolvedComparedVehicles] = useState<Record<string, Vehicle>>({});

  // A persisted comparison can contain a vehicle outside the current inventory
  // page/slice. Resolve those IDs through the real single-vehicle API so the
  // compare modal survives refreshes and marketplace pagination honestly.
  useEffect(() => {
    let cancelled = false;
    const availableIds = new Set(vehicles.map((vehicle) => vehicle.id));
    const missingIds = comparedVehicles.filter(
      (id) => !availableIds.has(id) && !resolvedComparedVehicles[id]
    );

    if (missingIds.length === 0) return () => { cancelled = true; };

    void Promise.all(missingIds.map(async (id) => {
      try {
        const car = await getCarById(id);
        return car ? [id, mapBackendCarToVehicle(car)] as const : [id, null] as const;
      } catch {
        return [id, null] as const;
      }
    })).then((results) => {
      if (cancelled) return;
      setResolvedComparedVehicles((prev) => {
        const next = { ...prev };
        for (const [id, vehicle] of results) {
          if (vehicle) next[id] = vehicle;
        }
        return next;
      });
      for (const [id, vehicle] of results) {
        if (!vehicle) removeComparedVehicle(id);
      }
    });

    return () => { cancelled = true; };
  }, [comparedVehicles, vehicles, resolvedComparedVehicles, removeComparedVehicle]);

  const comparedVehiclesList = useMemo(() => {
    const currentById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
    return comparedVehicles
      .map((id) => currentById.get(id) || resolvedComparedVehicles[id])
      .filter((vehicle): vehicle is Vehicle => Boolean(vehicle));
  }, [comparedVehicles, vehicles, resolvedComparedVehicles]);

  // Add Vehicle Handler
  const handleAddVehicle = useCallback((_newVehicle: Vehicle) => {
    // Vehicle creation is backend-authoritative. Refresh the real inventory
    // after a successful create instead of inserting a locally synthesized row.
    void fetchVehicles();
  }, [fetchVehicles]);

  // Escrow CTA Handler
  const handleStartEscrow = useCallback((vehicle: Vehicle) => {
    setQuickViewVehicle(null);
    setSelectedChatVehicle(vehicle);
    setActiveNav('escrow');
  }, []);

  // Contact Seller Handler
  const handleContactSeller = useCallback((vehicle: Vehicle) => {
    setQuickViewVehicle(null);
    setSelectedChatVehicle(vehicle);
    setActiveNav('chat');
  }, []);

  // Select Dealer Vehicles Shortcut
  const handleSelectDealerVehicles = useCallback((dealerName: string) => {
    setSearchQuery(dealerName);
    setActiveNav('marketplace');
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F1E8] text-slate-800 flex flex-col font-sans">
      {/* 0. Top notice/advertisement strip - real, backend-driven,
          admin-managed entirely through the Ad Manager panel, no code
          changes needed to add/edit/recolor/remove an entry. */}
      <TopNoticeStrip />

      {/* 1. Header Navigation */}
      <Navbar
        user={user}
        savedCount={savedVehicles.length}
        activeNav={activeNav}
        onNavClick={(nav) => setActiveNav(nav)}
        selectedCounty={selectedCounty}
        onCountyChange={(c) => setSelectedCounty(c)}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenAlerts={() => setShowAlertsModal(true)}
        onLogout={() => { authLogout(); }}
      />

      {/* 2. Main Container (Inventory Priority & Clear Hierarchy) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Suspense fallback={
          <div className="min-h-[420px] flex items-center justify-center px-6" role="status" aria-live="polite">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-amber-400" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-600">Loading KAYAD workspace…</p>
            </div>
          </div>
        }>
        
        {/* Module Switcher Rendering */}
        {activeNav === 'marketplace' && (
            <VehicleMarketplace
              vehicles={vehicles}
              savedVehicles={savedVehicles}
              comparedVehicles={comparedVehicles}
              onToggleSave={handleToggleSave}
              onToggleCompare={handleToggleCompare}
              onQuickView={handleOpenVehicleDetails}
              onStartEscrow={handleStartEscrow}
              selectedCounty={selectedCounty}
              onCountyChange={(c) => setSelectedCounty(c)}
              searchQuery={searchQuery}
              onSearchChange={(q) => setSearchQuery(q)}
              onOpenCompareModal={() => setShowCompareModal(true)}
              onNavigate={(nav) => setActiveNav(nav)}
              onOpenAuth={() => setShowAuthModal(true)}
              isLoadingReal={vehiclesLoading}
              loadError={vehiclesError}
              onRetryLoad={fetchVehicles}
            />
          )}

          {activeNav === 'auctions' && (
            <AuctionsView
              vehicles={vehicles}
              user={user}
              onOpenAuth={() => setShowAuthModal(true)}
              onStartEscrow={handleStartEscrow}
              onQuickViewVehicle={handleOpenVehicleDetails}
            />
          )}

          {activeNav === 'payments' && user && <PaymentHistoryView />}

          {activeNav === 'escrow' && (
            <EscrowView
              user={user}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          )}

          {activeNav === 'inspections' && (
            <InspectionsView
              vehicles={vehicles}
              user={user}
              onOpenAuth={() => setShowAuthModal(true)}
              onViewVehicleDetails={handleOpenVehicleDetails}
              onOpenInspectionMarketplace={() => setActiveNav('inspection-marketplace')}
            />
          )}

          {activeNav === 'inspection-marketplace' && (
            <InspectionMarketplacePage />
          )}

          {activeNav === 'financing' && (
            <FinancingView 
              vehicles={vehicles}
              onQuickViewVehicle={handleOpenVehicleDetails}
            />
          )}

          {activeNav === 'dealers' && (
            <DealersView
              dealers={[]}
              vehicles={vehicles}
              onSelectDealerVehicles={handleSelectDealerVehicles}
              onQuickViewVehicle={handleOpenVehicleDetails}
              onStartEscrow={handleStartEscrow}
              onAddVehicle={handleAddVehicle}
            />
          )}

          {activeNav === 'dashboard' && (
            <DashboardView
              savedVehicles={savedVehicles}
              vehicles={vehicles}
              // Fixed: this dashboard widget's own escrow-deals list is
              // a separate integration from the real Escrow page
              // (src/features/EscrowView.tsx, now connected to real
              // data) - out of today's explicit scope. Passing an
              // honest empty list rather than continuing to show fake
              // sample deals here.
              deals={[]}
              user={user}
              messages={[]}
              comparedVehicles={comparedVehicles}
              onNavigate={(nav) => setActiveNav(nav)}
              onQuickViewVehicle={handleOpenVehicleDetails}
              onToggleSave={handleToggleSave}
              onToggleCompare={handleToggleCompare}
              onStartEscrow={handleStartEscrow}
              onContactSeller={handleContactSeller}
              onOpenCompareModal={() => setShowCompareModal(true)}
              onOpenAlertsModal={() => setShowAlertsModal(true)}
              onOpenAuthModal={() => setShowAuthModal(true)}
            />
          )}

          {activeNav === 'chat' && (
            <ChatView
              messages={[]}
              selectedVehicle={selectedChatVehicle}
              user={user}
              onQuickViewVehicle={handleOpenVehicleDetails}
              onNavigateToEscrow={() => setActiveNav('escrow')}
              onNavigateToInspections={() => setActiveNav('inspections')}
              onNavigateToFinancing={() => setActiveNav('financing')}
            />
          )}

          {/* Fixed (Final Integration): this rendered purely on
              activeNav === 'admin', with no check on the real user's
              role - any visitor, including an anonymous, logged-out
              one, could reach this by manipulating client-side
              navigation state alone. Confirmed reverted from this
              project's own earlier hardening work (Phase 2). This
              frontend gate is a UX improvement, not the sole security
              boundary - real backend authorization on this view's own
              data calls remains the authoritative check. */}
          {activeNav === 'admin' && isAdmin && (
            <AdminView
              vehicles={vehicles}
              onQuickViewVehicle={handleOpenVehicleDetails}
            />
          )}

          {activeNav === 'support' && (
            <SupportView user={user} onOpenAuth={() => setShowAuthModal(true)} />
          )}

          {/* Fixed: 'broadcast' (LiveAuctionBroadcastPage) removed
              entirely - confirmed zero real navigation ever reached
              it (no nav link, no button anywhere in the real app), it
              was driven entirely by 2 hardcoded mock constants with
              no real backend connection, and the real, working "watch
              a live auction, see the real current bid, place a real
              bid" experience already exists and is genuinely
              connected (AuctionDiscoveryNetwork's own WatchLiveModal,
              'discovery'). Rebuilding this as a real, separate page
              would have duplicated that already-real functionality
              rather than adding anything genuinely new. */}
          {activeNav === 'discovery' && (
            <AuctionDiscoveryNetwork user={user} onOpenAuth={() => setShowAuthModal(true)} />
          )}

          {activeNav === 'kayadlive' && (
            <KAYADLive onNavigate={(nav) => setActiveNav(nav)} />
          )}

          {activeNav === 'buyer-platform' && (
            <BuyerPlatform user={user} onNavigate={(nav) => setActiveNav(nav)} onOpenAuth={() => setShowAuthModal(true)} />
          )}

          {activeNav === 'seller-platform' && (
            <PrivateSellerPlatform user={user} onOpenAuth={() => setShowAuthModal(true)} />
          )}

          {activeNav === 'dealer-dashboard' && (
            <DealerDashboard user={user} onOpenAuth={() => setShowAuthModal(true)} onNavigate={(nav) => setActiveNav(nav)} />
          )}

          {activeNav === 'finance' && (
            <FinanceMarketplace user={user} onOpenAuth={() => setShowAuthModal(true)} />
          )}

          {activeNav === 'saved' && (
            <VehicleMarketplace
              vehicles={savedVehiclesList}
              savedVehicles={savedVehicles}
              comparedVehicles={comparedVehicles}
              onToggleSave={handleToggleSave}
              onToggleCompare={handleToggleCompare}
              onQuickView={handleOpenVehicleDetails}
              onStartEscrow={handleStartEscrow}
              selectedCounty={selectedCounty}
              onCountyChange={(c) => setSelectedCounty(c)}
              searchQuery=""
              onSearchChange={() => {}}
              onOpenCompareModal={() => setShowCompareModal(true)}
              isLoadingReal={vehiclesLoading}
              loadError={vehiclesError}
              onRetryLoad={fetchVehicles}
            />
          )}

          {(activeNav === 'sell' || activeNav === 'seller' || activeNav === 'seller-dashboard') && (
            <PrivateSellerDashboardView
              vehicles={vehicles}
              user={user}
              // Fixed: same as DashboardView above - a separate
              // integration, out of today's explicit scope. Honest
              // empty list instead of fake sample deals.
              deals={[]}
              messages={[]}
              onNavigate={(nav) => setActiveNav(nav)}
              onQuickViewVehicle={handleOpenVehicleDetails}
              onOpenAuthModal={() => setShowAuthModal(true)}
            />
          )}
        </Suspense>
        </main>

      {/* 3. Footer */}
      <footer className="bg-[#17244B] text-slate-300 text-xs py-8 border-t border-navy-600/40 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-[#17244B] font-black flex items-center justify-center">
              K
            </div>
            <div>
              <p className="font-bold text-white">KAYAD Automotive Marketplace East Africa</p>
              <p className="text-[11px] text-slate-400">Verified Automotive & Escrow Platform East Africa</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-slate-300">
            <button onClick={() => setActiveNav('marketplace')} className="hover:text-amber-300">Marketplace</button>
            <button onClick={() => setActiveNav('escrow')} className="hover:text-amber-300">Escrow Vault</button>
            <button onClick={() => setActiveNav('financing')} className="hover:text-amber-300">Financing</button>
            <button onClick={() => setActiveNav('support')} className="hover:text-amber-300">Support & Disputes</button>
          </div>
        </div>
      </footer>

      {/* 4. Modals */}
      <VehicleDetailModal
        vehicle={quickViewVehicle}
        notFoundId={invalidVehicleId}
        allVehicles={vehicles}
        onClose={handleCloseVehicleDetails}
        onStartEscrow={handleStartEscrow}
        onContactSeller={handleContactSeller}
        onRequestInspection={() => setActiveNav('inspections')}
        isSaved={quickViewVehicle ? savedVehicles.includes(quickViewVehicle.id) : false}
        onToggleSave={handleToggleSave}
        onSelectVehicle={handleOpenVehicleDetails}
      />

      {showCompareModal && (
        <CompareModal
          vehicles={comparedVehiclesList}
          onClose={() => setShowCompareModal(false)}
          onRemove={handleToggleCompare}
          onStartEscrow={handleStartEscrow}
          onQuickViewVehicle={handleOpenVehicleDetails}
        />
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        // Fixed: the real state update already happens inside
        // AuthModal's own login()/register()/login() calls
        // through AuthContext by the time this fires - App no longer
        // keeps any separate state to set here.
        onLogin={() => {}}
      />

      <PriceAlertsModal
        isOpen={showAlertsModal}
        onClose={() => setShowAlertsModal(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <CompareProvider>
            <AppInner />
          </CompareProvider>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
