/**
 * GET  /api/notifications/preferences — fetch tenant's notification preferences
 * POST /api/notifications/preferences — upsert notification preferences
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const NOTIFICATION_EVENTS = [
  'new_booking',
  'booking_modified',
  'booking_cancelled',
  'maintenance_due',
  'payment_received',
  'team_invite_accepted',
  'turo_sync_complete',
  'vehicle_status_change',
] as const

export async function GET() {
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
    return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
  }

  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('event, email_enabled, app_enabled')
    .eq('tenant_id', profile.tenant_id)

  // Build a full map with defaults for events not yet saved
  const prefMap: Record<string, { email_enabled: boolean; app_enabled: boolean }> = {}
  for (const event of NOTIFICATION_EVENTS) {
    prefMap[event] = { email_enabled: true, app_enabled: false }
  }
  for (const p of prefs ?? []) {
    prefMap[p.event] = { email_enabled: p.email_enabled, app_enabled: p.app_enabled }
  }

  return NextResponse.json({ preferences: prefMap })
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
    return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const preferences = (body as { preferences?: Record<string, { email_enabled: boolean; app_enabled: boolean }> })?.preferences
  if (!preferences || typeof preferences !== 'object') {
    return NextResponse.json({ error: 'preferences object required' }, { status: 400 })
  }

  const rows = Object.entries(preferences)
    .filter(([event]) => (NOTIFICATION_EVENTS as readonly string[]).includes(event))
    .map(([event, pref]) => ({
      tenant_id: profile.tenant_id,
      event,
      email_enabled: Boolean(pref.email_enabled),
      app_enabled: Boolean(pref.app_enabled),
      updated_at: new Date().toISOString(),
    }))

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No valid preferences provided' }, { status: 400 })
  }

  const { error } = await supabase
    .from('notification_preferences')
    .upsert(rows, { onConflict: 'tenant_id,event' })

  if (error) {
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
