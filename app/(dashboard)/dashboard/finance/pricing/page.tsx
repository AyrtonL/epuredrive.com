import Link from 'next/link'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import { carDisplayName } from '@/lib/utils/car-display-name'
import { todayISO } from '@/lib/finance/revenue'
import { MIAMI_SEASONS, nextPeak, suggestPrices, type SeasonKind } from '@/lib/pricing/seasonal'
import ApplyRateButton from './ApplyRateButton'
import { fetchConsignedCarIds, sortOwnedFirst } from '@/lib/fleet/ownership'

export const dynamic = 'force-dynamic'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const SEASON_LABEL: Record<SeasonKind, string> = { low: 'Low season', high: 'High season', peak: 'Peak dates' }
const SEASON_COLOR: Record<SeasonKind, string> = {
  low: 'text-sky-300',
  high: 'text-amber-300',
  peak: 'text-rose-300',
}

const money = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? '—' : `$${Math.round(n).toLocaleString('en-US')}`
const pct = (n: number) => `${Math.round(n * 100)}%`
const shortDate = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`

const BASE_NOTE: Record<string, string> = {
  direct: 'Based on your direct bookings',
  all: 'Based on all bookings (few direct ones)',
  list: 'Not enough rentals yet — based on list price',
  none: 'No price or rentals yet',
}

export default async function PricingPage() {
  const { supabase, tenantId } = await requireTenantId()
  const today = todayISO()

  const [{ data: cars }, { data: reservations }, consignedIds] = await Promise.all([
    supabase.from('cars').select('id, make, model, model_full, daily_rate, status').eq('tenant_id', tenantId),
    supabase
      .from('reservations')
      .select('car_id, pickup_date, return_date, status, source, total_amount')
      .eq('tenant_id', tenantId)
      .in('status', ['completed', 'active']),
    fetchConsignedCarIds(supabase, tenantId),
  ])

  const fleet = (cars ?? [])
    .filter((c) => (c.status ?? '') !== 'retired')
    .map((c) => ({ id: c.id as number, name: carDisplayName(c), dailyRate: c.daily_rate != null ? Number(c.daily_rate) : null }))

  const { cars: rows, season } = suggestPrices({ cars: fleet, reservations: reservations ?? [], today })
  const sorted = sortOwnedFirst(rows, consignedIds, (r) => r.carId, (a, b) => (b.base ?? 0) - (a.base ?? 0))
  const peak = nextPeak(today)
  const m = MIAMI_SEASONS.multipliers

  // Next 12 months, starting with the current one.
  const startMonth = Number(today.slice(5, 7))
  const calendar = Array.from({ length: 12 }, (_, i) => {
    const month = ((startMonth - 1 + i) % 12) + 1
    const isHigh = MIAMI_SEASONS.highMonths.includes(month)
    const mm = String(month).padStart(2, '0')
    const peaks = MIAMI_SEASONS.peaks.filter((p) => p.from.startsWith(mm) || p.to.startsWith(mm)).map((p) => p.name)
    return { month, isHigh, peaks, isNow: i === 0 }
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Seasonal Pricing"
        description="Suggested daily rates for low season, high season and peak dates, based on what each vehicle actually earns. Suggestions only — nothing changes until you apply a price."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="kpi-card glass border border-white/[0.14] rounded-2xl p-4">
          <div className="text-[10px] font-bold text-white/55 uppercase tracking-widest mb-2">Today</div>
          <div className={`kpi-value font-bold ${SEASON_COLOR[season.kind]}`}>{season.label}</div>
          <div className="text-[11px] text-white/45 mt-1">The “Use” button applies the suggestion for this period.</div>
        </div>
        <div className="kpi-card glass border border-white/[0.14] rounded-2xl p-4">
          <div className="text-[10px] font-bold text-white/55 uppercase tracking-widest mb-2">Next peak</div>
          <div className="kpi-value font-bold text-rose-300">{peak ? peak.name : '—'}</div>
          <div className="text-[11px] text-white/45 mt-1">
            {peak ? `${peak.from <= today ? 'Now · until' : `${shortDate(peak.from)} –`} ${shortDate(peak.to)} (approx.)` : ''}
          </div>
        </div>
        <div className="kpi-card glass border border-white/[0.14] rounded-2xl p-4">
          <div className="text-[10px] font-bold text-white/55 uppercase tracking-widest mb-2">Season multipliers</div>
          <div className="kpi-value font-bold text-white text-base">
            <span className="text-sky-300">×{m.low}</span> · <span className="text-amber-300">×{m.high}</span> · <span className="text-rose-300">×{m.peak}</span>
          </div>
          <div className="text-[11px] text-white/45 mt-1">Low · High · Peak, applied to each car’s base price</div>
        </div>
      </div>

      <div className="glass border border-white/[0.14] rounded-2xl p-4 md:p-5">
        <h2 className="text-white font-bold text-sm mb-3">Miami season calendar</h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
          {calendar.map((c) => (
            <div
              key={c.month}
              className={`rounded-lg px-2 py-2 border text-center ${
                c.isHigh ? 'bg-amber-400/[0.10] border-amber-400/25' : 'bg-sky-400/[0.08] border-sky-400/20'
              } ${c.isNow ? 'ring-1 ring-white/60' : ''}`}
              title={c.peaks.length ? `Peak: ${c.peaks.join(', ')}` : c.isHigh ? 'High season' : 'Low season'}
            >
              <div className="text-[12px] font-bold text-white/85">{MONTHS[c.month - 1]}</div>
              <div className={`text-[9px] uppercase tracking-widest ${c.isHigh ? 'text-amber-300/80' : 'text-sky-300/80'}`}>
                {c.isHigh ? 'High' : 'Low'}
              </div>
              {c.peaks.length > 0 && <div className="mt-1 mx-auto w-1.5 h-1.5 rounded-full bg-rose-400" aria-label="Peak dates" />}
            </div>
          ))}
        </div>
        <div className="text-[11px] text-white/45 mt-3">
          Peaks (approx.): {MIAMI_SEASONS.peaks.map((p) => `${p.name} ${shortDate(`2000-${p.from}`)}–${shortDate(`2000-${p.to}`)}`).join(' · ')}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">
          No vehicles yet. <Link href="/dashboard/fleet" className="underline">Add one in Fleet</Link>.
        </div>
      ) : (
        <div className="data-table rounded-2xl">
          <table className="m-cards w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-white/55 border-b border-white/[0.10] bg-white/[0.04]">
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3 text-right">List price</th>
                <th className="px-4 py-3 text-right">You earn / day</th>
                <th className="px-4 py-3 text-right">Utilization 90d</th>
                <th className="px-4 py-3 text-right text-sky-300">Low</th>
                <th className="px-4 py-3 text-right text-amber-300">High</th>
                <th className="px-4 py-3 text-right text-rose-300">Peak</th>
                <th className="px-4 py-3 text-right">Now</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.07]">
              {sorted.map((r) => (
                <tr key={r.carId} className="hover:bg-white/5 transition-colors tabular-nums align-top">
                  <td data-primary className="px-4 py-3 text-white font-medium">
                    <Link href={`/dashboard/fleet/${r.carId}`} className="hover:underline underline-offset-2">{r.name}</Link>
                    <div className="text-[10px] text-white/40 mt-1 font-normal">{BASE_NOTE[r.baseSource]}</div>
                    {r.listTooHigh && (
                      <div className="text-[10px] text-amber-300/90 mt-1 font-normal">
                        List price is far above what this car actually earns
                      </div>
                    )}
                  </td>
                  <td data-label="List price" className="px-4 py-3 text-right text-white/85">{money(r.listRate)}</td>
                  <td data-label="You earn / day" className="px-4 py-3 text-right text-white/85">
                    {money(r.realizedPerDay)}
                    {(r.realizedDirectPerDay != null || r.realizedTuroPerDay != null) && (
                      <div className="text-[10px] text-white/40 mt-1">
                        {r.realizedDirectPerDay != null && `Direct ${money(r.realizedDirectPerDay)}`}
                        {r.realizedDirectPerDay != null && r.realizedTuroPerDay != null && ' · '}
                        {r.realizedTuroPerDay != null && `Turo ${money(r.realizedTuroPerDay)}`}
                      </div>
                    )}
                  </td>
                  <td data-label="Utilization 90d" className="px-4 py-3 text-right text-white/65">{pct(r.utilization90)}</td>
                  <td data-label="Low season" className="px-4 py-3 text-right text-sky-300 font-bold">{money(r.suggested?.low)}</td>
                  <td data-label="High season" className="px-4 py-3 text-right text-amber-300 font-bold">{money(r.suggested?.high)}</td>
                  <td data-label="Peak" className="px-4 py-3 text-right text-rose-300 font-bold">{money(r.suggested?.peak)}</td>
                  <td data-label="Now" className="px-4 py-3 text-right">
                    {r.suggestedNow != null ? <ApplyRateButton carId={r.carId} rate={r.suggestedNow} current={r.listRate} /> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-white/40 leading-relaxed">
        How it works: each car’s base is what it actually earned per rented day over the last 12 months (completed rentals — direct
        bookings when there are at least 3, otherwise all channels, otherwise the list price). Busy cars get a small bump (+5% at 50%
        utilization, +10% at 70%) and idle ones a small cut (−5% under 25%). The base is then multiplied for each season and rounded to
        $5. Turo prices are managed in Turo; applying a price here changes your list rate on your own site and new direct bookings only.
      </p>
    </div>
  )
}
