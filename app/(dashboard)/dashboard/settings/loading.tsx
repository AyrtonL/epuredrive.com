export default function SettingsLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-32 bg-white/5 rounded-lg" />
        <div className="h-4 w-56 bg-white/5 rounded-lg" />
      </div>
      <div className="bg-white/5 border border-white/5 rounded-2xl p-8 space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 bg-white/5 rounded" />
            <div className="h-10 w-full bg-white/5 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
