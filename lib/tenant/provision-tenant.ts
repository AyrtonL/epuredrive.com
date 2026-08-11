import { createAdminClient } from '@/lib/supabase/admin'

// Self-heal path for the "confirmed user, no tenant" dead end: the primary
// provisioning flow (netlify/functions/create-tenant.js, run from the auth
// callback right after signup) can fail after the auth account is already
// confirmed, leaving the user permanently stuck on a "Profile Incomplete"
// screen with no retry. Called from the dashboard layout whenever a logged-in
// user has no tenant_id, so provisioning is retried on next login instead of
// requiring manual DB intervention.
export async function provisionTenantForUser(
  userId: string,
  email: string | undefined,
  metadata: Record<string, unknown>
): Promise<string | null> {
  const admin = createAdminClient()

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

  const { error: profileError } = await admin
    .from('profiles')
    .upsert({ id: userId, tenant_id: tenant.id, role: 'admin' }, { onConflict: 'id' })

  if (profileError) return null

  return tenant.id
}
