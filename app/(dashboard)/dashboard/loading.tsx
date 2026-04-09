export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 bg-white/5 rounded-lg" />
        <div className="h-4 w-72 bg-white/5 rounded-lg" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-3">
            <div className="h-3 w-20 bg-white/5 rounded" />
            <div className="h-8 w-24 bg-white/5 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-10 w-10 bg-white/5 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-white/5 rounded" />
              <div className="h-3 w-1/2 bg-white/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
