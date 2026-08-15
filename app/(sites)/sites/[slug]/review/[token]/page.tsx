import { createAdminClient } from '@/lib/supabase/admin'
import ReviewForm from './ReviewForm'

interface Props {
  params: { slug: string; token: string }
}

function InvalidLink({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
        <p className="text-gray-700 font-semibold">{message}</p>
      </div>
    </div>
  )
}

export default async function ReviewPage({ params }: Props) {
  const supabase = createAdminClient()

  const { data: reservation } = await supabase
    .from('reservations')
    .select('id, tenant_id, car_id, customer_name')
    .eq('review_token', params.token)
    .maybeSingle()

  if (!reservation) {
    return <InvalidLink message="This link is no longer valid." />
  }

  const { data: existingReview } = await supabase
    .from('reservation_reviews')
    .select('id')
    .eq('reservation_id', reservation.id)
    .maybeSingle()

  if (existingReview) {
    return <InvalidLink message="You've already left a review — thank you!" />
  }

  const [{ data: tenant }, { data: car }] = await Promise.all([
    supabase
      .from('tenants')
      .select('name, brand_name, slug, logo_url, primary_color')
      .eq('id', reservation.tenant_id)
      .maybeSingle(),
    reservation.car_id
      ? supabase.from('cars').select('make, model, model_full').eq('id', reservation.car_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  if (!tenant) {
    return <InvalidLink message="This link is no longer valid." />
  }

  const tenantName = tenant.brand_name || tenant.name || 'Your rental company'
  const carName = car ? `${car.make} ${car.model_full || car.model}` : 'your rental'
  const accentColor = tenant.primary_color || '#00d2ff'

  return (
    <ReviewForm
      token={params.token}
      tenantName={tenantName}
      tenantLogoUrl={tenant.logo_url}
      carName={carName}
      customerName={reservation.customer_name || 'there'}
      accentColor={accentColor}
    />
  )
}
