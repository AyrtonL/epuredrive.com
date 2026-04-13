// app/sites/[slug]/[carId]/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Car, Tenant } from '@/lib/supabase/types'
import type { Metadata } from 'next'
import { buildCarMetadata } from '@/lib/utils/fleet-metadata'
import CarDetailView from '@/components/sites/CarDetailView'

interface Props {
  params: { slug: string; carId: string }
  searchParams: { booked?: string; pickup?: string; return?: string; pickTime?: string; retTime?: string; location?: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, brand_name, slug, logo_url')
    .eq('slug', params.slug)
    .single()

  if (!tenant) return { title: 'Vehicle' }

  const { data: car } = await supabase
    .from('cars')
    .select('id, make, model, model_full, description, image_url, gallery')
    .eq('id', Number(params.carId))
    .eq('tenant_id', (tenant as Tenant).id)
    .single()

  if (!car) return { title: 'Vehicle' }

  return buildCarMetadata(
    car as Pick<Car, 'id' | 'make' | 'model' | 'model_full' | 'description' | 'image_url' | 'gallery'>,
    tenant as Pick<Tenant, 'name' | 'brand_name' | 'slug' | 'logo_url'>
  )
}

export default async function CarDetailPage({ params, searchParams }: Props) {
  const supabase = createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, brand_name, slug, stripe_account_id')
    .eq('slug', params.slug)
    .single()

  if (!tenant) notFound()

  const { data: car } = await supabase
    .from('cars')
    .select('*')
    .eq('id', Number(params.carId))
    .eq('tenant_id', tenant.id)
    .single()

  if (!car) notFound()

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {searchParams.booked === 'true' && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-5 py-4 rounded-2xl mb-8 flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Payment confirmed! Your booking has been received. The operator will be in touch shortly.
        </div>
      )}
      <a
        href="javascript:history.back()"
        className="text-white/40 text-sm hover:text-white mb-8 inline-block transition-colors"
      >
        ← Back to fleet
      </a>
      <CarDetailView
        car={car as Car}
        tenantId={tenant.id}
        slug={tenant.slug!}
        paymentsEnabled={!!tenant.stripe_account_id}
      />
    </div>
  )
}
