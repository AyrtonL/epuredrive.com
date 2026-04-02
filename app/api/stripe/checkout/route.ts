/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout session for plan upgrades.
 * Requires: STRIPE_SECRET_KEY
 */

import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { priceId, tenantId, email } = body as Record<string, string>
  if (!priceId || !tenantId) {
    return NextResponse.json({ error: 'priceId and tenantId are required' }, { status: 400 })
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    return NextResponse.json({ error: 'Missing Stripe secret key' }, { status: 500 })
  }

  const origin =
    request.headers.get('origin') ||
    request.headers.get('referer')?.replace(/\/[^/]*$/, '') ||
    'https://epuredrivecom.netlify.app'

  const params = new URLSearchParams({
    mode: 'subscription',
    'payment_method_types[0]': 'card',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: `${origin}/dashboard?upgraded=1`,
    cancel_url: `${origin}/dashboard?upgrade_cancelled=1`,
    'metadata[tenantId]': tenantId,
    'metadata[priceId]': priceId,
    'subscription_data[metadata][tenantId]': tenantId,
    'subscription_data[metadata][priceId]': priceId,
  })
  if (email) params.set('customer_email', email)

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  const session = await res.json()
  if (!res.ok) {
    return NextResponse.json({ error: session.error?.message || 'Stripe error' }, { status: 400 })
  }

  return NextResponse.json({ url: session.url })
}
