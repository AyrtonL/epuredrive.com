/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout session for plan upgrades.
 * Requires: STRIPE_SECRET_KEY
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'stripe-checkout', { windowMs: 60_000, max: 10 })
  if (limited) return limited
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
    'https://epuredrive.com'

  const params = new URLSearchParams({
    mode: 'subscription',
    'payment_method_types[0]': 'card',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: `${origin}/dashboard/settings/billing?success=1`,
    cancel_url: `${origin}/dashboard/settings/billing?cancelled=1`,
    'metadata[tenant_id]': tenantId,
    'metadata[priceId]': priceId,
    'subscription_data[metadata][tenant_id]': tenantId,
    'subscription_data[metadata][priceId]': priceId,
    'automatic_tax[enabled]': 'true',
    'tax_id_collection[enabled]': 'true',
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
    console.error('[stripe/checkout] Stripe error:', session.error?.message)
    return NextResponse.json({ error: 'Payment session could not be created' }, { status: 400 })
  }

  return NextResponse.json({ url: session.url })
}
