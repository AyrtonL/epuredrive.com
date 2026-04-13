export default function FleetPageLoading() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-10 text-center space-y-4">
        <div className="h-3 w-32 bg-white/5 rounded-full mx-auto" />
        <div className="h-10 w-48 bg-white/5 rounded-xl mx-auto" />
        <div className="h-4 w-64 bg-white/5 rounded-lg mx-auto" />
      </div>

      {/* Car grid skeleton — 3 cards */}
      <div className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/5 rounded-[2rem] overflow-hidden"
            >
              {/* Image placeholder */}
              <div className="aspect-[16/10] bg-white/5" />

              {/* Card body */}
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-white/5 rounded" />
                  <div className="h-6 w-40 bg-white/5 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-white/5 rounded" />
                  <div className="h-3 w-4/5 bg-white/5 rounded" />
                </div>
                {/* Spec pills */}
                <div className="flex gap-2 pt-1">
                  <div className="h-6 w-16 bg-white/5 rounded-full" />
                  <div className="h-6 w-20 bg-white/5 rounded-full" />
                  <div className="h-6 w-14 bg-white/5 rounded-full" />
                </div>
                {/* Price + CTA row */}
                <div className="flex items-center justify-between pt-2">
                  <div className="h-7 w-24 bg-white/5 rounded-lg" />
                  <div className="h-9 w-28 bg-white/5 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
