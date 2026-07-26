'use client'

// components/telematics/AlertsClient.tsx
// Client island for the Alerts page:
//   - Filter bar for status / severity / type / car / date range.
//   - Grouped list (by occurred_at day) rendered from a server-provided slice.
//   - Bulk ack + per-row ack via server actions.
//   - 15s polling — uses router.refresh() to re-run the server component
//     which re-queries with the current searchParams and returns fresh rows.
import { useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import AlertRow, { type AlertRowData } from './AlertRow'
import DatePicker from '@/components/ui/DatePicker'
import { ackManyAction } from '@/app/(dashboard)/dashboard/telematics/alerts/actions'
import { useInterval } from './useInterval'
import type {
  TelematicsEventType,
  TelematicsSeverity,
} from '@/lib/supabase/types'

const POLL_MS = 15_000

export type StatusFilter = 'unacked' | 'acked' | 'all'
export type SeverityFilter = 'all' | TelematicsSeverity
export type TypeFilter = 'all' | TelematicsEventType

export interface CarOption {
  id: number
  label: string
}

export interface InitialFilters {
  status: StatusFilter
  severity: SeverityFilter
  type: TypeFilter
  carId: number | null
  from: string
  to: string
}

interface Props {
  alerts: AlertRowData[]
  cars: CarOption[]
  initialFilters: InitialFilters
  totalUnacked: number
}

const EVENT_TYPES: TelematicsEventType[] = [
  'ignition_on',
  'ignition_off',
  'trip_start',
  'trip_end',
  'geofence_enter',
  'geofence_exit',
  'speed_exceeded',
  'hard_braking',
  'hard_accel',
  'dtc_new',
  'dtc_cleared',
  'battery_low',
  'offline',
  'online',
  'connection_expired',
]

function dateKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toISOString().slice(0, 10)
}

function formatGroupDate(key: string): string {
  const d = new Date(`${key}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return key
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function toDateInput(iso: string): string {
  return iso.length >= 10 ? iso.slice(0, 10) : iso
}

export default function AlertsClient({
  alerts,
  cars,
  initialFilters,
  totalUnacked,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const currentParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterError, setFilterError] = useState<string | null>(null)

  const [status, setStatus] = useState<StatusFilter>(initialFilters.status)
  const [severity, setSeverity] = useState<SeverityFilter>(initialFilters.severity)
  const [type, setType] = useState<TypeFilter>(initialFilters.type)
  const [carId, setCarId] = useState<number | null>(initialFilters.carId)
  const [from, setFrom] = useState(toDateInput(initialFilters.from))
  const [to, setTo] = useState(toDateInput(initialFilters.to))

  // Poll: re-run the server component. If the searchParams haven't changed
  // router.refresh() is cheap and keeps RLS-scoped DB queries.
  useInterval(() => {
    router.refresh()
  }, POLL_MS)

  function applyFilters() {
    const q = new URLSearchParams(currentParams?.toString() ?? '')
    q.set('status', status)
    if (severity === 'all') q.delete('severity')
    else q.set('severity', severity)
    if (type === 'all') q.delete('type')
    else q.set('type', type)
    if (carId === null) q.delete('car_id')
    else q.set('car_id', String(carId))
    q.set('from', from)
    q.set('to', to)
    setFilterError(null)
    startTransition(() => {
      router.replace(`${pathname}?${q.toString()}`)
    })
  }

  function toggleSelect(id: string, next: boolean) {
    setSelectedIds((prev) => {
      const copy = new Set(prev)
      if (next) copy.add(id)
      else copy.delete(id)
      return copy
    })
  }

  function ackSelected() {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    startTransition(async () => {
      const res = await ackManyAction(ids)
      if (!res.ok) {
        setFilterError(res.error ?? 'Could not acknowledge selected alerts.')
        return
      }
      setSelectedIds(new Set())
      router.refresh()
    })
  }

  const grouped = useMemo(() => {
    const map = new Map<string, AlertRowData[]>()
    for (const a of alerts) {
      const key = dateKey(a.occurred_at)
      const list = map.get(key) ?? []
      list.push(a)
      map.set(key, list)
    }
    // Newest day first.
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [alerts])

  const selectableUnacked = alerts.filter((a) => a.acknowledged_at === null)
  const allSelected =
    selectableUnacked.length > 0 &&
    selectableUnacked.every((a) => selectedIds.has(a.id))

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(selectableUnacked.map((a) => a.id)))
    }
  }

  return (
    <>
      <div className="glass border border-white/[0.08] rounded-2xl p-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
              Status
            </span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="mt-1 w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-white/30"
            >
              <option value="unacked">Unacked</option>
              <option value="acked">Acked</option>
              <option value="all">All</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
              Severity
            </span>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as SeverityFilter)}
              className="mt-1 w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-white/30"
            >
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
              Type
            </span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TypeFilter)}
              className="mt-1 w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-white/30"
            >
              <option value="all">All</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
              Car
            </span>
            <select
              value={carId === null ? '' : String(carId)}
              onChange={(e) =>
                setCarId(e.target.value === '' ? null : Number(e.target.value))
              }
              className="mt-1 w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-white/30"
            >
              <option value="">All cars</option>
              {cars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <div className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
              From
            </span>
            <DatePicker
              value={from}
              onChange={setFrom}
              className="mt-1 w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-white/30"
            />
          </div>

          <div className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
              To
            </span>
            <DatePicker
              value={to}
              onChange={setTo}
              min={from || undefined}
              className="mt-1 w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-white/30"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={applyFilters}
            disabled={pending}
            className="bg-white text-black hover:bg-white/90 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            Apply filters
          </button>
          <div className="text-white/40 text-xs">
            {totalUnacked} unacked total
          </div>
          {selectableUnacked.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-white/60 ml-auto">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="w-3.5 h-3.5 rounded bg-white/5 border-white/20"
              />
              <span>Select all ({selectableUnacked.length})</span>
            </label>
          )}
          <button
            type="button"
            onClick={ackSelected}
            disabled={pending || selectedIds.size === 0}
            className="bg-white/10 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-wider text-white px-4 py-2 rounded-lg transition-colors"
          >
            Ack selected ({selectedIds.size})
          </button>
        </div>

        {filterError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 text-xs px-3 py-2">
            {filterError}
          </div>
        )}
      </div>

      {grouped.length === 0 ? (
        <div className="glass border border-white/[0.06] rounded-3xl p-12 text-center">
          <div className="text-white font-bold text-lg mb-1">No alerts match</div>
          <div className="text-white/40 text-sm">
            Adjust the filters or come back in a few minutes &mdash; the list
            auto-refreshes every 15 seconds.
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, list]) => (
            <section key={day}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">
                {formatGroupDate(day)}
              </div>
              <ul className="space-y-2">
                {list.map((a) => (
                  <AlertRow
                    key={a.id}
                    alert={a}
                    selected={selectedIds.has(a.id)}
                    onToggleSelect={toggleSelect}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
