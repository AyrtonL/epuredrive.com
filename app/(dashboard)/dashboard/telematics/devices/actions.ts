'use server'

// app/(dashboard)/dashboard/telematics/devices/actions.ts
// Server actions for the Devices page:
//   - linkDeviceAction    : attach or detach a device <-> car link
//   - refreshDevicesAction: trigger a pull-sync for the tenant's connection
//
// Both actions:
//   - Require an authenticated tenant (via requireTenantId)
//   - Re-check the bouncie_telematics feature flag as defense in depth
//   - Use the service-role admin client for the underlying writes so the
//     cross-table updates (telematics_devices + cars) succeed atomically
//     even if the caller's session doesn't have RLS write permission on
//     both tables.

import { revalidatePath } from 'next/cache'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFeatureEnabled } from '@/lib/supabase/feature-flags'
import { syncConnection } from '@/lib/telematics/sync'
import type { TelematicsConnection } from '@/lib/supabase/types'

const BOUNCIE_FLAG = 'bouncie_telematics'
const DEVICES_PATH = '/dashboard/telematics/devices'

export interface ActionResult {
  error: string | null
}

/**
 * Link (or unlink, when carId is null) a telematics device to a car.
 *
 * Writes both sides of the relationship so the Live Map query (which
 * filters cars.telematics_device_id) and the Devices table (which reads
 * telematics_devices.car_id) stay consistent. If the device was previously
 * linked to a different car, we clear the old car's telematics_device_id
 * so no car row is ever double-pointed.
 */
export async function linkDeviceAction(
  deviceId: string,
  carId: number | null,
): Promise<ActionResult> {
  const { tenantId } = await requireTenantId()

  const enabled = await isFeatureEnabled(tenantId, BOUNCIE_FLAG)
  if (!enabled) {
    return { error: 'Bouncie telematics is not enabled for this workspace.' }
  }

  const admin = createAdminClient()

  // Read current linkage so we can clear the stale car pointer if needed.
  const { data: existing, error: readErr } = await admin
    .from('telematics_devices')
    .select('id, tenant_id, car_id')
    .eq('id', deviceId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (readErr || !existing) {
    return { error: 'Device not found.' }
  }
  const currentCarId = (existing as { car_id: number | null }).car_id

  // If unlinking: null both sides.
  if (carId === null) {
    const { error } = await admin
      .from('telematics_devices')
      .update({ car_id: null })
      .eq('id', deviceId)
      .eq('tenant_id', tenantId)
    if (error) return { error: 'Could not update device.' }
    if (currentCarId !== null) {
      await admin
        .from('cars')
        .update({ telematics_device_id: null })
        .eq('id', currentCarId)
        .eq('tenant_id', tenantId)
    }
    revalidatePath(DEVICES_PATH)
    return { error: null }
  }

  // Linking: verify car belongs to tenant (defense vs crafted IDs).
  const { data: car } = await admin
    .from('cars')
    .select('id')
    .eq('id', carId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!car) return { error: 'That car is not in your fleet.' }

  // Clear any prior car pointer (if device was linked to a different car).
  if (currentCarId !== null && currentCarId !== carId) {
    await admin
      .from('cars')
      .update({ telematics_device_id: null })
      .eq('id', currentCarId)
      .eq('tenant_id', tenantId)
  }

  // Clear any prior device pointer on the target car (a car may only hold
  // one device). Without this we could briefly have two devices claiming
  // the same car in the cars table.
  await admin
    .from('telematics_devices')
    .update({ car_id: null })
    .eq('tenant_id', tenantId)
    .eq('car_id', carId)
    .neq('id', deviceId)

  const { error: deviceErr } = await admin
    .from('telematics_devices')
    .update({ car_id: carId })
    .eq('id', deviceId)
    .eq('tenant_id', tenantId)
  if (deviceErr) return { error: 'Could not link device.' }

  const { error: carErr } = await admin
    .from('cars')
    .update({ telematics_device_id: deviceId })
    .eq('id', carId)
    .eq('tenant_id', tenantId)
  if (carErr) return { error: 'Could not update car record.' }

  revalidatePath(DEVICES_PATH)
  revalidatePath('/dashboard/telematics')
  return { error: null }
}

/**
 * Trigger a pull-sync for the calling tenant's Bouncie connection.
 * Same shape as syncNowAction in the Bouncie config page; kept as a
 * separate action so the Devices page can have its own refresh button
 * without bouncing to the integrations page.
 */
export async function refreshDevicesAction(): Promise<ActionResult> {
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
  if (!connection) return { error: 'Connect Bouncie before refreshing devices.' }
  if ((connection as TelematicsConnection).status === 'disconnected') {
    return { error: 'Connection is disconnected — reconnect Bouncie first.' }
  }

  try {
    await syncConnection(admin, connection as TelematicsConnection)
  } catch {
    return { error: 'Refresh failed. Check the integration status.' }
  }

  revalidatePath(DEVICES_PATH)
  return { error: null }
}
