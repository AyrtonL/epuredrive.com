'use server'

import { redirect } from 'next/navigation'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { getStripe } from '@/lib/stripe'

export async function createConnectAccount() {
  const stripe = getStripe()
  if (!stripe) return { error: 'Stripe is not configured' }

  const { supabase, tenantId } = await requireTenantId()

  // Check if tenant already has a Stripe account
  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_account_id, name, brand_name')
    .eq('id', tenantId)
    .single()

  let accountId = tenant?.stripe_account_id

  // Create a new Connect account if none exists
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'standard',
      metadata: { tenant_id: tenantId },
    })
    accountId = account.id

    // Save the account ID to the tenant
    await supabase
      .from('tenants')
      .update({ stripe_account_id: accountId })
      .eq('id', tenantId)
  }

  // Generate an account link for onboarding
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/dashboard/settings/payments`,
    return_url: `${origin}/dashboard/settings/payments?connected=true`,
    type: 'account_onboarding',
  })

  redirect(accountLink.url)
}

export async function getConnectAccountStatus(): Promise<{
  connected: boolean
  accountId: string | null
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
}> {
  const stripe = getStripe()
  if (!stripe) {
    return { connected: false, accountId: null, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false }
  }

  const { supabase, tenantId } = await requireTenantId()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_account_id')
    .eq('id', tenantId)
    .single()

  if (!tenant?.stripe_account_id) {
    return { connected: false, accountId: null, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false }
  }

  const account = await stripe.accounts.retrieve(tenant.stripe_account_id)

  return {
    connected: true,
    accountId: tenant.stripe_account_id,
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    detailsSubmitted: account.details_submitted ?? false,
  }
}
