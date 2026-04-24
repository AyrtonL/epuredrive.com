// lib/email/telematics.ts
// Minimal MVP sender for telematics alerts. Mirrors the pattern used by
// maintenance alerts: look up all operator profile ids for the tenant,
// resolve their auth emails via supabase.auth.admin.getUserById, and send
// a short HTML body that links back to the dashboard alert page.
//
// When RESEND_API_KEY is not configured, sendEmail() already short-circuits
// with a warn log — no additional guarding needed here.

import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN || 'https://epuredrive.com'

export interface TelematicsAlertEmailArgs {
  tenant_id: string
  event_id: string
  severity: 'warning' | 'critical'
  title: string
  /** Relative URL path to the alert detail, e.g. /dashboard/telematics/alerts?event=... */
  link: string
}

export async function sendTelematicsAlertEmail(
  args: TelematicsAlertEmailArgs,
): Promise<void> {
  const supabase = createAdminClient()

  // Resolve tenant name for a friendly subject/From line.
  const { data: tenant } = await supabase
    .from('tenants')
    .select('brand_name, name')
    .eq('id', args.tenant_id)
    .maybeSingle()
  const tenantName =
    tenant?.brand_name?.trim() || tenant?.name?.trim() || 'Your Fleet'

  // Fan out to all operator profiles for the tenant.
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('tenant_id', args.tenant_id)
  if (!profiles || profiles.length === 0) return

  const emails: string[] = []
  for (const p of profiles) {
    try {
      const { data } = await supabase.auth.admin.getUserById(p.id)
      const email = data?.user?.email
      if (email) emails.push(email)
    } catch {
      // A single lookup failure shouldn't drop the whole batch.
    }
  }
  if (emails.length === 0) return

  const fullLink = args.link.startsWith('http') ? args.link : `${APP_ORIGIN}${args.link}`
  const prefix = args.severity === 'critical' ? '[CRITICAL]' : '[WARNING]'
  const subject = `${prefix} ${sanitizeSubject(args.title)}`
  const html = renderHtml({ title: args.title, link: fullLink, tenantName })

  await Promise.allSettled(
    emails.map((to) =>
      sendEmail({
        to,
        subject,
        html,
        fromName: tenantName,
      }),
    ),
  )
}

function renderHtml(args: { title: string; link: string; tenantName: string }): string {
  // Intentionally minimal — dashboard design system styles these pages;
  // the email just needs to be readable and link back.
  return [
    '<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">',
    `<h2 style="margin:0 0 12px">${escapeHtml(args.title)}</h2>`,
    `<p style="margin:0 0 16px">A telematics alert was raised for your fleet.</p>`,
    `<p style="margin:0 0 16px"><a href="${escapeAttr(args.link)}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;border-radius:6px;text-decoration:none">View alert</a></p>`,
    `<p style="margin:0;color:#666;font-size:12px">Sent by ${escapeHtml(args.tenantName)} via éPure Drive</p>`,
    '</div>',
  ].join('')
}

/**
 * Strip CR/LF from a subject line to prevent email header injection via
 * user-influenced content (e.g. DTC codes pulled from provider payloads).
 * Also trims and caps length to avoid pathological headers.
 */
export function sanitizeSubject(s: string): string {
  return s.replace(/[\r\n]+/g, ' ').trim().slice(0, 200)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(s: string): string {
  return escapeHtml(s)
}
