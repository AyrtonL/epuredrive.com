// app/sites/[slug]/[carId]/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Car, Tenant } from '@/lib/supabase/types'
import type { Metadata } from 'next'
import { buildCarMetadata } from '@/lib/utils/fleet-metadata'
import CarDetailView from '@/components/sites/CarDetailView'

interface Props {
  params: { slug: string; carId: string }
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

export default async function CarDetailPage({ params }: Props) {
  const supabase = createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, brand_name')
    .eq('slug', params.slug)
    .single()

  if (!tenant) notFound()

  const { data: car } = await supabase
    .from('cars')
    .select('*')
    .eq('id', Number(params.carId))
    .eq('tenant_id', (tenant as Tenant).id)
    .single()

  if (!car) notFound()

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <a
        href="javascript:history.back()"
        className="text-white/40 text-sm hover:text-white mb-8 inline-block transition-colors"
      >
        ← Back to fleet
      </a>
      <CarDetailView car={car as Car} />
    </div>
  )
}
