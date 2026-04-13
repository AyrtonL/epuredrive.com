'use client'

import { useState } from 'react'
import { deactivateAccount } from './actions'

export default function DeactivateButton() {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDeactivate() {
    setLoading(true)
    setError(null)
    try {
      const result = await deactivateAccount()
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
      // On success, deactivateAccount redirects to /login?deactivated=1
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-3">
          <span className="text-red-400 text-xs font-bold">Are you sure?</span>
          <button
            onClick={handleDeactivate}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
          >
            {loading ? 'Deactivating…' : 'Yes, deactivate'}
          </button>
          <button
            onClick={() => { setConfirming(false); setError(null) }}
            disabled={loading}
            className="bg-white/5 hover:bg-white/10 text-white/60 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
    >
      Deactivate
    </button>
  )
}
