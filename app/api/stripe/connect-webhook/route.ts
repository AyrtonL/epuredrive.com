/**
 * POST /api/stripe/connect-webhook
 * Handles Stripe Connect events from connected accounts (tenant payments).
 * Listens to: checkout.session.completed (rental payments)
 * Requires: STRIPE_CONNECT_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import crypto from 'crypto'
import { sendEmail } from '@/lib/email/resend'
import {
  newBookingEmail,
  bookingConfirmedCustomerEmail,
  type TenantBrand,
} from '@/lib/email/templates/rentals'

const TENANT_BRAND_COLUMNS =
  'name, brand_name, slug, logo_url, owner_email, owner_phone, company_phone, whatsapp_phone, company_address'

interface TenantBrandRow {
  name: string | null
  brand_name: string | null
  slug: string | null
  logo_url: string | null
  owner_email: string | null
  owner_phone: string | null
  company_phone: string | null
  whatsapp_phone: string | null
  company_address: string | null
}

function rowToBrand(row: TenantBrandRow | null): TenantBrand {
  return {
    name: row?.brand_name || row?.name || 'Your Rental Company',
    logoUrl: row?.logo_url ?? null,
    email: row?.owner_email ?? null,
    phone: row?.company_phone || row?.whatsapp_phone || row?.owner_phone || null,
    address: row?.company_address ?? null,
  }
}

function verifySignature(rawBody: string, sigHeader: string, secret: string): void {
  const pairs = sigHeader.split(',').map(p => p.split('='))
  const timestamp = pairs.find(([k]) => k === 't')?.[1]
  const signatures = pairs.filter(([k]) => k === 'v1').map(([, v]) => v)

  if (!timestamp || !signatures.length) throw new Error('Invalid signature header')
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) throw new Error('Timestamp too old')

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex')

  if (!signatures.includes(expected)) throw new Error('Signature mismatch')
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const sig = request.headers.get('stripe-signature') || ''
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET

  if (!webhookSecret) {
    return new Response('Missing connect webhook secret', { status: 500 })
  }

  let stripeEvent: { type: string; data: { object: Record<string, unknown> }; account?: string }
  try {
    verifySignature(rawBody, sig, webhookSecret)
    stripeEvent = JSON.parse(rawBody)
  } catch (err: unknown) {
    return new Response(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown'}`, { status: 400 })
  }

  const supabase = createAdminClient()
  const { type, data, account: connectedAccountId } = stripeEvent

  // ── checkout.session.completed (rental payment on connected account) ──
  if (type === 'checkout.session.completed') {
    const session = data.object as Record<string, unknown>
    const metadata = session.metadata as Record<string, string> | undefined

    // Only process rental checkouts (they have car_id in metadata)
    if (!metadata?.car_id || !metadata?.tenant_id) {
      return new Response('ok', { status: 200 })
    }

    const tenantId = metadata.tenant_id
    const carId = parseInt(metadata.car_id, 10)
    const startDate = metadata.start_date
    const endDate = metadata.end_date
    const days = parseInt(metadata.days || '0', 10)
    const customerName = metadata.customer_name || 'Customer'
    const customerEmail = (session.customer_email as string) || ''
    const paymentIntentId = (session.payment_intent as string) || null
    const amountTotal = (session.amount_total as number) || 0
    const totalDollars = amountTotal / 100

    // Check for duplicate — idempotency via payment_intent
    if (paymentIntentId) {
      const { data: existing } = await supabase
        .from('reservations')
        .select('id')
        .eq('stripe_payment_id', paymentIntentId)
        .maybeSingle()

      if (existing) {
        return new Response('ok', { status: 200 })
      }
    }

    // Fetch car details for emails
    const { data: car } = await supabase
      .from('cars')
      .select('make, model, model_full')
      .eq('id', carId)
      .eq('tenant_id', tenantId)
      .single()

    const carName = car ? `${car.make} ${car.model_full || car.model}` : `Car #${carId}`

    // Create the reservation
    const { data: reservation, error: insertError } = await supabase
      .from('reservations')
      .insert({
        tenant_id: tenantId,
        car_id: carId,
        customer_name: customerName,
        customer_email: customerEmail || null,
        pickup_date: startDate,
        return_date: endDate,
        total_amount: totalDollars,
        status: 'confirmed',
        source: 'stripe',
        stripe_payment_id: paymentIntentId,
        notes: `Paid online — ${days} day${days !== 1 ? 's' : ''} via Stripe Checkout`,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[connect-webhook] Failed to create reservation:', insertError.message)
      return new Response('Reservation insert failed', { status: 500 })
    }

    // ── Send emails (fire-and-forget) ──

    // Fetch tenant info for emails
    const { data: tenantRow } = await supabase
      .from('tenants')
      .select(TENANT_BRAND_COLUMNS)
      .eq('id', tenantId)
      .single()

    const brand = rowToBrand(tenantRow as TenantBrandRow | null)
    const tenantName = brand.name

    // 1. Notify operator
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('tenant_id', tenantId)

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
            pickupDate: startDate,
            returnDate: endDate,
            totalAmount: totalDollars,
            tenantName,
          }),
        }).catch(e => console.error('[connect-webhook] Operator email failed:', e))
      }
    }

    // 2. Confirm to customer
    if (customerEmail && reservation) {
      sendEmail({
        to: customerEmail,
        fromName: tenantName,
        replyTo: brand.email ?? undefined,
        ...bookingConfirmedCustomerEmail({
          customerName,
          brand,
          carName,
          pickupDate: startDate,
          returnDate: endDate,
          pickupLocation: 'To be confirmed',
          reservationId: reservation.id,
        }),
      }).catch(e => console.error('[connect-webhook] Customer email failed:', e))
    }
  }

  // ── charge.refunded — mark reservation as refunded ──
  if (type === 'charge.refunded') {
    const charge = data.object as Record<string, unknown>
    const paymentIntentId = charge.payment_intent as string | null

    if (paymentIntentId) {
      await supabase
        .from('reservations')
        .update({ status: 'cancelled', notes: 'Payment refunded via Stripe' })
        .eq('stripe_payment_id', paymentIntentId)
    }
  }

  return new Response('ok', { status: 200 })
}
