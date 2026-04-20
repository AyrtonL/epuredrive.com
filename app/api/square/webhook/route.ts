import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatch'
import { createInAppNotification } from '@/lib/notifications/create'
import { generateBookingCode } from '@/lib/booking-code'
import {
  newBookingEmail,
  bookingConfirmedCustomerEmail,
  type TenantBrand,
} from '@/lib/email/templates/rentals'
import crypto from 'crypto'

/**
 * Verify Square webhook signature.
 * Square uses HMAC-SHA256 with the notification URL as the signature key.
 */
function verifySquareWebhook(
  body: string,
  signature: string | null,
  signatureKey: string,
  notificationUrl: string
): boolean {
  if (!signature) return false

  const expected = Buffer.from(
    crypto
      .createHmac('sha256', signatureKey)
      .update(notificationUrl + body)
      .digest('base64'),
    'base64'
  )
  const actual = Buffer.from(signature, 'base64')
  if (expected.length !== actual.length) return false
  return crypto.timingSafeEqual(expected, actual)
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-square-hmacsha256-signature')
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY

  if (!signatureKey) {
    return new Response('Missing webhook signature key', { status: 500 })
  }

  const notificationUrl = process.env.SQUARE_WEBHOOK_URL || `${process.env.NEXT_PUBLIC_APP_URL}/api/square/webhook`

  if (!verifySquareWebhook(rawBody, signature, signatureKey, notificationUrl)) {
    return new Response('Invalid signature', { status: 400 })
  }

  let event: { type: string; data: { object: Record<string, unknown> } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const supabase = createAdminClient()

  // Cleanup expired pending checkouts (housekeeping)
  void supabase
    .from('pending_checkouts')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .eq('status', 'pending')

  // Handle payment.completed event
  if (event.type === 'payment.completed') {
    const payment = event.data.object as Record<string, unknown>
    const paymentId = payment.id as string
    const orderId = payment.orderId as string | undefined
    const locationId = payment.locationId as string | undefined
    const amountMoney = payment.amountMoney as { amount?: number; currency?: string } | undefined
    const totalCents = Number(amountMoney?.amount ?? 0)
    const totalDollars = totalCents / 100
    const buyerEmail = (payment.buyerEmailAddress as string) || ''

    // Find the tenant by square_location_id
    if (!locationId) {
      return new Response('ok', { status: 200 })
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, brand_name, slug, owner_email, logo_url, company_phone, whatsapp_phone, owner_phone, company_address')
      .eq('square_location_id', locationId)
      .single()

    if (!tenant) {
      console.warn('[square-webhook] No tenant found for location:', locationId)
      return new Response('ok', { status: 200 })
    }

    // Check for duplicate via square_payment_id
    const { data: existing } = await supabase
      .from('reservations')
      .select('id')
      .eq('square_payment_id', paymentId)
      .maybeSingle()

    if (existing) {
      return new Response('ok', { status: 200 })
    }

    // Look up pending_checkout for full booking data
    let pendingCheckout: {
      id: string; car_id: number; customer_name: string; customer_email: string;
      customer_phone: string | null; pickup_date: string; return_date: string;
      pickup_time: string | null; return_time: string | null; pickup_location: string | null;
      total_amount: number | null; extras: unknown;
    } | null = null

    if (orderId) {
      const { data: pc } = await supabase
        .from('pending_checkouts')
        .select('*')
        .eq('square_order_id', orderId)
        .eq('status', 'pending')
        .maybeSingle()
      pendingCheckout = pc
    }

    // Fallback: match by tenant + amount + email within last 2 hours
    if (!pendingCheckout && buyerEmail) {
      const { data: pc } = await supabase
        .from('pending_checkouts')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('customer_email', buyerEmail)
        .eq('status', 'pending')
        .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      pendingCheckout = pc
    }

    const bookingCode = generateBookingCode()
    const customerName = pendingCheckout?.customer_name || 'Square Customer'
    const customerEmail = pendingCheckout?.customer_email || buyerEmail || null
    const carId = pendingCheckout?.car_id || null

    // Fetch car name for emails
    let carName = 'Vehicle'
    if (carId) {
      const { data: car } = await supabase
        .from('cars')
        .select('make, model, model_full')
        .eq('id', carId)
        .maybeSingle()
      if (car) carName = `${car.make} ${car.model_full || car.model}`
    }

    const days = pendingCheckout?.pickup_date && pendingCheckout?.return_date
      ? Math.ceil((new Date(pendingCheckout.return_date).getTime() - new Date(pendingCheckout.pickup_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0

    // Create complete reservation
    const { data: reservation, error: insertError } = await supabase
      .from('reservations')
      .insert({
        tenant_id: tenant.id,
        car_id: carId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: pendingCheckout?.customer_phone || null,
        pickup_date: pendingCheckout?.pickup_date || null,
        return_date: pendingCheckout?.return_date || null,
        pickup_time: pendingCheckout?.pickup_time || null,
        return_time: pendingCheckout?.return_time || null,
        pickup_location: pendingCheckout?.pickup_location || null,
        total_amount: totalDollars,
        status: 'confirmed',
        source: 'square',
        square_payment_id: paymentId,
        booking_code: bookingCode,
        notes: `Paid online — ${days > 0 ? `${days} day${days !== 1 ? 's' : ''} ` : ''}via Square`,
        extras: pendingCheckout?.extras || null,
      })
      .select('id, booking_code')
      .single()

    if (insertError) {
      console.error('[square-webhook] Failed to create reservation:', insertError.message)
      return new Response('Reservation insert failed', { status: 500 })
    }

    // Mark pending checkout as completed
    if (pendingCheckout) {
      await supabase
        .from('pending_checkouts')
        .update({ status: 'completed' })
        .eq('id', pendingCheckout.id)
    }

    // In-app notification
    createInAppNotification({
      tenantId: tenant.id,
      event: 'new_booking',
      title: 'New Paid Booking',
      body: `${customerName} booked ${carName}${pendingCheckout?.pickup_date ? ` (${pendingCheckout.pickup_date} → ${pendingCheckout.return_date})` : ''} — $${totalDollars.toFixed(2)} paid via Square`,
      metadata: { reservation_id: reservation.id, car_id: carId, source: 'square' },
    }).catch(e => console.error('[square-webhook] In-app notification failed:', e))

    // Dispatch webhook event (fire-and-forget)
    dispatchWebhookEvent(tenant.id, 'payment.received', {
      reservation_id: reservation.id,
      amount: totalDollars,
      currency: amountMoney?.currency || 'USD',
      square_payment_id: paymentId,
      customer_email: customerEmail,
      customer_name: customerName,
      source: 'square',
    }).catch(err => console.error('[square-webhook] webhook dispatch failed:', err))

    // ── Send emails (fire-and-forget) ──
    const brand: TenantBrand = {
      name: tenant.brand_name || tenant.name || 'Your Rental Company',
      logoUrl: tenant.logo_url ?? null,
      email: tenant.owner_email ?? null,
      phone: tenant.company_phone || tenant.whatsapp_phone || tenant.owner_phone || null,
      address: tenant.company_address ?? null,
    }

    // 1. Notify operator
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('tenant_id', tenant.id)

    if (profiles?.length) {
      const adminClient = createAdminClient()
      const results = await Promise.allSettled(
        profiles.map((p: { id: string }) => adminClient.auth.admin.getUserById(p.id))
      )
      const operatorEmails: string[] = []
      for (const r of results) {
        if (r.status === 'fulfilled') {
          const email = r.value.data?.user?.email
          if (email) operatorEmails.push(email)
        }
      }

      if (operatorEmails.length > 0) {
        sendEmail({
          to: operatorEmails,
          ...newBookingEmail({
            customerName,
            carName,
            pickupDate: pendingCheckout?.pickup_date || 'N/A',
            returnDate: pendingCheckout?.return_date || 'N/A',
            totalAmount: totalDollars,
            tenantName: brand.name,
          }),
        }).catch(e => console.error('[square-webhook] Operator email failed:', e))
      }
    }

    // 2. Confirm to customer
    if (customerEmail && reservation) {
      sendEmail({
        to: customerEmail,
        fromName: brand.name,
        replyTo: brand.email ?? undefined,
        ...bookingConfirmedCustomerEmail({
          customerName,
          brand,
          carName,
          pickupDate: pendingCheckout?.pickup_date || 'N/A',
          returnDate: pendingCheckout?.return_date || 'N/A',
          pickupLocation: pendingCheckout?.pickup_location || 'To be confirmed',
          reservationId: reservation.id,
        }),
      }).catch(e => console.error('[square-webhook] Customer email failed:', e))
    }
  }

  return new Response('ok', { status: 200 })
}
