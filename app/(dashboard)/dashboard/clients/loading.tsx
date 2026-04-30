export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-white/5 rounded-lg" />
        <div className="h-4 w-72 bg-white/5 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-3">
            <div className="h-3 w-20 bg-white/5 rounded" />
            <div className="h-8 w-24 bg-white/5 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="bg-white/5 border border-white/5 rounded-3xl p-6 md:p-8 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-10 w-10 bg-white/5 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 bg-white/5 rounded" />
              <div className="h-3 w-1/3 bg-white/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
