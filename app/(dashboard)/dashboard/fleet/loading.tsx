export default function FleetLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-24 bg-white/5 rounded-lg" />
        <div className="h-4 w-56 bg-white/5 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="h-36 w-full bg-white/5 rounded-xl" />
            <div className="space-y-2">
              <div className="h-5 w-3/4 bg-white/5 rounded" />
              <div className="h-3 w-1/2 bg-white/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
