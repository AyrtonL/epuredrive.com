import { requireSuperuser } from '@/lib/supabase/admin-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'

interface FeedbackRow {
  id: string
  rating: number
  comment: string | null
  created_at: string
  tenant_id: string
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

export default async function AdminTenantFeedbackPage() {
  const { supabase } = await requireSuperuser()

  const { data: feedback } = await supabase
    .from('tenant_feedback')
    .select('id, rating, comment, created_at, tenant_id')
    .order('created_at', { ascending: false })

  const rows = (feedback as FeedbackRow[]) ?? []

  const tenantIds = Array.from(new Set(rows.map((r) => r.tenant_id)))
  const { data: tenants } = tenantIds.length
    ? await supabase.from('tenants').select('id, name, brand_name').in('id', tenantIds)
    : { data: [] as Array<{ id: string; name: string | null; brand_name: string | null }> }

  const tenantMap = new Map((tenants ?? []).map((t) => [t.id, t.brand_name || t.name || 'Unknown']))

  const avgRating = rows.length ? rows.reduce((sum, r) => sum + r.rating, 0) / rows.length : 0

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-32">
      <PageHeader title="Tenant Feedback" description="What tenants think of éPure Drive itself — submitted via the product-feedback email." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Responses" value={rows.length} />
        <StatCard label="Average Rating" value={rows.length ? avgRating.toFixed(1) : '—'} sub={rows.length ? 'out of 5 stars' : undefined} />
        <StatCard label="5-Star Responses" value={rows.filter((r) => r.rating === 5).length} />
      </div>
      {rows.length === 0 ? (
        <div className="glass border border-white/10 rounded-3xl p-12 text-center">
          <p className="text-white/40 text-sm">
            No responses yet. They&apos;ll show up here once tenants reply to the feedback email.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="glass border border-white/10 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="text-white font-semibold text-sm">{tenantMap.get(r.tenant_id) || 'Unknown tenant'}</div>
                  <div className="text-white/40 text-xs mt-0.5">
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
