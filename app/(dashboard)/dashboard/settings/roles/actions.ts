'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { sendEmail } from '@/lib/email/resend'
import { teamInviteEmail } from '@/lib/email/templates/platform'

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

  const { data: linkData, error: inviteError } = await adminClient.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      data: { tenant_id: tenantId, role },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://epuredrive.com'}/dashboard`,
    },
  })

  if (inviteError || !linkData) {
    if (inviteError?.message.includes('already')) {
      return { success: false, error: 'An invitation has already been sent to this address.' }
    }
    return { success: false, error: inviteError?.message ?? 'Failed to generate invite link' }
  }

  // Create profile row immediately so the onboarding page can identify the tenant
  // and role when the invited user accepts and logs in for the first time.
  const newUserId = linkData?.user?.id
  const inviteUrl = (linkData as any).properties?.action_link as string | undefined

  if (newUserId) {
    await adminClient.from('profiles').upsert({
      id: newUserId,
      tenant_id: tenantId,
      role,
    })
  }

  // Send branded invite email
  if (inviteUrl) {
    const { data: tenantData } = await adminClient
      .from('tenants')
      .select('brand_name, name')
      .eq('id', tenantId)
      .single()
    const companyName = tenantData?.brand_name || tenantData?.name || 'the team'
    await sendEmail({
      to: email,
      ...teamInviteEmail({ invitedBy: 'Your team admin', companyName, role, inviteUrl }),
    }).catch(() => {})
  }

  return { success: true }
}
