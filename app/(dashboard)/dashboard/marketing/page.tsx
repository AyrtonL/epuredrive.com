import Link from 'next/link'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import {
  CHANNEL_LABELS,
  computeChannelStats,
  type ChannelReservation,
} from '@/lib/marketing/channels'

interface SearchParams {
  period?: string
}

const PERIODS = [
  { key: '365', label: 'Last 12 months', days: 365 },
  { key: '90', label: 'Last 90 days', days: 90 },
  { key: 'all', label: 'All time', days: null },
] as const

type PeriodKey = (typeof PERIODS)[number]['key']

/** 2027 targets agreed in the marketing plan — shown next to the live numbers. */
const TARGETS = {
  directShare: 0.6,
  repeatRate: 0.25,
  directEmailCapture: 0.95,
} as const

const PAGE_SIZE = 1000 // PostgREST silently caps selects at 1000 rows — page with range().

const COLUMNS =
  'source, status, total_amount, pickup_date, return_date, customer_name, customer_email, customer_phone'

function fmtCurrency(n: number): string {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function fmtPct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function toneFor(value: number, target: number): string {
  if (value >= target) return 'text-emerald-400'
  if (value >= target * 0.6) return 'text-yellow-400'
  return 'text-red-400'
}

async function fetchReservations(
  supabase: Awaited<ReturnType<typeof requireTenantId>>['supabase'],
  tenantId: string,
  since: string | null,
): Promise<{ rows: ChannelReservation[]; error: string | null }> {
  const rows: ChannelReservation[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase
      .from('reservations')
      .select(COLUMNS)
      .eq('tenant_id', tenantId)
      .order('pickup_date', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (since) query = query.gte('pickup_date', since)
    const { data, error } = await query
    if (error) return { rows, error: error.message }
    rows.push(...((data ?? []) as ChannelReservation[]))
    if (!data || data.length < PAGE_SIZE) return { rows, error: null }
  }
}

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { supabase, tenantId } = await requireTenantId()
  const params = await searchParams
  const period = PERIODS.find((p) => p.key === params.period) ?? PERIODS[0]
  const periodKey: PeriodKey = period.key

  let since: string | null = null
  if (period.days) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - period.days)
    since = d.toISOString().split('T')[0]
  }

  const { rows, error } = await fetchReservations(supabase, tenantId, since)
  const stats = computeChannelStats(rows)
  const repeatRate = stats.uniqueCustomers ? stats.repeatCustomers / stats.uniqueCustomers : 0
  const direct = stats.channels.find((c) => c.channel === 'direct')!
  const turo = stats.channels.find((c) => c.channel === 'turo')!
  const directPremium =
    turo.avgPerEarnedBooking > 0 ? direct.avgPerEarnedBooking / turo.avgPerEarnedBooking - 1 : null

  const cards = [
    {
      label: 'Direct share of bookings',
      value: fmtPct(stats.directShare),
      hint: `Goal ${fmtPct(TARGETS.directShare)}`,
      color: toneFor(stats.directShare, TARGETS.directShare),
    },
    {
      label: 'Repeat customers',
      value: `${stats.repeatCustomers} / ${stats.uniqueCustomers}`,
      hint: `${fmtPct(repeatRate)} · goal ${fmtPct(TARGETS.repeatRate)}`,
      color: toneFor(repeatRate, TARGETS.repeatRate),
    },
    {
      label: 'Direct bookings with email',
      value: fmtPct(stats.directEmailCapture),
      hint: `Goal ${fmtPct(TARGETS.directEmailCapture)} — needed to re-market`,
      color: toneFor(stats.directEmailCapture, TARGETS.directEmailCapture),
    },
    {
      label: 'Direct vs Turo per booking',
      value: directPremium == null ? '—' : `${directPremium >= 0 ? '+' : ''}${fmtPct(directPremium)}`,
      hint: `${fmtCurrency(direct.avgPerEarnedBooking)} vs ${fmtCurrency(turo.avgPerEarnedBooking)}`,
      color: directPremium != null && directPremium > 0 ? 'text-emerald-400' : 'text-white',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Marketing"
        description="Where your bookings come from, what each channel is worth, and how many customers come back."
      />

      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/dashboard/marketing?period=${p.key}`}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-colors ${
              p.key === periodKey
                ? 'bg-white text-black border-white'
                : 'bg-white/[0.04] border-white/[0.10] text-white/60 hover:border-white/25 hover:text-white'
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Couldn&apos;t load bookings: {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="kpi-card glass border border-white/[0.14] rounded-2xl p-4">
            <div className="text-[10px] font-bold text-white/55 uppercase tracking-widest mb-2">{card.label}</div>
            <div className={`kpi-value font-bold ${card.color}`}>{card.value}</div>
            <div className="text-[11px] text-white/40 mt-1">{card.hint}</div>
          </div>
        ))}
      </div>

      {stats.totalBookings === 0 ? (
        <div className="empty-state">No bookings in this period yet.</div>
      ) : (
        <div className="data-table rounded-2xl">
          <table className="m-cards w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-white/55 border-b border-white/[0.10] bg-white/[0.04]">
                <th className="px-6 py-4">Channel</th>
                <th className="px-6 py-4">Bookings</th>
                <th className="px-6 py-4">Share</th>
                <th className="px-6 py-4">Avg rental</th>
                <th className="px-6 py-4">Avg per booking</th>
                <th className="px-6 py-4 text-emerald-400">Earned revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.07]">
              {stats.channels
                .filter((c) => c.bookings > 0)
                .map((c) => (
                  <tr key={c.channel} className="hover:bg-white/5 transition-colors">
                    <td data-primary className="px-6 py-4 text-white font-medium">{CHANNEL_LABELS[c.channel]}</td>
                    <td data-label="Bookings" className="px-6 py-4 text-white/65 tabular-nums">{c.bookings}</td>
                    <td data-label="Share" className="px-6 py-4 text-white/65 tabular-nums">
                      {fmtPct(c.bookings / stats.totalBookings)}
                    </td>
                    <td data-label="Avg rental" className="px-6 py-4 text-white/65 tabular-nums">
                      {c.avgDays.toFixed(1)} days
                    </td>
                    <td data-label="Avg per booking" className="px-6 py-4 text-white/85 tabular-nums">
                      {fmtCurrency(c.avgPerEarnedBooking)}
                    </td>
                    <td data-badge className="px-6 py-4 font-bold text-emerald-400 tabular-nums">
                      {fmtCurrency(c.earnedRevenue)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-white/40 font-light">
        Revenue counts completed rentals only (same as Finance). Turo amounts are host earnings. Repeat
        customers are matched by email, then phone, then name. Don&apos;t contact Turo guests off-platform —
        it breaks Turo&apos;s terms.
      </p>
    </div>
  )
}
