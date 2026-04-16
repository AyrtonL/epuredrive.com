export const WEBHOOK_EVENTS = [
  'booking.created',
  'booking.updated',
  'booking.cancelled',
  'payment.received',
  'vehicle.status_changed',
  'maintenance.due',
  'team.member_added',
  'customer.created',
  'test.ping',
] as const

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number]

export interface WebhookPayload {
  event: WebhookEventType
  tenant_id: string
  timestamp: string
  data: Record<string, unknown>
}
