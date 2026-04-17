'use client'

import { useRouter } from 'next/navigation'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function FleetError({ error: _error, reset }: Props) {
  const router = useRouter()
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="glass rounded-[2rem] border border-white/10 p-10 max-w-md w-full text-center space-y-6">
        <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
          <svg
            className="w-6 h-6 text-white/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <h2 className="font-outfit text-2xl font-black text-white tracking-tight">
            Something went wrong
          </h2>
          <p className="text-white/40 text-sm leading-relaxed">
            We couldn&apos;t load the fleet right now. This is usually temporary — please try again.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-full bg-primary text-black text-sm font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-full border border-white/10 text-white/50 text-sm font-semibold hover:text-white hover:border-white/20 transition-colors"
          >
            ← Back to fleet
          </button>
        </div>
      </div>
    </div>
  )
}
