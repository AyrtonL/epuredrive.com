export default function FleetLoading() {
  return (
    <div className="animate-pulse">
      {/* Hero skeleton */}
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-8 text-center space-y-4">
        <div className="h-10 w-64 bg-white/5 rounded-xl mx-auto" />
        <div className="h-5 w-80 bg-white/5 rounded-lg mx-auto" />
      </div>

      {/* Search bar skeleton */}
      <div className="max-w-4xl mx-auto px-6 mb-24">
        <div className="h-14 bg-white/5 rounded-[2.5rem] border border-white/5" />
      </div>

      {/* Car cards skeleton */}
      <div className="max-w-7xl mx-auto px-6 space-y-48">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="grid lg:grid-cols-12 gap-20 items-start">
            <div className="lg:col-span-8 space-y-8">
              <div className="aspect-[16/10] bg-white/5 rounded-[3rem] border border-white/5" />
              <div className="space-y-4 px-4">
                <div className="h-4 w-24 bg-white/5 rounded" />
                <div className="h-12 w-72 bg-white/5 rounded-xl" />
                <div className="h-20 w-full bg-white/5 rounded-lg" />
              </div>
            </div>
            <div className="lg:col-span-4">
              <div className="bg-white/5 border border-white/5 rounded-[2rem] h-[500px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
