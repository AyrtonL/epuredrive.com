'use client'

import { useState } from 'react'
import { createConnectAccount } from './actions'

export default function ConnectButton() {
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    setLoading(true)
    const result = await createConnectAccount()
    if (result?.error) {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="bg-[#635BFF] hover:bg-[#635BFF]/90 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#635BFF]/20 transition-all flex items-center gap-2 disabled:opacity-50"
    >
      {loading ? 'Connecting…' : 'Connect Account'}
      {!loading && (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      )}
    </button>
  )
}
