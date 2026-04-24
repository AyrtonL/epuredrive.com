'use client'

// components/telematics/VehicleDrawer.tsx
// Right-side slide-in drawer for a selected vehicle on the Live Map.
// Content is rendered from props — the page owns the data fetch so we keep
// this component dumb and cheap to re-render on polling ticks.
import Link from 'next/link'
import type { TelematicsEvent } from '@/lib/supabase/types'
import type { MapVehicle } from './types'
import { formatRelative, statusColor, statusLabel } from './types'

interface Props {
  vehicle: MapVehicle | null
  mileage: number | null
  reservationId: string | null
  recentEvents: TelematicsEvent[]
  onClose: () => void
}

function formatMileage(n: number | null): string {
  if (n === null || Number.isNaN(n)) return '—'
  return `${n.toLocaleString()} mi`
}

export default function VehicleDrawer({
  vehicle,
  mileage,
  reservationId,
  recentEvents,
  onClose,
}: Props) {
  const open = vehicle !== null

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 transition-opacity duration-200 z-40 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-background border-l border-white/10 shadow-2xl transform transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!open}
      >
        {vehicle && (
          <div className="flex flex-col h-full">
            <div className="flex items-start justify-between p-6 border-b border-white/10">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">
                  Vehicle
                </div>
                <div className="text-white font-bold text-xl">
                  {vehicle.plate ?? ([vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Unknown')}
                </div>
                <div className="text-white/60 text-sm mt-1">
                  {[vehicle.make, vehicle.model].filter(Boolean).join(' ')}
                </div>
                <span
                  className="inline-flex items-center gap-2 mt-3 rounded-full bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: statusColor(vehicle.status) }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: statusColor(vehicle.status) }}
                  />
                  {statusLabel(vehicle.status)}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-white/40 hover:text-white/80 text-xl leading-none p-1"
                aria-label="Close drawer"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <InfoRow label="Last seen" value={formatRelative(vehicle.last_seen_at)} />
                <InfoRow label="Mileage" value={formatMileage(mileage)} />
              </dl>

              {reservationId && (
                <Link
                  href={`/dashboard/bookings/${reservationId}`}
                  className="block rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80 hover:border-white/25 hover:bg-white/5 transition-colors"
                >
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-0.5">
                    Active reservation
                  </div>
                  View booking &rarr;
                </Link>
              )}

              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">
                  Recent events
                </div>
                {recentEvents.length === 0 ? (
                  <div className="text-white/40 text-sm">No events yet.</div>
                ) : (
                  <ul className="space-y-2">
                    {recentEvents.slice(0, 3).map((ev) => (
                      <li
                        key={ev.id}
                        className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white/80">
                            {ev.event_type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-white/40">{formatRelative(ev.occurred_at)}</span>
                        </div>
                        <div className="text-white/50 text-[11px] mt-0.5 uppercase tracking-wider">
                          {ev.severity}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-white/10">
              <Link
                href={`/dashboard/fleet/${vehicle.id}`}
                className="block w-full text-center bg-white text-black hover:bg-white/90 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
              >
                Go to car
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</dt>
      <dd className="mt-1 text-white/80">{value}</dd>
    </div>
  )
}
