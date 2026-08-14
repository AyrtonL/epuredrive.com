/**
 * POST /api/cron/tenant-feedback
 * Pass 1: sends a product-feedback request 14+ days after tenant signup (with catch-up).
 * Pass 2: sends one reminder 7+ days after that, only if no feedback was submitted.
 * Call daily via cron.
 * Requires: Authorization: Bearer <CRON_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { tenantFeedbackRequestEmail, tenantFeedbackReminderEmail } from '@/lib/email/templates/platform'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // tenants.owner_email/owner_name are not populated at signup — the real
  // operator identity lives in profiles + auth.users. get_tenant_owners()
  // (SECURITY DEFINER) returns the earliest-created profile per tenant.
  const { data: ownerRows, error: ownersError } = await supabase.rpc('get_tenant_owners')
  if (ownersError) {
    console.error('[cron/tenant-feedback] get_tenant_owners failed:', ownersError.message)
    return NextResponse.json({ error: ownersError.message }, { status: 500 })
  }
  const ownerMap = new Map<string, { name: string | null; email: string | null }>(
    (ownerRows ?? []).map((o: { tenant_id: string; owner_name: string | null; owner_email: string | null }) => [
      o.tenant_id,
      { name: o.owner_name, email: o.owner_email },
    ]),
  )

  let initialSent = 0
  let remindersSent = 0

  // Pass 1: initial send. Window: created_at between 14 and 45 days ago
  // (generous catch-up, date granularity, matching review-requests' pattern)
  // so a skipped/failed cron run doesn't permanently drop a signup cohort.
  {
    const today = new Date()
    const endDate = new Date(today)
    endDate.setDate(today.getDate() - 14)
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - 45)
    const endStr = endDate.toISOString().split('T')[0]
    const startStr = startDate.toISOString().split('T')[0]

    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, status, created_at, feedback_email_sent_at')
      .is('feedback_email_sent_at', null)
      .eq('status', 'active')
      .gte('created_at', startStr)
      .lte('created_at', endStr)
      .limit(500)

    if (error) {
      console.error('[cron/tenant-feedback] initial select failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    for (const t of tenants ?? []) {
      const owner = ownerMap.get(t.id)
      if (!owner?.email) continue

      const res = await sendEmail({
        to: owner.email,
        replyTo: 'info@epuredrive.com',
        ...tenantFeedbackRequestEmail({ operatorName: owner.name || 'there' }),
      }).catch((err) => ({ error: err instanceof Error ? err.message : 'send failed', id: null }))

      if (res && !res.error) {
        await supabase.from('tenants').update({ feedback_email_sent_at: new Date().toISOString() }).eq('id', t.id)
        initialSent += 1
      } else {
        console.error('[cron/tenant-feedback] send failed for tenant', t.id, res?.error)
      }
    }
  }

  // Pass 2: reminder, 7+ days after the initial email, only if still no feedback row.
  {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, feedback_email_sent_at, feedback_reminder_sent_at')
      .not('feedback_email_sent_at', 'is', null)
      .is('feedback_reminder_sent_at', null)
      .lte('feedback_email_sent_at', sevenDaysAgo.toISOString())
      .limit(500)

    if (error) {
      console.error('[cron/tenant-feedback] reminder select failed:', error.message)
      return NextResponse.json({ error: error.message, initialSent }, { status: 500 })
    }

    for (const t of tenants ?? []) {
      const owner = ownerMap.get(t.id)
      if (!owner?.email) continue

      const { data: existingFeedback } = await supabase
        .from('tenant_feedback')
        .select('id')
        .eq('tenant_id', t.id)
        .limit(1)
        .maybeSingle()

      if (existingFeedback) continue

      const res = await sendEmail({
        to: owner.email,
        replyTo: 'info@epuredrive.com',
        ...tenantFeedbackReminderEmail({ operatorName: owner.name || 'there' }),
      }).catch((err) => ({ error: err instanceof Error ? err.message : 'send failed', id: null }))

      if (res && !res.error) {
        await supabase.from('tenants').update({ feedback_reminder_sent_at: new Date().toISOString() }).eq('id', t.id)
        remindersSent += 1
      } else {
        console.error('[cron/tenant-feedback] reminder send failed for tenant', t.id, res?.error)
      }
    }
  }

  return NextResponse.json({ initialSent, remindersSent })
}
