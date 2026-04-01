import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import ReportsClient from './ReportsClient'
import type { Reservation, Transaction } from '@/lib/supabase/types'

export default async function ReportsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()
  const tenantId = profile!.tenant_id

  const [{ data: reservations }, { data: expenses }] = await Promise.all([
    supabase
      .from('reservations')
      .select('id, customer_name, customer_email, customer_phone, pickup_date, return_date, total_amount, status')
      .eq('tenant_id', tenantId)
      .order('pickup_date', { ascending: false }),
    supabase
      .from('transactions')
      .select('id, transaction_date, category, description, amount, car_id')
      .eq('tenant_id', tenantId)
      .order('transaction_date', { ascending: false }),
  ])

  const rows = (reservations as Reservation[]) ?? []
  const expenseRows = (expenses as Transaction[]) ?? []

  return (
    <div className="max-w-7xl space-y-6">
      <PageHeader title="Reports" description="Filter by date range, track revenue and expenses, download CSV exports." />
      <ReportsClient reservations={rows} expenses={expenseRows} />
    </div>
  )
}
