/**
 * POST /api/stripe/webhook
 * Handles Stripe events to activate/suspend tenant plans.
 * Requires: STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'
import { sendEmail } from '@/lib/email/resend'
import { setTenantFlag } from '@/lib/supabase/feature-flags'
import { createInAppNotification } from '@/lib/notifications/create'
import {
  subscriptionActivatedEmail,
  subscriptionChangedEmail,
  subscriptionCancelledEmail,
  paymentReceiptEmail,
  paymentFailedEmail,
} from '@/lib/email/templates/platform'

const STARTER_PRICE_ID = 'price_1TDaQ3HAH4zJnnwfasGBYtYO'
const PRO_PRICE_ID = process.env.STRIPE_PRICE_PRO ?? 'price_1TOeR2HAH4zJnnwfoIUGUERS'
const MAX_PRICE_ID = process.env.STRIPE_PRICE_MAX ?? 'price_1TOeR5HAH4zJnnwftxKqDqG2'

function resolvePlan(priceId: string | undefined, metaPlan: string | undefined): string {
  // Prefer the plan name set in checkout metadata (most reliable)
  if (metaPlan && ['pro', 'max', 'enterprise'].includes(metaPlan)) return metaPlan
  // Fall back to price ID matching
  if (priceId === PRO_PRICE_ID) return 'pro'
  if (MAX_PRICE_ID && priceId === MAX_PRICE_ID) return 'max'
  if (priceId === STARTER_PRICE_ID) return 'starter'
  return 'starter'
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

  // Telematics (Bouncie) is a Pro/Max feature. Flip tenant_feature_flags
  // whenever a plan change lands so the sidebar + middleware show/hide
  // the Telematics section without manual admin intervention.
  async function syncTelematicsFlag(tenantId: string, plan: string) {
    const enabled = plan === 'pro' || plan === 'max'
    await setTenantFlag(supabase, tenantId, 'bouncie_telematics', enabled)
  }

  async function getOperatorEmailsForTenant(tenantId: string): Promise<string[]> {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('tenant_id', tenantId)

    if (!profiles?.length) return []
    const results = await Promise.allSettled(
      profiles.map((p: { id: string }) => supabase.auth.admin.getUserById(p.id))
    )
    const emails: string[] = []
    for (const r of results) {
      if (r.status === 'fulfilled') {
        const email = r.value.data?.user?.email
        if (email) emails.push(email)
      }
    }
    return emails
  }

  async function getTenantName(tenantId: string): Promise<string> {
    const { data } = await supabase
      .from('tenants')
      .select('brand_name, name')
      .eq('id', tenantId)
      .single()
    return (data as { brand_name?: string; name?: string } | null)?.brand_name ||
      (data as { brand_name?: string; name?: string } | null)?.name ||
      'Your Fleet'
  }

  if (type === 'checkout.session.completed') {
    const session = data.object
    const tenantId: string | undefined = session.metadata?.tenant_id ?? session.metadata?.tenantId
    if (tenantId) {
      const priceId: string | undefined = session.metadata?.priceId ?? session.metadata?.price_id
      const plan = resolvePlan(priceId, session.metadata?.plan)
      await patchTenant(tenantId, {
        plan,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
      })
      await syncTelematicsFlag(tenantId, plan)
      // Send subscription activated email
      const emails = await getOperatorEmailsForTenant(tenantId)
      const tenantName = await getTenantName(tenantId)
      const billingDate = session.current_period_end
        ? new Date(session.current_period_end * 1000).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
          })
        : undefined
      Promise.allSettled(
        emails.map(email =>
          sendEmail({
            to: email,
            ...subscriptionActivatedEmail({
              operatorName: tenantName,
              plan,
              billingDate,
            }),
          })
        )
      ).catch(() => {})
    }
  }

  if (type === 'customer.subscription.updated') {
    const sub = data.object
    const tenantId: string | undefined = sub.metadata?.tenant_id ?? sub.metadata?.tenantId
    if (tenantId) {
      const priceId: string | undefined = sub.items?.data?.[0]?.price?.id
      const plan = resolvePlan(priceId, sub.metadata?.plan)
      await patchTenant(tenantId, { plan, plan_limit_warning_last_count: null })
      await syncTelematicsFlag(tenantId, plan)
      // Send subscription changed email
      const emailsUpd = await getOperatorEmailsForTenant(tenantId)
      const nameUpd = await getTenantName(tenantId)
      const previousPlan = sub.metadata?.previousPlan ?? 'free'
      Promise.allSettled(
        emailsUpd.map(email =>
          sendEmail({
            to: email,
            ...subscriptionChangedEmail({
              operatorName: nameUpd,
              previousPlan,
              newPlan: plan,
            }),
          })
        )
      ).catch(() => {})
    }
  }

  if (type === 'customer.subscription.deleted') {
    const sub = data.object
    const tenantId: string | undefined = sub.metadata?.tenant_id ?? sub.metadata?.tenantId
    if (tenantId) {
      const priceId: string | undefined = sub.items?.data?.[0]?.price?.id
      const plan = resolvePlan(priceId, sub.metadata?.plan)
      await patchTenant(tenantId, { plan: 'free' })
      // plan is 'free' here — disables bouncie_telematics per Starter/downgrade rule.
      await syncTelematicsFlag(tenantId, 'free')
      // Send subscription cancelled email
      const emailsDel = await getOperatorEmailsForTenant(tenantId)
      const nameDel = await getTenantName(tenantId)
      Promise.allSettled(
        emailsDel.map(email =>
          sendEmail({
            to: email,
            ...subscriptionCancelledEmail({ operatorName: nameDel, plan: plan ?? 'pro' }),
          })
        )
      ).catch(() => {})
    }
  }

  if (type === 'invoice.payment_succeeded') {
    const invoice = data.object as any
    const customerId: string | undefined = invoice.customer
    if (customerId) {
      const { data: tenantRow } = await supabase
        .from('tenants')
        .select('id, brand_name, name, plan')
        .eq('stripe_customer_id', customerId)
        .single()

      if (tenantRow) {
        const emailsInv = await getOperatorEmailsForTenant((tenantRow as any).id)
        const amountCents: number = invoice.amount_paid ?? 0
        const amount = `$${(amountCents / 100).toFixed(2)}`
        const billingDate = new Date(((invoice.created ?? Date.now() / 1000)) * 1000)
          .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        const last4: string | undefined =
          invoice.payment_intent?.payment_method?.card?.last4 ?? undefined
        Promise.allSettled(
          emailsInv.map(email =>
            sendEmail({
              to: email,
              ...paymentReceiptEmail({
                operatorName: (tenantRow as any).brand_name || (tenantRow as any).name,
                plan: (tenantRow as any).plan ?? 'starter',
                amount,
                billingDate,
                last4,
              }),
            })
          )
        ).catch(() => {})

        // In-app notification
        createInAppNotification({
          tenantId: (tenantRow as any).id,
          event: 'payment_received',
          title: 'Payment Received',
          body: `${amount} payment processed for your ${(tenantRow as any).plan ?? 'subscription'} plan`,
        }).catch(() => {})
      }
    }
  }

  if (type === 'invoice.payment_failed') {
    const invoice = data.object as any
    const customerId: string | undefined = invoice.customer
    if (customerId) {
      const { data: tenantRow } = await supabase
        .from('tenants')
        .select('id, brand_name, name')
        .eq('stripe_customer_id', customerId)
        .single()

      if (tenantRow) {
        const emailsFail = await getOperatorEmailsForTenant((tenantRow as any).id)
        const amountCents: number = invoice.amount_due ?? 0
        const amount = `$${(amountCents / 100).toFixed(2)}`
        const reason: string | undefined =
          invoice.last_finalization_error?.message ??
          invoice.payment_intent?.last_payment_error?.message ??
          undefined
        Promise.allSettled(
          emailsFail.map(email =>
            sendEmail({
              to: email,
              ...paymentFailedEmail({
                operatorName: (tenantRow as any).brand_name || (tenantRow as any).name,
                amount,
                reason,
              }),
            })
          )
        ).catch(() => {})
      }
    }
  }

  return new Response('ok', { status: 200 })
}
