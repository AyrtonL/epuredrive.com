export default function CalendarLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-32 bg-white/5 rounded-lg" />
        <div className="h-4 w-72 bg-white/5 rounded-lg" />
      </div>
      <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-32 bg-white/5 rounded" />
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-white/5 rounded-lg" />
            <div className="h-8 w-20 bg-white/5 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-20 bg-white/[0.02] border border-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
