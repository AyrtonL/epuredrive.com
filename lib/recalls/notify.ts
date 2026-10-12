/**
 * Sends one digest per tenant for every car_recalls row not yet notified:
 * email to each team member (unless the tenant turned the email channel off),
 * plus in-app bell + push via createInAppNotification. Marks rows notified
 * only after the tenant was processed, so a crash mid-run retries next day.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { recallAlertEmail, type RecallEmailVehicle } from '@/lib/email/templates/recalls'
import { createInAppNotification } from '@/lib/notifications/create'
import { emailTeam } from '@/lib/notifications/email-team'

export const RECALL_EVENT = 'vehicle_recall'

interface PendingRecall {
  id: number
  tenant_id: string
  car_id: number
  campaign_number: string
  component: string | null
  summary: string | null
  park_it: boolean
  park_outside: boolean
}

interface CarInfo {
  id: number
  make: string | null
  model: string | null
  model_full: string | null
  year: number | null
  vin: string | null
}

export async function notifyNewRecalls(supabase: SupabaseClient): Promise<{ tenantsNotified: number; emailsSent: number }> {
  const { data, error } = await supabase
    .from('car_recalls')
    .select('id, tenant_id, car_id, campaign_number, component, summary, park_it, park_outside')
    .is('notified_at', null)
    .eq('status', 'open')
  if (error) throw new Error(`load pending recalls: ${error.message}`)

  const byTenant = new Map<string, PendingRecall[]>()
  for (const r of (data ?? []) as PendingRecall[]) {
    byTenant.set(r.tenant_id, [...(byTenant.get(r.tenant_id) ?? []), r])
  }

  let tenantsNotified = 0
  let emailsSent = 0
  for (const [tenantId, recalls] of Array.from(byTenant.entries())) {
    try {
      emailsSent += await notifyTenant(supabase, tenantId, recalls)
      tenantsNotified += 1
    } catch (err) {
      console.error(`[recalls] notify tenant ${tenantId} failed:`, err instanceof Error ? err.message : err)
    }
  }
  return { tenantsNotified, emailsSent }
}

function carName(c: CarInfo | undefined, carId: number): string {
  if (!c) return `Vehicle #${carId}`
  return [c.year, c.make?.trim(), (c.model_full || c.model)?.trim()].filter(Boolean).join(' ')
}

async function notifyTenant(supabase: SupabaseClient, tenantId: string, recalls: PendingRecall[]): Promise<number> {
  const carIds = Array.from(new Set(recalls.map((r) => r.car_id)))
  const [{ data: cars }, { data: tenant }] = await Promise.all([
    supabase.from('cars').select('id, make, model, model_full, year, vin').in('id', carIds).eq('tenant_id', tenantId),
    supabase.from('tenants').select('brand_name, name').eq('id', tenantId).single(),
  ])
  const carMap = new Map(((cars ?? []) as CarInfo[]).map((c) => [c.id, c]))
  const tenantName = tenant?.brand_name || tenant?.name || 'Your Fleet'

  const vehicles: RecallEmailVehicle[] = carIds.map((carId) => ({
    carId,
    name: carName(carMap.get(carId), carId),
    vin: carMap.get(carId)?.vin ?? null,
    recalls: recalls
      .filter((r) => r.car_id === carId)
      .map((r) => ({
        campaignNumber: r.campaign_number,
        component: r.component,
        summary: r.summary,
        parkIt: r.park_it,
        parkOutside: r.park_outside,
      })),
  }))

  const emailsSent = await emailTeam(supabase, tenantId, RECALL_EVENT, recallAlertEmail({ tenantName, vehicles }))

  const urgent = recalls.some((r) => r.park_it || r.park_outside)
  await createInAppNotification({
    tenantId,
    event: RECALL_EVENT,
    title: urgent ? 'Urgent safety recall — check VIN' : 'New recall for your model — check VIN',
    body: vehicles.length === 1
      ? `${vehicles[0].name}: ${recalls.length} recall${recalls.length !== 1 ? 's' : ''}`
      : `${recalls.length} recalls across ${vehicles.length} vehicles`,
    metadata: { car_ids: carIds, car_id: carIds.length === 1 ? carIds[0] : null },
  })

  const { error } = await supabase
    .from('car_recalls')
    .update({ notified_at: new Date().toISOString() })
    .in('id', recalls.map((r) => r.id))
  if (error) throw new Error(`mark notified: ${error.message}`)
  return emailsSent
}
