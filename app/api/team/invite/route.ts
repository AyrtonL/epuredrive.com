/**
 * POST /api/team/invite
 * Sends a Supabase invitation email and creates the profile row.
 * Requires: SUPABASE_SERVICE_ROLE_KEY
 *
 * NOTE: Prefer the `inviteTeamMember` Server Action in settings/roles/actions.ts
 * which has the same functionality with auth already enforced by requireTenantId().
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'
import { teamInviteEmail } from '@/lib/email/templates/platform'

const ALLOWED_ROLES = ['admin', 'finance', 'staff'] as const
type Role = (typeof ALLOWED_ROLES)[number]

export async function POST(request: Request) {
  // Verify the caller is authenticated and belongs to the supplied tenantId
  const supabaseUser = createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabaseUser
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, name, role, tenantId } = body as Record<string, string>

  // Ensure the caller can only invite into their own tenant
  if (tenantId !== profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }
  if (!ALLOWED_ROLES.includes(role as Role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 1 — Generate invite link (does NOT auto-send Supabase's default email)
  // tenant_id in user_metadata lets the roles page identify pending (unaccepted) invites
  const { data: linkData, error: inviteError } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      data: { full_name: name || '', role, tenant_id: tenantId },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://epuredrive.com'}/dashboard`,
    },
  })

  if (inviteError || !linkData) {
    return NextResponse.json({ error: inviteError?.message ?? 'Failed to generate invite' }, { status: 400 })
  }

  const newUserId = linkData.user?.id
  const inviteUrl = (linkData as any).properties?.action_link as string | undefined

  // 2 — Create profile row with tenant + role set before first login
  if (newUserId && tenantId) {
    await supabase.from('profiles').upsert({
      id: newUserId,
      tenant_id: tenantId,
      full_name: name || null,
      role,
      invited_by_user_id: user.id,
      invite_accepted_notified_at: null,
    })
  }

  // 3 — Send branded invite email
  if (inviteUrl) {
    const { data: inviterProfile } = await supabaseUser
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const { data: tenantData } = await supabase
      .from('tenants')
      .select('brand_name, name')
      .eq('id', tenantId)
      .single()

    const companyName = tenantData?.brand_name || tenantData?.name || 'the team'
    const invitedBy = inviterProfile?.full_name || user.email || 'Your team admin'

    await sendEmail({
      to: email,
      ...teamInviteEmail({ invitedBy, companyName, role, inviteUrl }),
    }).catch(() => {}) // non-blocking
  }

  return NextResponse.json({ success: true, userId: newUserId })
}
