import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/resend'
import { newInquiryEmail } from '@/lib/email/templates'

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

  // Send notification email to operator (fire-and-forget)
  notifyOperator(
    String(data.tenant_id),
    String(data.name),
    String(data.email),
    typeof data.vehicle === 'string' ? data.vehicle : 'Not specified',
    typeof data.message === 'string' ? data.message : '',
  ).catch(e => console.error('[concierge] notify error:', e))

  return NextResponse.json({ success: true })
}

async function notifyOperator(
  tenantId: string,
  customerName: string,
  customerEmail: string,
  vehicle: string,
  message: string,
) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return // Can't look up emails without admin access

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const { data: profiles } = await admin
    .from('profiles')
    .select('id')
    .eq('tenant_id', tenantId)

  if (!profiles?.length) return

  const emails: string[] = []
  for (const p of profiles) {
    const { data: userData } = await admin.auth.admin.getUserById(p.id)
    if (userData?.user?.email) emails.push(userData.user.email)
  }

  if (emails.length === 0) return

  const { data: tenantData } = await admin
    .from('tenants')
    .select('brand_name, name')
    .eq('id', tenantId)
    .single()

  const tenantName = tenantData?.brand_name || tenantData?.name || 'Your Fleet'

  const { subject, html } = newInquiryEmail({
    customerName,
    customerEmail,
    carName: vehicle,
    message,
    tenantName,
  })

  await sendEmail({ to: emails, subject, html })
}
