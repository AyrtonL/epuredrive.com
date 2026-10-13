import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { welcomeEmail, adminNewSignupEmail } from '@/lib/email/templates/platform'

// Self-heal path for the "confirmed user, no tenant" dead end: the primary
// provisioning flow (netlify/functions/create-tenant.js, run from the auth
// callback right after signup) can fail after the auth account is already
// confirmed, leaving the user permanently stuck on a "Profile Incomplete"
// screen with no retry. Called from the dashboard layout whenever a logged-in
// user has no tenant_id, so provisioning is retried on next login instead of
// requiring manual DB intervention.
//
// SAFETY (incident 2026-10-13): the caller's RLS profile read can fail
// transiently (e.g. mid token refresh). That used to look like "no tenant",
// so an existing user got a brand-new empty tenant and their profile —
// tenant AND role — was overwritten. Now the profile is re-read with the
// admin client first; we only create a tenant when it is confirmed missing,
// and we only ever fill a NULL tenant_id, never replace one or the role.
export async function provisionTenantForUser(
  userId: string,
  email: string | undefined,
  metadata: Record<string, unknown>
): Promise<string | null> {
  const admin = createAdminClient()

  const { data: existing, error: readError } = await admin
    .from('profiles')
    .select('id, tenant_id, role')
    .eq('id', userId)
    .maybeSingle()
  if (readError) {
    console.error('[provisionTenantForUser] profile read failed — not provisioning', readError.message)
    return null
  }
  if (existing?.tenant_id) return existing.tenant_id as string

  const company =
    (metadata.company as string) ||
    (metadata.full_name as string) ||
    (metadata.name as string) ||
    email?.split('@')[0] ||
    'My Fleet'

  const rawSlug = company.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32) + '-' + Date.now()
  const slug = rawSlug.slice(0, 63)

  const { data: tenant, error: tenantError } = await admin
    .from('tenants')
    .insert({ name: company, slug, plan: 'free' })
    .select('id')
    .single()

  if (tenantError || !tenant) return null

  if (existing) {
    // Fill only a missing tenant; keep the existing role untouched.
    const { data: updated, error: updateError } = await admin
      .from('profiles')
      .update({ tenant_id: tenant.id })
      .eq('id', userId)
      .is('tenant_id', null)
      .select('id')
      .maybeSingle()
    if (updateError || !updated) {
      // Someone else linked a tenant in the meantime — drop ours, keep theirs.
      await admin.from('tenants').delete().eq('id', tenant.id)
      return null
    }
  } else {
    const { error: insertError } = await admin
      .from('profiles')
      .insert({ id: userId, tenant_id: tenant.id, role: 'admin' })
    if (insertError) {
      await admin.from('tenants').delete().eq('id', tenant.id)
      return null
    }
  }

  if (email) {
    const operatorName = (metadata.company as string) || email.split('@')[0] || 'there'
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL
    const emails = [sendEmail({ to: email, ...welcomeEmail({ operatorName }) })]
    if (adminEmail) {
      emails.push(
        sendEmail({
          to: adminEmail,
          ...adminNewSignupEmail({
            userEmail: email,
            companyName: company,
            tenantSlug: slug,
            signedUpAt: new Date().toISOString(),
          }),
        })
      )
    }
    Promise.allSettled(emails).catch(() => {}) // intentional fire-and-forget
  }

  return tenant.id
}
