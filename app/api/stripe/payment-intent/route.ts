/**
 * POST /api/stripe/payment-intent
 * Creates a Stripe PaymentIntent for one-time bookings.
 * Requires: STRIPE_SECRET_KEY
 */

import { NextResponse } from 'next/server'

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*'

const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function POST(request: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'Payment service not configured' }, { status: 500, headers: CORS })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400, headers: CORS })
  }

  const { amount, currency = 'usd', carName, pickupDate, returnDate, customerEmail } =
    body as Record<string, string | number>

  const amountCents = Math.round(Number(amount))
  if (!amountCents || amountCents < 50) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400, headers: CORS })
  }

  const params = new URLSearchParams({
    amount: String(amountCents),
    currency: String(currency),
    'automatic_payment_methods[enabled]': 'true',
    description: `Rental: ${carName || 'Vehicle'} (${pickupDate} – ${returnDate})`,
    'metadata[car_name]': String(carName || ''),
    'metadata[pickup_date]': String(pickupDate || ''),
    'metadata[return_date]': String(returnDate || ''),
  })
  if (customerEmail) params.set('receipt_email', String(customerEmail))

  const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  const intent = await stripeRes.json()
  if (intent.error) {
    return NextResponse.json({ error: intent.error.message }, { status: 402, headers: CORS })
  }

  return NextResponse.json({ clientSecret: intent.client_secret }, { headers: CORS })
}
