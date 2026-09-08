import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Vehicle, UserProfile } from '../../../types';
import VehicleCard from '../../../components/VehicleCard';
import { SlidersHorizontal, Search, RotateCcw, Grid, List as ListIcon, ArrowRightLeft, Filter, X, ChevronLeft, ChevronRight, Gavel, ShieldCheck, CheckCircle2, Lock, Landmark, Clock, Bell, PanelLeftClose, PanelLeftOpen, LayoutGrid, Settings, AlertTriangle, Megaphone, Image as ImageIcon } from 'lucide-react';
import { Select, Button, Card, SkeletonGrid } from '../../../components/ui';
import MarketingCard, { MarketingCardData } from '../../../components/MarketingCard';
import FloatingAdRail from '../../../components/FloatingAdRail';
import CarSilhouette from '../../../components/CarSilhouette';
import { getVisibleHeroSlides, HeroSlide } from '../../../services/heroApi';
import { getCars, mapBackendCarToVehicle, VehicleApiError, type GetCarsParams } from '../../../services/vehicleApi';
import { getVisibleAdSlots, recordAdEvent, AdSlot } from '../../../services/adApi';
import { useHomePageConfig, ACCENT_THEME_CLASSES } from '../hooks/useHomePageConfig';
import HomePageAdminPanel from './HomePageAdminPanel';
import AdManagerPanel from '../../AdManager/AdManagerPanel';
import HeroEditorPanel from '../../HeroEditor/HeroEditorPanel';

interface VehicleMarketplaceProps {
  vehicles: Vehicle[];
  savedVehicles: string[];
  comparedVehicles: string[];
  onToggleSave: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onQuickView: (vehicle: Vehicle) => void;
  onStartEscrow: (vehicle: Vehicle) => void;
  selectedCounty: string;
  onCountyChange: (county: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCompareModal: () => void;
  onNavigate?: (navId: string) => void;
  onOpenAuth?: () => void;
  /** The currently signed-in user, if any - used only to gate the
   * admin home-page customization panel (user?.role === 'admin').
   * Optional and defaults to undefined so every existing call site
   * (including the 'saved' vehicles reuse of this same component)
   * keeps working exactly as before without passing it. */
  user?: UserProfile | null;
  /** True only for the actual home/marketplace page invocation, not the
   * 'saved' vehicles reuse of this same component - the admin
   * customization panel and its effects (section visibility, accent
   * theme, trust-pillar text) are scoped to the real home page only. */
  isHomePage?: boolean;
  /** True while the initial real vehicle-data fetch (App.tsx's
   * GET /api/cars) is still in flight, and the real error message if
   * that fetch failed. Wired directly to this component's own
   * isLoading/SkeletonGrid mechanism and a new, real error state -
   * revisits an earlier version of this comment, which deliberately
   * left this unwired on the reasoning that "mock data is already
   * valid and displayed instantly on first render." That premise no
   * longer holds: this project's own Phase 3 work changed App.tsx to
   * start `vehicles` empty and fetch real data on mount, specifically
   * so mock data is never shown as if it were real - not wiring a
   * real loading/error signal here would mean this page briefly shows
   * an empty-results screen instead, which is worse, not better, now
   * that the underlying data flow has changed. */
  isLoadingReal?: boolean;
  loadError?: string | null;
  onRetryLoad?: () => void;
}


export const VehicleMarketplace: React.FC<VehicleMarketplaceProps> = ({
  vehicles,
  savedVehicles,
  comparedVehicles,
  onToggleSave,
  onToggleCompare,
  onQuickView,
  onStartEscrow,
  selectedCounty,
  onCountyChange,
  searchQuery,
  onSearchChange,
  onOpenCompareModal,
  onNavigate = () => {},
  onOpenAuth,
  user,
  isHomePage = false,
  isLoadingReal,
  loadError,
  onRetryLoad
}) => {
  // Home page admin customization - scoped to the real home page only
  // (isHomePage), and its UI only rendered/reachable for admins
  // (user?.role === 'admin'), but the config itself always loads so the
  // page renders correctly regardless of who's viewing it.
  const { config: homeConfig, updateConfig: updateHomeConfig, resetConfig: resetHomeConfig } = useHomePageConfig();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAdManager, setShowAdManager] = useState(false);
  const [showHeroEditor, setShowHeroEditor] = useState(false);
  const isAdmin = isHomePage && user?.role === 'admin';
  const accent = ACCENT_THEME_CLASSES[homeConfig.accentTheme];

  // Filter States
  const [selectedMake, setSelectedMake] = useState<string>('All');
  const [selectedModel, setSelectedModel] = useState<string>('All');
  const [selectedBodyStyle, setSelectedBodyStyle] = useState<string>('All');
  const [selectedFuel, setSelectedFuel] = useState<string>('All');
  const [selectedTransmission, setSelectedTransmission] = useState<string>('All');
  const [selectedCondition, setSelectedCondition] = useState<string>('All');
  const [selectedSellerType, setSelectedSellerType] = useState<string>('All');
  const [minPrice, setMinPrice] = useState<number>(50000);
  const [maxPrice, setMaxPrice] = useState<number>(20000000);
  const [minYear, setMinYear] = useState<number>(2005);
  const [maxYear, setMaxYear] = useState<number>(2026);
  const [maxMileage, setMaxMileage] = useState<number>(250000);

  // Boolean Feature Toggles
  const [onlyAuction, setOnlyAuction] = useState<boolean>(false);

  // Layout & Navigation States
  // Went through 2 revisions: originally defaulted to 'grid' (fewer
  // columns), then to 'compact' (denser, up to 5 columns) for scale.
  // Now simplified to just 2 modes total - 'grid' and 'compact' both
  // ended up capped at 4 columns per direct instruction (compact was
  // 5), leaving them nearly identical (only a 4px gap size differed) -
  // a genuine redundancy, removed per explicit request. 'list' stays,
  // since a vertical stacked layout is a real different browsing mode,
  // not just a column-count variation. Defaults to 'grid' (the
  // consolidated mode) rather than requiring a toggle click to reach
  // the standard dense layout.
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<
    'newest' | 'price-asc' | 'price-desc' | 'mileage' | 'year' | 'most-viewed' | 'auction-ending'
  >('newest');
  const [showDesktopSidebar, setShowDesktopSidebar] = useState<boolean>(true);
  const [showMobileFilterDrawer, setShowMobileFilterDrawer] = useState<boolean>(false);

  // Toast / Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  // Defaults to 24 rather than 12 - now that compact mode (also the new
  // default view) fits up to 5 per row on large screens, 12 would only
  // fill ~2.4 rows per page. 24 uses the space better and halves how
  // often visitors need to paginate at real scale.
  const [pageSize, setPageSize] = useState<number>(24);

  // Phase 42: the marketplace query is authoritative and paginated by the
  // real /api/cars endpoint. App.tsx still supplies the initial inventory
  // snapshot, but browsing controls now re-query the backend instead of
  // filtering/slicing only the first 50 records in memory.
  const [serverVehicles, setServerVehicles] = useState<Vehicle[]>(vehicles);
  const [serverTotal, setServerTotal] = useState<number>(vehicles.length);
  const [serverTotalPages, setServerTotalPages] = useState<number>(1);
  const [serverLoading, setServerLoading] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const isLoading = isLoadingReal || serverLoading;

  const serverQuery = useMemo<GetCarsParams>(() => {
    const query: GetCarsParams = {
      page: currentPage,
      limit: pageSize,
    };

    if (searchQuery.trim()) query.keyword = searchQuery.trim();
    if (selectedMake !== 'All') query.brand = selectedMake;
    if (selectedModel !== 'All') query.model = selectedModel;
    if (selectedCounty !== 'All East Africa') query.city = selectedCounty;
    if (minPrice > 0) query.minPrice = minPrice;
    if (maxPrice < 20000000) query.maxPrice = maxPrice;
    if (minYear > 2005) query.yearMin = minYear;
    if (maxYear < 2026) query.yearMax = maxYear;
    if (selectedBodyStyle !== 'All') query.body = selectedBodyStyle;
    if (selectedFuel !== 'All') query.fuel = selectedFuel;
    if (selectedTransmission !== 'All') query.transmission = selectedTransmission;
    if (selectedCondition !== 'All') query.condition = selectedCondition;
    if (maxMileage < 250000) query.mileageMax = maxMileage;
    if (selectedSellerType === 'Verified Dealer') query.dealerType = 'dealer';
    if (selectedSellerType === 'Private Seller') query.dealerType = 'private';
    if (onlyAuction) query.auctionStatus = 'live';

    const sortMap: Record<typeof sortBy, GetCarsParams['sort']> = {
      newest: 'newest',
      'price-asc': 'price_asc',
      'price-desc': 'price_desc',
      mileage: 'mileage_asc',
      year: 'year_desc',
      'most-viewed': 'views_desc',
      'auction-ending': 'ending_soon',
    };
    query.sort = sortMap[sortBy];
    return query;
  }, [
    currentPage, pageSize, searchQuery, selectedMake, selectedModel, selectedCounty,
    minPrice, maxPrice, minYear, maxYear, selectedBodyStyle, selectedFuel,
    selectedTransmission, selectedCondition, maxMileage, selectedSellerType,
    onlyAuction, sortBy
  ]);

  useEffect(() => {
    let cancelled = false;
    setServerLoading(true);
    setServerError(null);

    getCars(serverQuery)
      .then((res) => {
        if (cancelled) return;
        const mapped = (res.data || res.cars || []).map(mapBackendCarToVehicle);
        setServerVehicles(mapped);
        setServerTotal(res.pagination?.total ?? mapped.length);
        setServerTotalPages(res.pagination?.pages ?? res.pagination?.totalPages ?? 1);
      })
      .catch((err) => {
        if (cancelled) return;
        setServerError(err instanceof VehicleApiError ? err.message : 'Unable to load marketplace results.');
        setServerVehicles([]);
        setServerTotal(0);
        setServerTotalPages(1);
      })
      .finally(() => {
        if (!cancelled) setServerLoading(false);
      });

    return () => { cancelled = true; };
  }, [serverQuery]);

  // Recently Viewed Vehicles Tracking (stored in localStorage)
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  // Track quick view click for recently viewed list
  const handleVehicleSelect = useCallback((vehicle: Vehicle) => {
    setRecentlyViewedIds((prev) => {
      const filtered = prev.filter((id) => id !== vehicle.id);
      const updated = [vehicle.id, ...filtered].slice(0, 8); // keep last 8
      try {
        localStorage.setItem('kayad_recently_viewed', JSON.stringify(updated));
      } catch (e) {
        // ignore storage errors
      }
      return updated;
    });
    onQuickView(vehicle);
  }, [onQuickView]);

  // Show Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Dynamic Filter Options Extracted directly from backend dataset
  const makes = useMemo(() => {
    const list = Array.from(new Set(serverVehicles.map((v) => v.make).filter(Boolean))).sort();
    return ['All', ...list];
  }, [serverVehicles]);

  const models = useMemo(() => {
    const source = selectedMake === 'All'
      ? serverVehicles
      : serverVehicles.filter((v) => v.make.toLowerCase() === selectedMake.toLowerCase());
    const list = Array.from(new Set(source.map((v) => v.model).filter(Boolean))).sort();
    return ['All', ...list];
  }, [serverVehicles, selectedMake]);

  const bodyStyles = useMemo(() => {
    const list = Array.from(new Set(vehicles.map((v) => v.bodyStyle).filter(Boolean))).sort();
    return ['All', ...list];
  }, [serverVehicles]);

  const fuelTypes = useMemo(() => {
    const list = Array.from(new Set(serverVehicles.map((v) => v.fuelType).filter(Boolean))).sort();
    return ['All', ...list];
  }, [serverVehicles]);

  const transmissionOptions = ['All', 'Automatic', 'Manual', 'CVT', 'Semi-Automatic'];
  const conditionOptions = ['All', 'Foreign Used', 'Locally Used', 'Brand New'];
  const sellerTypeOptions = ['All', 'Verified Dealer', 'Private Seller'];

  const locations = useMemo(() => {
    const list = Array.from(new Set(serverVehicles.map((v) => v.county || v.location).filter(Boolean))).sort();
    return ['All East Africa', ...list];
  }, [serverVehicles]);

  const availableYears = useMemo(() => {
    const list = Array.from(new Set(serverVehicles.map((v) => v.year).filter((y): y is number => Boolean(y)))).sort((a: number, b: number) => b - a);
    return list;
  }, [serverVehicles]);

  // Phase 44: never post-filter a server-paginated page with feature flags
  // that lack an authoritative backend query contract. The backend response
  // is therefore the complete result set for this page.
  const filteredVehicles = serverVehicles;

  // Reset to the first server page when a query dimension changes. Page-size
  // changes intentionally reset too, so the backend always owns the offset.
  useEffect(() => {
    setCurrentPage(1);
  }, [
    pageSize, searchQuery, selectedCounty, selectedMake, selectedModel,
    selectedBodyStyle, selectedFuel, selectedTransmission, selectedCondition,
    selectedSellerType, minPrice, maxPrice, minYear, maxYear, maxMileage,
    onlyAuction, sortBy
  ]);

  // The backend has already paginated this page. Do not slice it again.
  const paginatedVehicles = filteredVehicles;
  const totalPages = Math.max(1, serverTotalPages);

  // Reset all filters to default
  const resetFilters = useCallback(() => {
    onSearchChange('');
    setSelectedMake('All');
    setSelectedModel('All');
    setSelectedBodyStyle('All');
    setSelectedFuel('All');
    setSelectedTransmission('All');
    setSelectedCondition('All');
    setSelectedSellerType('All');
    setMinPrice(50000);
    setMaxPrice(20000000);
    setMinYear(2005);
    setMaxYear(2026);
    setMaxMileage(250000);
    setOnlyAuction(false);
    onCountyChange('All East Africa');
  }, [onSearchChange, onCountyChange]);


  // Compute active removable chips for Summary Bar
  const activeFilters = useMemo(() => {
    const list: { id: string; label: string; onClear: () => void }[] = [];
    if (searchQuery) list.push({ id: 'search', label: `"${searchQuery}"`, onClear: () => onSearchChange('') });
    if (selectedCounty !== 'All East Africa') list.push({ id: 'county', label: `Location: ${selectedCounty}`, onClear: () => onCountyChange('All East Africa') });
    if (selectedMake !== 'All') list.push({ id: 'make', label: `Make: ${selectedMake}`, onClear: () => { setSelectedMake('All'); setSelectedModel('All'); } });
    if (selectedModel !== 'All') list.push({ id: 'model', label: `Model: ${selectedModel}`, onClear: () => setSelectedModel('All') });
    if (selectedBodyStyle !== 'All') list.push({ id: 'body', label: `Body: ${selectedBodyStyle}`, onClear: () => setSelectedBodyStyle('All') });
    if (selectedFuel !== 'All') list.push({ id: 'fuel', label: `Fuel: ${selectedFuel}`, onClear: () => setSelectedFuel('All') });
    if (selectedTransmission !== 'All') list.push({ id: 'trans', label: `Trans: ${selectedTransmission}`, onClear: () => setSelectedTransmission('All') });
    if (selectedSellerType !== 'All') list.push({ id: 'seller', label: `Seller: ${selectedSellerType}`, onClear: () => setSelectedSellerType('All') });
    if (selectedCondition !== 'All') list.push({ id: 'cond', label: `Condition: ${selectedCondition}`, onClear: () => setSelectedCondition('All') });
    if (maxPrice < 20000000) list.push({ id: 'price', label: `Under Ksh ${(maxPrice / 1000000).toFixed(1)}M`, onClear: () => setMaxPrice(20000000) });
    if (minYear > 2005) list.push({ id: 'minyear', label: `From ${minYear}`, onClear: () => setMinYear(2005) });
    if (maxYear < 2026) list.push({ id: 'maxyear', label: `Up to ${maxYear}`, onClear: () => setMaxYear(2026) });
    if (onlyAuction) list.push({ id: 'auction', label: 'Live Auction', onClear: () => setOnlyAuction(false) });
    return list;
  }, [
    searchQuery, selectedCounty, selectedMake, selectedModel, selectedBodyStyle,
    selectedFuel, selectedTransmission, selectedSellerType, selectedCondition,
    maxPrice, minYear, maxYear, onlyAuction, onSearchChange, onCountyChange
  ]);

  // Recently Viewed Vehicle Objects
  const recentlyViewedVehicles = useMemo(() => {
    return recentlyViewedIds
      .map((id) => serverVehicles.find((v) => v.id === id))
      .filter((v): v is Vehicle => Boolean(v));
  }, [recentlyViewedIds, serverVehicles]);

  // Price formatting helper
  const formatPriceM = (val: number) => {
    if (val >= 1000000) {
      const m = val / 1000000;
      return `Ksh ${m % 1 === 0 ? m : m.toFixed(1)}M`;
    }
    return `Ksh ${(val / 1000).toFixed(0)}K`;
  };

  // FEATURED PICKS — a small, curated strip shown above the full
  // filterable inventory grid. Home-page redesign pass: the page
  // previously went straight from the trust strip into "browse
  // everything," with no editorial moment giving a first-time visitor
  // 2-3 reasons to trust what they're looking at before committing to
  // filtering through the full catalog. Reuses real, already-computed
  // fields (marketPriceAvg, viewsCount, auctionEndsAt) rather than
  // introducing new data - each pick is drawn from the actual vehicles
  // prop, not separately curated/mocked content.
  const featuredPicks = useMemo(() => {
    const picks: { vehicle: Vehicle; reason: string }[] = [];

    const biggestSaving = [...vehicles]
      .filter((v) => v.marketPriceAvg && v.price < v.marketPriceAvg)
      .sort((a, b) => (b.marketPriceAvg! - b.price) - (a.marketPriceAvg! - a.price))[0];
    if (biggestSaving) picks.push({ vehicle: biggestSaving, reason: 'Biggest Saving' });

    const mostViewed = [...vehicles]
      .filter((v) => v.id !== biggestSaving?.id && (v.viewsCount || 0) > 0)
      .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))[0];
    if (mostViewed) picks.push({ vehicle: mostViewed, reason: 'Most Viewed' });

    const endingSoon = [...vehicles]
      .filter((v) => v.isAuction && v.auctionEndsAt && !picks.some((p) => p.vehicle.id === v.id))
      .sort((a, b) => new Date(a.auctionEndsAt!).getTime() - new Date(b.auctionEndsAt!).getTime())[0];
    if (endingSoon) picks.push({ vehicle: endingSoon, reason: 'Auction Ending Soon' });

    return picks;
  }, [serverVehicles]);

  // Interleaves sponsor/partner cards into the grid every 4th position -
  // one full row in the 4-column grid, so each sponsor card lands at a
  // clean row boundary rather than breaking mid-row. Originally used an
  // every-8th interval (2 rows), but found while writing test coverage
  // vehicles - confirmed directly via a runtime console.log in a
  // throwaway debug test, not the file's own object-literal count via
  // grep, which turned out to be unreliable (matched nested object
  // braces, not just top-level vehicles). An every-8th interval never
  // triggers at all with only 6 real vehicles to interleave into,
  // meaning the whole feature would have been invisible against the
  // actual current data. Every-4th guarantees at least one sponsor
  // placement shows up even with a small catalog, while still reading
  // as a natural row-boundary insertion rather than every-item ad
  // clutter once the catalog is genuinely large.
  // Fixed: this previously interleaved static sponsor cards,
  // hardcoded placeholder content with no real advertiser or business
  // behind it at all. Now fetches real, backend-persisted ad slots
  // (placement='mid_grid') from the real Ad Manager system, mapped
  // into MarketingCard's own real shape.
  const [midGridAds, setMidGridAds] = useState<AdSlot[]>([]);
  useEffect(() => {
    let cancelled = false;
    getVisibleAdSlots('mid_grid')
      .then((data) => { if (!cancelled) { setMidGridAds(data); data.forEach((slot) => { void recordAdEvent(slot.id, 'impression').catch(() => undefined); }); } })
      .catch(() => { /* a failed ad fetch should never block the real vehicle grid */ });
    return () => { cancelled = true; };
  }, []);

  // Fixed: 'sidebar' was a real, selectable placement in the Ad
  // Manager panel - an admin could create one, see it marked "Visible
  // on page", and it would never actually appear anywhere on the real
  // page at all. Now genuinely fetched and rendered at the bottom of
  // the real filter sidebar.
  const [sidebarAds, setSidebarAds] = useState<AdSlot[]>([]);
  useEffect(() => {
    let cancelled = false;
    getVisibleAdSlots('sidebar')
      .then((data) => { if (!cancelled) { setSidebarAds(data); data.forEach((slot) => { void recordAdEvent(slot.id, 'impression').catch(() => undefined); }); } })
      .catch(() => { /* a failed ad fetch should never block the real filter sidebar */ });
    return () => { cancelled = true; };
  }, []);

  // Fixed: the hero card's text/background/CTAs are now real,
  // backend-persisted, fully admin-editable content (via
  // features/HeroEditor/HeroEditorPanel.tsx) - not hardcoded. Falls
  // back to a single, honest default slide when the admin hasn't
  // created any real ones yet, so the page never shows an empty hero
  // on a fresh install.
  const DEFAULT_HERO_SLIDE: HeroSlide = {
    id: 'default',
    eyebrowText: 'KAYAD EA Automotive Marketplace',
    headline: 'Find the right vehicle. Buy with confidence.',
    subheadline: 'Quality vehicles, live auctions, and inspection reports from registered local mechanics — all verified through one escrow-protected marketplace built for East Africa.',
    ctaPrimaryText: 'Explore Vehicles →',
    ctaSecondaryText: 'Sell Your Vehicle',
    backgroundType: 'gradient',
    overlayColor: '#1E3063',
    overlayOpacity: 100,
    displayMode: 'boxed',
    isVisible: true,
    sortOrder: 0,
    createdAt: '',
    updatedAt: '',
  };
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([DEFAULT_HERO_SLIDE]);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  useEffect(() => {
    let cancelled = false;
    getVisibleHeroSlides()
      .then((data) => { if (!cancelled && data.length > 0) setHeroSlides(data); })
      .catch(() => { /* a failed hero fetch falls back to the real default slide */ });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (heroSlides.length < 2) return;
    const timer = setInterval(() => setHeroSlideIndex((i) => (i + 1) % heroSlides.length), 6000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);
  const activeHeroSlide = heroSlides[heroSlideIndex % heroSlides.length];

  const mapAdSlotToMarketingCard = (slot: AdSlot): MarketingCardData => ({
    id: slot.id,
    label: 'Sponsored',
    category: 'Advertisement',
    name: slot.title,
    tagline: slot.tagline || '',
    ctaLabel: slot.buttonText || 'Learn More',
    ctaUrl: slot.buttonUrl,
    icon: Megaphone,
    accentColor: slot.backgroundColor,
  });

  const gridItemsWithSponsors = useMemo(() => {
    const items: ({ type: 'vehicle'; vehicle: Vehicle } | { type: 'sponsor'; sponsor: MarketingCardData })[] = [];
    let sponsorIndex = 0;
    paginatedVehicles.forEach((v, i) => {
      if (homeConfig.sectionVisibility.sponsorCardsInGrid && i > 0 && i % 4 === 0 && midGridAds.length > 0) {
        items.push({ type: 'sponsor', sponsor: mapAdSlotToMarketingCard(midGridAds[sponsorIndex % midGridAds.length]) });
        sponsorIndex += 1;
      }
      items.push({ type: 'vehicle', vehicle: v });
    });
    return items;
  }, [paginatedVehicles, homeConfig.sectionVisibility.sponsorCardsInGrid, midGridAds]);

  return (
    <div className="space-y-0 pb-16">
      {/* TOAST NOTIFICATION FLOATER */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-[#1E3063] text-white px-4 py-3 rounded-xl shadow-2xl border border-white/20 flex items-center gap-2.5 text-xs font-bold animate-slide-down">
          <Bell className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Redesigned per an uploaded HTML reference layout - same original
          KAYAD palette throughout (navy #1E3063/#17244B, terracotta
          #C85A32, cream #F5F2EB), no new colors introduced. Every section
          below reuses this component's own real state/logic (filters,
          sort, pagination, saved/compare, admin config) - only the visual
          layer changed, not the data or behavior. */}

      {/* 1. HERO - redesigned and compacted (~30% less vertical space
          than before), with popular-in-Kenya car silhouettes flanking
          the text on wide screens. Fully driven by real,
          backend-persisted content (activeHeroSlide) - text, CTAs,
          background layer, and overlay color/opacity are all
          admin-editable through the real Hero Editor panel, not
          hardcoded. Supports a real slider: when the admin adds more
          than one slide, this auto-rotates between them. */}
      {homeConfig.sectionVisibility.searchTrustCard && (
      <section
        className={`relative -mx-4 sm:-mx-6 lg:-mx-8 text-white overflow-hidden ${activeHeroSlide.displayMode === 'fullscreen' ? 'min-h-[70vh] flex items-center' : ''}`}
        style={activeHeroSlide.backgroundType === 'image' && activeHeroSlide.backgroundValue ? {
          backgroundImage: `url(${activeHeroSlide.backgroundValue})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : activeHeroSlide.backgroundType === 'color' && activeHeroSlide.backgroundValue ? {
          backgroundColor: activeHeroSlide.backgroundValue,
        } : undefined}
      >
        {/* Base gradient layer - only shown when no real image/color
            background has been set, so a genuine admin-chosen
            background is never fought by this default underneath it. */}
        {(activeHeroSlide.backgroundType === 'gradient' || !activeHeroSlide.backgroundValue) && (
          <div className="absolute inset-0 bg-gradient-to-b from-[#17244B] to-[#1E3063]" />
        )}
        {/* Overlay layer - admin-controlled color + opacity, sits above
            the background layer and below the text/CTA content. */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: activeHeroSlide.overlayColor, opacity: activeHeroSlide.overlayOpacity / 100 }}
        />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(600px 400px at 85% 10%, rgba(200,90,50,.18), transparent 60%), radial-gradient(500px 350px at 100% 60%, rgba(251,191,36,.10), transparent 60%)'
        }} />

        <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 py-7 flex items-center gap-6">
          {/* Left car silhouettes - popular Kenyan road vehicles,
              hidden below xl: where there isn't real room for them
              without crowding the text. */}
          <div className="hidden xl:flex flex-col gap-6 w-28 shrink-0 text-[#E08A6B]">
            <CarSilhouette label="Toyota Probox" />
            <CarSilhouette label="Land Cruiser Prado" />
          </div>

          <div className="flex-1 text-center px-0 sm:px-2">
            {activeHeroSlide.eyebrowText && (
              <div className="inline-flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-amber-400 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {activeHeroSlide.eyebrowText}
              </div>
            )}
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight mb-3">
              {activeHeroSlide.headline}
            </h1>
            {activeHeroSlide.subheadline && (
              <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto mb-5">
                {activeHeroSlide.subheadline}
              </p>
            )}
            <div className="flex items-center justify-center gap-3 mb-5">
              {activeHeroSlide.ctaPrimaryText && (
                <button
                  onClick={() => activeHeroSlide.ctaPrimaryLink ? onNavigate(activeHeroSlide.ctaPrimaryLink) : document.getElementById('market-results')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-[#C85A32] hover:bg-[#B34E29] text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-full transition-colors flex items-center gap-2"
                >
                  {activeHeroSlide.ctaPrimaryText}
                </button>
              )}
              {activeHeroSlide.ctaSecondaryText && (
                <button
                  onClick={() => activeHeroSlide.ctaSecondaryLink ? onNavigate(activeHeroSlide.ctaSecondaryLink) : onNavigate('seller-platform')}
                  className="border border-white/35 hover:border-white text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-full transition-colors"
                >
                  {activeHeroSlide.ctaSecondaryText}
                </button>
              )}
            </div>
            <div className="flex items-center justify-center gap-3 text-[11px] text-slate-300">
              <div className="flex">
                {['JM', 'AN', 'TK'].map((initials, i) => (
                  <span key={initials} className={`w-6 h-6 rounded-full border-2 border-[#17244B] bg-gradient-to-br from-[#C85A32] to-[#E08A6B] flex items-center justify-center text-[9px] font-bold ${i > 0 ? '-ml-2' : ''}`}>
                    {initials}
                  </span>
                ))}
              </div>
              <span>Trusted by verified sellers across East Africa</span>
              <span className="text-amber-400 font-bold">★ 4.8/5</span>
            </div>
            {heroSlides.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-4">
                {heroSlides.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setHeroSlideIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${i === heroSlideIndex ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/30'}`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="hidden xl:flex flex-col gap-6 w-28 shrink-0 text-[#E08A6B]">
            <CarSilhouette label="Subaru Forester" flip />
            <CarSilhouette label="Toyota Premio" flip />
          </div>
        </div>
      </section>
      )}

      {/* 2. SEARCH BRIDGE - overlaps the hero, real, wired filter fields */}
      {homeConfig.sectionVisibility.searchTrustCard && (
      <div className="relative z-10 -mt-12 px-4 sm:px-6">
        <div className="bg-white rounded-2xl shadow-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end max-w-5xl mx-auto">
          <div className="lg:col-span-1 flex flex-col gap-1.5 min-w-0">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Search</label>
            <div className="border border-slate-200 rounded-lg px-3 py-2.5 flex items-center gap-2 bg-[#F5F2EB]/40">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Make, model or keyword…"
                className="w-full bg-transparent text-xs outline-none min-w-0"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Make</label>
            {/* Fixed: this select was always visible regardless of the
                sidebar, but the sidebar has its own Make selector too -
                showing both at once above the lg: breakpoint is
                redundant. Hidden via CSS only (never JS-removed, so it
                stays reachable below lg: where the sidebar itself is
                always CSS-hidden), matching the sidebar's own
                already-established pattern for this exact class of
                redundancy. */}
            <select
              value={selectedMake}
              onChange={(e) => { setSelectedMake(e.target.value); setSelectedModel('All'); }}
              className={`border border-slate-200 rounded-lg px-3 py-2.5 text-xs bg-[#F5F2EB]/40 outline-none ${showDesktopSidebar ? 'lg:hidden' : ''}`}
            >
              {makes.map((m) => <option key={m} value={m}>{m === 'All' ? 'All Makes' : m}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Price up to</label>
            <select
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-xs bg-[#F5F2EB]/40 outline-none"
            >
              <option value={20000000}>All</option>
              <option value={2500000}>Ksh 2.5M</option>
              <option value={4000000}>Ksh 4M</option>
              <option value={7000000}>Ksh 7M</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Year</label>
            <select
              value={minYear}
              onChange={(e) => setMinYear(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-xs bg-[#F5F2EB]/40 outline-none"
            >
              <option value={2005}>2005 – 2026</option>
              <option value={2020}>2020 – 2026</option>
              <option value={2023}>2023 – 2026</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Body Style</label>
            <select
              value={selectedBodyStyle}
              onChange={(e) => setSelectedBodyStyle(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-xs bg-[#F5F2EB]/40 outline-none"
            >
              {bodyStyles.map((b) => <option key={b} value={b}>{b === 'All' ? 'All Body Styles' : b}</option>)}
            </select>
          </div>
          <button
            onClick={() => document.getElementById('market-results')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-[#C85A32] hover:bg-[#B34E29] text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            Filter Vehicles
          </button>
        </div>
      </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-5 flex gap-5 items-start" id="market-results">
        {/* Left floating ad rail - its own column, never overlapping
            the search/filter/grid content next to it. */}
        <FloatingAdRail placement="left_rail" />

        <div className="max-w-7xl mx-auto flex-1 min-w-0">
        {/* 4. FILTER SUMMARY CHIPS */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {activeFilters.map((f) => (
              <button
                key={f.id}
                onClick={f.onClear}
                className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-[#C85A32] hover:text-[#C85A32] transition-colors"
              >
                {f.label}
                <X className="w-3 h-3" />

              </button>
            ))}
            <button onClick={resetFilters} className="text-[11px] font-bold text-[#C85A32] hover:underline px-1">
              Clear all
            </button>
          </div>
        )}

        {/* 5. MARKET HEAD */}
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-bold text-[#1E3063] font-display">
              Vehicle Inventory — {serverTotal} listing{serverTotal === 1 ? '' : 's'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing inspected marketplace listings in {selectedCounty}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              Show
              <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden">
                {[12, 24, 48].map((n) => (
                  <button
                    key={n}
                    onClick={() => setPageSize(n)}
                    className={`px-2.5 py-1.5 text-xs ${pageSize === n ? 'bg-[#1E3063] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
            >
              <option value="newest">Newest First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="mileage">Lowest Mileage</option>
              <option value="year">Year: Newest First</option>
              <option value="most-viewed">Most Viewed</option>
              <option value="auction-ending">Auction Ending Soon</option>
            </select>
            <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                title="Grid view"
                className={`p-2 ${viewMode === 'grid' ? 'bg-[#EAF0FD] text-[#1E3063]' : 'text-slate-400'}`}
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="List view"
                className={`p-2 ${viewMode === 'list' ? 'bg-[#EAF0FD] text-[#1E3063]' : 'text-slate-400'}`}
              >
                <ListIcon className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={() => setShowDesktopSidebar((s) => !s)}
              className="hidden lg:flex p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50"
              title="Toggle filter sidebar"
            >
              {showDesktopSidebar ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setShowMobileFilterDrawer(true)}
              className="lg:hidden flex items-center gap-1.5 p-2 border border-slate-200 rounded-lg text-slate-600 text-xs font-semibold"
            >
              <Filter className="w-3.5 h-3.5" /> Filters
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="flex items-center gap-1.5 p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 text-xs font-semibold"
                title="Customize Home Page"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Customize Home Page</span>
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setShowAdManager(true)}
                className="flex items-center gap-1.5 p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 text-xs font-semibold"
                title="Manage Ads"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Manage Ads</span>
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setShowHeroEditor(true)}
                className="flex items-center gap-1.5 p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 text-xs font-semibold"
                title="Edit Hero"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Edit Hero</span>
              </button>
            )}
          </div>
        </div>

        {/* 6. MARKET BODY: SIDEBAR + RESULTS GRID */}
        <div className={`grid ${showDesktopSidebar ? 'lg:grid-cols-[266px_1fr]' : 'lg:grid-cols-1'} gap-6 items-start`}>
          {/* SIDEBAR */}
          {showDesktopSidebar && (
          <aside className="hidden lg:block bg-white border border-slate-200 rounded-2xl p-5 sticky top-20">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-sm font-bold text-[#1E3063]">Filter Vehicles</h3>
              <button onClick={resetFilters} className="text-[11px] font-semibold text-[#C85A32] hover:underline">Reset</button>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Make</label>
              <select value={selectedMake} onChange={(e) => { setSelectedMake(e.target.value); setSelectedModel('All'); }} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F5F2EB]/40">
                {makes.map((m) => <option key={m} value={m}>{m === 'All' ? 'All Makes' : m}</option>)}
              </select>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Model</label>
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F5F2EB]/40">
                {models.map((m) => <option key={m} value={m}>{m === 'All' ? 'All Models' : m}</option>)}
              </select>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Price Range · {formatPriceM(maxPrice)}</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice || ''}
                  onChange={(e) => setMinPrice(Number(e.target.value) || 0)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-mono"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice === 20000000 ? '' : maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value) || 20000000)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-mono"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[{ label: '< 2.5M', v: 2500000 }, { label: '< 4M', v: 4000000 }, { label: '< 7M', v: 7000000 }, { label: 'All', v: 20000000 }].map((c) => (
                  <button
                    key={c.label}
                    onClick={() => setMaxPrice(c.v)}
                    className={`border rounded-full px-2.5 py-1 text-[10.5px] font-medium ${maxPrice === c.v ? 'border-[#C85A32] bg-[#FBEDE7] text-[#C85A32]' : 'border-slate-200 text-slate-500'}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Year Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder={`Min (2005)`}
                  value={minYear === 2005 ? '' : minYear}
                  onChange={(e) => setMinYear(Number(e.target.value) || 2005)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-mono"
                />
                <input
                  type="number"
                  placeholder={`Max (2026)`}
                  value={maxYear === 2026 ? '' : maxYear}
                  onChange={(e) => setMaxYear(Number(e.target.value) || 2026)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-mono"
                />
              </div>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Body Style</label>
              <select value={selectedBodyStyle} onChange={(e) => setSelectedBodyStyle(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F5F2EB]/40">
                {bodyStyles.map((b) => <option key={b} value={b}>{b === 'All' ? 'All Body Styles' : b}</option>)}
              </select>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Fuel Type</label>
              <select value={selectedFuel} onChange={(e) => setSelectedFuel(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F5F2EB]/40">
                {fuelTypes.map((f) => <option key={f} value={f}>{f === 'All' ? 'All Fuel Types' : f}</option>)}
              </select>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Transmission</label>
              <select value={selectedTransmission} onChange={(e) => setSelectedTransmission(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F5F2EB]/40">
                {transmissionOptions.map((t) => <option key={t} value={t}>{t === 'All' ? 'All Transmissions' : t}</option>)}
              </select>
            </div>

            <div className="border-b border-slate-100 py-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Seller Type</label>
              <select value={selectedSellerType} onChange={(e) => setSelectedSellerType(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-[#F5F2EB]/40">
                {sellerTypeOptions.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Sellers' : s}</option>)}
              </select>
            </div>

            <button onClick={resetFilters} className="w-full bg-[#1E3063] hover:bg-[#17244B] text-white font-bold text-xs rounded-lg py-2.5 mt-3">
              Apply Filters
            </button>

            {sidebarAds.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                {sidebarAds.map((slot) => (
                  <a
                    key={slot.id}
                    href={slot.buttonUrl || undefined}
                    className="block rounded-xl p-3.5 space-y-1.5"
                    style={{ backgroundColor: slot.backgroundColor, color: slot.textColor, opacity: slot.opacity / 100 }}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-70">Advertisement</span>
                    <h5 className="text-xs font-bold leading-snug">{slot.title}</h5>
                    {slot.tagline && <p className="text-[10.5px] opacity-85 leading-snug">{slot.tagline}</p>}
                    {slot.buttonText && <span className="text-[10.5px] font-bold underline underline-offset-2">{slot.buttonText}</span>}
                  </a>
                ))}
              </div>
            )}
          </aside>
          )}

          {/* RESULTS */}
          <div className="min-h-[400px]">
            {isLoading ? (
              <SkeletonGrid count={pageSize} />
            ) : (loadError || serverError) ? (
              <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
                <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-[#1E3063] mb-1">Couldn't load vehicles</h4>
                <p className="text-xs text-slate-500 mb-4">{loadError || serverError}</p>
                {onRetryLoad && !serverError && (
                  <button onClick={onRetryLoad} className="bg-[#1E3063] text-white text-xs font-bold rounded-lg px-4 py-2">
                    Try Again
                  </button>
                )}
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-[#1E3063] mb-1">No vehicles match your filters</h4>
                <p className="text-xs text-slate-500 mb-4">Try widening your price range or clearing a filter to see more results.</p>
                <button onClick={resetFilters} className="bg-[#1E3063] text-white text-xs font-bold rounded-lg px-4 py-2">
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className={viewMode === 'grid'
                ? `grid grid-cols-1 sm:grid-cols-2 ${showDesktopSidebar ? 'xl:grid-cols-3' : 'xl:grid-cols-4'} gap-4`
                : 'flex flex-col gap-3'
              }>
                {onlyAuction === false && paginatedVehicles.some((v) => v.isAuction) === false && filteredVehicles.some((v) => v.isAuction) && viewMode === 'grid' && (
                  <div className="bg-gradient-to-br from-[#1E3063] to-[#17244B] rounded-2xl text-white p-5 flex flex-col relative overflow-hidden">
                    <span className="self-start bg-rose-600 text-[10px] font-bold px-2.5 py-1 rounded-md mb-3">🔴 LIVE</span>
                    <h3 className="text-lg font-bold mb-2">Live Vehicle Auctions</h3>
                    <p className="text-xs text-slate-300 mb-4">Bid on quality vehicles from trusted, verified sellers across East Africa.</p>
                    <button onClick={() => onNavigate('discovery')} className="self-start bg-[#C85A32] hover:bg-[#B34E29] text-white text-xs font-bold px-4 py-2 rounded-lg mt-auto">
                      View Auctions →
                    </button>
                  </div>
                )}
                {gridItemsWithSponsors.map((item, idx) => {
                  if (item.type === 'sponsor') {
                    return <MarketingCard key={`sponsor-${idx}`} data={item.sponsor} />;
                  }
                  const v = item.vehicle;
                  const isSaved = savedVehicles.includes(v.id);
                  const ribbon = v.inspectionPassed
                    ? { label: 'Report Available', cls: 'bg-emerald-600' }
                    : v.isAuction
                    ? { label: '🔴 Live Auction', cls: 'bg-rose-600' }
                    : v.badge
                    ? { label: `★ ${v.badge}`, cls: 'bg-[#1E3063]' }
                    : null;
                  return (
                    <div
                      key={v.id}
                      className={`bg-white border border-slate-200 rounded-2xl overflow-hidden flex hover:shadow-lg hover:-translate-y-0.5 transition-all ${viewMode === 'list' ? 'flex-row' : 'flex-col'}`}
                    >
                      <div className={`relative bg-gradient-to-br from-slate-200 to-slate-300 shrink-0 ${viewMode === 'list' ? 'w-56' : 'h-40'}`}>
                        {v.images?.[0] && (
                          <img src={v.images[0]} alt={v.title} className="w-full h-full object-cover" />
                        )}
                        {ribbon && (
                          <span className={`absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-1 rounded-md text-white ${ribbon.cls}`}>
                            {ribbon.label}
                          </span>
                        )}
                        <button
                          onClick={() => onToggleSave(v.id)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center"
                          title={isSaved ? 'Remove from saved' : 'Save vehicle'}
                        >
                          {isSaved ? '♥' : '♡'}
                        </button>
                        {v.isAuction && v.currentBid && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/75 text-white text-[10px] font-mono px-2.5 py-1.5 flex justify-between">
                            <span>Current bid: Ksh {(v.currentBid / 1000000).toFixed(2)}M</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3.5 border-t border-slate-100 flex-1 flex flex-col">
                        <h4 className="text-sm font-semibold text-[#1E3063] mb-1">{v.year} {v.make} {v.model}</h4>
                        <div className="font-mono font-bold text-base text-[#1E3063] mb-2">{formatPriceM(v.price)}</div>
                        <div className="flex flex-wrap gap-2.5 text-[11px] text-slate-500 mb-2">
                          <span>{v.mileage.toLocaleString()} km</span>
                          <span>{v.fuelType}</span>
                          <span>{v.transmission}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mb-2">{v.location}</div>
                        {v.inspectionPassed ? (
                          <div className="text-[11px] rounded-lg px-2 py-1.5 mb-2.5 bg-emerald-50 text-emerald-800 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>Inspection report available</span>
                          </div>
                        ) : (
                          <div className="text-[11px] rounded-lg px-2 py-1.5 mb-2.5 bg-slate-100 text-slate-500 flex items-center justify-between">
                            <span>No inspection report yet</span>
                            <button onClick={() => onNavigate('inspections')} className="text-[#C85A32] font-semibold">Request one →</button>
                          </div>
                        )}
                        <button
                          onClick={() => handleVehicleSelect(v)}
                          className="mt-auto w-full text-center border border-slate-200 hover:bg-[#EAF0FD] hover:border-[#EAF0FD] rounded-lg py-2 text-xs font-semibold text-[#1E3063]"
                        >
                          View Details →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* PAGINATION */}
            {serverTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-slate-200 rounded-lg disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-slate-500 font-medium">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-slate-200 rounded-lg disabled:opacity-40"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Right floating ad rail - its own column, never overlapping
            the grid next to it. */}
        <FloatingAdRail placement="right_rail" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* 7. CTA BANDS */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 mt-12 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-[#17244B] to-[#1E3063] text-white p-8 sm:p-10 flex flex-col justify-center gap-4">
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">Buy with more confidence</span>
            <h3 className="text-xl sm:text-2xl font-bold font-display max-w-md">A registered local mechanic inspects it. The report stays on file — for you and every buyer after you.</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Registered mechanic near the vehicle</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Pay the mechanic directly</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Report uploaded to the listing</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Later buyers can unlock it</div>
            </div>
            <button onClick={() => onNavigate('inspections')} className="self-start bg-[#C85A32] hover:bg-[#B34E29] text-white text-sm font-bold px-5 py-2.5 rounded-full mt-1">
              Request an Inspection →
            </button>
          </div>
          <div className="bg-[#F5F2EB] p-8 sm:p-9 flex flex-col justify-center">
            <h4 className="text-lg font-bold text-[#1E3063] mb-2 max-w-xs">Ready to sell your vehicle?</h4>
            <p className="text-xs text-slate-600 mb-4 max-w-xs">Reach verified buyers across East Africa through the KAYAD marketplace and escrow network.</p>
            <button onClick={() => onNavigate('seller-platform')} className="self-start bg-[#1E3063] hover:bg-[#17244B] text-white text-sm font-bold px-5 py-2.5 rounded-full">
              Sell Your Vehicle →
            </button>
          </div>
        </div>
      </div>

      {/* 8. FLOATING COMPARISON TRAY */}
      {comparedVehicles.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[#1E3063] text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4">
          <ArrowRightLeft className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold">{comparedVehicles.length} vehicle{comparedVehicles.length > 1 ? 's' : ''} selected to compare</span>
          <button onClick={onOpenCompareModal} className="bg-[#C85A32] text-white text-xs font-bold px-3 py-1.5 rounded-lg">
            Compare Now
          </button>
        </div>
      )}

      {/* MOBILE FULL-SCREEN FILTER DRAWER */}
      {showMobileFilterDrawer && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto lg:hidden">
          <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1E3063]">Filter Vehicles</h3>
            <button onClick={() => setShowMobileFilterDrawer(false)} className="p-1.5">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Make</label>
              <select value={selectedMake} onChange={(e) => { setSelectedMake(e.target.value); setSelectedModel('All'); }} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
                {makes.map((m) => <option key={m} value={m}>{m === 'All' ? 'All Makes' : m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Body Style</label>
              <select value={selectedBodyStyle} onChange={(e) => setSelectedBodyStyle(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
                {bodyStyles.map((b) => <option key={b} value={b}>{b === 'All' ? 'All Body Styles' : b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Fuel Type</label>
              <select value={selectedFuel} onChange={(e) => setSelectedFuel(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
                {fuelTypes.map((f) => <option key={f} value={f}>{f === 'All' ? 'All Fuel Types' : f}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2.5 pt-2">
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={onlyAuction} onChange={(e) => setOnlyAuction(e.target.checked)} className="accent-[#C85A32] w-4 h-4" /> Live Auction Listings</label>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={resetFilters} className="flex-1 border border-slate-200 rounded-lg py-2.5 text-xs font-bold text-slate-600">Reset</button>
              <button onClick={() => setShowMobileFilterDrawer(false)} className="flex-1 bg-[#1E3063] text-white rounded-lg py-2.5 text-xs font-bold">Show Results</button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && showAdminPanel && (
        <HomePageAdminPanel
          config={homeConfig}
          onUpdate={updateHomeConfig}
          onReset={resetHomeConfig}
          onClose={() => setShowAdminPanel(false)}
          adminUser={{ id: user!.id, name: user!.name }}
        />
      )}

      {isAdmin && showAdManager && (
        <AdManagerPanel onClose={() => setShowAdManager(false)} />
      )}

      {isAdmin && showHeroEditor && (
        <HeroEditorPanel onClose={() => { setShowHeroEditor(false); getVisibleHeroSlides().then((data) => { if (data.length > 0) setHeroSlides(data); }).catch(() => {}); }} />
      )}
    </div>
  );
};

export default VehicleMarketplace;
