'use server'

// app/dashboard/integrations/bouncie/actions.ts
// Server actions for the tenant-facing Bouncie integration page:
//   - syncNowAction      → pull-syncs the tenant's single connection
//   - disconnectAction   → revokes token with Bouncie + marks connection 'disconnected'
//
// Both actions are scoped to the authenticated tenant. We never iterate all
// tenants here (audit finding #8 — that's the cron's job); and both re-check
// the bouncie_telematics feature flag as defense in depth (audit #3) even
// though the route is already gated by the dashboard layout.

import { revalidatePath } from 'next/cache'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFeatureEnabled } from '@/lib/supabase/feature-flags'
import { syncConnection } from '@/lib/telematics/sync'
import { getProvider } from '@/lib/telematics/registry'
import type { TelematicsConnection } from '@/lib/supabase/types'

const BOUNCIE_FLAG = 'bouncie_telematics'

export interface ActionResult {
  error: string | null
}

/**
 * Trigger a pull-sync for the calling tenant's Bouncie connection.
 *
 * IMPORTANT: this MUST NOT invoke the cron's "sync every tenant" path.
 * syncConnection() is called with a single row so side effects stay scoped
 * to the current tenant.
 */
export async function syncNowAction(): Promise<ActionResult> {
  const { tenantId } = await requireTenantId()

  const enabled = await isFeatureEnabled(tenantId, BOUNCIE_FLAG)
  if (!enabled) {
    return { error: 'Bouncie telematics is not enabled for this workspace.' }
  }

  const admin = createAdminClient()
  const { data: connection, error: fetchError } = await admin
    .from('telematics_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('provider', 'bouncie')
    .maybeSingle()

  if (fetchError) return { error: 'Could not load Bouncie connection.' }
  if (!connection) return { error: 'No Bouncie connection to sync.' }
  if (connection.status === 'disconnected') {
    return { error: 'Connection is disconnected — reconnect Bouncie first.' }
  }

  try {
    await syncConnection(admin, connection as TelematicsConnection)
  } catch {
    // syncConnection already persists status=error on failure; surface a
    // generic message so we don't leak raw error details to the UI.
    return { error: 'Sync failed. Check the integration status below.' }
  }

  revalidatePath('/dashboard/integrations/bouncie')
  return { error: null }
}

/**
 * Disconnect the calling tenant's Bouncie connection.
 *
 * Best-effort revocation with Bouncie (we don't block on their response, so
 * a revoked or expired token still marks the row disconnected locally).
 */
export async function disconnectAction(): Promise<ActionResult> {
  const { tenantId } = await requireTenantId()

  const admin = createAdminClient()
  const { data: connection } = await admin
    .from('telematics_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('provider', 'bouncie')
    .maybeSingle()

  if (!connection) {
    return { error: null } // idempotent — nothing to disconnect
  }

  const accessToken = (connection as TelematicsConnection).access_token
  if (accessToken) {
    try {
      await getProvider('bouncie').revokeToken(accessToken)
    } catch {
      // Ignore — we still want to clear local state even if Bouncie is down.
    }
  }

  const { error: updateError } = await admin
    .from('telematics_connections')
    .update({
      status: 'disconnected',
      access_token: null,
      refresh_token: null,
      error_message: null,
    })
    .eq('id', (connection as TelematicsConnection).id)

  if (updateError) {
    return { error: 'Could not disconnect. Please try again.' }
  }

  revalidatePath('/dashboard/integrations/bouncie')
  return { error: null }
}
