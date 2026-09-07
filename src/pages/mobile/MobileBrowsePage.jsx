import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Search, SlidersHorizontal, Grid3X3, List, 
  ChevronDown, X, Clock, MapPin, Calendar,
  Gauge, Fuel, Zap, Filter, ArrowUpDown, Check
} from 'lucide-react';

// Import mobile components
import { 
  MobileBottomNav,
  MobileSearchBar,
  MobileCarousel,
  CarouselItem,
  Section,
  StatsBar,
  VehicleCard,
  MobileCardSkeleton,
  MobileEmptyState,
  MobileFilterDrawer,
  MobileHeroHeader,
} from '../../components/mobile';

import { toast } from '../../components/mobile/MobileToast';
import { carsAPI } from '../../api/api';

const PAGE_SIZE = 8;

const SORTS = [
  { id: 'default', label: 'Best Match' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc', label: 'Price: High to Low' },
  { id: 'year_desc', label: 'Newest First' },
  { id: 'mileage_asc', label: 'Lowest Mileage' },
];

const ACTIVE_FILTERS = [
  { key: 'auctionOnly', label: 'Auctions Only' },
  { key: 'verifiedOnly', label: 'Verified' },
  { key: 'inspectedOnly', label: 'Inspected' },
];

export default function MobileBrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [cars, setCars] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [sortBy, setSortBy] = useState('default');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [filters, setFilters] = useState({
    brand: searchParams.get('brand') || 'All',
    fuel: 'All',
    transmission: 'All',
    bodyType: searchParams.get('bodyType') || 'All',
    condition: 'All',
    yearMin: 'All',
    yearMax: 'All',
    priceMax: 20000000,
    mileageMax: 200000,
    auctionOnly: false,
    verifiedOnly: false,
    inspectedOnly: false,
  });

  // Active filter chips
  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (filters.brand !== 'All') chips.push({ key: 'brand', label: filters.brand });
    if (filters.fuel !== 'All') chips.push({ key: 'fuel', label: filters.fuel });
    if (filters.transmission !== 'All') chips.push({ key: 'transmission', label: filters.transmission });
    if (filters.bodyType !== 'All') chips.push({ key: 'bodyType', label: filters.bodyType });
    if (filters.auctionOnly) chips.push({ key: 'auctionOnly', label: 'Auctions Only' });
    if (filters.verifiedOnly) chips.push({ key: 'verifiedOnly', label: 'Verified' });
    if (filters.inspectedOnly) chips.push({ key: 'inspectedOnly', label: 'Inspected' });
    return chips;
  }, [filters]);

  // Fetch real cars from the backend, matching the pattern already
  // proven on the desktop BrowsePage — no more client-side filtering
  // of a static mock array.
  const sortParam = useMemo(() => ({
    default: undefined,
    price_asc: 'price_asc',
    price_desc: 'price_desc',
    year_desc: 'year_desc',
    mileage_asc: 'mileage_asc',
  }[sortBy]), [sortBy]);

  const requestKeyRef = useRef(0);

  const fetchCars = useCallback(async (pageNum = 1, append = false) => {
    let requestKey = requestKeyRef.current;
    if (pageNum === 1) { setIsLoading(true); requestKeyRef.current++; requestKey = requestKeyRef.current; } else { setIsLoadingMore(true); }
    try {
      const params = {
        search: searchQuery || undefined,
        brand: filters.brand !== 'All' ? filters.brand : undefined,
        fuel: filters.fuel !== 'All' ? filters.fuel : undefined,
        transmission: filters.transmission !== 'All' ? filters.transmission : undefined,
        bodyType: filters.bodyType !== 'All' ? filters.bodyType : undefined,
        auctionOnly: filters.auctionOnly || undefined,
        verifiedOnly: filters.verifiedOnly || undefined,
        inspectedOnly: filters.inspectedOnly || undefined,
        sort: sortParam,
      };
      const data = await carsAPI.listPaginated(params, pageNum, PAGE_SIZE);
      // Drop this response if a newer fetch has started since —
      // otherwise rapid search/filter changes could let an older,
      // slower request overwrite the newer results already shown.
      if (pageNum === 1 && requestKey !== requestKeyRef.current) return;
      const newCars = data.cars || [];
      setCars(prev => append ? [...prev, ...newCars] : newCars);
      setTotal(data.total || newCars.length);
      setHasMore(data.hasMore !== false);
      setPage(pageNum);
    } catch {
      if (pageNum === 1 && requestKey !== requestKeyRef.current) return;
      if (!append) { setCars([]); setTotal(0); }
      setHasMore(false);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [searchQuery, filters, sortParam]);

  useEffect(() => {
    fetchCars(1, false);
  }, [searchQuery, filters, sortParam]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !hasMore || isLoading) return;
    fetchCars(page + 1, true);
  }, [isLoadingMore, hasMore, isLoading, page, fetchCars]);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const handleRemoveFilter = useCallback((key) => {
    if (key === 'brand') setFilters(p => ({ ...p, brand: 'All' }));
    else if (key === 'fuel') setFilters(p => ({ ...p, fuel: 'All' }));
    else if (key === 'transmission') setFilters(p => ({ ...p, transmission: 'All' }));
    else if (key === 'bodyType') setFilters(p => ({ ...p, bodyType: 'All' }));
    else setFilters(p => ({ ...p, [key]: false }));
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setFilters({
      brand: 'All',
      fuel: 'All',
      transmission: 'All',
      bodyType: 'All',
      condition: 'All',
      yearMin: 'All',
      yearMax: 'All',
      priceMax: 20000000,
      mileageMax: 200000,
      auctionOnly: false,
      verifiedOnly: false,
      inspectedOnly: false,
    });
    setSearchQuery('');
  }, []);

  const handleFavorite = useCallback((car, isFavorite) => {
    toast.success(isFavorite ? 'Added to favorites' : 'Removed from favorites');
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = document.getElementById('load-more-sentinel');
    if (sentinel) observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, handleLoadMore]);

  return (
    <div className="mobile-viewport">
      {/* Header */}
      <header className="mobile-page__header" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{
          padding: '12px 16px',
          background: 'rgba(7, 9, 12, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
        }}>
          {/* Search row */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <MobileSearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmit={handleSearch}
                placeholder="Search vehicles..."
                showVoice={false}
              />
            </div>
            <button
              onClick={() => setFilterDrawerOpen(true)}
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: activeFilterChips.length > 0 ? 'var(--gold-100)' : 'var(--surface)',
                border: `1px solid ${activeFilterChips.length > 0 ? 'var(--gold-400)' : 'var(--border)'}`,
                color: activeFilterChips.length > 0 ? 'var(--gold-400)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
              }}
              aria-label="Open filters"
            >
              <SlidersHorizontal size={20} />
              {activeFilterChips.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  background: 'var(--gold-500)',
                  color: 'black',
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {activeFilterChips.length}
                </span>
              )}
            </button>
          </div>

          {/* Sort and view controls */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginTop: 12,
          }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {isLoading ? 'Loading...' : `${total} vehicles`}
            </div>
            
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Sort dropdown */}
              <div style={{ position: 'relative' }}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    appearance: 'none',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '8px 32px 8px 12px',
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {SORTS.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
                <ChevronDown 
                  size={14} 
                  style={{ 
                    position: 'absolute', 
                    right: 10, 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }} 
                />
              </div>

              {/* View toggle */}
              <div style={{
                display: 'flex',
                background: 'var(--surface)',
                borderRadius: 8,
                padding: 4,
              }}>
                <button
                  onClick={() => setViewMode('grid')}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    border: 'none',
                    background: viewMode === 'grid' ? 'var(--gold-500)' : 'transparent',
                    color: viewMode === 'grid' ? 'black' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label="Grid view"
                >
                  <Grid3X3 size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    border: 'none',
                    background: viewMode === 'list' ? 'var(--gold-500)' : 'transparent',
                    color: viewMode === 'list' ? 'black' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label="List view"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Active filters */}
          {activeFilterChips.length > 0 && (
            <div style={{
              display: 'flex',
              gap: 8,
              marginTop: 12,
              flexWrap: 'wrap',
            }}>
              {activeFilterChips.map(chip => (
                <button
                  key={chip.key}
                  onClick={() => handleRemoveFilter(chip.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    background: 'var(--gold-100)',
                    border: '1px solid var(--gold-400)',
                    borderRadius: 20,
                    color: 'var(--gold-400)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {chip.label}
                  <X size={14} />
                </button>
              ))}
              <button
                onClick={handleClearAllFilters}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <div 
        className="mobile-scroll-container"
        style={{ 
          flex: 1,
          paddingTop: 'var(--mobile-space-4)',
          paddingBottom: 'calc(var(--bottom-nav-height) + var(--safe-area-bottom) + 20px)',
        }}
      >
        {isLoading ? (
          // Loading skeleton
          <div className={viewMode === 'grid' ? 'mobile-card-grid' : 'mobile-list-skeleton'}>
            {Array.from({ length: 6 }).map((_, i) => (
              <MobileCardSkeleton key={i} />
            ))}
          </div>
        ) : cars.length === 0 ? (
          // Empty state
          <MobileEmptyState
            template="search"
            onAction={handleClearAllFilters}
          />
        ) : (
          // Car grid/list
          <>
            <div 
              className={viewMode === 'grid' ? 'mobile-card-grid' : 'mobile-list-view'}
              style={viewMode === 'list' ? { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 } : {}}
            >
              {cars.map((car, i) => (
                <div 
                  key={car._id}
                  className="mobile-list-item"
                  style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}
                >
                  <VehicleCard car={car} variant="horizontal" onSave={handleFavorite} />
                </div>
              ))}
            </div>

            {/* Load more sentinel */}
            {hasMore && (
              <div 
                id="load-more-sentinel"
                style={{ 
                  padding: 24, 
                  textAlign: 'center',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                {isLoadingMore && (
                  <div className="mobile-pull-refresh__spinner" />
                )}
              </div>
            )}

            {/* End of results */}
            {!hasMore && cars.length > 0 && (
              <div style={{ 
                padding: 24, 
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 13,
              }}>
                You've seen all {cars.length} vehicles
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <MobileBottomNav />

      {/* Filter Drawer */}
      <MobileFilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        filters={filters}
        onFilterChange={setFilters}
        onApply={(f) => setFilters(f)}
        onReset={handleClearAllFilters}
      />
    </div>
  );
}
