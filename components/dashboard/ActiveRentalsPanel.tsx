import Link from 'next/link'
import type { RentalProgress } from '@/lib/dashboard/overview-metrics'
import { formatClock } from '@/lib/daily-schedule/build'

export interface ActiveRental {
  id: string
  bookingCode: string | null
  customer: string
  vehicle: string
  dates: string
  returnTime: string | null
  total: number | null
  progress: RentalProgress
}

interface Props {
  rentals: ActiveRental[]
}

const TONE_TEXT: Record<RentalProgress['tone'], string> = {
  normal: 'text-white/60',
  today: 'text-sky-300',
  overdue: 'text-red-300',
}

const TONE_BAR: Record<RentalProgress['tone'], string> = {
  normal: 'bg-white/60',
  today: 'bg-sky-400',
  overdue: 'bg-red-400',
}

const money = (n: number): string => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`

export default function ActiveRentalsPanel({ rentals }: Props) {
  const overdue = rentals.filter((r) => r.progress.tone === 'overdue').length

  return (
    <div className="glass rounded-2xl border border-white/[0.10] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 lg:px-6 py-4 border-b border-white/[0.06]">
        <div>
          <h3 className="text-white font-bold text-sm">
            Active rentals <span className="text-white/50 font-semibold tabular-nums">· {rentals.length}</span>
          </h3>
          <div className="text-[12px] text-white/55 mt-0.5">
            {overdue > 0 ? <span className="text-red-300">{overdue} overdue · </span> : null}
            Soonest return first
          </div>
        </div>
      </div>

      {rentals.length === 0 ? (
        <div className="px-6 py-8 text-center text-white/50 text-sm">No cars out right now</div>
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {rentals.map((r) => {
            const time = formatClock(r.returnTime)
            return (
              <Link
                key={r.id}
                href={`/dashboard/bookings?q=${encodeURIComponent(r.bookingCode ?? r.customer)}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_90px] gap-x-4 gap-y-2 items-center px-4 lg:px-6 py-3.5 hover:bg-white/[0.04] transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-sm text-white font-medium truncate">{r.customer}</div>
                  <div className="text-[12px] text-white/55 truncate lg:hidden">{r.vehicle}</div>
                </div>
                <div className="hidden lg:block min-w-0">
                  <div className="text-[13px] text-white/75 truncate" title={r.vehicle}>{r.vehicle}</div>
                  <div className="text-[12px] text-white/50 tabular-nums">{r.dates}</div>
                </div>
                <div className="col-span-2 lg:col-span-1 row-start-2 lg:row-start-auto min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-1.5 text-[12px]">
                    <span className={`font-semibold ${TONE_TEXT[r.progress.tone]}`}>
                      {r.progress.label}{time && r.progress.tone !== 'overdue' ? ` · ${time}` : ''}
                    </span>
                    {r.progress.totalDays != null && (
                      <span className="text-white/45 tabular-nums shrink-0">
                        Day {Math.min(r.progress.day, r.progress.totalDays)} of {r.progress.totalDays}
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 bg-white/[0.10] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${TONE_BAR[r.progress.tone]}`}
                      style={{ width: `${r.progress.pct ?? 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-right text-sm text-white/85 font-medium tabular-nums row-start-1 col-start-2 lg:row-start-auto lg:col-start-auto">
                  {r.total != null ? money(r.total) : '—'}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
