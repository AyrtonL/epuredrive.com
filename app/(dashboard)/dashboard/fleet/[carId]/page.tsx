import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import CarEditForm from './CarEditForm'
import RecallsPanel, { type CarRecall } from './RecallsPanel'
import type { Car } from '@/lib/supabase/types'

interface Props {
  params: { carId: string }
}

export default async function CarEditPage({ params }: Props) {
  const { supabase, tenantId } = await requireTenantId()

  const carId = Number(params.carId)
  const [{ data: car }, { data: recalls }] = await Promise.all([
    supabase.from('cars').select('*').eq('id', carId).eq('tenant_id', tenantId).single(),
    supabase
      .from('car_recalls')
      .select('id, campaign_number, component, summary, consequence, remedy, report_received_date, park_it, park_outside, matched_make, matched_model, matched_year, status')
      .eq('car_id', carId)
      .eq('tenant_id', tenantId)
      .order('status', { ascending: true })
      .order('report_received_date', { ascending: false }),
  ])

  if (!car) notFound()

  const c = car as Car

  return (
    <div className="max-w-3xl">
      <div className="mb-2">
        <Link href="/dashboard/fleet" className="text-sm text-white/40 hover:text-white transition-colors">
          ← Back to fleet
        </Link>
      </div>
      <PageHeader
        title={`${c.make} ${c.model_full || c.model}`}
        description={`Car ID: ${c.id}`}
      />
      {recalls && recalls.length > 0 && <RecallsPanel recalls={recalls as CarRecall[]} vin={c.vin} />}
      <CarEditForm car={c} />
    </div>
  )
}
