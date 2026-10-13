// lib/booking/extras.ts
//
// Loads the extras a customer picked, with prices from the DB (never the
// browser). Unknown/inactive/other-tenant ids are silently dropped.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { DbExtra } from '@/lib/booking/quote'

/** Extra ids from an untrusted request body (`extras: [{ extra_id }]`). */
export function requestedExtraIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const ids = raw
    .map((e) => (e && typeof e === 'object' ? (e as { extra_id?: unknown }).extra_id : null))
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
  return [...new Set(ids)].slice(0, 50)
}

export async function loadActiveExtras(
  supabase: SupabaseClient,
  tenantId: string,
  ids: readonly string[],
): Promise<DbExtra[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('rental_extras')
    .select('id, name, pricing_type, price')
    .in('id', [...ids])
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
  if (error) throw new Error(`extras lookup failed: ${error.message}`)
  return (data ?? []) as DbExtra[]
}
