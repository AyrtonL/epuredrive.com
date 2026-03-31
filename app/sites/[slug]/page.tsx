// app/sites/[slug]/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tenant, Car } from '@/lib/supabase/types'
import type { Metadata } from 'next'
import { buildFleetMetadata } from '@/lib/utils/fleet-metadata'
import FleetGrid from '@/components/sites/FleetGrid'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, brand_name, slug, logo_url')
    .eq('slug', params.slug)
    .single()

  if (!tenant) return { title: 'Fleet' }
  return buildFleetMetadata(tenant as Pick<Tenant, 'name' | 'brand_name' | 'slug' | 'logo_url'>, params.slug)
}

export default async function FleetPage({ params }: Props) {
  const supabase = createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, brand_name')
    .eq('slug', params.slug)
    .single()

  if (!tenant) notFound()

  const { data: cars } = await supabase
    .from('cars')
    .select('*')
    .eq('tenant_id', (tenant as Tenant).id)
    .eq('status', 'available')
    .order('daily_rate', { ascending: true })

  const fleet = (cars ?? []) as Car[]
  const displayName = (tenant as Tenant).brand_name || (tenant as Tenant).name

  return (
    <main>
      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          Our Fleet
        </h1>
        <p className="text-white/50 text-lg max-w-xl mx-auto">
          {fleet.length > 0
            ? `${fleet.length} vehicle${fleet.length === 1 ? '' : 's'} available from ${displayName}`
            : `No vehicles currently available from ${displayName}`}
        </p>
      </div>

      <FleetGrid cars={fleet} slug={params.slug} />
    </main>
  )
}
