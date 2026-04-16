'use server'

import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import type { WebhookEndpoint, WebhookDelivery } from '@/lib/supabase/types'

const MAX_ENDPOINTS = 5

function generateSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString('base64url')}`
}

async function getTenantId(): Promise<string> {
  const { tenantId } = await requireTenantId()
  return tenantId
}

export async function listWebhookEndpoints(): Promise<WebhookEndpoint[]> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  const { data } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  return (data as WebhookEndpoint[]) ?? []
}

export async function createWebhookEndpoint(input: {
  url: string
  description?: string
  events: string[]
}): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()

  // Enforce limit
  const { count } = await supabase
    .from('webhook_endpoints')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
  if ((count ?? 0) >= MAX_ENDPOINTS) {
    return { error: `Maximum ${MAX_ENDPOINTS} endpoints allowed` }
  }

  // Validate URL — HTTPS only
  try {
    const parsed = new URL(input.url)
    if (parsed.protocol !== 'https:') {
      return { error: 'Webhook URL must use HTTPS' }
    }
  } catch {
    return { error: 'Invalid URL' }
  }

  const { error } = await supabase.from('webhook_endpoints').insert({
    tenant_id: tenantId,
    url: input.url.trim(),
    description: input.description?.trim() || null,
    secret: generateSecret(),
    events: input.events,
    active: true,
  })

  revalidatePath('/dashboard/settings/api')
  return { error: error?.message ?? null }
}

export async function updateWebhookEndpoint(
  id: number,
  input: { url?: string; description?: string; events?: string[]; active?: boolean }
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()

  if (input.url) {
    try {
      const parsed = new URL(input.url)
      if (parsed.protocol !== 'https:') {
        return { error: 'Webhook URL must use HTTPS' }
      }
    } catch {
      return { error: 'Invalid URL' }
    }
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.url !== undefined) patch.url = input.url.trim()
  if (input.description !== undefined) patch.description = input.description.trim() || null
  if (input.events !== undefined) patch.events = input.events
  if (input.active !== undefined) patch.active = input.active

  const { error } = await supabase
    .from('webhook_endpoints')
    .update(patch)
    .eq('id', id)
    .eq('tenant_id', tenantId)

  revalidatePath('/dashboard/settings/api')
  return { error: error?.message ?? null }
}

export async function deleteWebhookEndpoint(id: number): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  const { error } = await supabase
    .from('webhook_endpoints')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)
  revalidatePath('/dashboard/settings/api')
  return { error: error?.message ?? null }
}

export async function rotateWebhookSecret(
  id: number
): Promise<{ secret: string | null; error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  const newSecret = generateSecret()
  const { error } = await supabase
    .from('webhook_endpoints')
    .update({ secret: newSecret, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
  revalidatePath('/dashboard/settings/api')
  return { secret: error ? null : newSecret, error: error?.message ?? null }
}

export async function listDeliveries(endpointId?: number): Promise<WebhookDelivery[]> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  let query = supabase
    .from('webhook_deliveries')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('delivered_at', { ascending: false })
    .limit(50)

  if (endpointId) {
    query = query.eq('endpoint_id', endpointId)
  }

  const { data } = await query
  return (data as WebhookDelivery[]) ?? []
}
