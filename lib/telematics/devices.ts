// lib/telematics/devices.ts
// Shared device-seeding helper. A telematics_devices row must exist before
// a sync or webhook delivery can attach positions/trips/events to it — this
// is the one place that creates/updates one from a provider vehicle.
//
// Used by:
//   - app/api/telematics/oauth/callback/route.ts (initial connect)
//   - lib/telematics/sync.ts (self-heals a device that's missing because the
//     initial seed failed, or because a vehicle was added to the provider
//     account after the tenant connected)

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProviderVehicle } from './types'

export interface DeviceRow {
  id: string
  car_id: number | null
  last_seen_at: string | null
}

export async function seedDevice(
  supabase: SupabaseClient,
  tenantId: string,
  connectionId: string,
  vehicle: ProviderVehicle,
): Promise<DeviceRow | null> {
  const { data, error } = await supabase
    .from('telematics_devices')
    .upsert(
      {
        tenant_id: tenantId,
        connection_id: connectionId,
        imei: vehicle.imei,
        vin: vehicle.vin,
        nickname: vehicle.nickname,
        last_seen_at: vehicle.last_seen_at,
        battery_voltage: vehicle.battery_voltage,
        online: vehicle.online,
      },
      { onConflict: 'tenant_id,imei' },
    )
    .select('id, car_id, last_seen_at')
    .single()

  if (error || !data) return null
  return data as DeviceRow
}
