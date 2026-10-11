/**
 * POST   /api/push/subscribe  — save this device's Web Push subscription
 * DELETE /api/push/subscribe  — remove it ({ endpoint })
 *
 * tenant_id always comes from the caller's profile, never from the request,
 * so a device can only receive its own tenant's notifications.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToTenant } from '@/lib/push/send'

async function getCaller() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  if (!profile?.tenant_id) return null
  return { userId: user.id, tenantId: profile.tenant_id as string }
}

function isPushEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 1000) return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

const isKey = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200

export async function POST(request: NextRequest) {
  const caller = await getCaller()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as
    | { subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }; test?: boolean }
    | null
  const sub = body?.subscription
  if (!sub || !isPushEndpoint(sub.endpoint) || !isKey(sub.keys?.p256dh) || !isKey(sub.keys?.auth)) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('push_subscriptions').upsert(
    {
      user_id: caller.userId,
      tenant_id: caller.tenantId,
      endpoint: sub.endpoint,
      p256dh: sub.keys!.p256dh as string,
      auth: sub.keys!.auth as string,
      user_agent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
    },
    { onConflict: 'endpoint' },
  )
  if (error) {
    console.error('[push/subscribe] save failed:', error.message)
    return NextResponse.json({ error: 'Could not save subscription' }, { status: 500 })
  }

  if (body?.test) {
    await sendPushToTenant(caller.tenantId, {
      title: 'Notifications are on',
      body: "You'll get new bookings, late returns and expiring documents here.",
      url: '/dashboard',
      tag: 'push-test',
    })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const caller = await getCaller()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as { endpoint?: unknown } | null
  if (!isPushEndpoint(body?.endpoint)) return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })

  await createAdminClient()
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', body!.endpoint as string)
    .eq('user_id', caller.userId)

  return NextResponse.json({ ok: true })
}
