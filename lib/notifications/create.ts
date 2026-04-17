/**
 * Server-side helper to create in-app notifications.
 * Checks the tenant's notification_preferences before inserting.
 */

import { createAdminClient } from '@/lib/supabase/admin'

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
  const supabase = createAdminClient()

  // Check if in-app is enabled for this event
  const { data: pref } = await supabase
    .from('notification_preferences')
    .select('app_enabled')
    .eq('tenant_id', tenantId)
    .eq('event', event)
    .single()

  // Default: app_enabled = false (unless tenant explicitly enabled it)
  if (!pref?.app_enabled) return

  await supabase.from('notifications').insert({
    tenant_id: tenantId,
    user_id: userId ?? null,
    event,
    title,
    body: body ?? null,
    metadata: metadata ?? {},
  })
}
