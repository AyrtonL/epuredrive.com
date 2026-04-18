'use server'

import { redirect } from 'next/navigation'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { getStripe } from '@/lib/stripe'

const PRICE_MAP: Record<string, string | undefined> = {
  pro: process.env.STRIPE_PRICE_PRO,
  max: process.env.STRIPE_PRICE_MAX,
}

export async function createCheckoutSession(planName: string): Promise<{ error: string | null }> {
  const stripe = getStripe()
  if (!stripe) {
    return { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in environment variables.' }
  }

  const { supabase, tenantId } = await requireTenantId()

  const priceId = PRICE_MAP[planName]
  if (!priceId) {
    return { error: `No Stripe price configured for the ${planName} plan. Set STRIPE_PRICE_${planName.toUpperCase()} env var.` }
  }

  // Get tenant info for Stripe metadata
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, brand_name')
    .eq('id', tenantId)
    .single()

  const { data: { user } } = await supabase.auth.getUser()

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card', 'paypal'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://epuredrive.com'}/dashboard/settings/billing?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://epuredrive.com'}/dashboard/settings/billing?cancelled=1`,
    customer_email: user?.email ?? undefined,
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    metadata: {
      tenant_id: tenantId,
      plan: planName,
      tenant_name: tenant?.brand_name || tenant?.name || '',
    },
    subscription_data: {
      metadata: {
        tenant_id: tenantId,
        plan: planName,
      },
    },
  })

  if (session.url) {
    redirect(session.url)
  }

  return { error: 'Could not create checkout session.' }
}

export async function deactivateAccount(): Promise<{ error: string | null }> {
  const { supabase, tenantId } = await requireTenantId()

  // Mark tenant as deactivated
  const { error } = await supabase
    .from('tenants')
    .update({ plan: 'deactivated' })
    .eq('id', tenantId)

  if (error) return { error: error.message }

  // Sign out the user
  await supabase.auth.signOut()

  redirect('/login?deactivated=1')
}
