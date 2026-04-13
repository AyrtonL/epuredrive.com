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

  // 1 — Send invitation email via Supabase Auth Admin API
  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name || '', role },
  })

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 })
  }

  const newUserId = inviteData.user?.id

  // 2 — Create profile row with tenant + role set before first login
  if (newUserId && tenantId) {
    await supabase.from('profiles').upsert({
      id: newUserId,
      tenant_id: tenantId,
      full_name: name || null,
      role,
    })
  }

  return NextResponse.json({ success: true, userId: newUserId })
}
