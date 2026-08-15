import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'

interface ReviewRow {
  id: string
  rating: number
  comment: string | null
  created_at: string
  reservation_id: string
  car_id: number | null
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 shrink-0" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="text-lg leading-none" style={{ color: n <= rating ? '#f5b400' : '#3a3a3a' }}>
          {n <= rating ? '★' : '☆'}
        </span>
      ))}
    </div>
  )
}

export default async function ReviewsPage() {
  const { supabase, tenantId } = await requireTenantId()

  const { data: reviews } = await supabase
    .from('reservation_reviews')
    .select('id, rating, comment, created_at, reservation_id, car_id')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  const rows = (reviews as ReviewRow[]) ?? []

  const reservationIds = Array.from(new Set(rows.map((r) => r.reservation_id)))
  const carIds = Array.from(new Set(rows.map((r) => r.car_id).filter((id): id is number => id != null)))

  const [{ data: reservations }, { data: cars }] = await Promise.all([
    reservationIds.length
      ? supabase.from('reservations').select('id, customer_name').in('id', reservationIds)
      : Promise.resolve({ data: [] as Array<{ id: string; customer_name: string | null }> }),
    carIds.length
      ? supabase.from('cars').select('id, make, model, model_full').in('id', carIds)
      : Promise.resolve({
          data: [] as Array<{ id: number; make: string | null; model: string | null; model_full: string | null }>,
        }),
  ])

  const customerMap = new Map((reservations ?? []).map((r) => [r.id, r.customer_name]))
  const carMap = new Map(
    (cars ?? []).map((c) => [c.id, `${c.make ?? ''} ${c.model_full || c.model || ''}`.trim() || 'Vehicle']),
  )

  const avgRating = rows.length ? rows.reduce((sum, r) => sum + r.rating, 0) / rows.length : 0

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-32">
      <PageHeader title="Reviews" description="Star ratings and comments left by renters after their trip." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Reviews" value={rows.length} />
        <StatCard label="Average Rating" value={rows.length ? avgRating.toFixed(1) : '—'} sub={rows.length ? 'out of 5 stars' : undefined} />
        <StatCard label="5-Star Reviews" value={rows.filter((r) => r.rating === 5).length} />
      </div>
      {rows.length === 0 ? (
        <div className="glass border border-white/10 rounded-3xl p-12 text-center">
          <p className="text-white/40 text-sm">
            No reviews yet. They&apos;ll show up here once renters leave feedback after their trip.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="glass border border-white/10 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="text-white font-semibold text-sm">{customerMap.get(r.reservation_id) || 'Renter'}</div>
                  <div className="text-white/40 text-xs mt-0.5">
                    {r.car_id ? carMap.get(r.car_id) : 'Vehicle'} ·{' '}
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <Stars rating={r.rating} />
              </div>
              {r.comment && <p className="text-white/70 text-sm leading-relaxed mt-3">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
