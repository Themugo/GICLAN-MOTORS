import { useState, useCallback, useRef, useEffect, memo, Children, isValidElement, cloneElement } from 'react';
import { ChevronLeft, MoreHorizontal, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Pull to refresh hook
function usePullToRefresh({ onRefresh, threshold = 80, disabled = false }) {
  const [status, setStatus] = useState('idle'); // idle, pulling, ready, refreshing
  const [pullY, setPullY] = useState(0);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (disabled) return;
    if (containerRef.current && containerRef.current.scrollTop > 0) return;

    startYRef.current = e.touches[0].clientY;
    isPullingRef.current = true;
  }, [disabled]);

  const handleTouchMove = useCallback((e) => {
    if (disabled || !isPullingRef.current) return;
    if (containerRef.current && containerRef.current.scrollTop > 0) {
      isPullingRef.current = false;
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    if (diff > 0) {
      e.preventDefault();
      const pull = Math.min(diff * 0.5, threshold * 1.5);
      setPullY(pull);

      if (pull >= threshold && status !== 'ready') {
        setStatus('ready');
      } else if (pull < threshold && status !== 'pulling') {
        setStatus('pulling');
      }
    }
  }, [disabled, threshold, status]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled) return;

    isPullingRef.current = false;

    if (status === 'ready') {
      setStatus('refreshing');
      setPullY(threshold);

      try {
        await onRefresh?.();
      } finally {
        setTimeout(() => {
          setStatus('idle');
          setPullY(0);
        }, 300);
      }
    } else {
      setStatus('idle');
      setPullY(0);
    }
  }, [disabled, status, threshold, onRefresh]);

  return {
    containerRef,
    status,
    pullY,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

// Pull to refresh indicator
function PullToRefreshIndicator({ status, pullY }) {
  if (status === 'idle') return null;

  return (
    <div
      className={`mobile-pull-refresh ${status === 'refreshing' ? 'mobile-pull-refresh--refreshing' : ''}`}
      style={{
        transform: status === 'refreshing' ? 'translateY(0)' : `translateY(${pullY}px)`,
        height: pullY,
      }}
    >
      <div
        className="mobile-pull-refresh__spinner"
        style={{
          opacity: status === 'refreshing' ? 1 : pullY / 80,
          transform: `rotate(${pullY * 3}deg)`,
        }}
      />
      <span className="mobile-pull-refresh__text">
        {status === 'ready' ? 'Release to refresh' : 'Pull to refresh'}
      </span>
    </div>
  );
}

// Mobile page layout
function MobilePageLayout({
  children,
  title,
  subtitle,
  backButton = false,
  onBack,
  actions,
  noPaddingTop = false,
  noPaddingBottom = false,
  stickyHeader = false,
  onRefresh,
  refreshDisabled = false,
  className = '',
}) {
  const navigate = useNavigate();

  const { containerRef, status, pullY, handlers } = usePullToRefresh({
    onRefresh,
    disabled: refreshDisabled || !onRefresh,
  });

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  }, [navigate, onBack]);

  return (
    <div className={`mobile-page ${className}`}>
      {/* Header */}
      <header
        className="mobile-page__header"
        style={{
          position: stickyHeader ? 'sticky' : 'fixed',
          top: 0,
        }}
      >
        <div className="mobile-header mobile-safe-area">
          {backButton && (
            <button
              className="mobile-header__back"
              onClick={handleBack}
              aria-label="Go back"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          <h1 className="mobile-header__title">
            {title}
            {subtitle && (
              <span style={{
                display: 'block',
                fontSize: 'var(--mobile-text-sm)',
                fontWeight: 400,
                color: 'var(--text-muted)',
              }}>
                {subtitle}
              </span>
            )}
          </h1>

          <div className="mobile-header__actions">
            {actions}
          </div>
        </div>
      </header>

      {/* Content */}
      <main
        ref={containerRef}
        className={`mobile-scroll-container mobile-page__content ${!noPaddingTop ? '' : 'mobile-page__content--no-padding-top'} ${!noPaddingBottom ? '' : 'mobile-page__content--no-padding-bottom'}`}
        {...handlers}
      >
        <PullToRefreshIndicator status={status} pullY={pullY} />
        {children}
      </main>
    </div>
  );
}

// Mobile section
function MobileSection({
  children,
  title,
  link,
  linkLabel = 'See all',
  onLinkClick,
  noPadding = false,
  className = '',
}) {
  return (
    <section className={`mobile-section ${className}`} style={noPadding ? {} : { padding: '0 var(--mobile-space-4)' }}>
      {title && (
        <div className="mobile-section-header">
          <h2 className="mobile-section-title">{title}</h2>
          {link && (
            <button
              className="mobile-section-link"
              onClick={onLinkClick}
            >
              {linkLabel}
            </button>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

// Mobile tabs
function MobileTabs({ tabs, activeTab, onTabChange, className = '' }) {
  return (
    <div
      className={`mobile-tabs ${className}`}
      role="tablist"
      style={{
        display: 'flex',
        gap: 'var(--mobile-space-2)',
        padding: '0 var(--mobile-space-4)',
        marginBottom: 'var(--mobile-space-4)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {tabs.map(tab => (
        <button
          key={tab.id || tab}
          role="tab"
          aria-selected={activeTab === (tab.id || tab)}
          className={`mobile-category-pill ${activeTab === (tab.id || tab) ? 'mobile-category-pill--active' : ''}`}
          onClick={() => onTabChange?.(tab.id || tab)}
          style={{ flexShrink: 0 }}
        >
          {tab.icon && <span className="mobile-category-pill__icon">{tab.icon}</span>}
          {typeof tab === 'string' ? tab : tab.label}
        </button>
      ))}
    </div>
  );
}

// Mobile stats bar
function MobileStatsBar({ stats, className = '' }) {
  return (
    <div className="mobile-stats-bar" style={{ margin: '0 var(--mobile-space-4) var(--mobile-space-4)' }}>
      {stats.map((stat, i) => (
        <div key={i} className="mobile-stat">
          <div className="mobile-stat__value" style={{ color: stat.color || 'var(--gold-400)' }}>
            {stat.value}
          </div>
          <div className="mobile-stat__label">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

// Mobile carousel
function MobileCarousel({ children, className = '' }) {
  const scrollRef = useRef(null);

  return (
    <div
      ref={scrollRef}
      className={`mobile-carousel ${className}`}
      role="list"
    >
      {Children.map(children, (child, i) => (
        isValidElement(child) ? (
          cloneElement(child, {
            style: {
              ...child.props.style,
              animationDelay: `${i * 0.05}s`,
            },
            className: `${child.props.className || ''} mobile-list-item`,
          })
        ) : child
      ))}
    </div>
  );
}

// Carousel item wrapper
function CarouselItem({ children, style }) {
  return (
    <div className="mobile-carousel__item" style={style}>
      {children}
    </div>
  );
}

export {
  MobilePageLayout as Page,
  MobileSection as Section,
  MobileTabs as Tabs,
  MobileStatsBar as StatsBar,
  MobileCarousel,
  MobileCarousel as Carousel,
  CarouselItem,
  usePullToRefresh,
  PullToRefreshIndicator,
};

export default MobilePageLayout;
