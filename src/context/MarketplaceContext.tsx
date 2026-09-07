import type React from 'react';
import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Vehicle, BodyStyle } from '../types';
import { useOptionalAuth } from './AuthContext';
import { useVehicleCollections } from '../hooks/useVehicleCollections';
import { getCars, mapBackendCarToVehicle } from '../services/vehicleApi';
import { bidsAPI } from '../api/api';
import type { FC } from 'react';

// Local type definitions for context state
type EscrowStatus = 'initiated' | 'buyer_funded' | 'inspection_pending' | 'inspection_approved' | 'delivery_in_transit' | 'buyer_accepted' | 'disputed' | 'completed' | 'refunded';

interface EscrowMilestone {
  step: number;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
  timestamp?: string;
}

interface EscrowContractData {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  vehicleImage: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  agreedPrice: number;
  escrowFee: number;
  status: EscrowStatus;
  milestones: EscrowMilestone[];
  createdAt: string;
  updatedAt?: string;
}

interface BidData {
  id: string;
  vehicleId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  placedAt: string;
  isAutoBid?: boolean;
}


export interface EscrowContractLocal extends EscrowContractData {}
export interface BidLocal extends BidData {}
interface Advert {
  id: string;
  title: string;
  subtitle: string;
  badgeTag: string;
  ctaText: string;
  ctaPage: 'gallery' | 'auctions' | 'ghost_check' | 'escrow' | 'dashboard' | 'support';
  theme: 'cyan_navy' | 'emerald_escrow' | 'gold_luxury' | 'sunset_red';
  placement: 'homepage' | 'auctions' | 'search_feed';
  imageUrl?: string;
  isActive: boolean;
  clicksCount: number;
  createdAt: string;
}

interface PriceAlertData {
  id: string;
  userId: string;
  vehicleId: string;
  vehicleTitle: string;
  targetPrice: number;
  alertOnPriceDrop: boolean;
  alertOnStatusChange: boolean;
  currentPriceAtSet: number;
  notifyMethod: 'in_app' | 'email' | 'both';
  createdAt: string;
  isActive: boolean;
}

export interface PriceAlertLocal extends PriceAlertData {}

export interface FilterState {
  searchQuery: string;
  makes: string[];
  bodyStyles: BodyStyle[];
  minYear: number;
  maxYear: number;
  minPrice: number;
  maxPrice: number;
  maxMileage: number;
  transmission: string[];
  fuelType: string[];
  listingType: 'all' | 'auction' | 'fixed';
  certifiedOnly: boolean;
  sortBy: 'featured' | 'newest' | 'price_asc' | 'price_desc' | 'year_desc' | 'mileage_asc' | 'ending_soon';
}

// Maps this context's internal page-name convention to this app's real
// react-router paths. navigateTo() used to only update local state, which
// the real routed app never read — clicking any button wired to it did
// nothing visible. This keeps the internal state (still used by pages in
// this tree that aren't wired to real routes yet) while also actually
// navigating.
const PAGE_TO_PATH: Record<PageView, string> = {
  home: '/',
  gallery: '/gallery',
  vehicle_detail: '/car',
  auctions: '/auction',
  ghost_check: '/ghost-checker',
  how_it_works: '/about',
  about: '/about',
  escrow: '/escrow',
  dashboard: '/buyer',
  dealer_profile: '/dealer',
  admin: '/admin',
  support: '/support',
  sell: '/sell',
};



export type PageView = 
  | 'home'
  | 'gallery'
  | 'vehicle_detail'
  | 'auctions'
  | 'ghost_check'
  | 'how_it_works'
  | 'about'
  | 'escrow'
  | 'dashboard'
  | 'dealer_profile'
  | 'admin'
  | 'support'
  | 'sell';

interface MarketplaceContextType {
  activePage: PageView;
  navigateTo: (page: PageView, vehicleId?: string) => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  previousPage: PageView | null;
  selectedVehicleId: string | null;
  selectedVehicle: Vehicle | null;
  vehicles: Vehicle[];
  savedVehicleIds: string[];
  toggleSaveVehicle: (id: string) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  bids: BidLocal[];
  placeBid: (vehicleId: string, amount: number, bidderName: string, bidderId: string) => Promise<boolean>;
  escrowContracts: EscrowContractLocal[];
  initiateEscrow: (vehicle: Vehicle, buyerId: string, buyerName: string) => EscrowContractLocal;
  updateEscrowStep: (contractId: string, nextStep: number) => void;
  isChatOpen: boolean;
  openChat: (vehicleId?: string) => void;
  closeChat: () => void;
  activeChatVehicleId: string | null;
  isReportModalOpen: boolean;
  openReportModal: () => void;
  closeReportModal: () => void;
  addNewVehicle: (vehicleData: Partial<Vehicle>) => Vehicle;
  adverts: Advert[];
  addAdvert: (advData: Omit<Advert, 'id' | 'clicksCount' | 'createdAt'>) => Advert;
  toggleAdvertStatus: (id: string) => void;
  deleteAdvert: (id: string) => void;
  priceAlerts: PriceAlertLocal[];
  setPriceAlert: (alertData: Omit<PriceAlertLocal, 'id' | 'createdAt' | 'isActive'>) => PriceAlertLocal;
  removePriceAlert: (vehicleId: string) => void;
  getPriceAlertForVehicle: (vehicleId: string) => PriceAlertLocal | undefined;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const initialFilters: FilterState = {
  searchQuery: '',
  makes: [],
  bodyStyles: [],
  minYear: 2000,
  maxYear: 2026,
  minPrice: 0,
  maxPrice: 60000000,
  maxMileage: 500000,
  transmission: [],
  fuelType: [],
  listingType: 'all',
  certifiedOnly: false,
  sortBy: 'featured'
};

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export const MarketplaceProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<PageView>('home');
  const [navHistory, setNavHistory] = useState<PageView[]>(['home']);
  const [navIndex, setNavIndex] = useState<number>(0);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [bids, setBids] = useState<BidLocal[]>([]);
  const [bidLoadError, setBidLoadError] = useState<string | null>(null);
  const [escrowContracts, setEscrowContracts] = useState<EscrowContractLocal[]>([]);
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatVehicleId, setActiveChatVehicleId] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const navigate = useNavigate();
  const auth = useOptionalAuth();
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getCars({ limit: 100 })
      .then((response) => {
        if (cancelled) return;
        const mapped = (response.data || []).map(mapBackendCarToVehicle);
        setVehicles(mapped);
        setSelectedVehicleId((current) => current && mapped.some((v) => v.id === current) ? current : null);
      })
      .catch(() => {
        if (!cancelled) setVehicles([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);


  useEffect(() => {
    if (!auth?.user?.id) {
      setBids([]);
      setBidLoadError(null);
      return;
    }
    let cancelled = false;
    setBidLoadError(null);
    bidsAPI.myBids()
      .then((response: any) => {
        if (cancelled) return;
        const rows = Array.isArray(response?.bids) ? response.bids : [];
        setBids(rows.map((bid: any): BidLocal => ({
          id: String(bid.id || bid._id),
          vehicleId: String(bid.carId?.id || bid.carId?._id || bid.car?.id || bid.car?._id || bid.carId || ''),
          bidderId: String(bid.user?.id || bid.user?._id || bid.user || auth.user.id),
          bidderName: String(bid.user?.name || auth.user.name || 'KAYAD member'),
          amount: Number(bid.amount || 0),
          placedAt: bid.createdAt || bid.created_at || new Date().toISOString(),
        })).filter((bid: BidLocal) => Boolean(bid.vehicleId)));
      })
      .catch(() => {
        if (!cancelled) {
          setBids([]);
          setBidLoadError('Unable to load your bids right now.');
        }
      });
    return () => { cancelled = true; };
  }, [auth?.user?.id, auth?.user?.name]);

  const navigateTo = (page: PageView, vehicleId?: string) => {
    if (vehicleId) {
      setSelectedVehicleId(vehicleId);
    }

    if (page !== activePage) {
      const newHistory = navHistory.slice(0, navIndex + 1);
      newHistory.push(page);
      setNavHistory(newHistory);
      setNavIndex(newHistory.length - 1);
    }

    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const path = PAGE_TO_PATH[page] ?? '/';
    navigate(page === 'vehicle_detail' && vehicleId ? `${path}/${vehicleId}` : path);
  };

  const goBack = () => {
    if (navIndex > 0) {
      const prevIndex = navIndex - 1;
      setNavIndex(prevIndex);
      setActivePage(navHistory[prevIndex]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Default back is gallery or home
      setActivePage(activePage === 'gallery' ? 'home' : 'gallery');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goForward = () => {
    if (navIndex < navHistory.length - 1) {
      const nextIndex = navIndex + 1;
      setNavIndex(nextIndex);
      setActivePage(navHistory[nextIndex]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const canGoBack = navIndex > 0 || activePage !== 'home';
  const canGoForward = navIndex < navHistory.length - 1;
  const previousPage = navIndex > 0 ? navHistory[navIndex - 1] : null;

  const selectedVehicle = useMemo(() => {
    return selectedVehicleId ? vehicles.find(v => v.id === selectedVehicleId) || null : null;
  }, [vehicles, selectedVehicleId]);

  // Phase 52: favorites have one frontend source of truth. Reuse the
  // established collection hook rather than maintaining a second local
  // saved-ID store inside this legacy context. Authenticated users therefore
  // read/write the real favorites API here too; isolated unauthenticated
  // mounts retain the hook's explicitly documented anonymous behavior.
  const { savedVehicles: savedVehicleIds, handleToggleSave: toggleSaveVehicle } =
    useVehicleCollections(vehicles, auth?.user?.id ?? null);

  const resetFilters = () => setFilters(initialFilters);

  // A bid only counts once the canonical backend auction engine
  // (POST /api/bids/:id/bid) accepts it — the frontend never decides
  // the current bid, the minimum bid, or the winner. Local bid history
  // is updated only after server confirmation.
  const placeBid = async (vehicleId: string, amount: number, bidderName: string, bidderId: string): Promise<boolean> => {
    const target = vehicles.find(v => v.id === vehicleId);
    if (!target) return false;

    try {
      const res = await bidsAPI.place(vehicleId, { amount });
      if (!res?.data?.success) return false;
    } catch {
      return false;
    }

    // The response is intentionally not converted into a synthetic local bid.
    // Re-read the authoritative car and current user's bids so pending/failed
    // M-Pesa state cannot be presented as a confirmed auction mutation.
    try {
      const [latestCar, latestBids] = await Promise.all([
        import('../services/vehicleApi').then(({ getCarById }) => getCarById(vehicleId)),
        bidsAPI.myBids(),
      ]);
      if (latestCar) {
        const mapped = mapBackendCarToVehicle(latestCar);
        setVehicles(prev => prev.map(v => v.id === mapped.id ? mapped : v));
      }
      const rows = Array.isArray((latestBids as any)?.bids) ? (latestBids as any).bids : [];
      setBids(rows.map((bid: any): BidLocal => ({
        id: String(bid.id || bid._id),
        vehicleId: String(bid.carId?.id || bid.carId?._id || bid.car?.id || bid.car?._id || bid.carId || ''),
        bidderId: String(bid.user?.id || bid.user?._id || bid.user || bidderId),
        bidderName: String(bid.user?.name || bidderName || 'KAYAD member'),
        amount: Number(bid.amount || 0),
        placedAt: bid.createdAt || bid.created_at || new Date().toISOString(),
      })).filter((bid: BidLocal) => Boolean(bid.vehicleId)));
      setBidLoadError(null);
    } catch {
      // The bid request itself succeeded; failure to refresh the read model
      // must not fabricate a local success state. The next authoritative
      // refresh will reconcile the UI.
    }

    return true;
  };

  const initiateEscrow = (vehicle: Vehicle, buyerId: string, buyerName: string): EscrowContractLocal => {
    const existing = escrowContracts.find(e => e.vehicleId === vehicle.id && e.buyerId === buyerId);
    if (existing) return existing;

    const price = vehicle.buyNowPrice || vehicle.currentBid || vehicle.price;
    const fee = Math.round(price * 0.005); // 0.5% escrow fee

    const newContract: EscrowContractLocal = {
      id: `escrow_KYD_${Math.floor(10000 + Math.random() * 90000)}`,
      vehicleId: vehicle.id,
      vehicleTitle: vehicle.title,
      vehicleImage: vehicle.images[0],
      buyerId,
      buyerName,
      sellerId: vehicle.sellerId,
      sellerName: vehicle.sellerName,
      agreedPrice: price,
      escrowFee: fee,
      status: 'initiated',
      milestones: [
        { step: 1, title: 'Escrow Agreement Initiated', description: 'Buyer accepted deal terms and inspection policy', status: 'completed', timestamp: 'Just now' },
        { step: 2, title: 'Buyer Funds Deposit', description: `Awaiting wire/card transfer of $${(price + fee).toLocaleString()}`, status: 'current' },
        { step: 3, title: 'Title & Lien Audit', description: 'KAYAD legal team verifies vehicle ownership and clear title', status: 'upcoming' },
        { step: 4, title: 'Insured Transport Dispatch', description: 'Carrier collects vehicle from seller', status: 'upcoming' },
        { step: 5, title: 'Buyer Inspection Window', description: '48-Hour evaluation period before funds payout', status: 'upcoming' },
        { step: 6, title: 'Disbursement to Seller', description: 'Funds released from segregated escrow account', status: 'upcoming' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setEscrowContracts(prev => [newContract, ...prev]);
    
    return newContract;
  };

  const updateEscrowStep = (contractId: string, nextStep: number) => {
    setEscrowContracts(prev =>
      prev.map(contract => {
        if (contract.id === contractId) {
          const updatedMilestones = contract.milestones.map(m => {
            if (m.step < nextStep) return { ...m, status: 'completed' as const };
            if (m.step === nextStep) return { ...m, status: 'current' as const, timestamp: 'In Progress' };
            return { ...m, status: 'upcoming' as const };
          });

          const statusMap: Record<number, EscrowStatus> = {
            1: 'initiated',
            2: 'buyer_funded',
            3: 'inspection_pending',
            4: 'delivery_in_transit',
            5: 'buyer_accepted',
            6: 'completed'
          };

          return {
            ...contract,
            status: statusMap[nextStep] || contract.status,
            milestones: updatedMilestones,
            updatedAt: new Date().toISOString()
          };
        }
        return contract;
      })
    );
  };

  const openChat = (vehicleId?: string) => {
    if (vehicleId) setActiveChatVehicleId(vehicleId);
    setIsChatOpen(true);
  };

  const closeChat = () => setIsChatOpen(false);

  const addNewVehicle = (data: Partial<Vehicle>): Vehicle => {
    const newVehicle: Vehicle = {
      id: `veh_${Date.now()}`,
      title: data.title || '2024 Custom Performance Listing',
      make: data.make || 'Custom',
      model: data.model || 'Model',
      year: data.year || 2024,
      vin: data.vin || 'VIN' + Math.floor(Math.random() * 100000000),
      price: data.price || 50000,
      buyNowPrice: data.buyNowPrice || data.price || 50000,
      mileage: data.mileage || 1000,
      location: data.location || 'Miami, FL',
      bodyStyle: data.bodyStyle || 'Coupe',
      transmission: data.transmission || 'Automatic',
      fuelType: data.fuelType || 'Gasoline',
      engine: data.engine || 'V8 Twin Turbo',
      horsepower: data.horsepower || 450,
      exteriorColor: data.exteriorColor || 'Black Metallic',
      interiorColor: data.interiorColor || 'Black Leather',
      condition: data.condition || 'Excellent',
      listingType: data.listingType || 'fixed',
      images: data.images?.length ? data.images : ['https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80'],
      description: data.description || 'Verified KAYAD inventory listing with inspection certification.',
      features: data.features || ['Navigation', 'Leather Interior', 'Premium Sound'],
      sellerId: data.sellerId || 'dealer_1',
      sellerName: data.sellerName || 'Apex Luxury Motors',
      sellerRating: 4.9,
      isDealerCertified: true,
      viewsCount: 1,
      savedCount: 0,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    setVehicles(prev => [newVehicle, ...prev]);
    return newVehicle;
  };

  const [adverts, setAdverts] = useState<Advert[]>([]);

  const addAdvert = (data: Omit<Advert, 'id' | 'clicksCount' | 'createdAt'>): Advert => {
    const newAdv: Advert = {
      id: `adv_${Date.now()}`,
      title: data.title,
      subtitle: data.subtitle,
      badgeTag: data.badgeTag || 'PROMOTION',
      ctaText: data.ctaText || 'Learn More',
      ctaPage: data.ctaPage || 'gallery',
      theme: data.theme || 'cyan_navy',
      placement: data.placement || 'homepage',
      imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
      isActive: data.isActive ?? true,
      clicksCount: 0,
      createdAt: new Date().toISOString()
    };
    setAdverts(prev => [newAdv, ...prev]);
    return newAdv;
  };

  const toggleAdvertStatus = (id: string) => {
    setAdverts(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
  };

  const deleteAdvert = (id: string) => {
    setAdverts(prev => prev.filter(a => a.id !== id));
  };

  const [priceAlerts, setPriceAlerts] = useState<PriceAlertLocal[]>([]);

  const setPriceAlert = (alertData: Omit<PriceAlertLocal, 'id' | 'createdAt' | 'isActive'>): PriceAlertLocal => {
    const existingIndex = priceAlerts.findIndex(a => a.vehicleId === alertData.vehicleId && a.userId === alertData.userId);
    const newAlert: PriceAlertLocal = {
      ...alertData,
      id: existingIndex >= 0 ? priceAlerts[existingIndex].id : `alert_${Date.now()}`,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    if (existingIndex >= 0) {
      setPriceAlerts(prev => prev.map((item, idx) => idx === existingIndex ? newAlert : item));
    } else {
      setPriceAlerts(prev => [newAlert, ...prev]);
    }


    return newAlert;
  };

  const removePriceAlert = (vehicleId: string) => {
    setPriceAlerts(prev => prev.filter(a => a.vehicleId !== vehicleId));
  };

  const getPriceAlertForVehicle = (vehicleId: string): PriceAlertLocal | undefined => {
    return priceAlerts.find(a => a.vehicleId === vehicleId && a.isActive);
  };

  return (
    <MarketplaceContext.Provider
      value={{
        activePage,
        navigateTo,
        goBack,
        goForward,
        canGoBack,
        canGoForward,
        previousPage,
        selectedVehicleId,
        selectedVehicle,
        vehicles,
        savedVehicleIds,
        toggleSaveVehicle,
        filters,
        setFilters,
        resetFilters,
        bids,
        placeBid,
        escrowContracts,
        initiateEscrow,
        updateEscrowStep,
        isChatOpen,
        openChat,
        closeChat,
        activeChatVehicleId,
        isReportModalOpen,
        openReportModal: () => setIsReportModalOpen(true),
        closeReportModal: () => setIsReportModalOpen(false),
        addNewVehicle,
        adverts,
        addAdvert,
        toggleAdvertStatus,
        deleteAdvert,
        priceAlerts,
        setPriceAlert,
        removePriceAlert,
        getPriceAlertForVehicle,
        isLoading,
        setIsLoading
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
};

export const useMarketplace = () => {
  const context = useContext(MarketplaceContext);
  if (!context) throw new Error('useMarketplace must be used within MarketplaceProvider');
  return context;
};
