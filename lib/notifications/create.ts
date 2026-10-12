/**
 * Server-side helper to create in-app notifications.
 * Checks the tenant's notification_preferences before inserting.
 * Key events (PUSH_EVENTS) also go out as Web Push to every device the tenant
 * turned notifications on for — that opt-in is per device, not per event pref.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { PUSH_EVENTS, sendPushToTenant } from '@/lib/push/send'
import { defaultAppEnabled } from './defaults'

interface CreateNotificationParams {
  tenantId: string
  event: string
  title: string
  body?: string
  metadata?: Record<string, unknown>
  userId?: string // null = broadcast to all tenant members
}

export async function createInAppNotification({
  tenantId,
  event,
  title,
  body,
  metadata,
  userId,
}: CreateNotificationParams): Promise<void> {
  if (PUSH_EVENTS.has(event)) {
    await sendPushToTenant(tenantId, {
      title,
      body,
      url: pushUrlFor(event),
      tag: typeof metadata?.reservation_id === 'number' ? `${event}-${metadata.reservation_id}` : undefined,
    }).catch((err) => console.error('[notifications] push failed:', err))
  }

  const supabase = createAdminClient()

  // Check if in-app is enabled for this event
  const { data: pref } = await supabase
    .from('notification_preferences')
    .select('app_enabled')
    .eq('tenant_id', tenantId)
    .eq('event', event)
    .maybeSingle()

  // No saved pref → per-event default (off for most events, see ./defaults)
  const appEnabled = pref ? pref.app_enabled : defaultAppEnabled(event)
  if (!appEnabled) return

  await supabase.from('notifications').insert({
    tenant_id: tenantId,
    user_id: userId ?? null,
    event,
    title,
    body: body ?? null,
    metadata: metadata ?? {},
  })
}

function pushUrlFor(event: string): string {
  if (event === 'maintenance_due') return '/dashboard/maintenance'
  if (event === 'vehicle_recall') return '/dashboard/fleet'
  if (event === 'daily_schedule') return '/dashboard'
  return '/dashboard/bookings'
}
