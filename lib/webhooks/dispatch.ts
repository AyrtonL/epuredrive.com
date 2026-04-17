import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import type { WebhookEventType, WebhookPayload } from './events'

const DELIVERY_TIMEOUT_MS = 10_000
const MAX_RESPONSE_BODY = 1024

/** Reject webhook URLs pointing to internal/private networks */
function isSafeWebhookUrl(raw: string): boolean {
  try {
    const { protocol, hostname } = new URL(raw)
    if (protocol !== 'https:') return false
    if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|localhost|::1|\[::1\])/i.test(hostname)) return false
    return true
  } catch {
    return false
  }
}

function signPayload(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex')
  return `t=${timestamp},v1=${signature}`
}

/**
 * Dispatch a webhook event to all active endpoints for a tenant.
 * Fire-and-forget — does not throw on delivery failure.
 */
export async function dispatchWebhookEvent(
  tenantId: string,
  event: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  const supabase = createAdminClient()

  // Fetch active endpoints subscribed to this event
  const { data: endpoints } = await supabase
    .from('webhook_endpoints')
    .select('id, url, secret, events')
    .eq('tenant_id', tenantId)
    .eq('active', true)

  if (!endpoints?.length) return

  const matchingEndpoints = endpoints.filter(
    (ep: { events: string[]; url: string }) =>
      (ep.events.includes(event) || ep.events.includes('*')) && isSafeWebhookUrl(ep.url)
  )

  if (!matchingEndpoints.length) return

  const payload: WebhookPayload = {
    event,
    tenant_id: tenantId,
    timestamp: new Date().toISOString(),
    data,
  }

  const body = JSON.stringify(payload)

  const deliveries = matchingEndpoints.map(
    async (ep: { id: number; url: string; secret: string }) => {
      const signature = signPayload(body, ep.secret)
      let statusCode: number | null = null
      let responseBody: string | null = null
      let errorMessage: string | null = null

      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS)

        const res = await fetch(ep.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event,
            'User-Agent': 'ePureDrive-Webhooks/1.0',
          },
          body,
          signal: controller.signal,
        })

        clearTimeout(timeout)
        statusCode = res.status
        responseBody = (await res.text()).slice(0, MAX_RESPONSE_BODY)
      } catch (err: unknown) {
        errorMessage = err instanceof Error ? err.message : 'Unknown delivery error'
      }

      // Log delivery
      await supabase.from('webhook_deliveries').insert({
        endpoint_id: ep.id,
        tenant_id: tenantId,
        event_type: event,
        payload,
        status_code: statusCode,
        response_body: responseBody,
        error_message: errorMessage,
        attempt: 1,
      })
    }
  )

  await Promise.allSettled(deliveries)
}
