// app/api/support/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'
import {
  dashboardSupportAdminEmail,
  dashboardSupportConfirmEmail,
} from '@/lib/email/templates/support'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'support', { windowMs: 600_000, max: 5 })
  if (limited) return limited

  // Must be an authenticated operator
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get tenantId from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const tenantId = profile?.tenant_id
  if (!tenantId) {
    return NextResponse.json({ error: 'No tenant found' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const data = body as Record<string, unknown>
  const subject = typeof data.subject === 'string' ? data.subject.trim().slice(0, 200) : ''
  const message = typeof data.message === 'string' ? data.message.trim().slice(0, 2000) : ''

  if (!subject || !message) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  }

  const adminEmail =
    process.env.SUPPORT_NOTIFY_EMAIL ||
    process.env.ADMIN_NOTIFY_EMAIL ||
    'support@epuredrive.com'

  const [profileResult, tenantResult] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase.from('tenants').select('brand_name, name, plan').eq('id', tenantId).single(),
  ])

  const operatorName = profileResult.data?.full_name || user.email
  const tenantName = tenantResult.data?.brand_name || tenantResult.data?.name || 'Unknown'
  const plan = tenantResult.data?.plan || 'unknown'

  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .insert({
      tenant_id: tenantId,
      user_id: user.id,
      operator_name: operatorName,
      operator_email: user.email,
      subject,
      message,
    })
    .select('ticket_number')
    .single()

  if (ticketError || !ticket) {
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
  }

  const ticketNumber = ticket.ticket_number

  await Promise.allSettled([
    sendEmail({
      to: adminEmail,
      replyTo: user.email,
      ...dashboardSupportAdminEmail({
        ticketNumber,
        operatorName,
        operatorEmail: user.email,
        tenantName,
        plan,
        tenantId,
        subject,
        message,
      }),
    }),
    sendEmail({
      to: user.email,
      ...dashboardSupportConfirmEmail({ ticketNumber, operatorName, subject }),
    }),
  ])

  return NextResponse.json({ success: true, ticketNumber })
}
