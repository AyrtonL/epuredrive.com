import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/resend'

/**
 * Emails every member of a tenant, unless the tenant turned the email
 * channel off for this event (no saved pref = on). Resolves addresses via
 * auth — tenants.owner_email is NULL for every tenant. Returns emails sent.
 */
export async function emailTeam(
  supabase: SupabaseClient,
  tenantId: string,
  event: string,
  email: { subject: string; html: string },
): Promise<number> {
  const { data: pref } = await supabase
    .from('notification_preferences')
    .select('email_enabled')
    .eq('tenant_id', tenantId)
    .eq('event', event)
    .maybeSingle()
  if (pref && !pref.email_enabled) return 0

  const { data: profiles } = await supabase.from('profiles').select('id').eq('tenant_id', tenantId)
  const users = await Promise.allSettled((profiles ?? []).map((p) => supabase.auth.admin.getUserById(p.id)))
  const emails = users.flatMap((u) => (u.status === 'fulfilled' && u.value.data?.user?.email ? [u.value.data.user.email] : []))

  const results = await Promise.allSettled(emails.map((to) => sendEmail({ to, ...email })))
  return results.filter((r) => r.status === 'fulfilled' && !r.value.error).length
}
