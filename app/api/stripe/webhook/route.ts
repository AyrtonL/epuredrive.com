/**
 * POST /api/stripe/webhook
 * Handles Stripe events to activate/suspend tenant plans.
 * Requires: STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

const STARTER_PRICE_ID = 'price_1TDaQ3HAH4zJnnwfasGBYtYO'
const PRO_PRICE_ID = 'price_1TF2UnHAH4zJnnwfTwU129PO'

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
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    return new Response('Missing webhook secret', { status: 500 })
  }

  let stripeEvent: { type: string; data: { object: any } }
  try {
    verifySignature(rawBody, sig, webhookSecret)
    stripeEvent = JSON.parse(rawBody)
  } catch (err: unknown) {
    return new Response(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown'}`, { status: 400 })
  }

  const supabase = createAdminClient()
  const { type, data } = stripeEvent

  async function patchTenant(tenantId: string, patch: Record<string, unknown>) {
    await supabase.from('tenants').update(patch).eq('id', tenantId)
  }

  if (type === 'checkout.session.completed') {
    const session = data.object
    const tenantId: string | undefined = session.metadata?.tenantId
    if (tenantId) {
      const priceId: string | undefined = session.metadata?.priceId
      const plan = priceId === PRO_PRICE_ID ? 'pro' : 'starter'
      await patchTenant(tenantId, {
        plan,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
      })
    }
  }

  if (type === 'customer.subscription.updated') {
    const sub = data.object
    const tenantId: string | undefined = sub.metadata?.tenantId
    if (tenantId) {
      const priceId: string | undefined = sub.items?.data?.[0]?.price?.id
      const plan = priceId === PRO_PRICE_ID ? 'pro' : 'starter'
      await patchTenant(tenantId, { plan })
    }
  }

  if (type === 'customer.subscription.deleted') {
    const sub = data.object
    const tenantId: string | undefined = sub.metadata?.tenantId
    if (tenantId) {
      await patchTenant(tenantId, { plan: 'suspended' })
    }
  }

  return new Response('ok', { status: 200 })
}
