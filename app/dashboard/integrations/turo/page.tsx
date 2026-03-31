import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'

interface TuroFeed {
  id: number
  car_id: number | null
  last_synced: string | null
  source_name?: string | null
  url?: string | null
}

export default async function TuroPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()
  const tenantId = profile!.tenant_id

  const [{ data: feeds }, { data: cars }] = await Promise.all([
    supabase.from('turo_feeds').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: true }),
    supabase.from('cars').select('id, make, model, model_full').eq('tenant_id', tenantId),
  ])

  const rows = (feeds as TuroFeed[]) ?? []
  const carMap = Object.fromEntries(
    ((cars as { id: number; make: string; model: string; model_full: string | null }[]) ?? []).map((c) => [c.id, `${c.make} ${c.model_full || c.model}`])
  )

  return (
    <div className="max-w-4xl">
      <PageHeader title="Turo Integration" description="iCal feeds synced from Turo." />
      {rows.length === 0 ? (
        <EmptyState message="No Turo feeds configured. Use the old dashboard to add them." />
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 border-b border-white/10">
                <th className="px-6 py-4 font-medium">Car</th>
                <th className="px-6 py-4 font-medium">Last synced</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((f) => (
                <tr key={f.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-white font-medium">
                    {f.car_id ? carMap[f.car_id] ?? `Car #${f.car_id}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-white/50">
                    {f.last_synced ? new Date(f.last_synced).toLocaleString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-6 text-sm text-white/30">
        To manage Turo feeds (add/remove/sync), use the{' '}
        <a href="/admin/dashboard.html" className="text-white/50 hover:text-white transition-colors underline">
          legacy dashboard ↗
        </a>{' '}
        until this page is fully migrated.
      </p>
    </div>
  )
}
