'use client'

import type { Reservation, Car } from '@/lib/supabase/types'

interface Props {
  reservation: Reservation | null
  cars: Car[]
  dailyRateMap: Record<number, number>
  onClose: () => void
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-green-500/20 text-green-300',
  pending:   'bg-yellow-500/20 text-yellow-300',
  completed: 'bg-white/10 text-white/50',
  cancelled: 'bg-red-500/20 text-red-300',
  active:    'bg-blue-500/20 text-blue-300',
}

export default function ReservationDetailModal({ reservation: r, cars, dailyRateMap, onClose }: Props) {
  if (!r) return null

  const carMap = Object.fromEntries(cars.map(c => [c.id, `${c.make} ${c.model_full || c.model}`]))

  // Late fee calculation
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const returnDate = r.return_date ? new Date(r.return_date + 'T12:00:00') : null
  const overdueDays = returnDate && r.status !== 'completed' && r.status !== 'cancelled'
    ? Math.max(0, Math.floor((today.getTime() - returnDate.getTime()) / 86400000))
    : 0
  const dailyRate = r.car_id ? (dailyRateMap[r.car_id] ?? 0) : 0
  const lateFee = overdueDays * dailyRate

  // Duration
  const days = r.pickup_date && r.return_date
    ? Math.max(1, Math.round((new Date(r.return_date).getTime() - new Date(r.pickup_date).getTime()) / 86400000))
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <h3 className="text-lg font-bold text-white">Booking Detail</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1">✕</button>
        </div>

        {/* Late Fee Alert */}
        {overdueDays > 0 && (
          <div className="mx-6 mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3">
            <span className="text-red-400 text-xl">⚠</span>
            <div>
              <div className="text-red-400 font-bold text-sm">
                Overdue {overdueDays} day{overdueDays !== 1 ? 's' : ''}
              </div>
              {dailyRate > 0 && (
                <div className="text-red-300/70 text-xs mt-0.5">
                  Estimated late fee: <strong className="text-red-300">${lateFee.toLocaleString()}</strong>
                  {' '}(${dailyRate}/day)
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-3">
          {[
            ['Customer', <strong className="text-white">{r.customer_name || '—'}</strong>],
            ['Email', r.customer_email ? <a href={`mailto:${r.customer_email}`} className="text-white/70 hover:text-white underline">{r.customer_email}</a> : '—'],
            ['Phone', r.customer_phone ? <a href={`tel:${r.customer_phone}`} className="text-white/70 hover:text-white underline">{r.customer_phone}</a> : '—'],
            ['Vehicle', <strong className="text-white">{r.car_id ? carMap[r.car_id] ?? `Car #${r.car_id}` : '—'}</strong>],
            ['Pickup', `${r.pickup_date || '—'} at ${r.pickup_time || '10:00'}`],
            ['Return', `${r.return_date || '—'} at ${r.return_time || '10:00'}`],
            ['Duration', `${days} day${days !== 1 ? 's' : ''}`],
            ['Location', r.pickup_location || 'Aventura'],
            ['Total', <strong className="text-white">{r.total_amount ? `$${Number(r.total_amount).toLocaleString()}` : '—'}</strong>],
            ['Source', <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded bg-white/10 text-white/60">{r.source || 'admin'}</span>],
            ['Status', <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full ${STATUS_STYLES[r.status ?? ''] ?? 'bg-white/10 text-white/40'}`}>{r.status || '—'}</span>],
          ].map(([label, value], i) => (
            <div key={i} className="flex items-start justify-between py-2 border-b border-white/5 last:border-none gap-4">
              <span className="text-white/40 text-sm shrink-0">{label as string}</span>
              <div className="text-sm text-white/80 text-right">{value as any}</div>
            </div>
          ))}

          {r.notes && (
            <div className="p-3 bg-white/5 rounded-xl text-xs text-white/50 italic">{r.notes}</div>
          )}
        </div>

        <div className="px-6 pb-6 flex justify-end">
          <button onClick={onClose}
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
