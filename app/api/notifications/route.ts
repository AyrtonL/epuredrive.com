/**
 * GET  /api/notifications         — fetch unread + recent notifications
 * POST /api/notifications         — mark one or all as read
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'No tenant' }, { status: 404 })
  }

  const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '20', 10)

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, event, title, body, metadata, read, created_at')
    .eq('tenant_id', profile.tenant_id)
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 50))

  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', profile.tenant_id)
    .eq('read', false)
    .or(`user_id.is.null,user_id.eq.${user.id}`)

  return NextResponse.json({
    notifications: notifications ?? [],
    unread_count: count ?? 0,
  })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'No tenant' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { id, all } = body as { id?: string; all?: boolean }

  if (all) {
    // Mark all as read for this tenant + user
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('tenant_id', profile.tenant_id)
      .eq('read', false)
      .or(`user_id.is.null,user_id.eq.${user.id}`)
  } else if (id) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
  } else {
    return NextResponse.json({ error: 'Provide id or all:true' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
