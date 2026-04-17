/**
 * GET /api/stripe/invoices
 * Fetches the authenticated tenant's Stripe invoices.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_customer_id')
    .eq('id', profile.tenant_id)
    .single()

  if (!tenant?.stripe_customer_id) {
    return NextResponse.json({ invoices: [] })
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const params = new URLSearchParams({
    customer: tenant.stripe_customer_id,
    limit: '24',
    status: 'paid',
  })

  const res = await fetch(`https://api.stripe.com/v1/invoices?${params}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 502 })
  }

  const stripeData = await res.json()

  const invoices = (stripeData.data ?? []).map((inv: Record<string, unknown>) => ({
    id: inv.id,
    number: inv.number,
    amount: inv.amount_paid,
    currency: inv.currency,
    status: inv.status,
    created: inv.created,
    pdf: inv.invoice_pdf,
    hosted_url: inv.hosted_invoice_url,
    period_start: inv.period_start,
    period_end: inv.period_end,
  }))

  return NextResponse.json({ invoices })
}
