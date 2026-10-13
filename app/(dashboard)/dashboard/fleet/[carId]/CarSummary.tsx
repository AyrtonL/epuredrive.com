import Link from 'next/link'
import StatCard from '@/components/dashboard/StatCard'
import type { CarStatus } from '@/lib/fleet/car-status'
import { formatDateRange } from '@/lib/dashboard/overview-metrics'
import { formatDate, formatMoney } from '@/lib/utils/format'
import { formatRelative } from '@/components/telematics/types'
import type { ExpiryStatus } from '@/lib/fleet/document-expiry'

export interface SummaryBooking {
  id: string
  bookingCode: string | null
  customer: string
  pickup: string | null
  ret: string | null
  status: string | null
  total: number | null
}

export interface LastService {
  date: string
  label: string
  amount: number | null
}

interface Props {
  today: string
  status: CarStatus
  revenue: number
  trips: number
  utilizationPct: number
  windowDays: number
  upcoming: SummaryBooking[]
  recent: SummaryBooking[]
  lastService: LastService | null
  gps: { lastSeenAt: string | null } | null
  mileage: number | null
  documents: { registration: { date: string | null; status: ExpiryStatus }; insurance: { date: string | null; status: ExpiryStatus } }
}

const DOC_TONE: Record<ExpiryStatus['state'], string> = {
  expired: 'text-red-300',
  soon: 'text-amber-300',
  ok: 'text-white/60',
  missing: 'text-white/40',
}

function DocLine({ name, date, status }: { name: string; date: string | null; status: ExpiryStatus }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-white font-medium">{name}</span>
      <span className={`text-[12px] text-right ${DOC_TONE[status.state]}`}>
        {status.state === 'missing' ? 'Not set · add below' : `${formatDate(date)} · ${status.label}`}
      </span>
    </div>
  )
}

const STATUS_TEXT: Record<CarStatus['kind'], string> = {
  on_rent: 'text-sky-300',
  overdue: 'text-red-300',
  available: 'text-emerald-300',
  maintenance: 'text-amber-300',
  retired: 'text-white/60',
}

function BookingList({ title, items, empty, today }: { title: string; items: SummaryBooking[]; empty: string; today: string }) {
  return (
    <div className="glass rounded-2xl border border-white/[0.10] overflow-hidden">
      <h3 className="px-5 py-4 border-b border-white/[0.06] text-white font-bold text-sm">{title}</h3>
      {items.length === 0 ? (
        <div className="px-5 py-6 text-[13px] text-white/50">{empty}</div>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {items.map((b) => (
            <li key={b.id}>
              <Link
                href={`/dashboard/bookings?q=${encodeURIComponent(b.bookingCode ?? b.customer)}`}
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-white/[0.04] transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-[13px] text-white font-medium truncate">{b.customer}</div>
                  <div className="text-[12px] text-white/55 tabular-nums">{formatDateRange(b.pickup, b.ret, today)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[13px] text-white/85 tabular-nums">{formatMoney(b.total)}</div>
                  <div className="text-[10px] uppercase tracking-wider text-white/45">{b.status}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function CarSummary(p: Props) {
  return (
    <div className="space-y-6 mb-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="kpi-card glass rounded-2xl p-4 md:p-6 border border-white/[0.16]">
          <div className="text-[10px] font-bold text-white/55 uppercase tracking-[0.18em] mb-2 md:mb-4">Right now</div>
          <div className={`kpi-value font-black tracking-tight ${STATUS_TEXT[p.status.kind]}`}>{p.status.label}</div>
          <div className="text-[12px] text-white/60 font-medium mt-1.5">{p.status.detail}</div>
        </div>
        <StatCard label="Revenue · All time" value={formatMoney(p.revenue, { cents: false })} sub="completed rentals" />
        <StatCard label="Trips" value={p.trips} sub="completed" />
        <StatCard label={`Utilization · ${p.windowDays}d`} value={`${p.utilizationPct}%`} sub="days rented" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BookingList title="Current & upcoming" items={p.upcoming} empty="No upcoming bookings." today={p.today} />
        <BookingList title="Recent trips" items={p.recent} empty="No completed trips yet." today={p.today} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="glass rounded-2xl border border-white/[0.10] p-5 space-y-1.5">
          <div className="text-[11px] font-semibold text-white/55 mb-1">Documents</div>
          <DocLine name="Registration" date={p.documents.registration.date} status={p.documents.registration.status} />
          <DocLine name="Insurance" date={p.documents.insurance.date} status={p.documents.insurance.status} />
        </div>
        <div className="glass rounded-2xl border border-white/[0.10] p-5">
          <div className="text-[11px] font-semibold text-white/55 mb-1">Last service</div>
          {p.lastService ? (
            <>
              <div className="text-sm text-white font-medium">{p.lastService.label}</div>
              <div className="text-[12px] text-white/55">
                {formatDate(p.lastService.date)}{p.lastService.amount != null ? ` · ${formatMoney(p.lastService.amount)}` : ''}
              </div>
            </>
          ) : (
            <Link href="/dashboard/maintenance" className="text-[13px] text-white/60 hover:text-white">No service logged · Log one →</Link>
          )}
        </div>
        <div className="glass rounded-2xl border border-white/[0.10] p-5">
          <div className="text-[11px] font-semibold text-white/55 mb-1">Mileage</div>
          <div className="text-sm text-white font-medium tabular-nums">{p.mileage != null ? `${p.mileage.toLocaleString('en-US')} mi` : '—'}</div>
        </div>
        <div className="glass rounded-2xl border border-white/[0.10] p-5">
          <div className="text-[11px] font-semibold text-white/55 mb-1">GPS</div>
          {p.gps ? (
            <Link href="/dashboard/telematics" className="text-sm text-white font-medium hover:underline underline-offset-4">
              Last seen {formatRelative(p.gps.lastSeenAt).toLowerCase()} · Live map →
            </Link>
          ) : (
            <div className="text-[13px] text-white/50">No tracker connected</div>
          )}
        </div>
      </div>
    </div>
  )
}
