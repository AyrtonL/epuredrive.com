'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'

export type InviteResult =
  | { success: true }
  | { success: false; error: string }

export async function inviteTeamMember(
  email: string,
  role: string
): Promise<InviteResult> {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { success: false, error: 'Invalid email address.' }
  }
  const validRoles = ['admin', 'manager', 'staff', 'finance']
  if (!validRoles.includes(role)) {
    return { success: false, error: 'Invalid role.' }
  }

  const { tenantId } = await requireTenantId()
  const adminClient = createAdminClient()

  const { data: inviteData, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { tenant_id: tenantId, role },
  })

  if (error) {
    if (error.message.includes('already')) {
      return { success: false, error: 'An invitation has already been sent to this address.' }
    }
    return { success: false, error: 'Failed to send invitation. Please try again.' }
  }

  // Create profile row immediately so the onboarding page can identify the tenant
  // and role when the invited user accepts and logs in for the first time.
  const newUserId = inviteData?.user?.id
  if (newUserId) {
    await adminClient.from('profiles').upsert({
      id: newUserId,
      tenant_id: tenantId,
      role,
    })
  }

  return { success: true }
}
