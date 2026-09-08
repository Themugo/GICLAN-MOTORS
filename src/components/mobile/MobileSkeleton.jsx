import { memo, useEffect } from 'react';

// Inject skeleton keyframes once
if (typeof document !== 'undefined') {
  const styleId = 'mobile-skeleton-keyframes';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes mobile-skeleton-shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      @keyframes mobile-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    document.head.appendChild(style);
  }
}

const shimmerStyle = {
  background: 'linear-gradient(90deg, var(--surface) 25%, var(--bg-elevated) 50%, var(--surface) 75%)',
  backgroundSize: '200% 100%',
  animation: 'mobile-skeleton-shimmer 1.5s ease-in-out infinite',
};

// Base skeleton block
function SkeletonBlock({ width = '100%', height = 16, radius = 6, style = {} }) {
  return (
    <div
      className="mobile-skeleton"
      style={{
        width,
        height,
        borderRadius: radius,
        ...shimmerStyle,
        ...style
      }}
    />
  );
}

// Card skeleton
export function MobileCardSkeleton({ style }) {
  return (
    <div className="mobile-car-card" style={{ pointerEvents: 'none', ...style }}>
      <div className="mobile-car-card__image-wrap">
        <div className="mobile-car-card__image-skeleton" />
      </div>
      <div className="mobile-car-card__content">
        <SkeletonBlock height={16} width="80%" />
        <SkeletonBlock height={12} width="50%" style={{ marginTop: 8 }} />
        <SkeletonBlock height={24} width="40%" style={{ marginTop: 12 }} />
        <div style={{
          display: 'flex',
          gap: 12,
          marginTop: 12,
          flexWrap: 'wrap'
        }}>
          <SkeletonBlock height={14} width={60} />
          <SkeletonBlock height={14} width={50} />
          <SkeletonBlock height={14} width={45} />
        </div>
      </div>
    </div>
  );
}

// List skeleton
export function MobileListSkeleton({ count = 3, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, ...style }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          display: 'flex',
          gap: 16,
          padding: 16,
          background: 'var(--bg-card)',
          borderRadius: 'var(--mobile-radius-lg)',
        }}>
          <SkeletonBlock width={80} height={60} radius={8} />
          <div style={{ flex: 1 }}>
            <SkeletonBlock height={14} width="70%" />
            <SkeletonBlock height={12} width="40%" style={{ marginTop: 8 }} />
          </div>
          <SkeletonBlock width={60} height={24} radius={4} />
        </div>
      ))}
    </div>
  );
}

// Detail skeleton
export function MobileDetailSkeleton() {
  return (
    <div>
      {/* Hero image */}
      <div style={{
        aspectRatio: '16/10',
        background: 'var(--surface)',
        animation: 'mobile-pulse 1.5s ease-in-out infinite',
      }} />

      <div style={{ padding: 20 }}>
        {/* Title */}
        <SkeletonBlock height={24} width="85%" />
        <SkeletonBlock height={14} width="40%" style={{ marginTop: 8 }} />

        {/* Price */}
        <SkeletonBlock height={32} width="50%" style={{ marginTop: 20 }} />

        {/* Meta */}
        <div style={{
          display: 'flex',
          gap: 16,
          marginTop: 24,
          flexWrap: 'wrap',
        }}>
          {[1, 2, 3, 4].map(i => (
            <SkeletonBlock key={i} height={40} width={70} radius={8} />
          ))}
        </div>

        {/* Description */}
        <div style={{ marginTop: 32 }}>
          <SkeletonBlock height={16} width="30%" style={{ marginBottom: 16 }} />
          <SkeletonBlock height={12} width="100%" />
          <SkeletonBlock height={12} width="95%" style={{ marginTop: 8 }} />
          <SkeletonBlock height={12} width="88%" style={{ marginTop: 8 }} />
        </div>

        {/* CTA */}
        <div style={{
          display: 'flex',
          gap: 12,
          marginTop: 32,
          position: 'sticky',
          bottom: 'calc(var(--bottom-nav-height) + var(--safe-area-bottom) + 16px)',
        }}>
          <SkeletonBlock height={56} radius={12} style={{ flex: 2 }} />
          <SkeletonBlock height={56} width={56} radius={28} />
        </div>
      </div>
    </div>
  );
}

// Page skeleton
export function MobilePageSkeleton() {
  return (
    <div className="mobile-page">
      {/* Header */}
      <div style={{
        padding: 16,
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        gap: 12
      }}>
        <SkeletonBlock height={48} radius={12} style={{ flex: 1 }} />
        <SkeletonBlock height={48} width={48} radius={24} />
      </div>

      {/* Content */}
      <div style={{ padding: 16 }}>
        {/* Section */}
        <div style={{ marginBottom: 24 }}>
          <SkeletonBlock height={20} width={120} style={{ marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 12, overflow: 'hidden' }}>
            {[1, 2, 3].map(i => (
              <SkeletonBlock key={i} height={80} width={120} radius={12} />
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="mobile-card-grid">
          {[1, 2, 3, 4].map(i => (
            <MobileCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Inline skeleton for text
export function MobileTextSkeleton({ lines = 3, style }) {
  const widths = ['100%', '95%', '85%', '70%', '60%'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          height={14}
          width={widths[i % widths.length]}
        />
      ))}
    </div>
  );
}

// Stat skeleton
export function MobileStatSkeleton() {
  return (
    <div style={{
      padding: 20,
      background: 'var(--bg-card)',
      borderRadius: 'var(--mobile-radius-lg)',
      textAlign: 'center',
    }}>
      <SkeletonBlock height={32} width={60} style={{ margin: '0 auto 8px' }} />
      <SkeletonBlock height={12} width={80} style={{ margin: '0 auto' }} />
    </div>
  );
}

// Staggered list skeleton
export function MobileStaggeredList({ count = 5, style }) {
  return (
    <div style={{
      display: 'grid',
      gap: 16,
      padding: 16,
      ...style
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            animation: `mobile-fade-in 0.3s ease-out ${i * 0.05}s both`,
          }}
        >
          <MobileCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export default {
  Card: MobileCardSkeleton,
  List: MobileListSkeleton,
  Detail: MobileDetailSkeleton,
  Page: MobilePageSkeleton,
  Text: MobileTextSkeleton,
  Stat: MobileStatSkeleton,
  StaggeredList: MobileStaggeredList,
  Block: SkeletonBlock,
};
