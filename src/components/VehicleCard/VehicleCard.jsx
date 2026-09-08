/**
 * VehicleCard - Premium unified vehicle card component
 *
 * Inspired by: Porsche Finder, BMW Approved Used, Aston Martin Timeless,
 * Bring a Trailer, Collecting Cars, Airbnb, Apple
 *
 * Features:
 * - Large immersive image with hover zoom
 * - Image overlays (badges, actions)
 * - Premium price display with market comparison
 * - Compact spec chips
 * - Dealer section with verification
 * - Trust signals
 * - Action buttons
 * - Loading skeleton
 * - Multiple variants (compact, horizontal)
 */

import { memo, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart, Share2, GitCompare, Eye, Clock, MapPin,
  Gauge, Fuel, Settings2, Calendar, Zap, Shield, CheckCircle2,
  Star, Award, Truck, CreditCard, FileCheck, ChevronRight
} from 'lucide-react';
import './VehicleCard.css';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatPrice = (price, currency = 'KES') => {
  if (!price) return null;
  if (price >= 1000000) {
    return `${currency} ${(price / 1000000).toFixed(1)}M`;
  }
  return `${currency} ${price.toLocaleString()}`;
};

const formatMileage = (mileage) => {
  if (!mileage) return null;
  if (typeof mileage === 'number') {
    return mileage >= 1000 ? `${(mileage / 1000).toFixed(0)}k km` : `${mileage} km`;
  }
  return mileage;
};

const getMarketComparison = (price, marketPrice, avgMarket) => {
  const ref = marketPrice || avgMarket;
  if (!price || !ref) return null;
  const diff = ((price - ref) / ref) * 100;
  if (Math.abs(diff) < 5) return null;
  return {
    direction: diff > 0 ? 'above' : 'below',
    percentage: Math.abs(diff).toFixed(0),
  };
};

const getTrustLevel = (score) => {
  if (score >= 85) return { label: 'Highly Trusted', color: 'success' };
  if (score >= 70) return { label: 'Trusted', color: 'info' };
  if (score >= 50) return { label: 'Verified', color: 'warning' };
  return null;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Premium badge component */
const Badge = memo(({ variant = 'default', children, icon, className = '' }) => (
  <span className={`vc-badge vc-badge--${variant} ${className}`}>
    {icon && <span className="vc-badge__icon">{icon}</span>}
    {children}
  </span>
));
Badge.displayName = 'Badge';

/** Compact spec chip */
const SpecChip = memo(({ icon: Icon, label, value }) => (
  <span className="vc-spec-chip">
    {Icon && <Icon size={12} className="vc-spec-chip__icon" />}
    {value || label}
  </span>
));
SpecChip.displayName = 'SpecChip';

/** Trust signal indicator */
const TrustSignal = memo(({ icon: Icon, label, variant = 'default' }) => (
  <span className={`vc-trust-signal vc-trust-signal--${variant}`}>
    {Icon && <Icon size={11} />}
    {label}
  </span>
));
TrustSignal.displayName = 'TrustSignal';

/** Image overlay slot positions */
const OverlayPosition = {
  TOP_LEFT: 'top-left',
  TOP_RIGHT: 'top-right',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_RIGHT: 'bottom-right',
};

/** Image overlay badges */
const ImageOverlay = memo(({ children, position = OverlayPosition.TOP_LEFT }) => (
  <div className={`vc-image-overlay vc-image-overlay--${position}`}>
    {children}
  </div>
));
ImageOverlay.displayName = 'ImageOverlay';

// ============================================================================
// SKELETON COMPONENT
// ============================================================================

export const VehicleCardSkeleton = memo(({ variant = 'default' }) => (
  <div className={`vc-card vc-card--skeleton vc-card--${variant}`}>
    <div className="vc-card__image-wrap">
      <div className="vc-card__image-skeleton" />
    </div>
    <div className="vc-card__body">
      <div className="vc-card__skeleton-line vc-card__skeleton-line--title" />
      <div className="vc-card__skeleton-line vc-card__skeleton-line--subtitle" />
      <div className="vc-card__skeleton-line vc-card__skeleton-line--price" />
      <div className="vc-card__skeleton-chips">
        <div className="vc-card__skeleton-chip" />
        <div className="vc-card__skeleton-chip" />
        <div className="vc-card__skeleton-chip" />
      </div>
      <div className="vc-card__skeleton-dealer" />
    </div>
  </div>
));
VehicleCardSkeleton.displayName = 'VehicleCardSkeleton';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * VehicleCard - Premium vehicle display card
 *
 * @param {Object} props
 * @param {Object} props.car - Vehicle data object
 * @param {string} props.variant - Card variant: 'default' | 'compact' | 'horizontal'
 * @param {boolean} props.featured - Show featured badge
 * @param {boolean} props.verified - Show verified badge
 * @param {boolean} props.saved - Initial saved state
 * @param {boolean} props.showCompare - Show compare checkbox
 * @param {boolean} props.showDealer - Show dealer section
 * @param {boolean} props.showFinance - Show finance estimate
 * @param {boolean} props.showTrust - Show trust signals
 * @param {boolean} props.showActions - Show action buttons
 * @param {Function} props.onSave - Save callback
 * @param {Function} props.onCompare - Compare callback
 * @param {Function} props.onShare - Share callback
 * @param {Function} props.onQuickView - Quick view callback
 * @param {string} props.className - Additional CSS class
 */
const VehicleCard = memo(({
  car,
  variant = 'default',
  featured = false,
  verified = false,
  saved: initialSaved = false,
  showCompare = false,
  compareSelected = false,
  showDealer = true,
  showFinance = false,
  showTrust = true,
  showActions = false,
  onSave,
  onCompare,
  onShare,
  onQuickView,
  onBookTestDrive,
  onContactDealer,
  className = '',
  ...props
}) => {
  const [saved, setSaved] = useState(initialSaved);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Parse car data with fallbacks
  const id = car._id || car.id;
  const images = car.images?.map(img => typeof img === 'string' ? img : img.url).filter(Boolean) || [];
  const primaryImage = images[0] || car.image;
  const fallbackImage = 'https://images.pexels.com/photos/3593922/pexels-photo-3593922.jpeg?auto=compress&cs=tinysrgb&w=800';

  // Determine vehicle status
  const isAuction = car.auction_status === 'live' || car.isAuction;
  const isLive = car.auction_status === 'live' || car.isLive;
  const isNew = car.is_new || car.isNew;
  const isReserved = car.reserved || car.status === 'reserved';
  const isSold = car.sold || car.status === 'sold';
  const isPriceDrop = car.price_drop || car.priceDrop;
  const isElectric = car.fuel?.toLowerCase() === 'electric' || car.isElectric;
  const isHybrid = car.fuel?.toLowerCase() === 'hybrid' || car.isHybrid;
  const isCertified = car.certified || car.isCertified;

  // Pricing
  const price = isAuction && car.currentBid > 0 ? car.currentBid : car.price;
  const originalPrice = car.original_price || car.originalPrice;
  const financeEstimate = car.finance_estimate || car.financeEstimate;
  const monthlyPayment = financeEstimate?.monthly;

  // Dealer info
  const dealer = {
    name: car.dealer?.business_name || car.dealer?.name || car.dealerName || car.dealerName || 'Private Seller',
    logo: car.dealer?.logo || car.dealerLogo,
    rating: car.dealer?.rating || car.dealerRating || car.rating,
    responseTime: car.dealer?.response_time || car.dealerResponseTime,
    yearsOnPlatform: car.dealer?.years_on_platform || car.dealerYearsOnPlatform,
    verified: car.dealer?.verified || car.dealerVerified || car.is_verified_dealer || car.isVerified || verified,
  };

  // Specifications
  const specs = useMemo(() => {
    const items = [];
    if (car.mileage) items.push({ icon: Gauge, label: 'Mileage', value: formatMileage(car.mileage) });
    if (car.year) items.push({ icon: Calendar, label: 'Year', value: car.year });
    if (car.fuel) items.push({ icon: Fuel, label: 'Fuel', value: car.fuel });
    if (car.transmission) items.push({ icon: Settings2, label: 'Transmission', value: car.transmission });
    if (car.power) items.push({ icon: Zap, label: 'Power', value: car.power });
    if (car.engine) items.push({ icon: Settings2, label: 'Engine', value: car.engine });
    if (car.drive) items.push({ icon: Gauge, label: 'Drive', value: car.drive });
    if (car.color) items.push({ icon: null, label: car.color });
    if (car.location) {
      const loc = typeof car.location === 'string' ? car.location : car.location?.city;
      if (loc) items.push({ icon: MapPin, label: loc });
    }
    return items.slice(0, 5); // Max 5 specs
  }, [car]);

  // Trust signals
  const trustSignals = useMemo(() => {
    const signals = [];
    if (car.inspection_status === 'completed' || car.has_inspection || car.inspectionAvailable) {
      signals.push({ icon: Shield, label: 'Inspected', variant: 'success' });
    }
    if (car.ntsa_verified || car.ntsaVerified) {
      signals.push({ icon: FileCheck, label: 'NTSA Verified', variant: 'success' });
    }
    if (car.logbook_verified || car.logbookVerified) {
      signals.push({ icon: CheckCircle2, label: 'Logbook OK', variant: 'success' });
    }
    if (car.warranty_available || car.warranty) {
      signals.push({ icon: Award, label: 'Warranty', variant: 'info' });
    }
    if (car.finance_available || car.financeOption) {
      signals.push({ icon: CreditCard, label: 'Finance', variant: 'default' });
    }
    if (car.delivery_available || car.delivery) {
      signals.push({ icon: Truck, label: 'Delivery', variant: 'default' });
    }
    if (car.insurance_available || car.insurance) {
      signals.push({ icon: Shield, label: 'Insured', variant: 'default' });
    }
    return signals.slice(0, 4); // Max 4 trust signals
  }, [car]);

  // Trust level
  const trustLevel = getTrustLevel(car.trust_score || car.trustScore);
  const marketComparison = getMarketComparison(price, car.market_price, car.avg_market_price);

  // Handlers
  const handleSave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const newState = !saved;
    setSaved(newState);
    onSave?.(car, newState);
  }, [car, saved, onSave]);

  const handleCompare = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onCompare?.(car, !compareSelected);
  }, [car, compareSelected, onCompare]);

  const handleShare = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({ title: car.title, url: window.location.origin + `/cars/${id}` });
    } else {
      navigator.clipboard?.writeText(window.location.origin + `/cars/${id}`);
    }
    onShare?.(car);
  }, [car, id, onShare]);

  const handleQuickView = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickView?.(car);
  }, [car, onQuickView]);

  // Determine badge variant
  const getBadgeVariant = () => {
    if (isSold) return 'danger';
    if (isReserved) return 'warning';
    if (isLive) return 'live';
    if (featured || isNew) return 'brand';
    if (isCertified) return 'success';
    return 'default';
  };

  const getBadgeText = () => {
    if (isSold) return 'Sold';
    if (isReserved) return 'Reserved';
    if (isLive) return 'LIVE';
    if (isNew) return 'New';
    if (featured) return 'Featured';
    if (isCertified) return 'Certified';
    return null;
  };

  return (
    <article
      className={`vc-card vc-card--${variant} ${className}`}
      data-status={isSold ? 'sold' : isReserved ? 'reserved' : isLive ? 'live' : 'available'}
      {...props}
    >
      {/* Image Section */}
      <Link to={`/cars/${id}`} className="vc-card__image-link">
        <div className="vc-card__image-wrap">
          {/* Loading skeleton */}
          {!imageLoaded && !imageError && (
            <div className="vc-card__image-skeleton" />
          )}

          {/* Main image */}
          <img
            src={imageError ? fallbackImage : primaryImage}
            alt={car.title}
            className={`vc-card__image ${imageLoaded ? 'vc-card__image--loaded' : ''}`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />

          {/* Image overlays - Top Left Badges */}
          <ImageOverlay position={OverlayPosition.TOP_LEFT}>
            {getBadgeText() && (
              <Badge variant={getBadgeVariant()} icon={isLive ? '🔴' : undefined}>
                {getBadgeText()}
              </Badge>
            )}
            {isElectric && <Badge variant="electric">⚡ Electric</Badge>}
            {isHybrid && <Badge variant="hybrid">🔋 Hybrid</Badge>}
            {isPriceDrop && <Badge variant="price-drop">↓ Price Drop</Badge>}
          </ImageOverlay>

          {/* Image overlays - Top Right Actions */}
          <ImageOverlay position={OverlayPosition.TOP_RIGHT}>
            <div className="vc-card__actions">
              <button
                className={`vc-card__action-btn ${saved ? 'vc-card__action-btn--active' : ''}`}
                onClick={handleSave}
                aria-label={saved ? 'Remove from saved' : 'Save'}
              >
                <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
              </button>
              {showCompare && (
                <button
                  className={`vc-card__action-btn ${compareSelected ? 'vc-card__action-btn--selected' : ''}`}
                  onClick={handleCompare}
                  aria-label="Add to compare"
                >
                  <GitCompare size={16} />
                </button>
              )}
              <button
                className="vc-card__action-btn"
                onClick={handleShare}
                aria-label="Share"
              >
                <Share2 size={16} />
              </button>
              {onQuickView && (
                <button
                  className="vc-card__action-btn"
                  onClick={handleQuickView}
                  aria-label="Quick view"
                >
                  <Eye size={16} />
                </button>
              )}
            </div>
          </ImageOverlay>

          {/* Image counter */}
          {images.length > 1 && (
            <div className="vc-card__image-count">
              📷 {images.length}
            </div>
          )}

          {/* Auction timer */}
          {isAuction && car.auction_end_time && (
            <div className="vc-card__auction-timer">
              <Clock size={12} />
              Ends {new Date(car.auction_end_time).toLocaleDateString()}
            </div>
          )}
        </div>
      </Link>

      {/* Body Section */}
      <div className="vc-card__body">
        {/* Title */}
        <Link to={`/cars/${id}`} className="vc-card__title-link">
          <h3 className="vc-card__title">{car.title}</h3>
        </Link>

        {/* Price Section */}
        <div className="vc-card__price-section">
          <div className="vc-card__price-row">
            <span className="vc-card__price">
              {isAuction ? 'Current Bid' : ''} {formatPrice(price)}
            </span>
            {originalPrice && price < originalPrice && (
              <span className="vc-card__price-original">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>

          {/* Price indicators */}
          <div className="vc-card__price-indicators">
            {marketComparison && (
              <span className={`vc-card__market-badge vc-card__market-badge--${marketComparison.direction}`}>
                {marketComparison.direction === 'below' ? '↓' : '↑'} {marketComparison.percentage}% {marketComparison.direction === 'below' ? 'Below Market' : 'Above Market'}
              </span>
            )}
            {car.deal_rating === 'great' && (
              <Badge variant="success" className="vc-card__deal-badge">Great Deal</Badge>
            )}
            {car.deal_rating === 'good' && (
              <Badge variant="info" className="vc-card__deal-badge">Good Deal</Badge>
            )}
          </div>

          {/* Monthly finance */}
          {showFinance && monthlyPayment && (
            <div className="vc-card__finance">
              From {formatPrice(monthlyPayment)}/mo with finance
            </div>
          )}
        </div>

        {/* Specifications */}
        <div className="vc-card__specs">
          {specs.map((spec, i) => (
            <SpecChip key={i} {...spec} />
          ))}
        </div>

        {/* Trust Level */}
        {trustLevel && (
          <div className={`vc-card__trust-level vc-card__trust-level--${trustLevel.color}`}>
            <Shield size={12} />
            {trustLevel.label}
          </div>
        )}

        {/* Trust Signals */}
        {showTrust && trustSignals.length > 0 && (
          <div className="vc-card__trust-signals">
            {trustSignals.map((signal, i) => (
              <TrustSignal key={i} {...signal} />
            ))}
          </div>
        )}

        {/* Dealer Section */}
        {showDealer && (
          <div className="vc-card__dealer">
            {dealer.logo && (
              <img src={dealer.logo} alt="" className="vc-card__dealer-logo" />
            )}
            <div className="vc-card__dealer-info">
              <span className="vc-card__dealer-name">
                {dealer.name}
                {dealer.verified && (
                  <Badge variant="verified" className="vc-card__dealer-badge">✓</Badge>
                )}
              </span>
              {dealer.rating && (
                <span className="vc-card__dealer-rating">
                  <Star size={10} fill="currentColor" />
                  {dealer.rating}
                  {dealer.responseTime && (
                    <span className="vc-card__dealer-response">
                      • {dealer.responseTime}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {showActions && (
          <div className="vc-card__actions-footer">
            <Link to={`/cars/${id}`} className="vc-card__btn vc-card__btn--primary">
              View Details <ChevronRight size={14} />
            </Link>
            {onBookTestDrive && (
              <button
                className="vc-card__btn vc-card__btn--secondary"
                onClick={(e) => { e.preventDefault(); onBookTestDrive(car); }}
              >
                Book Test Drive
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
});

VehicleCard.displayName = 'VehicleCard';
VehicleCard.Skeleton = VehicleCardSkeleton;
VehicleCard.Badge = Badge;
VehicleCard.SpecChip = SpecChip;
VehicleCard.TrustSignal = TrustSignal;

export default VehicleCard;
