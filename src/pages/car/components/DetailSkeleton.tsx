export default function DetailSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Hero image skeleton */}
      <div className="w-full aspect-video bg-cream-200 rounded-2xl mb-6" />

      {/* Thumbnails */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="w-16 h-12 bg-cream-200 rounded-lg" />
        ))}
      </div>

      {/* Title & specs */}
      <div className="space-y-4 mb-8">
        <div className="h-8 w-3/4 bg-cream-200 rounded" />
        <div className="h-4 w-1/2 bg-cream-200 rounded" />
      </div>

      {/* Specs grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="h-20 bg-cream-100 rounded-xl" />
        ))}
      </div>

      {/* Description */}
      <div className="space-y-2 mb-8">
        <div className="h-4 w-full bg-cream-200 rounded" />
        <div className="h-4 w-5/6 bg-cream-200 rounded" />
        <div className="h-4 w-4/6 bg-cream-200 rounded" />
      </div>

      {/* Sidebar skeleton */}
      <div className="space-y-4">
        <div className="h-32 bg-cream-100 rounded-2xl" />
        <div className="h-16 bg-cream-100 rounded-2xl" />
        <div className="h-12 bg-cream-100 rounded-2xl" />
      </div>
    </div>
  );
}
