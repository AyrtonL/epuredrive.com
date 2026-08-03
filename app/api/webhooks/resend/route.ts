/**
 * POST /api/webhooks/resend
 * Receives delivery events (bounce, complaint, delay) from Resend and records
 * them so the dashboard can flag "this email may not have reached the customer"
 * instead of showing a blind "sent" status.
 * Requires: RESEND_WEBHOOK_SECRET
 */

import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

interface ResendTag {
  name: string
  value: string
}

interface ResendWebhookPayload {
  type: string
  created_at: string
  data: {
    email_id: string
    to?: string[]
    tags?: ResendTag[]
  }
}

const TRACKED_EVENTS = new Set([
  'email.bounced',
  'email.complained',
  'email.delivery_delayed',
  'email.failed',
])

function verifySignature(rawBody: string, id: string, timestamp: string, sigHeader: string, secret: string): boolean {
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp, 10)) > 300) return false

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const signedContent = `${id}.${timestamp}.${rawBody}`
  const expected = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64')

  const candidates = sigHeader.split(' ').map((part) => part.split(',')[1]).filter(Boolean)
  return candidates.some((candidate) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected))
    } catch {
      return false
    }
  })
}

function tagValue(tags: ResendTag[] | undefined, name: string): string | null {
  return tags?.find((t) => t.name === name)?.value ?? null
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    return new Response('Missing webhook secret', { status: 500 })
  }

  const rawBody = await request.text()
  const svixId = request.headers.get('svix-id') || ''
  const svixTimestamp = request.headers.get('svix-timestamp') || ''
  const svixSignature = request.headers.get('svix-signature') || ''

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing signature headers', { status: 400 })
  }

  if (!verifySignature(rawBody, svixId, svixTimestamp, svixSignature, secret)) {
    return new Response('Invalid signature', { status: 400 })
  }

  let payload: ResendWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (!TRACKED_EVENTS.has(payload.type)) {
    return new Response('ok', { status: 200 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('email_events').insert({
    resend_email_id: payload.data.email_id,
    event_type: payload.type,
    recipient: payload.data.to?.[0] ?? 'unknown',
    reservation_id: tagValue(payload.data.tags, 'reservation_id'),
    tenant_id: tagValue(payload.data.tags, 'tenant_id'),
    email_type: tagValue(payload.data.tags, 'email_type'),
    raw: payload,
  })

  if (error) {
    console.error('[resend-webhook] Failed to record event:', error)
    return new Response('Storage error', { status: 500 })
  }

  return new Response('ok', { status: 200 })
}
