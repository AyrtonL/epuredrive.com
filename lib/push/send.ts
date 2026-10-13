/**
 * Web Push to a tenant's subscribed devices (installed dashboard app / browser).
 *
 * Opt-in is per device: turning notifications on in Settings → Notifications
 * stores a subscription; every PUSH_EVENTS event for that tenant is then sent to
 * it, independent of the in-app (bell) preference.
 */

import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

/** Events worth interrupting someone's phone for. */
export const PUSH_EVENTS = new Set([
  'new_booking',
  'rental.return.overdue',
  'document_expiring',
  'maintenance_due',
  'vehicle_recall',
  'daily_schedule',
  'vehicle_document_expiring',
])

export interface PushPayload {
  title: string
  body?: string
  /** Dashboard path opened when the notification is tapped. */
  url?: string
  /** Same tag replaces an earlier notification instead of stacking. */
  tag?: string
}

let configured: boolean | null = null

function configure(): boolean {
  if (configured !== null) return configured
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@epuredrive.com'
  if (!publicKey || !privateKey) {
    console.warn('[push] VAPID keys missing — push disabled')
    configured = false
    return configured
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
  return configured
}

/** Sends to every device subscribed for the tenant. Never throws. */
export async function sendPushToTenant(tenantId: string, payload: PushPayload): Promise<number> {
  if (!configure()) return 0
  const supabase = createAdminClient()
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('tenant_id', tenantId)
  if (error || !subs?.length) return 0

  const body = JSON.stringify({ url: '/dashboard', ...payload })
  const expired: number[] = []
  let sent = 0

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
          { TTL: 60 * 60 * 24, urgency: 'high' },
        )
        sent++
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        // 404/410: the browser dropped this subscription (app removed, permission revoked).
        if (status === 404 || status === 410) expired.push(s.id)
        else console.error('[push] send failed:', status, (err as Error).message)
      }
    }),
  )

  if (expired.length) await supabase.from('push_subscriptions').delete().in('id', expired)
  if (sent) {
    await supabase
      .from('push_subscriptions')
      .update({ last_used_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .not('id', 'in', `(${expired.join(',') || 0})`)
  }
  return sent
}
