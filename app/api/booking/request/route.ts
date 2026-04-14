import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/resend'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Persistent rate limiter (Upstash Redis). Falls back to in-memory for local dev.
let ratelimit: Ratelimit | null = null
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, '10 m'),
    prefix: 'booking',
  })
}

// In-memory fallback (dev only — resets on cold start)
const rateLimitStore = new Map<string, number[]>()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  try {
    const { hostname } = new URL(origin)
    // Allow main domain and all tenant subdomains
    if (hostname === 'epuredrive.com' || hostname.endsWith('.epuredrive.com')) return true
    // Allow localhost in development
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true
    return false
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  // CSRF protection: verify Origin header matches allowed domains
  const origin = request.headers.get('origin')
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'

  if (ratelimit) {
    // Persistent rate limit via Upstash Redis
    const { success } = await ratelimit.limit(ip)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }
  } else {
    // In-memory fallback (dev / no Redis configured)
    const now = Date.now()
    const windowMs = 10 * 60 * 1000
    const maxRequests = 5
    const timestamps = (rateLimitStore.get(ip) ?? []).filter((t) => now - t < windowMs)
    if (timestamps.length >= maxRequests) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }
    rateLimitStore.set(ip, [...timestamps, now])
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const data = body as Record<string, unknown>

  // Validate required fields
  if (
    typeof data.tenant_id !== 'string' ||
    typeof data.customer_name !== 'string' ||
    !data.customer_name.trim() ||
    typeof data.customer_email !== 'string' ||
    !EMAIL_REGEX.test(data.customer_email.trim()) ||
    typeof data.pickup_date !== 'string' ||
    typeof data.return_date !== 'string'
  ) {
    return NextResponse.json({ error: 'Missing or invalid required fields' }, { status: 400 })
  }

  // Verify tenant exists and get their info for notifications
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, name, brand_name, slug, whatsapp_phone, owner_email')
    .eq('id', data.tenant_id)
    .single()

  if (tenantErr || !tenant) {
    return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 })
  }

  // Verify car exists and belongs to tenant
  if (typeof data.car_id !== 'number') {
    return NextResponse.json({ error: 'Invalid car' }, { status: 400 })
  }

  const { data: car, error: carErr } = await supabase
    .from('cars')
    .select('id, make, model, model_full')
    .eq('id', data.car_id)
    .eq('tenant_id', data.tenant_id)
    .single()

  if (carErr || !car) {
    return NextResponse.json({ error: 'Invalid car' }, { status: 400 })
  }

  const { data: inserted, error } = await supabase
    .from('reservations')
    .insert({
      tenant_id: data.tenant_id,
      car_id: data.car_id,
      customer_name: String(data.customer_name).trim().slice(0, 200),
      customer_email: String(data.customer_email).trim().slice(0, 200),
      customer_phone: typeof data.customer_phone === 'string' ? data.customer_phone.trim().slice(0, 50) : null,
      pickup_date: String(data.pickup_date),
      pickup_time: typeof data.pickup_time === 'string' ? data.pickup_time : null,
      return_date: String(data.return_date),
      return_time: typeof data.return_time === 'string' ? data.return_time : null,
      pickup_location: typeof data.pickup_location === 'string' ? data.pickup_location.trim().slice(0, 200) : null,
      total_amount: typeof data.total_amount === 'number' ? data.total_amount : null,
      status: 'pending',
      source: 'website',
      notes: typeof data.notes === 'string' ? data.notes.trim().slice(0, 2000) : null,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 })
  }

  const reservationId = inserted.id
  const tenantName = tenant.brand_name || tenant.name
  const vehicleName = `${car.make} ${car.model_full || car.model}`
  const customerName = String(data.customer_name).trim()
  const customerEmail = String(data.customer_email).trim()
  const pickupDate = String(data.pickup_date)
  const returnDate = String(data.return_date)
  const pickupTime = typeof data.pickup_time === 'string' ? data.pickup_time : ''
  const returnTime = typeof data.return_time === 'string' ? data.return_time : ''
  const pickupLocation = typeof data.pickup_location === 'string' ? data.pickup_location : 'To be confirmed'
  const total = typeof data.total_amount === 'number' ? `$${data.total_amount.toLocaleString()}` : 'TBD'

  // Send confirmation email to customer (non-blocking)
  sendEmail({
    to: customerEmail,
    subject: `Reservation Request Received — ${vehicleName}`,
    html: buildCustomerEmail({ customerName, vehicleName, tenantName, pickupDate, returnDate, pickupTime, returnTime, pickupLocation, total, reservationId }),
  }).catch((err) => console.error('[booking] customer email failed:', err))

  // Send notification email to tenant owner (non-blocking)
  // Prefer owner_email from tenant record, fallback to TENANT_NOTIFY_EMAIL env var
  const tenantNotifyEmail = (tenant.owner_email as string | null) ?? process.env.TENANT_NOTIFY_EMAIL ?? null
  if (tenantNotifyEmail) {
    sendEmail({
      to: tenantNotifyEmail,
      subject: `New Booking Request — ${vehicleName} from ${customerName}`,
      html: buildTenantEmail({ customerName, customerEmail, vehicleName, tenantName, pickupDate, returnDate, pickupTime, returnTime, pickupLocation, total, reservationId }),
    }).catch((err) => console.error('[booking] tenant email failed:', err))
  }

  return NextResponse.json({ success: true, reservationId })
}

function buildCustomerEmail(p: {
  customerName: string
  vehicleName: string
  tenantName: string
  pickupDate: string
  returnDate: string
  pickupTime: string
  returnTime: string
  pickupLocation: string
  total: string
  reservationId: number
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#ffffff">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#111111;border-radius:24px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">
        <!-- Header -->
        <tr><td style="padding:40px 40px 32px;border-bottom:1px solid rgba(255,255,255,0.06)">
          <p style="margin:0 0 8px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.4em;color:rgba(255,255,255,0.3)">${p.tenantName}</p>
          <h1 style="margin:0;font-size:28px;font-weight:900;letter-spacing:-0.03em;font-style:italic">Reservation Received</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px 40px">
          <p style="margin:0 0 24px;color:rgba(255,255,255,0.5);font-size:14px;line-height:1.6">
            Hi <strong style="color:#fff">${p.customerName}</strong>, your reservation request for the <strong style="color:#fff">${p.vehicleName}</strong> has been received. We'll confirm your booking shortly.
          </p>
          <!-- Details box -->
          <table width="100%" style="background:rgba(255,255,255,0.04);border-radius:16px;border:1px solid rgba(255,255,255,0.06);margin-bottom:24px">
            <tr><td style="padding:24px">
              ${detailRow('Ref #', `#${p.reservationId}`)}
              ${detailRow('Vehicle', p.vehicleName)}
              ${detailRow('Pickup', `${p.pickupDate}${p.pickupTime ? ' at ' + p.pickupTime : ''}`)}
              ${detailRow('Return', `${p.returnDate}${p.returnTime ? ' at ' + p.returnTime : ''}`)}
              ${detailRow('Location', p.pickupLocation)}
              ${detailRow('Estimated Total', p.total)}
            </td></tr>
          </table>
          <p style="margin:0;color:rgba(255,255,255,0.3);font-size:12px;line-height:1.6">
            Questions? Reply to this email or contact ${p.tenantName} directly.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.06)">
          <p style="margin:0;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.3em;color:rgba(255,255,255,0.15)">Powered by éPure Drive</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildTenantEmail(p: {
  customerName: string
  customerEmail: string
  vehicleName: string
  tenantName: string
  pickupDate: string
  returnDate: string
  pickupTime: string
  returnTime: string
  pickupLocation: string
  total: string
  reservationId: number
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#ffffff">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#111111;border-radius:24px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">
        <tr><td style="padding:40px 40px 32px;border-bottom:1px solid rgba(255,255,255,0.06)">
          <p style="margin:0 0 8px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.4em;color:rgba(255,255,255,0.3)">${p.tenantName} · New Booking</p>
          <h1 style="margin:0;font-size:28px;font-weight:900;letter-spacing:-0.03em;font-style:italic">New Reservation Request</h1>
        </td></tr>
        <tr><td style="padding:32px 40px">
          <table width="100%" style="background:rgba(255,255,255,0.04);border-radius:16px;border:1px solid rgba(255,255,255,0.06);margin-bottom:24px">
            <tr><td style="padding:24px">
              ${detailRow('Ref #', `#${p.reservationId}`)}
              ${detailRow('Customer', p.customerName)}
              ${detailRow('Email', p.customerEmail)}
              ${detailRow('Vehicle', p.vehicleName)}
              ${detailRow('Pickup', `${p.pickupDate}${p.pickupTime ? ' at ' + p.pickupTime : ''}`)}
              ${detailRow('Return', `${p.returnDate}${p.returnTime ? ' at ' + p.returnTime : ''}`)}
              ${detailRow('Location', p.pickupLocation)}
              ${detailRow('Total', p.total)}
            </td></tr>
          </table>
          <p style="margin:0;color:rgba(255,255,255,0.3);font-size:12px">
            Log in to your dashboard to confirm or manage this reservation.
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.06)">
          <p style="margin:0;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.3em;color:rgba(255,255,255,0.15)">éPure Drive Platform</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function detailRow(label: string, value: string): string {
  return `<table width="100%" style="margin-bottom:12px"><tr>
    <td style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;color:rgba(255,255,255,0.3);width:40%">${label}</td>
    <td style="font-size:13px;font-weight:600;color:#ffffff;text-align:right">${value}</td>
  </tr></table>`
}
