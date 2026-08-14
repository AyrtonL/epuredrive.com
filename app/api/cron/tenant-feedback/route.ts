/**
 * POST /api/cron/tenant-feedback
 * Pass 1: sends a product-feedback request 14 days after tenant signup.
 * Pass 2: sends one reminder 7 days after that, only if no feedback was submitted.
 * Call daily via cron.
 * Requires: Authorization: Bearer <CRON_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { tenantFeedbackRequestEmail, tenantFeedbackReminderEmail } from '@/lib/email/templates/platform'

function daysAgoRange(days: number): { startStr: string; endStr: string } {
  const end = new Date()
  end.setDate(end.getDate() - days)
  const start = new Date()
  start.setDate(start.getDate() - (days + 1))
  return { startStr: start.toISOString(), endStr: end.toISOString() }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  let initialSent = 0
  let remindersSent = 0

  // Pass 1: initial send, 14–15 days after signup.
  {
    const { startStr, endStr } = daysAgoRange(14)
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, owner_name, owner_email, status, created_at, feedback_email_sent_at')
      .is('feedback_email_sent_at', null)
      .not('owner_email', 'is', null)
      .eq('status', 'active')
      .gte('created_at', startStr)
      .lte('created_at', endStr)
      .limit(500)

    if (error) {
      console.error('[cron/tenant-feedback] initial select failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    for (const t of tenants ?? []) {
      if (!t.owner_email) continue
      const res = await sendEmail({
        to: t.owner_email,
        replyTo: 'info@epuredrive.com',
        ...tenantFeedbackRequestEmail({ operatorName: t.owner_name || 'there' }),
      }).catch(() => null)

      if (res) {
        await supabase.from('tenants').update({ feedback_email_sent_at: new Date().toISOString() }).eq('id', t.id)
        initialSent += 1
      }
    }
  }

  // Pass 2: reminder, 7–8 days after the initial email, only if still no feedback row.
  {
    const { startStr, endStr } = daysAgoRange(7)
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, owner_name, owner_email, feedback_email_sent_at, feedback_reminder_sent_at')
      .not('feedback_email_sent_at', 'is', null)
      .is('feedback_reminder_sent_at', null)
      .not('owner_email', 'is', null)
      .gte('feedback_email_sent_at', startStr)
      .lte('feedback_email_sent_at', endStr)
      .limit(500)

    if (error) {
      console.error('[cron/tenant-feedback] reminder select failed:', error.message)
      return NextResponse.json({ error: error.message, initialSent }, { status: 500 })
    }

    for (const t of tenants ?? []) {
      if (!t.owner_email) continue

      const { data: existingFeedback } = await supabase
        .from('tenant_feedback')
        .select('id')
        .eq('tenant_id', t.id)
        .limit(1)
        .maybeSingle()

      if (existingFeedback) continue

      const res = await sendEmail({
        to: t.owner_email,
        replyTo: 'info@epuredrive.com',
        ...tenantFeedbackReminderEmail({ operatorName: t.owner_name || 'there' }),
      }).catch(() => null)

      if (res) {
        await supabase.from('tenants').update({ feedback_reminder_sent_at: new Date().toISOString() }).eq('id', t.id)
        remindersSent += 1
      }
    }
  }

  return NextResponse.json({ initialSent, remindersSent })
}
