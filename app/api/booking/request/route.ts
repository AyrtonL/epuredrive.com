import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { createInAppNotification } from '@/lib/notifications/create'
import { emailTeam } from '@/lib/notifications/email-team'
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatch'
import { generateBookingCode } from '@/lib/booking-code'
import { carDisplayName } from '@/lib/utils/car-display-name'
import { isAllowedBookingOrigin } from '@/lib/booking/origin'
import { prepareBooking } from '@/lib/booking/prepare'
import type { PickupLocation } from '@/lib/supabase/types'

const rateLimitStore = new Map<string, number[]>()

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  // CSRF protection: platform hosts, localhost, or a tenant's custom domain
  if (!(await isAllowedBookingOrigin(request.headers.get('origin'), supabase))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
  const now = Date.now()
  const windowMs = 10 * 60 * 1000 // 10 minutes
  const maxRequests = 5

  const timestamps = (rateLimitStore.get(ip) ?? []).filter((t) => now - t < windowMs)
  if (timestamps.length >= maxRequests) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }
  rateLimitStore.set(ip, [...timestamps, now])

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

  const pickupDate = data.pickup_date
  const returnDate = data.return_date

  // Verify tenant exists and get their info for notifications
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, name, brand_name, slug, whatsapp_phone, pickup_locations')
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
    .select('id, make, model, model_full, daily_rate')
    .eq('id', data.car_id)
    .eq('tenant_id', data.tenant_id)
    .single()

  if (carErr || !car) {
    return NextResponse.json({ error: 'Invalid car' }, { status: 400 })
  }

  const prepared = await prepareBooking(supabase, {
    tenantId: data.tenant_id,
    carId: data.car_id,
    dailyRate: Number(car.daily_rate) || 0,
    pickupLocations: tenant.pickup_locations as PickupLocation[] | null,
    surchargeRate: null,
    card: false,
    pickupDate,
    returnDate,
    pickupTime: data.pickup_time,
    returnTime: data.return_time,
    pickupLocation: data.pickup_location,
    extras: data.extras,
  })
  if (!prepared.ok) {
    return NextResponse.json({ error: prepared.error }, { status: prepared.status })
  }
  // Price is computed server-side; the browser's total is ignored
  const { quote, pickupTime, returnTime, pickupLocation: pickupLocationRaw } = prepared.booking
  const totalAmount = quote.totalCents / 100

  const bookingCode = generateBookingCode()

  const { data: inserted, error } = await supabase
    .from('reservations')
    .insert({
      tenant_id: data.tenant_id,
      car_id: data.car_id,
      customer_name: String(data.customer_name).trim().slice(0, 200),
      customer_email: String(data.customer_email).trim().slice(0, 200),
      customer_phone: typeof data.customer_phone === 'string' ? data.customer_phone.trim().slice(0, 50) : null,
      pickup_date: pickupDate,
      pickup_time: pickupTime,
      return_date: returnDate,
      return_time: returnTime,
      pickup_location: pickupLocationRaw,
      total_amount: car.daily_rate ? totalAmount : null,
      status: 'pending',
      source: 'web',
      notes: quote.extras.length > 0
        ? quote.extras.map((e) => `${e.name} ($${e.subtotal})`).join(', ')
        : null,
      extras: quote.extras.length > 0 ? quote.extras : null,
      booking_code: bookingCode,
      payment_method: 'cash',
    })
    .select('id, booking_code')
    .single()

  if (error || !inserted) {
    console.error('[booking] insert error:', error?.message, error?.details, error?.hint)
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 })
  }

  const reservationId = inserted.id
  const resBookingCode = inserted.booking_code as string
  const tenantName = tenant.brand_name || tenant.name
  const vehicleName = carDisplayName(car)
  const customerName = String(data.customer_name).trim()
  const customerEmail = String(data.customer_email).trim()
  const pickupLocation = pickupLocationRaw ?? 'To be confirmed'
  const total = car.daily_rate ? `$${totalAmount.toLocaleString()}` : 'TBD'
  const emailFields = {
    customerName, vehicleName, tenantName, pickupDate, returnDate,
    pickupTime: pickupTime ?? '', returnTime: returnTime ?? '', pickupLocation, total, bookingCode: resBookingCode,
  }

  // Await side effects before responding — serverless may freeze after the
  // response, dropping un-awaited emails. Failures are logged, never fatal.
  const results = await Promise.allSettled([
    sendEmail({
      to: customerEmail,
      subject: `Reservation Request Received — ${vehicleName}`,
      html: buildCustomerEmail(emailFields),
    }),
    // Operator: every team member (tenants.owner_email is NULL for all tenants)
    emailTeam(supabase, data.tenant_id, 'new_booking', {
      subject: `New Booking Request — ${vehicleName} from ${customerName}`,
      html: buildTenantEmail({ ...emailFields, customerEmail }),
    }),
    createInAppNotification({
      tenantId: data.tenant_id,
      event: 'new_booking',
      title: 'New Booking Request',
      body: `${customerName} requested ${vehicleName} for ${pickupDate} → ${returnDate}`,
      metadata: { reservation_id: reservationId, car_id: data.car_id, source: 'website' },
    }),
    dispatchWebhookEvent(data.tenant_id, 'booking.created', {
      reservation_id: reservationId,
      car_id: data.car_id,
      customer_name: customerName,
      customer_email: customerEmail,
      pickup_date: pickupDate,
      return_date: returnDate,
      total_amount: car.daily_rate ? totalAmount : null,
      source: 'website',
    }),
  ])
  const labels = ['customer email', 'operator email', 'in-app notification', 'webhook dispatch']
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`[booking] ${labels[i]} failed:`, r.reason)
  })
  if (results[1].status === 'fulfilled' && results[1].value === 0) {
    console.error('[booking] operator email reached nobody for tenant', data.tenant_id)
  }

  return NextResponse.json({ success: true, reservationId, bookingCode: resBookingCode, totalAmount })
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
  bookingCode: string
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
          <p style="margin:0 0 8px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.4em;color:rgba(255,255,255,0.3)">${escHtml(p.tenantName)}</p>
          <h1 style="margin:0;font-size:28px;font-weight:900;letter-spacing:-0.03em;font-style:italic">Reservation Received</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px 40px">
          <p style="margin:0 0 24px;color:rgba(255,255,255,0.5);font-size:14px;line-height:1.6">
            Hi <strong style="color:#fff">${escHtml(p.customerName)}</strong>, your reservation request for the <strong style="color:#fff">${escHtml(p.vehicleName)}</strong> has been received. We'll confirm your booking shortly.
          </p>
          <!-- Details box -->
          <table width="100%" style="background:rgba(255,255,255,0.04);border-radius:16px;border:1px solid rgba(255,255,255,0.06);margin-bottom:24px">
            <tr><td style="padding:24px">
              ${detailRow('Ref #', p.bookingCode)}
              ${detailRow('Vehicle', p.vehicleName)}
              ${detailRow('Pickup', `${p.pickupDate}${p.pickupTime ? ' at ' + p.pickupTime : ''}`)}
              ${detailRow('Return', `${p.returnDate}${p.returnTime ? ' at ' + p.returnTime : ''}`)}
              ${detailRow('Location', p.pickupLocation)}
              ${detailRow('Estimated Total', p.total)}
            </td></tr>
          </table>
          <p style="margin:0;color:rgba(255,255,255,0.3);font-size:12px;line-height:1.6">
            Questions? Reply to this email or contact ${escHtml(p.tenantName)} directly.
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
  bookingCode: string
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
          <p style="margin:0 0 8px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.4em;color:rgba(255,255,255,0.3)">${escHtml(p.tenantName)} · New Booking</p>
          <h1 style="margin:0;font-size:28px;font-weight:900;letter-spacing:-0.03em;font-style:italic">New Reservation Request</h1>
        </td></tr>
        <tr><td style="padding:32px 40px">
          <table width="100%" style="background:rgba(255,255,255,0.04);border-radius:16px;border:1px solid rgba(255,255,255,0.06);margin-bottom:24px">
            <tr><td style="padding:24px">
              ${detailRow('Ref #', p.bookingCode)}
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

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function detailRow(label: string, value: string): string {
  return `<table width="100%" style="margin-bottom:12px"><tr>
    <td style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;color:rgba(255,255,255,0.3);width:40%">${escHtml(label)}</td>
    <td style="font-size:13px;font-weight:600;color:#ffffff;text-align:right">${escHtml(value)}</td>
  </tr></table>`
}
