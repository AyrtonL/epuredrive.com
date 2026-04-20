/**
 * POST /api/superadmin/update
 * Updates a tenant's plan, notes, or owner contact info.
 * Caller must provide a valid Supabase JWT + is_super_admin = true.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { subscriptionActivatedEmail, subscriptionChangedEmail } from '@/lib/email/templates/platform'
import { rateLimit } from '@/lib/rate-limit'

const VALID_PLANS = ['free', 'pro', 'max', 'suspended'] as const
const ALLOWED_FIELDS = ['plan', 'notes', 'owner_name', 'owner_email', 'owner_phone'] as const

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'superadmin-update', { windowMs: 60_000, max: 20 })
  if (limited) return limited
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { tenantId, updates } = body as { tenantId?: string; updates?: Record<string, string> }
  if (!tenantId || !updates) {
    return NextResponse.json({ error: 'tenantId and updates required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify JWT
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  // Check is_super_admin
  const { data: profiles } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', userData.user.id)
    .limit(1)

  if (!profiles?.[0]?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Whitelist allowed fields
  const safe: Record<string, string> = {}
  for (const k of ALLOWED_FIELDS) {
    if (updates[k] !== undefined) safe[k] = updates[k]
  }
  if (!Object.keys(safe).length) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  if (safe.plan && !VALID_PLANS.includes(safe.plan as (typeof VALID_PLANS)[number])) {
    return NextResponse.json({ error: 'Invalid plan value' }, { status: 400 })
  }

  const { error: patchError } = await supabase.from('tenants').update(safe).eq('id', tenantId)
  if (patchError) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  // Fire plan change email if plan was updated
  if (safe.plan) {
    Promise.resolve().then(async () => {
      try {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('brand_name, name, plan')
          .eq('id', tenantId)
          .single()

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('tenant_id', tenantId)

        if (!profiles?.length || !tenant) return

        const emailResults = await Promise.allSettled(
          profiles.map(p => supabase.auth.admin.getUserById(p.id))
        )
        const emails: string[] = []
        for (const r of emailResults) {
          if (r.status === 'fulfilled' && r.value.data?.user?.email) {
            emails.push(r.value.data.user.email)
          }
        }

        const tenantName = tenant.brand_name || tenant.name || 'Your Fleet'
        const newPlan = safe.plan as string
        const previousPlan = tenant.plan ?? 'free'

        // If activating from free/suspended, send activation email; otherwise send change email
        const isPaidPlan = ['pro', 'max'].includes(newPlan)
        const wasInactive = ['free', 'suspended', 'deactivated'].includes(previousPlan)

        await Promise.allSettled(
          emails.map(email =>
            sendEmail({
              to: email,
              ...(isPaidPlan && wasInactive
                ? subscriptionActivatedEmail({ operatorName: tenantName, plan: newPlan })
                : subscriptionChangedEmail({ operatorName: tenantName, previousPlan, newPlan })),
            })
          )
        )
      } catch {
        // non-critical
      }
    })
  }

  return NextResponse.json({ ok: true })
}
