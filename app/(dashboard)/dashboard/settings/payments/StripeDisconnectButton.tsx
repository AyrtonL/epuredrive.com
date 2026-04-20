'use client'

import { useState } from 'react'
import { disconnectStripeAccount } from './actions'

export default function StripeDisconnectButton() {
  const [loading, setLoading] = useState(false)

  async function handleDisconnect() {
    if (!confirm('Disconnect Stripe? Customers will no longer be able to pay via Stripe until you reconnect.')) return
    setLoading(true)
    const result = await disconnectStripeAccount()
    if (result?.error) {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest">
        Active
      </div>
      <button
        onClick={handleDisconnect}
        disabled={loading}
        className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-2 rounded-xl hover:bg-red-500/20 transition-colors disabled:opacity-50"
      >
        {loading ? 'Disconnecting...' : 'Disconnect'}
      </button>
    </div>
  )
}
