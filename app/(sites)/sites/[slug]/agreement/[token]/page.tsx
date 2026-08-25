import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import AgreementSigner from './AgreementSigner'

interface Props {
  params: { slug: string; token: string }
}

export default async function AgreementPage({ params }: Props) {
  const supabase = createAdminClient()

  // Fetch reservation by token
  const { data: reservation } = await supabase
    .from('reservations')
    .select('*')
    .eq('agreement_token', params.token)
    .single()

  if (!reservation) notFound()

  // Fetch tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, brand_name, slug, logo_url, primary_color, accent_color, company_address, company_phone, agreement_clauses, agreement_template_url, plan')
    .eq('id', reservation.tenant_id)
    .single()

  if (!tenant) notFound()

  // Fetch car info
  const { data: car } = await supabase
    .from('cars')
    .select('make, model, model_full, year, vin, transmission, color, plate')
    .eq('id', reservation.car_id)
    .maybeSingle()

  const tenantName = tenant.brand_name || tenant.name
  const carName = car ? `${car.make} ${car.model_full || car.model}` : 'Vehicle'
  const accentColor = tenant.primary_color || '#00d2ff'

  // license-photos is a private bucket (PII) — resolve short-lived signed
  // URLs server-side with the admin client rather than exposing paths to the
  // (unauthenticated) customer-facing page.
  const SIGNED_URL_TTL = 60 * 60 // 1 hour, enough to view/print/download the agreement
  const [licensePhotoUrl, secondDriverLicensePhotoUrl] = await Promise.all([
    reservation.license_photo_path
      ? supabase.storage
          .from('license-photos')
          .createSignedUrl(reservation.license_photo_path, SIGNED_URL_TTL)
          .then(({ data }) => data?.signedUrl ?? null)
      : null,
    reservation.second_driver_license_photo_path
      ? supabase.storage
          .from('license-photos')
          .createSignedUrl(reservation.second_driver_license_photo_path, SIGNED_URL_TTL)
          .then(({ data }) => data?.signedUrl ?? null)
      : null,
  ])

  return (
    <AgreementSigner
      reservation={reservation}
      tenant={tenant as any}
      car={car}
      tenantName={tenantName}
      carName={carName}
      accentColor={accentColor}
      token={params.token}
      licensePhotoUrl={licensePhotoUrl}
      secondDriverLicensePhotoUrl={secondDriverLicensePhotoUrl}
    />
  )
}
