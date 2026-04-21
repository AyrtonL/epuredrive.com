import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tenant, Car } from '@/lib/supabase/types'
import type { Metadata } from 'next'
import { buildFleetMetadata } from '@/lib/utils/fleet-metadata'
import { buildBreadcrumbSchema, buildAutoRentalSchema } from '@/lib/utils/jsonld'
import JsonLd from '@/components/JsonLd'
import HeroSection from '@/components/sites/HeroSection'
import FleetPreview from '@/components/sites/FleetPreview'
import ExperienceSection from '@/components/sites/ExperienceSection'
import HowItWorksSection from '@/components/sites/HowItWorksSection'
import ConciergeSection from '@/components/sites/ConciergeSection'

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

export default async function TenantLandingPage({ params }: Props) {
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

  const displayName = typedTenant.brand_name ?? typedTenant.name
  const tenantUrl = `https://${typedTenant.slug}.epuredrive.com`

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'éPure Drive', url: 'https://epuredrive.com' },
    { name: displayName, url: tenantUrl },
  ])

  const autoRentalSchema = buildAutoRentalSchema({
    name: displayName,
    slug: typedTenant.slug!,
    logoUrl: typedTenant.logo_url,
    description: typedTenant.tagline,
  })

  return (
    <main>
      <JsonLd schema={breadcrumbSchema} />
      <JsonLd schema={autoRentalSchema} />
      <HeroSection
        tenant={typedTenant}
        carCount={fleet.length}
        slug={params.slug}
        locations={typedTenant.pickup_locations}
      />

      <FleetPreview cars={fleet} slug={params.slug} theme={typedTenant.site_theme || 'dark'} />

      <HowItWorksSection tenant={typedTenant} />

      <ExperienceSection cars={fleet} tenant={typedTenant} />

      <ConciergeSection tenant={typedTenant} cars={fleet} />
    </main>
  )
}
