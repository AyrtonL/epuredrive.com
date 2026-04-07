import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Uses anon key — RLS policy "anon_insert_concierge" permits inserts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const data = body as Record<string, unknown>

  if (
    typeof data.tenant_id !== 'string' ||
    typeof data.name !== 'string' ||
    !data.name.trim() ||
    typeof data.email !== 'string' ||
    !data.email.trim()
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify tenant exists (anon can read tenants — tenants_anon_read policy)
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('id')
    .eq('id', data.tenant_id)
    .single()

  if (tenantErr || !tenant) {
    return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 })
  }

  const { error } = await supabase.from('concierge_inquiries').insert({
    tenant_id: data.tenant_id,
    name: String(data.name).trim().slice(0, 200),
    email: String(data.email).trim().slice(0, 200),
    phone: typeof data.phone === 'string' ? data.phone.trim().slice(0, 50) : null,
    service: typeof data.service === 'string' ? data.service.trim().slice(0, 100) : null,
    vehicle: typeof data.vehicle === 'string' ? data.vehicle.trim().slice(0, 200) : null,
    message: typeof data.message === 'string' ? data.message.trim().slice(0, 2000) : null,
  })

  if (error) {
    console.error('[concierge] insert error:', error.message)
    return NextResponse.json({ error: 'Failed to save inquiry' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
