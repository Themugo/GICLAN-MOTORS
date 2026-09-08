import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, ChevronRight, TrendingUp, Clock,
  Shield, Zap, Car, ArrowRight, Bell, Plus,
  MapPin, Star, Award, Users
} from 'lucide-react';

// Import mobile components
import {
  MobileBottomNav,
  MobileSearchBar,
  MobileCarousel,
  CarouselItem,
  MobilePage,
  Section,
  StatsBar,
  VehicleCard,
  MobileCardSkeleton,
  MobileEmptyState,
  MobileFilterDrawer,
  MobileHeroHeader,
} from '../../components/mobile';

import { toast } from '../../components/mobile/MobileToast';

// Demo data
const FEATURED_CARS = [
  {
    _id: '1',
    title: 'Toyota Land Cruiser V8',
    price: 18500000,
    year: 2023,
    mileage: 12000,
    fuel: 'Petrol',
    transmission: 'Automatic',
    location: { city: 'Nairobi' },
    image: 'https://images.pexels.com/photos/3593922/pexels-photo-3593922.jpeg?auto=compress&cs=tinysrgb&w=800',
    isAuction: true,
    auction_status: 'live',
    verified: true,
  },
  {
    _id: '2',
    title: 'Mercedes-AMG G63',
    price: 22000000,
    year: 2024,
    mileage: 5000,
    fuel: 'Petrol',
    transmission: 'Automatic',
    location: { city: 'Mombasa' },
    image: 'https://images.pexels.com/photos/120049/pexels-photo-120049.jpeg?auto=compress&cs=tinysrgb&w=800',
    verified: true,
    inspected: true,
  },
  {
    _id: '3',
    title: 'Nissan Patrol Super Safari',
    price: 7800000,
    year: 2022,
    mileage: 45000,
    fuel: 'Diesel',
    transmission: 'Manual',
    location: { city: 'Kisumu' },
    image: 'https://images.pexels.com/photos/3311574/pexels-photo-3311574.jpeg?auto=compress&cs=tinysrgb&w=800',
    verified: true,
  },
  {
    _id: '4',
    title: 'Toyota Prado TXL',
    price: 9500000,
    year: 2023,
    mileage: 18000,
    fuel: 'Petrol',
    transmission: 'Automatic',
    location: { city: 'Nairobi' },
    image: 'https://images.pexels.com/photos/2446057/pexels-photo-2446057.jpeg?auto=compress&cs=tinysrgb&w=800',
    auction_status: 'live',
    isAuction: true,
    verified: true,
  },
];

const CATEGORIES = [
  { id: 'suv', label: 'SUV', icon: '🚙', count: 1240 },
  { id: 'sedan', label: 'Sedan', icon: '🚗', count: 890 },
  { id: 'pickup', label: 'Pickup', icon: '🛻', count: 456 },
  { id: 'hatchback', label: 'Hatchback', icon: '🚘', count: 320 },
  { id: 'luxury', label: 'Luxury', icon: '✨', count: 178 },
  { id: 'electric', label: 'Electric', icon: '⚡', count: 45 },
];

const LIVE_AUCTIONS = [
  {
    _id: 'a1',
    title: 'BMW X5 M Competition',
    currentBid: 12400000,
    bids: 23,
    endsIn: '2h 34m',
    image: 'https://images.pexels.com/photos/1687325/pexels-photo-1687325.jpeg?auto=compress&cs=tinysrgb&w=800',
    auction_status: 'live',
  },
  {
    _id: 'a2',
    title: 'Range Rover Autobiography',
    currentBid: 18900000,
    bids: 41,
    endsIn: '45m',
    image: 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=800',
    auction_status: 'live',
  },
];

const TRUST_BADGES = [
  { icon: '🔒', label: 'Secure Escrow', desc: 'Protected payments' },
  { icon: '🔍', label: 'Verified Inspections', desc: '150-point check' },
  { icon: '🏆', label: 'Top Dealers', desc: 'Vetted sellers' },
];

// Stats data
const STATS = [
  { label: 'Vehicles', value: '12.5K+', color: 'var(--gold-400)' },
  { label: 'Dealers', value: '500+', color: 'var(--green-400)' },
  { label: 'Auctions', value: '156', color: 'var(--blue-400)' },
];

// Skeleton card for loading
function FeaturedSkeleton() {
  return (
    <div className="mobile-carousel__item">
      <MobileCardSkeleton />
    </div>
  );
}

export default function MobileHomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filters, setFilters] = useState({
    brand: 'All',
    fuel: 'All',
    transmission: 'All',
    bodyType: 'All',
    condition: 'All',
    priceMax: 20000000,
    mileageMax: 200000,
    auctionOnly: false,
    verifiedOnly: false,
    inspectedOnly: false,
  });

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleSearch = useCallback((query) => {
    if (query.trim()) {
      navigate(`/browse?search=${encodeURIComponent(query)}`);
    }
  }, [navigate]);

  const handleVoiceSearch = useCallback(({ onResult, onError }) => {
    // Simulate voice recognition
    setTimeout(() => {
      onResult('Toyota Land Cruiser');
    }, 1500);
  }, []);

  const handleRefresh = useCallback(async () => {
    // Simulate refresh
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  }, []);

  const handleFavorite = useCallback((car, isFavorite) => {
    toast.success(isFavorite ? 'Added to favorites' : 'Removed from favorites');
  }, []);

  return (
    <div className="mobile-viewport">
      {/* Hero Header */}
      <MobileHeroHeader
        title="Find Your Perfect Drive"
        subtitle="Kenya's most trusted automotive marketplace"
        backgroundGradient="linear-gradient(180deg, var(--bg-deep) 0%, var(--bg-base) 100%)"
      >
        <div style={{ marginTop: 20 }}>
          <MobileSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={handleSearch}
            onVoiceSearch={handleVoiceSearch}
            placeholder="Search cars, brands, or models..."
          />
        </div>
      </MobileHeroHeader>

      {/* Main scrollable content */}
      <div
        className="mobile-scroll-container"
        style={{
          flex: 1,
          paddingBottom: 'calc(var(--bottom-nav-height) + var(--safe-area-bottom) + 20px)',
        }}
      >
        {/* Stats Bar */}
        <StatsBar stats={STATS} />

        {/* Categories */}
        <Section title="Browse by Type">
          <div className="mobile-category-pills" style={{ padding: '0 16px', marginBottom: 24 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className="mobile-category-pill"
                onClick={() => navigate(`/browse?bodyType=${cat.id}`)}
              >
                <span className="mobile-category-pill__icon">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Live Auctions Banner */}
        <div style={{ padding: '0 16px', marginBottom: 24 }}>
          <Link
            to="/auctions"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: 16,
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(139, 92, 246, 0.1))',
              borderRadius: 16,
              border: '1px solid rgba(168, 85, 247, 0.3)',
              textDecoration: 'none',
            }}
          >
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              background: 'linear-gradient(135deg, #9333ea, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              animation: 'live-pulse 2s ease-in-out infinite',
            }}>
              ⚡
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span className="mobile-car-card__badge mobile-car-card__badge--live" style={{ fontSize: 10 }}>
                  LIVE
                </span>
                Live Auctions
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                {LIVE_AUCTIONS.length} vehicles bidding now
              </div>
            </div>
            <ChevronRight size={20} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </Link>
        </div>

        {/* Featured Cars */}
        <Section title="Featured Vehicles">
          <MobileCarousel>
            {isLoading ? (
              <>
                <FeaturedSkeleton />
                <FeaturedSkeleton />
                <FeaturedSkeleton />
              </>
            ) : (
              FEATURED_CARS.map((car, i) => (
                <CarouselItem key={car._id}>
                  <div className="mobile-list-item" style={{ animationDelay: `${i * 0.05}s` }}>
                    <VehicleCard
                      car={car}
                      variant="horizontal"
                      featured
                      onSave={handleFavorite}
                    />
                  </div>
                </CarouselItem>
              ))
            )}
          </MobileCarousel>
        </Section>

        {/* Trust Badges */}
        <Section title="Why KAYAD">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            padding: '0 16px',
          }}>
            {TRUST_BADGES.map((badge, i) => (
              <div
                key={i}
                className="mobile-list-item"
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: 12,
                  padding: 16,
                  textAlign: 'center',
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>{badge.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {badge.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {badge.desc}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Recently Added */}
        <Section title="Recently Added">
          <div style={{ padding: '0 16px' }}>
            {isLoading ? (
              <>
                <MobileCardSkeleton style={{ marginBottom: 16 }} />
                <MobileCardSkeleton />
              </>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {FEATURED_CARS.slice(0, 2).map((car, i) => (
                  <div
                    key={car._id}
                    className="mobile-list-item"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <VehicleCard car={car} variant="horizontal" onSave={handleFavorite} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ padding: '16px 16px 0' }}>
            <button
              className="mobile-btn mobile-btn--secondary mobile-btn--full"
              onClick={() => navigate('/browse')}
            >
              View All Vehicles
              <ArrowRight size={18} />
            </button>
          </div>
        </Section>

        {/* Bottom spacing */}
        <div style={{ height: 20 }} />
      </div>

      {/* Bottom Navigation */}
      <MobileBottomNav />

      {/* Filter Drawer */}
      <MobileFilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        filters={filters}
        onFilterChange={setFilters}
        onApply={(f) => {
          setFilters(f);
          navigate('/browse');
        }}
        onReset={() => setFilters({
          brand: 'All',
          fuel: 'All',
          transmission: 'All',
          bodyType: 'All',
          condition: 'All',
          priceMax: 20000000,
          mileageMax: 200000,
          auctionOnly: false,
          verifiedOnly: false,
          inspectedOnly: false,
        })}
      />
    </div>
  );
}
