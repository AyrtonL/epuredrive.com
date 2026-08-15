/**
 * POST /api/cron/review-requests
 * Sends a review-request email to customers one day after their rental return_date.
 * Call daily via cron.
 * Requires: Authorization: Bearer <CRON_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { reviewRequestCustomerEmail } from '@/lib/email/templates/rentals'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Target: reservations whose return_date is 1-14 days ago, agreement signed,
  // not cancelled, and we haven't already sent a review email for.
  const today = new Date()
  const endDate = new Date(today)
  endDate.setDate(today.getDate() - 1) // yesterday
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - 14) // up to 14 days back (catch-up window)

  const endStr = endDate.toISOString().split('T')[0]
  const startStr = startDate.toISOString().split('T')[0]

  const { data: reservations, error } = await supabase
    .from('reservations')
    .select('id, tenant_id, car_id, customer_name, customer_email, return_date, status, agreement_signed_at, review_email_sent_at')
    .is('review_email_sent_at', null)
    .not('customer_email', 'is', null)
    .not('agreement_signed_at', 'is', null)
    .gte('return_date', startStr)
    .lte('return_date', endStr)
    .neq('status', 'cancelled')
    .limit(500)

  if (error) {
    console.error('[cron/review-requests]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!reservations?.length) {
    return NextResponse.json({ sent: 0 })
  }

  // Bulk fetch car + tenant data
  const carIds = Array.from(new Set(reservations.map(r => r.car_id).filter(Boolean)))
  const tenantIds = Array.from(new Set(reservations.map(r => r.tenant_id).filter(Boolean)))

  const [{ data: cars }, { data: tenants }] = await Promise.all([
    carIds.length
      ? supabase.from('cars').select('id, make, model, model_full').in('id', carIds as number[])
      : Promise.resolve({ data: [] as Array<{ id: number; make: string | null; model: string | null; model_full: string | null }> }),
    tenantIds.length
      ? supabase
          .from('tenants')
          .select('id, brand_name, name, slug, logo_url, owner_email, owner_phone, company_phone, whatsapp_phone, company_address')
          .in('id', tenantIds as string[])
      : Promise.resolve({
          data: [] as Array<{
            id: string
            brand_name: string | null
            name: string | null
            slug: string | null
            logo_url: string | null
            owner_email: string | null
            owner_phone: string | null
            company_phone: string | null
            whatsapp_phone: string | null
            company_address: string | null
          }>,
        }),
  ])

  const carMap = new Map((cars ?? []).map(c => [c.id, `${c.make ?? ''} ${c.model_full || c.model || ''}`.trim() || 'Vehicle']))
  const tenantMap = new Map((tenants ?? []).map(t => [t.id, t]))

  let sent = 0

  for (const r of reservations) {
    if (!r.customer_email || !r.tenant_id) continue
    const tenant = tenantMap.get(r.tenant_id)
    if (!tenant) continue

    const tenantSlug = tenant.slug || ''
    if (!tenantSlug) continue

    const carName = carMap.get(r.car_id ?? -1) ?? 'Vehicle'
    const brand = {
      name: tenant.brand_name || tenant.name || 'Your rental company',
      logoUrl: tenant.logo_url ?? null,
      email: tenant.owner_email ?? null,
      phone: tenant.company_phone || tenant.whatsapp_phone || tenant.owner_phone || null,
      address: tenant.company_address ?? null,
    }

    const reviewToken = crypto.randomUUID()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${tenantSlug}.epuredrive.com`
    const reviewUrl = `${baseUrl}/sites/${tenantSlug}/review/${reviewToken}`

    // Persist the token before sending — a token that's emailed but never
    // saved would be a permanently dead link for the customer.
    const { error: tokenError } = await supabase
      .from('reservations')
      .update({ review_token: reviewToken })
      .eq('id', r.id)
    if (tokenError) {
      console.error('[cron/review-requests] failed to persist review_token for', r.id, tokenError.message)
      continue
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
      await supabase
        .from('reservations')
        .update({ review_email_sent_at: new Date().toISOString() })
        .eq('id', r.id)
      sent += 1
    } else {
      console.error('[cron/review-requests] send failed for', r.id, res?.error)
    }
  }

  return NextResponse.json({ sent, candidates: reservations.length })
}
