import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import CarEditForm from './CarEditForm'
import type { Car } from '@/lib/supabase/types'

interface Props {
  params: { carId: string }
}

export default async function CarEditPage({ params }: Props) {
  const { supabase, tenantId } = await requireTenantId()

  const { data: car } = await supabase
    .from('cars')
    .select('*')
    .eq('id', Number(params.carId))
    .eq('tenant_id', tenantId)
    .single()

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
      <CarEditForm car={c} />
    </div>
  )
}
