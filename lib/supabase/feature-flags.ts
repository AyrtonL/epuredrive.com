import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from './server'

/**
 * Check if a feature flag is enabled for a specific tenant.
 * Resolution order:
 *   1. Per-tenant override in `tenant_feature_flags` → use that value
 *   2. No override → use global value from `feature_flags`
 *   3. Flag not found → return false
 */
export async function isFeatureEnabled(
  tenantId: string,
  flagKey: string
): Promise<boolean> {
  const supabase = createClient()

  // Check for per-tenant override first
  const { data: override } = await supabase
    .from('tenant_feature_flags')
    .select('enabled')
    .eq('flag_key', flagKey)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (override) return override.enabled

  // Fall back to global flag value
  const { data: flag } = await supabase
    .from('feature_flags')
    .select('enabled')
    .eq('key', flagKey)
    .maybeSingle()

  return flag?.enabled ?? false
}

/**
 * Batch-check multiple feature flags for a tenant in 2 queries (not N).
 * Returns a Record<string, boolean> keyed by flag key.
 */
export async function getFeatureFlags(
  tenantId: string,
  flagKeys: string[]
): Promise<Record<string, boolean>> {
  const supabase = createClient()

  const [{ data: globals }, { data: tenantOverrides }] = await Promise.all([
    supabase
      .from('feature_flags')
      .select('key, enabled')
      .in('key', flagKeys),
    supabase
      .from('tenant_feature_flags')
      .select('flag_key, enabled')
      .eq('tenant_id', tenantId)
      .in('flag_key', flagKeys),
  ])

  const globalMap: Record<string, boolean> = {}
  for (const g of globals ?? []) globalMap[g.key] = g.enabled

  const overrideMap: Record<string, boolean> = {}
  for (const o of tenantOverrides ?? []) overrideMap[o.flag_key] = o.enabled

  const result: Record<string, boolean> = {}
  for (const key of flagKeys) {
    // Override takes precedence over global
    result[key] = overrideMap[key] ?? globalMap[key] ?? false
  }

  return result
}

/**
 * Upsert a per-tenant feature flag override. Pass an already-authenticated
 * SupabaseClient (admin or server) so this helper stays decoupled from the
 * auth context — the Stripe webhook calls it with the service-role client.
 *
 * Uses `onConflict: 'flag_key,tenant_id'` to match the composite unique
 * index on `tenant_feature_flags`.
 */
export async function setTenantFlag(
  supabase: SupabaseClient,
  tenantId: string,
  flagKey: string,
  enabled: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('tenant_feature_flags')
    .upsert(
      { tenant_id: tenantId, flag_key: flagKey, enabled },
      { onConflict: 'flag_key,tenant_id' },
    )
  if (error) {
    // Don't throw — the caller (e.g. the Stripe webhook) must still return
    // 200 to Stripe even if flag persistence hiccups; log a sanitized note.
    console.warn(
      '[feature-flags] setTenantFlag failed',
      error.message,
    )
  }
}
