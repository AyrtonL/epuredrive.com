import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { teamInviteAcceptedEmail } from '@/lib/email/templates/platform'

interface NotifyParams {
  memberUserId: string
  memberEmail: string
  memberName: string
  inviterUserId: string
  role: string
  tenantId: string
}

export async function notifyInviterOnFirstLogin(params: NotifyParams): Promise<void> {
  const admin = createAdminClient()

  const { data: claimed, error: claimError } = await admin
    .from('profiles')
    .update({ invite_accepted_notified_at: new Date().toISOString() })
    .eq('id', params.memberUserId)
    .is('invite_accepted_notified_at', null)
    .select('id')
    .maybeSingle()

  if (claimError || !claimed) return

  const [{ data: inviterAuth }, { data: inviterProfile }, { data: tenant }] = await Promise.all([
    admin.auth.admin.getUserById(params.inviterUserId),
    admin.from('profiles').select('full_name').eq('id', params.inviterUserId).single(),
    params.tenantId
      ? admin.from('tenants').select('brand_name, name').eq('id', params.tenantId).single()
      : Promise.resolve({ data: null as { brand_name: string | null; name: string | null } | null }),
  ])

  const inviterEmail = inviterAuth?.user?.email
  if (!inviterEmail) return

  const inviterName = inviterProfile?.full_name || ''
  const companyName = tenant?.brand_name || tenant?.name || 'your team'

  await sendEmail({
    to: inviterEmail,
    ...teamInviteAcceptedEmail({
      inviterName,
      memberName: params.memberName,
      memberEmail: params.memberEmail,
      role: params.role,
      companyName,
    }),
  }).catch(() => {})
}
