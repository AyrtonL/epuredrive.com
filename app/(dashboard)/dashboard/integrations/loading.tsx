export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-white/5 rounded-lg" />
        <div className="h-4 w-72 bg-white/5 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-3">
            <div className="h-10 w-10 bg-white/5 rounded-xl" />
            <div className="h-4 w-32 bg-white/5 rounded" />
            <div className="h-3 w-full bg-white/5 rounded" />
            <div className="h-9 w-24 bg-white/5 rounded-lg mt-4" />
          </div>
        ))}
      </div>
    </div>
  )
}
