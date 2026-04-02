/**
 * POST /api/team/invite
 * Sends a Supabase invitation email and creates the profile row.
 * Requires: SUPABASE_SERVICE_ROLE_KEY
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_ROLES = ['admin', 'finance', 'staff'] as const
type Role = (typeof ALLOWED_ROLES)[number]

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, name, role, tenantId } = body as Record<string, string>

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
