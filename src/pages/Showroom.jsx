// ─────────────────────────────────────────────────────────────────────────
// Premium Showroom — unified command bar.
//
// Architecture rewrite (from the previous 720-line page):
//
//   • SINGLE source of truth for every filter: URL search params.
//     Components subscribe via `useSearchParams`; mutations write back via
//     `setSearchParams`. No duplicated local state for category / brand /
//     sort etc. — they were desyncing in the old layout.
//
//   • ONE search input that actually works. The previous one navigated
//     to `?search=…` but `getApiParams` ignored the param entirely and
//     the backend expected `keyword` anyway. Fixed: typing is debounced
//     by 300 ms, written to URL as `?keyword=…`, and the API request
//     carries it through.
//
//   • ONE row of category pills (All / Auction / Buy Now / Sold).
//     The old page had this same row inside SearchBar AND below it
//     ("filter chips"), each driving a different state.
//
//   • Sticky command bar with backdrop blur — search + pills + sort +
//     view toggle + filter button live on one editorial line.
//
//   • Active-filter strip is its own band, only mounted when at least
//     one filter is set. Each chip carries an × to remove that filter
//     individually; "Save" and "Clear all" sit on the right.
//
//   • Saved searches collapsed into a dropdown anchored to a "Saved"
//     button, instead of a separate full-width panel.
//
//   • Sidebar visible from the medium breakpoint up; below that it
//     becomes a left-side bottom sheet triggered by the filter button.
// ─────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  LayoutGrid, List, Bookmark, Bell, BellOff, Trash2, X,
  Loader, SlidersHorizontal, ChevronDown, RefreshCw, AlertTriangle,
} from 'lucide-react';

import { carsAPI, savedSearchAPI } from '../api/api';
import CartyGrid from '../components/CartyGrid';
import SearchBar from '../components/SearchBar';
import SearchSidebar from '../components/SearchSidebar';
import usePageMeta from '../hooks/usePageMeta';
import useMediaQuery from '../hooks/useMediaQuery';
import useIntersectionObserver from '../hooks/useIntersectionObserver';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { ItemListStructuredData, BreadcrumbStructuredData } from '../components/SeoStructuredData';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import ShowroomEmptyState from './showroom/components/ShowroomEmptyState';
import '../styles/showroom.css';

// ─── Constants ───────────────────────────────────────────────────────────
const CATEGORY_PILLS = [
  { value: 'all',     label: 'All' },
  { value: 'auction', label: 'Auctions' },
  { value: 'fixed',   label: 'Buy Now' },
  { value: 'sold',    label: 'Sold' },
];

const SORT_OPTIONS = [
  { value: 'default',       label: 'Curated' },
  { value: 'newest',        label: 'Newest first' },
  { value: 'ending_soon',   label: 'Ending soonest' },
  { value: 'price_asc',     label: 'Price ↑' },
  { value: 'price_desc',    label: 'Price ↓' },
  { value: 'views_desc',    label: 'Most viewed' },
];

const FILTER_LABELS = {
  brand: 'Make',
  location: 'Location',
  priceMin: 'Min Price',
  priceMax: 'Max Price',
  yearMin: 'Min Year',
  yearMax: 'Max Year',
  body: 'Body',
  fuel: 'Fuel',
  transmission: 'Transmission',
  color: 'Color',
  condition: 'Condition',
  mileageMin: 'Min Mileage',
  mileageMax: 'Max Mileage',
  keyword: 'Search',
};

const ALL_FILTER_KEYS = [
  'filter', 'keyword', 'brand', 'location',
  'priceMin', 'priceMax', 'yearMin', 'yearMax',
  'body', 'fuel', 'transmission', 'color', 'condition',
  'mileageMin', 'mileageMax', 'dealerType',
];

// ─── Component ───────────────────────────────────────────────────────────
export default function Showroom() {
  usePageMeta(
    'Browse Cars',
    'Browse premium cars for sale in Kenya. Filter by make, model, price, body, fuel — every listing escrow-backed on Kayad.'
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const gridCols = 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))';

  // ─── Local UI state ────────────────────────────────────────────────────
  const [cars, setCars]                 = useState([]);
  const [loading, setLoading]           = useState(true);
  const [page, setPage]                 = useState(1);
  const [hasMore, setHasMore]           = useState(false);
  const [totalCount, setTotalCount]     = useState(0);
  const [viewMode, setViewMode]         = useState('grid');
  const [sortBy, setSortBy]             = useState('default');
  const [sentinelRef, sentinelEntry]    = useIntersectionObserver();
  const loadingRef                      = useRef(false);

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [savedSearches, setSavedSearches]       = useState([]);
  const [showSavedMenu, setShowSavedMenu]       = useState(false);
  const [showSavePrompt, setShowSavePrompt]     = useState(false);
  const [saveName, setSaveName]                 = useState('');
  const [showroomError, setShowroomError]       = useState(null);

  // Local mirror of the keyword for snappy typing; debounced before going to URL.
  const [keywordInput, setKeywordInput] = useState(searchParams.get('keyword') || '');
  const debouncedKeyword = useDebouncedValue(keywordInput, 150);

  const socket    = useSocket();
  const { toast } = useToast();

  // ─── Realtime: keep showroom listings live ─────────────────────────────
  useEffect(() => {
    if (!socket) return;
    socket.joinShowroom?.();
    const unsub = socket.on?.('listingUpdate', data => {
      if (!data?.carId) return;
      setCars(prev => prev.map(c => (c._id === data.carId ? { ...c, ...data } : c)));
    });
    return () => { socket.leaveShowroom?.(); unsub?.(); };
  }, [socket]);

  // ─── Load user's saved searches once ──────────────────────────────────
  useEffect(() => {
    savedSearchAPI.list?.()
      .then(r => setSavedSearches(r.searches || []))
      .catch(() => setSavedSearches([]));
  }, []);

  // ─── URL ⇄ Filter state ───────────────────────────────────────────────
  const filters = useMemo(() => ({
    filter:        searchParams.get('filter')        || 'all',
    keyword:       searchParams.get('keyword')       || '',
    brand:         searchParams.get('brand')         || '',
    location:      searchParams.get('location')      || '',
    priceMin:      searchParams.get('priceMin')      || '',
    priceMax:      searchParams.get('priceMax')      || '',
    yearMin:       searchParams.get('yearMin')       || '',
    yearMax:       searchParams.get('yearMax')       || '',
    body:          searchParams.get('body')          || '',
    fuel:          searchParams.get('fuel')          || '',
    transmission:  searchParams.get('transmission')  || '',
    color:         searchParams.get('color')         || '',
    condition:     searchParams.get('condition')     || '',
    mileageMin:    searchParams.get('mileageMin')    || '',
    mileageMax:    searchParams.get('mileageMax')    || '',
  }), [searchParams]);

  const activeFilter  = filters.filter;
  const brandFilter   = filters.brand;
  const activeFilters = useMemo(
    () => Object.entries(filters).filter(([k, v]) => k !== 'filter' && v),
    [filters]
  );
  const anyFilterActive = activeFilters.length > 0;

  // Push debounced keyword into URL.
  useEffect(() => {
    if (debouncedKeyword === filters.keyword) return;
    const next = new URLSearchParams(searchParams);
    if (debouncedKeyword) next.set('keyword', debouncedKeyword);
    else next.delete('keyword');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword]);

  // Keep the input mirror in sync when the URL changes externally (back/forward, saved-search restore).
  useEffect(() => {
    const k = searchParams.get('keyword') || '';
    if (k !== keywordInput) setKeywordInput(k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ─── Filter mutations ─────────────────────────────────────────────────
  const onFilterChange = useCallback((type, value) => {
    const next = new URLSearchParams(searchParams);
    if (type === 'clear') {
      ALL_FILTER_KEYS.forEach(k => next.delete(k));
      setKeywordInput('');
      setShowroomError(null);
    } else if (type === 'category') {
      if (value === 'all') next.delete('filter');
      else                 next.set('filter', value);
    } else if (type === 'priceRange') {
      const [min, max] = value.split('-');
      next.set('priceMin', min); next.set('priceMax', max);
    } else {
      if (!value) next.delete(type);
      else        next.set(type, value);
    }
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const onBrandChange = useCallback(brand => {
    const next = new URLSearchParams(searchParams);
    if (!brand || brand === 'All') next.delete('brand');
    else                            next.set('brand', brand);
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  // ─── API call ─────────────────────────────────────────────────────────
  const getApiParams = useCallback(p => ({
    page: p,
    limit: 12,
    keyword:      filters.keyword     || undefined,
    brand:        brandFilter         || undefined,
    city:         filters.location    || undefined,
    minPrice:     filters.priceMin    || undefined,
    maxPrice:     filters.priceMax    || undefined,
    yearMin:      filters.yearMin     || undefined,
    yearMax:      filters.yearMax     || undefined,
    body:         filters.body        || undefined,
    fuel:         filters.fuel        || undefined,
    transmission: filters.transmission|| undefined,
    color:        filters.color       || undefined,
    condition:    filters.condition   || undefined,
    mileageMin:   filters.mileageMin  || undefined,
    mileageMax:   filters.mileageMax  || undefined,
    dealerType:   filters.dealerType  || undefined,
    category:     activeFilter === 'all' ? undefined : activeFilter,
    sort:         sortBy === 'default' ? undefined : sortBy,
  }), [filters, brandFilter, activeFilter, sortBy]);

  const loadCars = useCallback(async (pageNum, replace) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const data = await carsAPI.list(getApiParams(pageNum));
      const newCars = data.data || data.cars || [];
      if (replace && (!newCars || newCars.length === 0)) {
        setCars([]);
        setTotalCount(0);
        setHasMore(false);
        setShowroomError(null);
      } else {
        setCars(prev => (replace ? newCars : [...prev, ...newCars]));
        setTotalCount(data.pagination?.total || 0);
        setHasMore(pageNum < (data.pagination?.pages || 1));
        setShowroomError(null);
      }
    } catch (error) {
      console.error('Failed to load cars:', error);
      
      let errorMessage = 'Could not load vehicles. Please try again.';
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required. Please sign in.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Service unavailable.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      toast(errorMessage, 'error');
      if (replace) {
        setCars([]);
        setTotalCount(0);
        setHasMore(false);
        setShowroomError(errorMessage);
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [getApiParams, toast]);

  useEffect(() => { setPage(1); loadCars(1, true); }, [filters, sortBy, loadCars]);
  useEffect(() => { if (page > 1) loadCars(page, false); }, [page, loadCars]);

  // Infinite scroll
  useEffect(() => {
    if (sentinelEntry?.isIntersecting && hasMore && !loading) setPage(p => p + 1);
  }, [sentinelEntry, hasMore, loading]);

  // Close saved menu on outside click
  useEffect(() => {
    if (!showSavedMenu) return;
    const handleClick = () => setShowSavedMenu(false);
    document.addEventListener('click', handleClick, { once: true });
    return () => document.removeEventListener('click', handleClick);
  }, [showSavedMenu]);

  // ─── Saved searches actions ───────────────────────────────────────────
  const handleSaveSearch = async () => {
    if (!saveName.trim()) { toast('Give the search a name', 'error'); return; }
    try {
      const filtersPayload = Object.fromEntries(searchParams.entries());
      const res = await savedSearchAPI.create({
        name: saveName.trim(),
        filters: filtersPayload,
        notifyOnNewMatch: true,
      });
      setSavedSearches(prev => [res.search || res.savedSearch || res, ...prev]);
      setShowSavePrompt(false);
      setSaveName('');
      toast('✓ Saved', 'success');
    } catch (error) {
      console.error('Failed to save search:', error);
      toast('Failed to save', 'error');
    }
  };

  const handleRestoreSavedSearch = saved => {
    const params = new URLSearchParams(saved.query || '');
    if (!saved.query && saved.filters && typeof saved.filters === 'object') {
      Object.entries(saved.filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && String(val).length > 0) {
          params.set(key, String(val));
        }
      });
    }
    setSearchParams(params);
    setShowSavedMenu(false);
  };

  const handleToggleAlert = async saved => {
    try {
      const nextNotify = !(saved.notify ?? saved.alertsEnabled);
      const updated = await savedSearchAPI.toggleAlerts(saved._id, nextNotify);
      setSavedSearches(prev => prev.map(s => (s._id === saved._id ? updated.search || updated.savedSearch || updated : s)));
    } catch { toast('Could not toggle alerts', 'error'); }
  };

  const handleDeleteSaved = async saved => {
    if (!window.confirm(`Delete "${saved.name}"?`)) return;
    try {
      await savedSearchAPI.remove(saved._id);
      setSavedSearches(prev => prev.filter(s => s._id !== saved._id));
    } catch { toast('Could not delete', 'error'); }
  };

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <>
      <ItemListStructuredData items={cars} />
      <BreadcrumbStructuredData items={[
        { name: 'Home', url: '/' },
        { name: 'Showroom', url: '/showroom' },
      ]} />

      <div className="showroom-page">
        {/* ── Editorial hero ─────────────────────────────────────────── */}
        <section className={`showroom-hero ${isMobile ? 'showroom-hero-mobile' : 'showroom-hero-desktop'}`}>
          <div className="showroom-hero-hairline" />
          <div className="container showroom-hero-inner">
            <div className="showroom-hero-overline">Kenya's Premium Automotive Gallery</div>
            <h1 className="showroom-hero-title">The Gallery</h1>
            <p className="showroom-hero-sub">
              Curated listings, transparent pricing, escrow-backed transactions.
              Every vehicle independently verifiable.
            </p>
          </div>
        </section>

        {/* ── Sticky command bar ──────────────────────────────────────── */}
        <div className="command-bar">
          <div className={`container ${isMobile ? 'command-bar-inner-mobile' : 'command-bar-inner-desktop'}`}>
            {/* Search */}
            <div className={`command-bar-search ${isMobile ? 'command-bar-search-mobile' : ''}`}>
              <SearchBar
                value={keywordInput}
                onChange={setKeywordInput}
                size="sm"
                placeholder="Search make, model, keyword…"
                style={{ minHeight: isMobile ? '44px' : '40px' }}
              />
            </div>

            {/* Category pills */}
            <div
              role="tablist"
              aria-label="Listing category"
              className={`category-pills ${isMobile ? 'category-pills-mobile' : 'category-pills-desktop'}`}
            >
              {CATEGORY_PILLS.map(c => {
                const isActive = activeFilter === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => onFilterChange('category', c.value)}
                    className={`pill-btn ${isMobile ? 'pill-btn-mobile' : 'pill-btn-desktop'} ${isActive ? 'pill-btn-active' : 'pill-btn-inactive'}`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            {/* Right rail */}
            <div className={`command-rail ${isMobile ? 'command-rail-mobile' : 'command-rail-desktop'}`}>
              {/* Sort */}
              <div className="sort-wrap">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  aria-label="Sort results"
                  className={`sort-select ${isMobile ? 'sort-select-mobile' : 'sort-select-desktop'}`}
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value} style={{ background: '#0c0c0c' }}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="sort-chevron" />
              </div>

              {/* View toggle */}
              <div role="group" aria-label="Layout" className="view-toggle">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                  className={`view-btn ${isMobile ? 'view-btn-mobile' : 'view-btn-desktop'} ${viewMode === 'grid' ? 'view-btn-active' : 'view-btn-inactive'}`}
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                  className={`view-btn ${isMobile ? 'view-btn-mobile' : 'view-btn-desktop'} ${viewMode === 'list' ? 'view-btn-active' : 'view-btn-inactive'}`}
                >
                  <List size={14} />
                </button>
              </div>

              {/* Filter button — mobile only */}
              {isMobile && (
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(true)}
                  className={`filter-btn-mobile ${anyFilterActive ? 'filter-btn-mobile-active' : 'filter-btn-mobile-inactive'}`}
                >
                  <SlidersHorizontal size={13} />
                  Filter{anyFilterActive ? ` · ${activeFilters.length}` : ''}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Active-filter band ──────────────────────────────────────── */}
        {(anyFilterActive || savedSearches.length > 0) && (
          <div className={`container filter-band ${isMobile ? 'filter-band-mobile' : 'filter-band-desktop'}`}>
            <div className="filter-band-result-count">
              {loading && cars.length === 0 ? '…' : `${totalCount.toLocaleString()} ${totalCount === 1 ? 'vehicle' : 'vehicles'}`}
            </div>

            {/* Filter chips */}
            {activeFilters.map(([key, value]) => (
              <span key={key} className="filter-chip">
                <span className="filter-chip-label">{FILTER_LABELS[key] || key}</span>
                <span>{value}</span>
                <button
                  type="button"
                  onClick={() => onFilterChange(key, '')}
                  aria-label={`Remove ${FILTER_LABELS[key] || key} filter`}
                  className="filter-chip-remove"
                >
                  <X size={11} />
                </button>
              </span>
            ))}

            {/* Right cluster */}
            <div className="filter-band-right">
              {anyFilterActive && (
                <button type="button" onClick={() => setShowSavePrompt(true)} className="filter-band-btn btn-save">
                  <Bookmark size={12} /> Save
                </button>
              )}

              {savedSearches.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowSavedMenu(p => !p)}
                    aria-expanded={showSavedMenu}
                    aria-haspopup="menu"
                    className={`${showSavedMenu ? 'btn-saved-active' : 'btn-saved-inactive'}`}
                  >
                    Saved · {savedSearches.length}
                    <ChevronDown size={11} style={{ transform: showSavedMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                  </button>

                  {showSavedMenu && (
                    <div role="menu" className="saved-menu">
                      {savedSearches.map(s => (
                        <div key={s._id} className="saved-menu-item">
                          <button type="button" onClick={() => handleRestoreSavedSearch(s)} className="saved-menu-restore">
                            {s.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleAlert(s)}
                            aria-label={(s.notify ?? s.alertsEnabled) ? 'Disable alerts' : 'Enable alerts'}
                            className={`saved-menu-action ${(s.notify ?? s.alertsEnabled) ? 'saved-menu-alert-on' : 'saved-menu-alert-off'}`}
                          >
                            {(s.notify ?? s.alertsEnabled) ? <Bell size={13} /> : <BellOff size={13} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSaved(s)}
                            aria-label="Delete saved search"
                            className="saved-menu-action saved-menu-delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {anyFilterActive && (
                <button type="button" onClick={() => onFilterChange('clear')} className="btn-clear">
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Save-search prompt ────────────────────────────────────── */}
        {showSavePrompt && (
          <div className={`container ${isMobile ? 'save-prompt-wrap-mobile' : 'save-prompt-wrap'}`}>
            <div className="save-prompt-card">
              <Bookmark size={14} className="save-prompt-icon" />
              <input
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                placeholder="Name this search…"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleSaveSearch(); }}
                className="save-prompt-input"
              />
              <button type="button" onClick={handleSaveSearch} className="btn btn-gold btn-sm">Save</button>
              <button type="button" onClick={() => { setShowSavePrompt(false); setSaveName(''); }} className="save-prompt-cancel">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Body: sidebar + grid ─────────────────────────────────── */}
        <div className={`showroom-body ${isMobile ? 'showroom-body-mobile' : 'showroom-body-desktop'}`}>
          {/* Desktop sidebar */}
          {!isMobile && (
            <aside className="showroom-sidebar-desktop">
              <SearchSidebar
                cars={cars}
                filters={filters}
                onFilterChange={onFilterChange}
                onBrandChange={onBrandChange}
                activeBrand={filters.brand}
              />
            </aside>
          )}

          {/* Mobile filter drawer */}
          {isMobile && mobileFilterOpen && (
            <>
              <div role="presentation" onClick={() => setMobileFilterOpen(false)} className="mobile-filter-overlay" />
              <div className="mobile-filter-drawer">
                <SearchSidebar
                  cars={cars}
                  filters={filters}
                  onFilterChange={onFilterChange}
                  onBrandChange={onBrandChange}
                  activeBrand={filters.brand}
                  isMobile
                  onClose={() => setMobileFilterOpen(false)}
                />
              </div>
            </>
          )}

          {/* Grid / list area */}
          <main className={`showroom-main ${isMobile ? 'showroom-main-mobile' : 'showroom-main-desktop'}`}>
            <div className={`container showroom-main-inner ${!isMobile ? 'showroom-main-inner-desktop' : ''}`}>
              {/* Loading state */}
              {loading && cars.length === 0 ? (
                <div className={`showroom-skeleton ${isMobile ? 'showroom-skeleton-mobile' : ''}`}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="skeleton-thumbnail skeleton" style={{ borderRadius: 14, minHeight: 180 }} />
                  ))}
                </div>
              ) : showroomError && cars.length === 0 ? (
                <div className="showroom-error-state">
                  <div className="empty-state-icon" style={{ opacity: 0.35, margin: '0 auto 20px' }}>
                    <AlertTriangle size={48} strokeWidth={1.2} />
                  </div>
                  <h3 className="empty-state-title">{showroomError}</h3>
                  <p className="empty-state-text" style={{ marginBottom: 16 }}>
                    You can try again or adjust your filters.
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button type="button" onClick={() => { loadCars(1, true); setShowroomError(null); }} className="btn btn-gold btn-sm">
                      <RefreshCw size={14} style={{ marginRight: 6 }} /> Retry
                    </button>
                    <button type="button" onClick={() => onFilterChange('clear')} className="btn btn-soft btn-sm">
                      Clear Filters
                    </button>
                  </div>
                </div>
              ) : cars.length === 0 && !loading ? (
                <ShowroomEmptyState onClear={() => onFilterChange('clear')} />
              ) : showroomError ? (
                <>
                  <div className="showroom-error-banner">
                    <AlertTriangle size={14} />
                    <span>{showroomError}</span>
                    <button type="button" onClick={() => { setShowroomError(null); loadCars(1, true); }} className="showroom-error-dismiss">
                      <RefreshCw size={13} /> Retry
                    </button>
                    <button type="button" onClick={() => setShowroomError(null)} className="showroom-error-dismiss">
                      <X size={13} />
                    </button>
                  </div>
                </>
              ) : viewMode === 'grid' ? (
                <div className={`car-grid ${isMobile ? 'car-grid-mobile' : ''}`}>
                  {cars.map(car => (
                    <div key={car._id}>
                      <CartyGrid car={car} isMobile={isMobile} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="car-list">
                  {cars.map(car => (
                    <div key={car._id}>
                      <CartyGrid car={car} listView isMobile={isMobile} />
                    </div>
                  ))}
                </div>
              )}

              {/* Infinite scroll */}
              {hasMore && (
                <>
                  <div ref={sentinelRef} className="loading-center showroom-sentinel">
                    <div className="spinner" />
                  </div>
                  <div className="showroom-load-more">
                    <button className="btn btn-soft btn-sm" onClick={() => setPage(p => p + 1)}>
                      Load More
                    </button>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}


