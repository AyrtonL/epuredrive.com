'use client'

import { useState } from 'react'

interface SquareConnectButtonProps {
  connected: boolean
  merchantId: string | null
  locationId: string | null
}

export default function SquareConnectButton({ connected, merchantId, locationId }: SquareConnectButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    setLoading(true)
    const res = await fetch('/api/square/authorize')
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setLoading(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Square? Customers will no longer be able to pay via Square.')) return
    setLoading(true)
    const res = await fetch('/api/square/disconnect', { method: 'POST' })
    if (res.ok) {
      window.location.reload()
    }
    setLoading(false)
  }

  if (connected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-xs text-emerald-400 font-medium">Connected</span>
        </div>
        {merchantId && (
          <div className="text-[10px] text-white/30 font-mono">
            Merchant: {merchantId}
          </div>
        )}
        {locationId && (
          <div className="text-[10px] text-white/30 font-mono">
            Location: {locationId}
          </div>
        )}
        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-2 rounded-xl hover:bg-red-500/20 transition-colors disabled:opacity-50"
        >
          {loading ? 'Disconnecting...' : 'Disconnect Square'}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="bg-black hover:bg-black/80 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 border border-white/10"
    >
      {loading ? 'Connecting...' : 'Connect Square'}
      {!loading && (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      )}
    </button>
  )
}
