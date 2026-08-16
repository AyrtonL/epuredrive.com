/* eslint-disable no-console */
/**
 * One-time manual resend: the review-request email for reservation
 * 3aa8778d-761c-4d19-b4f3-cd2d506740cf was sent 2026-08-08, before the
 * renter-review-capture upgrade shipped — the customer got the old
 * tenant-homepage-redirect link, not a real review capture link.
 *
 * This mirrors the exact persist-then-send logic in
 * app/api/cron/review-requests/route.ts for this single reservation.
 *
 * Usage:
 *   npx tsx scripts/resend-review-request.ts
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function loadEnvLocal() {
  const path = join(process.cwd(), '.env.local')
  try {
    const content = readFileSync(path, 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // ignore
  }
}
loadEnvLocal()

import { createAdminClient } from '../lib/supabase/admin'
import { sendEmail } from '../lib/email/resend'
import { reviewRequestCustomerEmail } from '../lib/email/templates/rentals'

const RESERVATION_ID = '3aa8778d-761c-4d19-b4f3-cd2d506740cf'

async function main() {
  const supabase = createAdminClient()

  const { data: r, error } = await supabase
    .from('reservations')
    .select('id, customer_name, customer_email, tenant_id, car_id')
    .eq('id', RESERVATION_ID)
    .single()

  if (error || !r) {
    console.error('reservation lookup failed:', error?.message)
    process.exit(1)
  }
  if (!r.customer_email || !r.tenant_id) {
    console.error('missing customer_email or tenant_id')
    process.exit(1)
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, brand_name, slug, logo_url, owner_email, owner_phone, company_phone, whatsapp_phone, company_address')
    .eq('id', r.tenant_id)
    .single()
  if (!tenant) {
    console.error('tenant not found')
    process.exit(1)
  }

  const tenantSlug = tenant.slug || ''
  if (!tenantSlug) {
    console.error('tenant has no slug')
    process.exit(1)
  }

  const { data: car } = r.car_id
    ? await supabase.from('cars').select('make, model, model_full').eq('id', r.car_id).maybeSingle()
    : { data: null }
  const carName = car ? `${car.make ?? ''} ${car.model_full || car.model || ''}`.trim() || 'Vehicle' : 'Vehicle'

  const brand = {
    name: tenant.brand_name || tenant.name || 'Your rental company',
    logoUrl: tenant.logo_url ?? null,
    email: tenant.owner_email ?? null,
    phone: tenant.company_phone || tenant.whatsapp_phone || tenant.owner_phone || null,
    address: tenant.company_address ?? null,
  }

  const reviewToken = crypto.randomUUID()
  // NEXT_PUBLIC_APP_URL is set in Netlify but NOT in .env.local — the
  // subdomain fallback (`https://{slug}.epuredrive.com`) 404s (confirmed
  // 2026-08-15), so always use the production apex domain for one-off
  // scripts run locally instead of relying on the env fallback.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://epuredrive.com'
  const reviewUrl = `${baseUrl}/sites/${tenantSlug}/review/${reviewToken}`

  const { error: tokenError } = await supabase
    .from('reservations')
    .update({ review_token: reviewToken })
    .eq('id', r.id)
  if (tokenError) {
    console.error('failed to persist review_token:', tokenError.message)
    process.exit(1)
  }

  const res = await sendEmail({
    to: r.customer_email,
    fromName: brand.name,
    replyTo: brand.email ?? undefined,
    ...reviewRequestCustomerEmail({
      customerName: r.customer_name || 'there',
      brand,
      carName,
      tenantSlug,
      reviewUrl,
    }),
  }).catch((err) => ({ error: err instanceof Error ? err.message : 'send failed', id: null }))

  if (res && !res.error) {
    console.log(`SENT -> ${r.customer_email}`)
    console.log(`review link: ${reviewUrl}`)
  } else {
    console.log(`FAIL -> ${r.customer_email}: ${res?.error}`)
    process.exit(1)
  }
}

main()
