import Link from 'next/link'
import { formatClock as formatTime } from '@/lib/daily-schedule/build'

export interface TodayItem {
  id: string
  customer: string
  vehicle: string
  time: string | null
  bookingCode: string | null
}

export interface OpenRecall {
  id: number
  carId: number
  vehicle: string
  component: string | null
  parkIt: boolean
}

interface Props {
  pickups: TodayItem[]
  returns: TodayItem[]
  recalls: OpenRecall[]
}

function ItemList({ title, items, empty }: { title: string; items: TodayItem[]; empty: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-semibold text-white/70">{title}</span>
        <span className="text-[12px] text-white/50 tabular-nums">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="text-[12px] text-white/40 py-1">{empty}</div>
      ) : (
        <ul className="space-y-1">
          {items.map((i) => (
            <li key={i.id}>
              <Link
                href={`/dashboard/bookings?q=${encodeURIComponent(i.bookingCode ?? i.customer)}`}
                className="flex items-center justify-between gap-3 px-2.5 py-2 -mx-2.5 rounded-lg hover:bg-white/[0.05] transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-[13px] text-white font-medium truncate">{i.customer}</div>
                  <div className="text-[12px] text-white/55 truncate">{i.vehicle}</div>
                </div>
                {formatTime(i.time) && (
                  <span className="text-[12px] text-white/60 tabular-nums shrink-0">{formatTime(i.time)}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function TodayPanel({ pickups, returns, recalls }: Props) {
  return (
    <div className="glass rounded-2xl p-6 border border-white/[0.10] space-y-5">
      <h3 className="text-white font-bold text-sm">Today</h3>
      <ItemList title="Pickups" items={pickups} empty="No pickups today" />
      <div className="border-t border-white/[0.06]" />
      <ItemList title="Returns" items={returns} empty="No returns today" />

      {recalls.length > 0 && (
        <>
          <div className="border-t border-white/[0.06]" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-amber-300/90">Open safety recalls</span>
              <span className="text-[12px] text-amber-300/80 tabular-nums">{recalls.length}</span>
            </div>
            <ul className="space-y-1">
              {recalls.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/dashboard/fleet/${r.carId}`}
                    className="block px-2.5 py-2 -mx-2.5 rounded-lg hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-white font-medium truncate">{r.vehicle}</span>
                      {r.parkIt && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-300 bg-red-500/15 px-1.5 py-0.5 rounded shrink-0">
                          Do not drive
                        </span>
                      )}
                    </div>
                    {r.component && <div className="text-[12px] text-white/55 truncate">{r.component}</div>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
