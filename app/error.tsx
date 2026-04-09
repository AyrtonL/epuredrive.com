'use client'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ reset }: ErrorProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center space-y-8 px-6">
        <div className="space-y-2">
          <div className="text-[120px] font-black text-white/5 leading-none tracking-tighter">500</div>
          <h1 className="text-2xl font-bold text-white -mt-12 relative">Something went wrong</h1>
          <p className="text-white/40 text-sm max-w-md mx-auto mt-4">
            An unexpected error occurred. Please try again.
          </p>
        </div>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="bg-white text-black font-semibold px-6 py-3 rounded-lg text-sm hover:bg-white/90 transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="text-white/50 hover:text-white text-sm transition-colors"
          >
            Go home
          </a>
        </div>
        <div className="pt-8">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/10">éPure Drive</span>
        </div>
      </div>
    </div>
  )
}
