import Link from 'next/link'
import type { PickupCountdown } from '@/lib/dashboard/overview-metrics'
import { formatClock } from '@/lib/daily-schedule/build'

export interface UpcomingRental {
  id: string
  bookingCode: string | null
  customer: string
  vehicle: string
  dates: string
  pickupTime: string | null
  total: number | null
  status: string | null
  countdown: PickupCountdown
}

interface Props {
  rentals: UpcomingRental[]
  /** how many bookings matched before the list was capped */
  totalCount: number
  windowDays: number
}

const TONE_TEXT: Record<PickupCountdown['tone'], string> = {
  late: 'text-red-300',
  today: 'text-sky-300',
  soon: 'text-amber-300',
  normal: 'text-white/70',
}

const money = (n: number): string => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`

export default function UpcomingRentalsPanel({ rentals, totalCount, windowDays }: Props) {
  const unconfirmed = rentals.filter((r) => r.status === 'pending').length
  const hidden = totalCount - rentals.length

  return (
    <div className="glass rounded-2xl border border-white/[0.10] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 lg:px-6 py-4 border-b border-white/[0.06]">
        <div>
          <h3 className="text-white font-bold text-sm">
            Upcoming pickups <span className="text-white/50 font-semibold tabular-nums">· {totalCount}</span>
          </h3>
          <div className="text-[12px] text-white/55 mt-0.5">
            {unconfirmed > 0 ? <span className="text-yellow-300">{unconfirmed} not confirmed · </span> : null}
            Next {windowDays} days, soonest first
          </div>
        </div>
      </div>

      {rentals.length === 0 ? (
        <div className="px-6 py-8 text-center text-white/50 text-sm">No pickups in the next {windowDays} days</div>
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {rentals.map((r) => {
            const time = formatClock(r.pickupTime)
            return (
              <Link
                key={r.id}
                href={`/dashboard/bookings?q=${encodeURIComponent(r.bookingCode ?? r.customer)}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[120px_minmax(0,1.1fr)_minmax(0,1.3fr)_90px] gap-x-4 gap-y-1 items-center px-4 lg:px-6 py-3.5 hover:bg-white/[0.04] transition-colors"
              >
                <div className="max-lg:row-start-2 max-lg:col-span-2 text-[12px] lg:text-[13px] tabular-nums">
                  <span className={`font-semibold ${TONE_TEXT[r.countdown.tone]}`}>{r.countdown.label}</span>
                  {time && <span className="text-white/55"> · {time}</span>}
                </div>
                <div className="min-w-0 max-lg:row-start-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-white font-medium truncate">{r.customer}</span>
                    {r.status === 'pending' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-300 bg-yellow-500/10 px-1.5 py-0.5 rounded shrink-0">
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-white/55 truncate lg:hidden">{r.vehicle} · {r.dates}</div>
                </div>
                <div className="hidden lg:block min-w-0">
                  <div className="text-[13px] text-white/75 truncate" title={r.vehicle}>{r.vehicle}</div>
                  <div className="text-[12px] text-white/50 tabular-nums">{r.dates}</div>
                </div>
                <div className="text-right text-sm text-white/85 font-medium tabular-nums max-lg:row-start-1 max-lg:col-start-2">
                  {r.total != null ? money(r.total) : '—'}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {hidden > 0 && (
        <div className="px-4 md:px-6 py-2 border-t border-white/[0.06] text-right">
          <Link href="/dashboard/bookings" className="inline-block px-3 py-2 -mr-3 rounded-lg text-[13px] text-white/65 hover:text-white hover:bg-white/[0.06] transition-colors font-medium">
            +{hidden} more in bookings &rarr;
          </Link>
        </div>
      )}
    </div>
  )
}
