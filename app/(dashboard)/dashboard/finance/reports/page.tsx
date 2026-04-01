import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import ReportsClient from './ReportsClient'
import type { Reservation, Transaction } from '@/lib/supabase/types'

export default async function ReportsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()
  const tenantId = profile!.tenant_id

  const [{ data: reservations }, { data: transactions }, { data: cars }] = await Promise.all([
    supabase.from('reservations').select('*').eq('tenant_id', tenantId),
    supabase.from('transactions').select('*').eq('tenant_id', tenantId).order('transaction_date', { ascending: false }),
    supabase.from('cars').select('id, make, model, model_full').eq('tenant_id', tenantId)
  ])

  return (
    <div className="max-w-7xl space-y-6">
      <PageHeader title="Reports" description="Filter by date range, track revenue and expenses, download CSV exports." />
      <ReportsClient 
        reservations={(reservations as Reservation[]) ?? []} 
        expenses={(transactions as Transaction[]) ?? []} 
        cars={(cars as any[]) ?? []}
      />
    </div>
  )
}
