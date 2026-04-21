export default function MaintenanceLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-40 bg-white/5 rounded-lg" />
        <div className="h-4 w-60 bg-white/5 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-3">
            <div className="h-3 w-20 bg-white/5 rounded" />
            <div className="h-8 w-16 bg-white/5 rounded-lg" />
          </div>
        ))}
      </div>
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
