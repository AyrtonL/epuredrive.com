import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tenant, Car } from '@/lib/supabase/types'
import type { Metadata } from 'next'
import { buildFleetListMetadata } from '@/lib/utils/fleet-metadata'
import FleetGrid from '@/components/sites/FleetGrid'
import BackLink from '@/components/sites/FleetBackLink'
import QuickSearchBar from '@/components/sites/QuickSearchBar'
import { getSiteBase } from '@/lib/utils/site-base'
import { PUBLIC_CAR_COLUMNS, PUBLIC_TENANT_COLUMNS } from '@/lib/sites/public-car'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUnavailableCarIds } from '@/lib/booking/availability'
import { to24h } from '@/lib/booking/dates'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

interface Props {
  params: { slug: string }
  searchParams: { pickup?: string; return?: string; pickTime?: string; retTime?: string; location?: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, brand_name, slug, logo_url')
    .eq('slug', params.slug)
    .single()

  if (!tenant) notFound()
  return buildFleetListMetadata(tenant as Pick<Tenant, 'name' | 'brand_name' | 'slug' | 'logo_url'>)
}

export default async function FleetSubPage({ params, searchParams }: Props) {
  const supabase = createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select(PUBLIC_TENANT_COLUMNS)
    .eq('slug', params.slug)
    .single()

  if (!tenant) notFound()

  const typedTenant = {
    ...tenant,
    pickup_locations: Array.isArray(tenant.pickup_locations) ? tenant.pickup_locations : [],
  } as unknown as Tenant // PUBLIC_TENANT_COLUMNS only (no tokens / private fields)

  const pickupDate = searchParams.pickup
  const returnDate = searchParams.return
  const hasDateSearch = !!(pickupDate && returnDate)

  // Cars already booked/blocked for the requested range. Must use the
  // service-role client: anon has no SELECT on reservations, so the old anon
  // query always returned [] and every car showed as available.
  let unavailableIds = new Set<number>()
  let availabilityFiltered = false
  if (hasDateSearch && ISO_DATE.test(pickupDate!) && ISO_DATE.test(returnDate!)) {
    try {
      unavailableIds = await getUnavailableCarIds(createAdminClient(), typedTenant.id, {
        pickupDate: pickupDate!,
        pickupTime: to24h(searchParams.pickTime),
        returnDate: returnDate!,
        returnTime: to24h(searchParams.retTime),
      })
      availabilityFiltered = true
    } catch (err) {
      // Booking itself is still gated by prepareBooking; show the full fleet.
      console.error('[fleet] availability lookup failed', err)
    }
  }

  const carsQuery = supabase
    .from('cars')
    .select(PUBLIC_CAR_COLUMNS)
    .eq('tenant_id', typedTenant.id)
    .in('status', ['available', 'active'])
    .order('daily_rate', { ascending: true })

  const { data: cars } = await carsQuery

  const fleet = ((cars ?? []) as unknown as Car[]) // PUBLIC_CAR_COLUMNS only
    .filter((car) => !unavailableIds.has(car.id))
  const displayName = typedTenant.brand_name || typedTenant.name

  const formatDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <main>
      {/* Header */}
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-6">
        <BackLink base={getSiteBase(params.slug)} />

        <div className="text-center mb-8">
          <p className="text-[10px] font-black uppercase tracking-[.4em] text-primary/60 mb-3">Complete Collection</p>
          <h1 className="text-4xl sm:text-5xl font-outfit font-black text-white tracking-tight mb-3">
            Our Fleet
          </h1>
          <p className="text-white/60 text-sm">
            {availabilityFiltered
              ? fleet.length > 0
                ? `${fleet.length} vehicle${fleet.length === 1 ? '' : 's'} free for ${formatDate(pickupDate!)} – ${formatDate(returnDate!)}`
                : `Every vehicle is booked for ${formatDate(pickupDate!)} – ${formatDate(returnDate!)}. Try other dates.`
              : fleet.length > 0
                ? `${fleet.length} vehicle${fleet.length === 1 ? '' : 's'} available from ${displayName}`
                : `No vehicles currently available from ${displayName}`}
          </p>
        </div>

        {/* Quick Search Bar */}
        <div className="mb-6">
          <QuickSearchBar
            base={getSiteBase(params.slug)}
            locations={typedTenant.pickup_locations}
            inline
            initialPickDate={searchParams.pickup || ''}
            initialRetDate={searchParams.return || ''}
            initialPickTime={searchParams.pickTime || '10:00 AM'}
            initialRetTime={searchParams.retTime || '10:00 AM'}
            initialLocation={searchParams.location || ''}
            collapsible
          />
        </div>

      </div>

      <FleetGrid
        cars={fleet}
        base={getSiteBase(params.slug)}
        tenantId={typedTenant.id}
        pickupLocations={typedTenant.pickup_locations}
        whatsappPhone={typedTenant.whatsapp_phone}
      />
    </main>
  )
}
