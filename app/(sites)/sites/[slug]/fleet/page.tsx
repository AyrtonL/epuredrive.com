import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tenant, Car } from '@/lib/supabase/types'
import type { Metadata } from 'next'
import FleetGrid from '@/components/sites/FleetGrid'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, brand_name')
    .eq('slug', params.slug)
    .single()

  const displayName = tenant?.brand_name || tenant?.name || 'Fleet'
  return {
    title: `${displayName} — Full Fleet`,
    description: `Browse all vehicles available from ${displayName}.`,
  }
}

export default async function FleetSubPage({ params }: Props) {
  const supabase = createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!tenant) notFound()

  const typedTenant = {
    ...tenant,
    pickup_locations: Array.isArray(tenant.pickup_locations) ? tenant.pickup_locations : [],
  } as Tenant

  const { data: cars } = await supabase
    .from('cars')
    .select('*')
    .eq('tenant_id', typedTenant.id)
    .in('status', ['available', 'active'])
    .order('daily_rate', { ascending: true })

  const fleet = (cars ?? []) as Car[]
  const displayName = typedTenant.brand_name || typedTenant.name

  return (
    <main>
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-8">
        <a
          href={`/sites/${params.slug}`}
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-white/30 hover:text-white transition-colors mb-8"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Home
        </a>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[.4em] text-primary/60 mb-4">Complete Collection</p>
          <h1 className="text-4xl sm:text-5xl font-outfit font-black text-white tracking-tight mb-4">
            Our Fleet
          </h1>
          <p className="text-white/40 text-base max-w-xl mx-auto">
            {fleet.length > 0
              ? `${fleet.length} vehicle${fleet.length === 1 ? '' : 's'} available from ${displayName}`
              : `No vehicles currently available from ${displayName}`}
          </p>
        </div>
      </div>

      <FleetGrid
        cars={fleet}
        slug={params.slug}
        tenantId={typedTenant.id}
        pickupLocations={typedTenant.pickup_locations}
        whatsappPhone={typedTenant.whatsapp_phone}
      />
    </main>
  )
}
