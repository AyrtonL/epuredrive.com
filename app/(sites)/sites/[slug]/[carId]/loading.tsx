export default function CarDetailLoading() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12 animate-pulse">
      {/* Back link skeleton */}
      <div className="h-4 w-28 bg-white/5 rounded mb-8" />

      <div className="grid lg:grid-cols-12 gap-10 items-start">
        {/* Left — image + details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main image */}
          <div className="aspect-[16/10] bg-white/5 rounded-[2.5rem] border border-white/5" />

          {/* Thumbnail strip */}
          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="w-20 h-14 bg-white/5 rounded-xl border border-white/5 shrink-0"
              />
            ))}
          </div>

          {/* Title block */}
          <div className="space-y-3 pt-2">
            <div className="h-3 w-20 bg-white/5 rounded" />
            <div className="h-9 w-64 bg-white/5 rounded-xl" />
            <div className="h-4 w-full bg-white/5 rounded" />
            <div className="h-4 w-5/6 bg-white/5 rounded" />
          </div>

          {/* Spec grid */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2"
              >
                <div className="h-3 w-12 bg-white/5 rounded" />
                <div className="h-5 w-16 bg-white/5 rounded-lg" />
              </div>
            ))}
          </div>
        </div>

        {/* Right — booking panel */}
        <div className="lg:col-span-5">
          <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6 space-y-5">
            {/* Price line */}
            <div className="flex items-end gap-2">
              <div className="h-9 w-28 bg-white/5 rounded-xl" />
              <div className="h-4 w-16 bg-white/5 rounded" />
            </div>

            {/* Date fields */}
            <div className="space-y-3">
              <div className="h-12 bg-white/5 rounded-2xl border border-white/5" />
              <div className="h-12 bg-white/5 rounded-2xl border border-white/5" />
            </div>

            {/* Location dropdown */}
            <div className="h-12 bg-white/5 rounded-2xl border border-white/5" />

            {/* Summary lines */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between">
                <div className="h-3 w-24 bg-white/5 rounded" />
                <div className="h-3 w-16 bg-white/5 rounded" />
              </div>
              <div className="flex justify-between">
                <div className="h-3 w-20 bg-white/5 rounded" />
                <div className="h-3 w-12 bg-white/5 rounded" />
              </div>
            </div>

            {/* CTA button */}
            <div className="h-12 w-full bg-white/5 rounded-full border border-white/5 mt-4" />
          </div>
        </div>
      </div>
    </div>
  )
}
