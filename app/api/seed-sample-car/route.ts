// app/api/seed-sample-car/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const EPUREDRIVE_TENANT_ID = '8be5b928-ca59-4b29-a34b-75b18c9273db'
const SAMPLE_CAR_ID = 2 // Audi A3 2017

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) return NextResponse.json({ error: 'No tenant' }, { status: 400 })

  // Only seed if tenant has 0 cars
  const { count } = await supabase
    .from('cars')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', profile.tenant_id)

  if ((count ?? 0) > 0) return NextResponse.json({ seeded: false })

  // Fetch the sample car from éPure Drive
  const { data: source } = await supabase
    .from('cars')
    .select('make, model, model_full, year, daily_rate, image_url, gallery, category, badge, seats, transmission, hp, features, description')
    .eq('id', SAMPLE_CAR_ID)
    .eq('tenant_id', EPUREDRIVE_TENANT_ID)
    .single()

  if (!source) return NextResponse.json({ error: 'Sample car not found' }, { status: 500 })

  await supabase.from('cars').insert({
    ...source,
    tenant_id: profile.tenant_id,
    status: 'active',
    badge: 'Sample',
    notes: 'Sample car — replace or edit to get started',
  })

  return NextResponse.json({ seeded: true })
}
