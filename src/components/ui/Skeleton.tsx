
// Base skeleton component
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className = '',
  width,
  height,
  variant = 'text',
  animation = 'pulse',
}: SkeletonProps) {
  const baseClasses = 'bg-cream-200';

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const style: React.CSSProperties = {
    width: width ?? (variant === 'text' ? '100%' : undefined),
    height: height ?? (variant === 'text' ? '1em' : undefined),
  };

  return (
    <div
      className={`${baseClasses} ${animationClasses[animation]} ${variantClasses[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

// Card skeleton for car listings
export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
          {/* Image */}
          <Skeleton
            variant="rectangular"
            className="aspect-[16/10] w-full"
            animation="wave"
          />

          {/* Content */}
          <div className="p-4 space-y-3">
            <Skeleton variant="text" width="40%" height={14} />
            <Skeleton variant="text" width="80%" height={20} />

            <div className="flex gap-2">
              <Skeleton variant="text" width="30%" height={14} />
              <Skeleton variant="text" width="20%" height={14} />
            </div>

            <Skeleton variant="text" width="50%" height={16} />
          </div>
        </div>
      ))}
    </>
  );
}

// List item skeleton
export function ListItemSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-cream-200">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="60%" height={16} />
            <Skeleton variant="text" width="40%" height={12} />
          </div>
          <Skeleton variant="rectangular" width={80} height={32} className="rounded-lg" />
        </div>
      ))}
    </>
  );
}

// Table skeleton
export function TableSkeleton({
  rows = 5,
  columns = 4
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 bg-cream-50 border-b border-cream-200">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" className="flex-1" height={14} />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-4 p-4 border-b border-cream-100 last:border-0"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              variant="text"
              className="flex-1"
              height={14}
              width={colIndex === 0 ? '80%' : '60%'}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Profile skeleton
export function ProfileSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-cream-200 p-6">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton variant="circular" width={96} height={96} />
        <div className="space-y-2">
          <Skeleton variant="text" width={160} height={24} />
          <Skeleton variant="text" width={120} height={14} />
        </div>
      </div>

      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-cream-50 rounded-xl">
            <Skeleton variant="rectangular" width={40} height={40} className="rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="30%" height={12} />
              <Skeleton variant="text" width="60%" height={14} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Page skeleton for full page loading
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-cream-50 pt-16">
      {/* Header skeleton */}
      <div className="bg-charcoal-900 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <Skeleton variant="text" width={200} height={32} className="mb-4" />
          <Skeleton variant="text" width={300} height={16} />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-cream-200 p-4">
              <Skeleton variant="text" width="50%" height={12} className="mb-2" />
              <Skeleton variant="text" width="80%" height={28} />
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton count={6} />
        </div>
      </div>
    </div>
  );
}

// Chat skeleton
export function ChatSkeleton() {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div className="w-80 border-r border-cream-200 bg-white p-4">
        <Skeleton variant="text" width="60%" height={24} className="mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton variant="circular" width={40} height={40} />
              <div className="flex-1 space-y-1">
                <Skeleton variant="text" width="70%" height={14} />
                <Skeleton variant="text" width="50%" height={12} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-cream-200 bg-white">
          <Skeleton variant="text" width="40%" height={20} />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? '' : 'justify-end'}`}>
              <Skeleton
                variant="rounded"
                width={200}
                height={60}
                className={i % 2 === 0 ? '' : 'ml-auto'}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Empty state component
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {icon && (
        <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mb-4">
          {icon}
        </div>
      )}

      <h3 className="font-serif text-xl text-charcoal-900 font-bold mb-2">
        {title}
      </h3>

      {description && (
        <p className="font-sans text-sm text-warm-500 max-w-sm mb-6">
          {description}
        </p>
      )}

      {action && <div className="mt-2">{action}</div>}

      {secondaryAction && (
        <div className="mt-3">{secondaryAction}</div>
      )}
    </div>
  );
}

export function FeaturedVehiclesSkeleton() {
  return (
    <section className="bg-[#FCF9F4] py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12">
        <div className="text-center space-y-3">
          <div className="h-6 w-40 bg-warm-200 rounded-full mx-auto animate-pulse" />
          <div className="h-8 w-64 bg-warm-200 rounded mx-auto animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-3xl overflow-hidden border border-[#E8E1D5] bg-white">
              <div className="h-40 bg-warm-200 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 bg-warm-200 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-warm-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LiveAuctionsSkeleton() {
  return (
    <section className="py-10 sm:py-14 bg-[#F6F1E8] px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12">
        <div className="h-8 w-72 bg-warm-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-3xl overflow-hidden border border-[#E2D8C7] bg-white grid grid-cols-1 md:grid-cols-2">
              <div className="h-64 bg-warm-200 animate-pulse" />
              <div className="p-6 space-y-3">
                <div className="h-4 w-1/2 bg-warm-200 rounded animate-pulse" />
                <div className="h-6 w-3/4 bg-warm-200 rounded animate-pulse" />
                <div className="h-16 bg-warm-200 rounded-2xl animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function VehicleDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="h-8 w-64 bg-warm-200 rounded animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="aspect-[4/3] rounded-3xl bg-warm-200 animate-pulse" />
        <div className="space-y-4">
          <div className="h-6 w-3/4 bg-warm-200 rounded animate-pulse" />
          <div className="h-10 w-1/2 bg-warm-200 rounded animate-pulse" />
          <div className="h-24 bg-warm-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
