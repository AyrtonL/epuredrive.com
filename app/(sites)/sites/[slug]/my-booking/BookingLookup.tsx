'use client'

import { useState } from 'react'

interface ReservationResult {
  id: number
  vehicleName: string
  customerName: string | null
  pickupDate: string | null
  returnDate: string | null
  pickupTime: string | null
  returnTime: string | null
  pickupLocation: string | null
  totalAmount: number | null
  status: string | null
}

interface Props {
  tenantId: string
  slug: string
}

const STATUS_STYLES: Record<string, string> = {
  pending:   'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  confirmed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  completed: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  cancelled: 'text-red-400 bg-red-500/10 border-red-500/20',
}

export default function BookingLookup({ tenantId, slug }: Props) {
  const [refId, setRefId] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ReservationResult | null>(null)

  async function handleLookup() {
    setError('')
    setResult(null)
    if (!refId.trim() || !email.trim()) {
      setError('Both fields are required.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(
        `/api/booking/lookup?id=${encodeURIComponent(refId.trim())}&email=${encodeURIComponent(email.trim())}&tenantId=${tenantId}`
      )
      const data = await res.json() as { reservation?: ReservationResult; error?: string }
      if (!res.ok || !data.reservation) {
        setError(data.error || 'No reservation found matching those details.')
        return
      }
      setResult(data.reservation)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    const statusStyle = STATUS_STYLES[result.status?.toLowerCase() ?? ''] ?? 'text-white/40 bg-white/5 border-white/10'
    return (
      <div className="space-y-6">
        <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-3">
          <Row label="Ref #" value={`#${result.id}`} />
          <Row label="Vehicle" value={result.vehicleName} />
          {result.customerName && <Row label="Name" value={result.customerName} />}
          {result.pickupDate && (
            <Row
              label="Pickup"
              value={`${result.pickupDate}${result.pickupTime ? ' · ' + result.pickupTime : ''}`}
            />
          )}
          {result.returnDate && (
            <Row
              label="Return"
              value={`${result.returnDate}${result.returnTime ? ' · ' + result.returnTime : ''}`}
            />
          )}
          {result.pickupLocation && <Row label="Location" value={result.pickupLocation} />}
          {result.totalAmount != null && (
            <Row label="Est. Total" value={`$${Number(result.totalAmount).toLocaleString()}`} />
          )}
          <div className="pt-2 border-t border-white/5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30 shrink-0">Status</span>
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${statusStyle}`}>
                {result.status ?? 'Pending'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => { setResult(null); setRefId(''); setEmail('') }}
          className="w-full py-3 rounded-2xl bg-white/5 border border-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
        >
          Look Up Another Booking
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">
          Reservation Ref #
        </label>
        <input
          type="number"
          placeholder="e.g. 42"
          value={refId}
          onChange={e => setRefId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLookup()}
          className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:ring-1 focus:ring-primary/40 outline-none"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">
          Email Address
        </label>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLookup()}
          className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:ring-1 focus:ring-primary/40 outline-none"
        />
      </div>

      {error && (
        <p className="text-red-400 text-[11px] font-bold px-1">{error}</p>
      )}

      <button
        onClick={handleLookup}
        disabled={loading}
        className="w-full bg-white text-black font-black uppercase tracking-[0.2em] text-[11px] py-4 rounded-2xl hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/5 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
      >
        {loading ? 'Searching...' : 'Find My Booking'}
      </button>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[10px] font-black uppercase tracking-widest text-white/30 shrink-0">{label}</span>
      <span className="text-[12px] font-semibold text-white text-right">{value}</span>
    </div>
  )
}
