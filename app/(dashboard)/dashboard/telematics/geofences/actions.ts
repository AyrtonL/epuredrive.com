'use server'

// app/(dashboard)/dashboard/telematics/geofences/actions.ts
// Server actions for the Geofences page:
//   - saveGeofenceAction   : upsert a geofence (create or update) with Zod
//                            validation of the polygon shape (§13.3).
//   - deleteGeofenceAction : hard-delete a geofence by id.
//   - toggleGeofenceActive : flip the active flag.
//
// Security (§13.3):
//   - Auth via requireTenantId
//   - Feature flag re-check (defense-in-depth)
//   - Zod validates polygon: type === 'Polygon', 1-5 rings, each ring
//     4..101 vertices, all finite numbers → rejects 10k-vertex DoS payloads.
//   - All writes via admin client with explicit tenant_id filter.
//   - Never trust client-supplied tenant_id; we always use the session one.

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFeatureEnabled } from '@/lib/supabase/feature-flags'

const BOUNCIE_FLAG = 'bouncie_telematics'
const GEOFENCES_PATH = '/dashboard/telematics/geofences'

export interface GeofenceActionResult {
  ok: boolean
  error: string | null
  id?: string
}

// Each ring: at least 4 points (triangle + closing point), at most 101 (100
// real vertices plus the closing duplicate). Each point: [lon, lat], finite.
const polygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z
    .array(
      z
        .array(z.tuple([z.number().finite(), z.number().finite()]))
        .min(4)
        .max(101),
    )
    .min(1)
    .max(5),
})

const geofenceInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  kind: z.enum(['allowed', 'forbidden']),
  polygon: polygonSchema,
  applies_to: z.enum(['all', 'specific']),
  car_ids: z.array(z.number().int().positive()).max(500).default([]),
  speed_limit_mph: z.number().int().min(1).max(200).nullable(),
  active: z.boolean().default(true),
})

export type GeofenceInput = z.infer<typeof geofenceInputSchema>

export async function saveGeofenceAction(
  input: unknown,
): Promise<GeofenceActionResult> {
  const parsed = geofenceInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Invalid geofence input.' }
  }
  const data = parsed.data

  const { tenantId } = await requireTenantId()

  const enabled = await isFeatureEnabled(tenantId, BOUNCIE_FLAG)
  if (!enabled) {
    return { ok: false, error: 'Bouncie telematics is not enabled for this workspace.' }
  }

  const admin = createAdminClient()

  // When applies_to='all', force car_ids empty so we never leak stale refs.
  const carIds = data.applies_to === 'all' ? [] : data.car_ids

  // For "specific", verify every car_id belongs to this tenant (defense vs
  // crafted IDs from a modified client payload).
  if (carIds.length > 0) {
    const { data: owned } = await admin
      .from('cars')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('id', carIds)
    const ownedIds = new Set(((owned as { id: number }[] | null) ?? []).map((c) => c.id))
    for (const id of carIds) {
      if (!ownedIds.has(id)) {
        return { ok: false, error: 'One of the selected cars is not in your fleet.' }
      }
    }
  }

  const row = {
    id: data.id,
    tenant_id: tenantId,
    name: data.name,
    kind: data.kind,
    polygon: data.polygon,
    applies_to: data.applies_to,
    car_ids: carIds,
    speed_limit_mph: data.speed_limit_mph,
    active: data.active,
  }

  // Upsert by id (when provided, edit mode) or insert (new geofence).
  if (data.id) {
    // Update: constrain to tenant_id so a crafted id from another tenant
    // cannot overwrite that tenant's row.
    const { error } = await admin
      .from('telematics_geofences')
      .update({
        name: row.name,
        kind: row.kind,
        polygon: row.polygon,
        applies_to: row.applies_to,
        car_ids: row.car_ids,
        speed_limit_mph: row.speed_limit_mph,
        active: row.active,
      })
      .eq('id', data.id)
      .eq('tenant_id', tenantId)
    if (error) return { ok: false, error: 'Could not update geofence.' }
    revalidatePath(GEOFENCES_PATH)
    return { ok: true, error: null, id: data.id }
  }

  const { data: inserted, error } = await admin
    .from('telematics_geofences')
    .insert(row)
    .select('id')
    .single()
  if (error || !inserted) return { ok: false, error: 'Could not create geofence.' }
  revalidatePath(GEOFENCES_PATH)
  return { ok: true, error: null, id: (inserted as { id: string }).id }
}

export async function deleteGeofenceAction(
  id: unknown,
): Promise<GeofenceActionResult> {
  const parsed = z.string().uuid().safeParse(id)
  if (!parsed.success) return { ok: false, error: 'Invalid geofence id.' }

  const { tenantId } = await requireTenantId()

  const enabled = await isFeatureEnabled(tenantId, BOUNCIE_FLAG)
  if (!enabled) {
    return { ok: false, error: 'Bouncie telematics is not enabled for this workspace.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('telematics_geofences')
    .delete()
    .eq('id', parsed.data)
    .eq('tenant_id', tenantId)
  if (error) return { ok: false, error: 'Could not delete geofence.' }

  revalidatePath(GEOFENCES_PATH)
  return { ok: true, error: null }
}

export async function toggleGeofenceActiveAction(
  id: unknown,
  active: unknown,
): Promise<GeofenceActionResult> {
  const parsed = z
    .object({ id: z.string().uuid(), active: z.boolean() })
    .safeParse({ id, active })
  if (!parsed.success) return { ok: false, error: 'Invalid input.' }

  const { tenantId } = await requireTenantId()

  const enabled = await isFeatureEnabled(tenantId, BOUNCIE_FLAG)
  if (!enabled) {
    return { ok: false, error: 'Bouncie telematics is not enabled for this workspace.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('telematics_geofences')
    .update({ active: parsed.data.active })
    .eq('id', parsed.data.id)
    .eq('tenant_id', tenantId)
  if (error) return { ok: false, error: 'Could not update geofence.' }

  revalidatePath(GEOFENCES_PATH)
  return { ok: true, error: null }
}
