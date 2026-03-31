import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'
import type { Consignment, Car } from '@/lib/supabase/types'

export default async function ConsignmentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()
  const tenantId = profile!.tenant_id

  const [{ data: consignments }, { data: cars }] = await Promise.all([
    supabase.from('consignments').select('*').eq('tenant_id', tenantId).order('car_id'),
    supabase.from('cars').select('id, make, model, model_full').eq('tenant_id', tenantId),
  ])

  const rows = (consignments as Consignment[]) ?? []
  const carRows = (cars as Car[]) ?? []
  const carMap = Object.fromEntries(carRows.map((c) => [c.id, `${c.make} ${c.model_full || c.model}`]))

  return (
    <div className="max-w-5xl">
      <PageHeader title="Consignments" description="Cars managed for third-party owners." />
      {rows.length === 0 ? (
        <EmptyState message="No consignments." />
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 border-b border-white/10">
                <th className="px-6 py-4 font-medium">Car</th>
                <th className="px-6 py-4 font-medium">Owner</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">Split</th>
                <th className="px-6 py-4 font-medium">Contract</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-white font-medium">{c.car_id ? carMap[c.car_id] ?? `Car #${c.car_id}` : '—'}</td>
                  <td className="px-6 py-4 text-white/70">{c.owner_name ?? '—'}</td>
                  <td className="px-6 py-4 text-white/60 text-xs">
                    <div>{c.owner_email ?? '—'}</div>
                    <div>{c.owner_phone ?? ''}</div>
                  </td>
                  <td className="px-6 py-4 text-white/70">{c.owner_percentage != null ? `${c.owner_percentage}%` : '—'}</td>
                  <td className="px-6 py-4 text-white/40 text-xs">
                    {c.contract_start ? new Date(c.contract_start).toLocaleDateString() : '—'}
                    {c.contract_end ? ` → ${new Date(c.contract_end).toLocaleDateString()}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
