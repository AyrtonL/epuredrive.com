import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatch'
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

  // Handle payment.completed event
  if (event.type === 'payment.completed') {
    const payment = event.data.object as Record<string, unknown>
    const paymentId = payment.id as string
    const orderId = payment.orderId as string | undefined
    const locationId = payment.locationId as string | undefined
    const amountMoney = payment.amountMoney as { amount?: number; currency?: string } | undefined
    const totalCents = Number(amountMoney?.amount ?? 0)
    const totalDollars = totalCents / 100

    // Find the tenant by square_location_id
    if (!locationId) {
      return new Response('ok', { status: 200 })
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, brand_name, slug, owner_email')
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

    // Extract metadata from the order note or reference_id if available
    const referenceId = payment.referenceId as string | undefined
    const note = payment.note as string | undefined
    const buyerEmail = (payment.buyerEmailAddress as string) || ''

    // Create reservation
    const { data: reservation, error: insertError } = await supabase
      .from('reservations')
      .insert({
        tenant_id: tenant.id,
        customer_name: referenceId || 'Square Customer',
        customer_email: buyerEmail || null,
        total_amount: totalDollars,
        status: 'confirmed',
        source: 'square',
        square_payment_id: paymentId,
        notes: note || `Paid via Square — Payment ${paymentId}`,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[square-webhook] Failed to create reservation:', insertError.message)
      return new Response('Reservation insert failed', { status: 500 })
    }

    // Dispatch webhook event (fire-and-forget)
    dispatchWebhookEvent(tenant.id, 'payment.received', {
      reservation_id: reservation.id,
      amount: totalDollars,
      currency: amountMoney?.currency || 'USD',
      square_payment_id: paymentId,
      customer_email: buyerEmail,
      source: 'square',
    }).catch(err => console.error('[square-webhook] webhook dispatch failed:', err))

    // Send notification email to tenant (fire-and-forget)
    const tenantEmail = tenant.owner_email
    if (tenantEmail) {
      sendEmail({
        to: tenantEmail,
        subject: `New Payment Received — $${totalDollars.toFixed(2)} via Square`,
        html: `
          <div style="font-family:sans-serif;color:#333;padding:20px">
            <h2>New Square Payment</h2>
            <p>A payment of <strong>$${totalDollars.toFixed(2)}</strong> was received via Square.</p>
            <p><strong>Payment ID:</strong> ${paymentId}</p>
            ${buyerEmail ? `<p><strong>Customer:</strong> ${buyerEmail}</p>` : ''}
            <p>Log in to your dashboard to manage this reservation.</p>
            <p style="color:#999;font-size:12px">ePure Drive Platform</p>
          </div>
        `,
      }).catch(e => console.error('[square-webhook] Email failed:', e))
    }
  }

  return new Response('ok', { status: 200 })
}
