/**
 * POST /api/team/update-role
 * Allows an admin to change another user's role within the same tenant.
 * Caller must provide a valid Supabase JWT in Authorization header.
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_ROLES = ['admin', 'finance', 'staff'] as const
type Role = (typeof ALLOWED_ROLES)[number]

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') || ''
  const callerToken = authHeader.replace('Bearer ', '').trim()
  if (!callerToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { targetUserId, newRole } = body as Record<string, string>
  if (!targetUserId || !newRole) {
    return NextResponse.json({ error: 'targetUserId and newRole are required' }, { status: 400 })
  }
  if (!ALLOWED_ROLES.includes(newRole as Role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify caller identity
  const { data: callerData, error: callerError } = await supabase.auth.getUser(callerToken)
  if (callerError || !callerData.user) {
    return NextResponse.json({ error: 'Could not verify caller identity' }, { status: 401 })
  }
  const callerId = callerData.user.id

  // Get caller profile — must be admin
  const { data: callerProfiles } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', callerId)
    .limit(1)

  const callerProfile = callerProfiles?.[0]
  if (!callerProfile || callerProfile.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can change roles' }, { status: 403 })
  }

  // Prevent self-role changes
  if (callerId === targetUserId) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
  }

  // Verify target is in the same tenant
  const { data: targetProfiles } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', targetUserId)
    .limit(1)

  const targetProfile = targetProfiles?.[0]
  if (!targetProfile || targetProfile.tenant_id !== callerProfile.tenant_id) {
    return NextResponse.json({ error: 'Cannot modify users from another tenant' }, { status: 403 })
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
