import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tenant, Car } from '@/lib/supabase/types'
import type { Metadata } from 'next'
import FleetGrid from '@/components/sites/FleetGrid'
import BackLink from '@/components/sites/FleetBackLink'

interface Props {
  params: { slug: string }
  searchParams: { pickup?: string; return?: string; pickTime?: string; retTime?: string; location?: string }
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

export default async function FleetSubPage({ params, searchParams }: Props) {
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

  const pickupDate = searchParams.pickup
  const returnDate = searchParams.return
  const hasDateSearch = !!(pickupDate && returnDate)

  // Find car IDs that have overlapping confirmed/pending reservations in the requested range
  let bookedCarIds: number[] = []
  if (hasDateSearch) {
    const { data: conflicts } = await supabase
      .from('reservations')
      .select('car_id')
      .eq('tenant_id', typedTenant.id)
      .in('status', ['pending', 'confirmed'])
      .lte('pickup_date', returnDate!)
      .gte('return_date', pickupDate!)

    bookedCarIds = (conflicts ?? [])
      .map((r) => r.car_id)
      .filter((id): id is number => id !== null)
  }

  let carsQuery = supabase
    .from('cars')
    .select('*')
    .eq('tenant_id', typedTenant.id)
    .in('status', ['available', 'active'])
    .order('daily_rate', { ascending: true })

  if (bookedCarIds.length > 0) {
    carsQuery = carsQuery.not('id', 'in', `(${bookedCarIds.join(',')})`)
  }

  const { data: cars } = await carsQuery

  const fleet = (cars ?? []) as Car[]
  const displayName = typedTenant.brand_name || typedTenant.name

  const formatDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <main>
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-8">
        <BackLink slug={params.slug} />
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[.4em] text-primary/60 mb-4">Complete Collection</p>
          <h1 className="text-4xl sm:text-5xl font-outfit font-black text-white tracking-tight mb-4">
            Our Fleet
          </h1>
          {hasDateSearch ? (
            <div className="flex flex-col items-center gap-3">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20">
                <svg className="w-3.5 h-3.5 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                  {formatDate(pickupDate!)} — {formatDate(returnDate!)}
                  {searchParams.pickTime ? ` · ${searchParams.pickTime}` : ''}
                </span>
              </div>
              <p className="text-white/40 text-sm">
                {fleet.length > 0
                  ? `${fleet.length} vehicle${fleet.length === 1 ? '' : 's'} available for your dates`
                  : `No vehicles available for the selected dates`}
              </p>
            </div>
          ) : (
            <p className="text-white/40 text-base max-w-xl mx-auto">
              {fleet.length > 0
                ? `${fleet.length} vehicle${fleet.length === 1 ? '' : 's'} available from ${displayName}`
                : `No vehicles currently available from ${displayName}`}
            </p>
          )}
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
