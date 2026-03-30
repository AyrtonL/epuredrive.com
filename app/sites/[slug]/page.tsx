// app/sites/[slug]/page.tsx
import { createClient } from '@/lib/supabase/server'
import CarCard from '@/components/CarCard'
import type { Car, Tenant } from '@/lib/supabase/types'

interface Props {
  params: { slug: string }
}

export default async function TenantFleetPage({ params }: Props) {
  const supabase = createClient()

  // Load tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, brand_name')
    .eq('slug', params.slug)
    .single()

  if (!tenant) return null // layout handles 404

  // Load tenant's active cars
  const { data: cars } = await supabase
    .from('cars')
    .select('id, make, model, model_full, year, daily_rate, image_url, category, badge, seats, transmission, hp, description, tenant_id, status')
    .eq('tenant_id', (tenant as Tenant).id)
    .neq('status', 'retired')
    .order('id')

  const displayName = (tenant as Tenant).brand_name || (tenant as Tenant).name

  return (
    <div id="cars" className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Our Fleet</h1>
        <p className="text-white/50">
          {cars?.length ?? 0} vehicle{cars?.length !== 1 ? 's' : ''} available from {displayName}
        </p>
      </div>

      {cars && cars.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cars.map((car) => (
            <CarCard key={car.id} car={car as Car} slug={params.slug} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 text-white/30">
          <p className="text-lg">No vehicles listed yet.</p>
        </div>
      )}
    </div>
  )
}
