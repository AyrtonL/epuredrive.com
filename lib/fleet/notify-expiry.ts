/**
 * Daily vehicle-document expiry check: for each tenant, finds registration /
 * insurance dates crossing 30 / 7 / 0 days, emails the team once per
 * threshold (unless the tenant turned email off), adds a bell + push
 * notification, and records each alert in car_document_alerts so it never
 * repeats. Retired cars are skipped.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { carDisplayName } from '@/lib/utils/car-display-name'
import { createInAppNotification } from '@/lib/notifications/create'
import { emailTeam } from '@/lib/notifications/email-team'
import { documentExpiryEmail } from '@/lib/email/templates/document-expiry'
import { dueExpiryAlerts, expiryKey, type ExpiryAlert } from './document-expiry'

export const DOCUMENT_EXPIRY_EVENT = 'vehicle_document_expiring'

interface CarRow {
  id: number
  tenant_id: string
  make: string
  model: string
  model_full: string | null
  registration_expiry: string | null
  insurance_expiry: string | null
}

export async function notifyDocumentExpiry(
  supabase: SupabaseClient,
  today: string,
): Promise<{ tenantsNotified: number; alerts: number; emailsSent: number; failed: number }> {
  const [{ data: cars, error: carsErr }, { data: sent, error: sentErr }] = await Promise.all([
    supabase
      .from('cars')
      .select('id, tenant_id, make, model, model_full, registration_expiry, insurance_expiry')
      .neq('status', 'retired')
      .or('registration_expiry.not.is.null,insurance_expiry.not.is.null'),
    supabase.from('car_document_alerts').select('car_id, kind, expiry_date, threshold'),
  ])
  if (carsErr || sentErr) throw new Error(`load expiry data: ${(carsErr ?? sentErr)!.message}`)

  const sentKeys = new Set(
    ((sent ?? []) as { car_id: number; kind: 'registration' | 'insurance'; expiry_date: string; threshold: number }[]).map((s) =>
      expiryKey(s.car_id, s.kind, s.expiry_date, s.threshold),
    ),
  )
  const carRows = (cars ?? []) as CarRow[]
  const byTenant = new Map<string, CarRow[]>()
  for (const c of carRows) byTenant.set(c.tenant_id, [...(byTenant.get(c.tenant_id) ?? []), c])

  let tenantsNotified = 0
  let alerts = 0
  let emailsSent = 0
  let failed = 0
  for (const [tenantId, tenantCars] of Array.from(byTenant.entries())) {
    const due = dueExpiryAlerts(tenantCars, today, sentKeys)
    if (due.length === 0) continue
    try {
      emailsSent += await notifyTenant(supabase, tenantId, tenantCars, due)
      tenantsNotified += 1
      alerts += due.length
    } catch (err) {
      failed += 1
      console.error(`[document-expiry] tenant ${tenantId} failed:`, err instanceof Error ? err.message : err)
    }
  }
  return { tenantsNotified, alerts, emailsSent, failed }
}

async function notifyTenant(supabase: SupabaseClient, tenantId: string, cars: CarRow[], due: ExpiryAlert[]): Promise<number> {
  const names = new Map(cars.map((c) => [c.id, carDisplayName(c)]))
  const { data: tenant } = await supabase.from('tenants').select('brand_name, name').eq('id', tenantId).single()
  const tenantName = tenant?.brand_name || tenant?.name || 'Your Fleet'

  const items = due
    .map((a) => ({ carId: a.carId, carName: names.get(a.carId) ?? `Car #${a.carId}`, kind: a.kind, expiry: a.expiry, daysLeft: a.daysLeft }))
    .sort((a, b) => a.daysLeft - b.daysLeft)

  const emailsSent = await emailTeam(supabase, tenantId, DOCUMENT_EXPIRY_EVENT, documentExpiryEmail({ tenantName, items }))

  const expired = items.filter((i) => i.daysLeft <= 0).length
  const first = items[0]
  await createInAppNotification({
    tenantId,
    event: DOCUMENT_EXPIRY_EVENT,
    title: expired > 0 ? `Expired: ${first.carName} ${first.kind}` : `${first.carName} ${first.kind} expires in ${first.daysLeft} days`,
    body: items.length > 1 ? `${items.length} vehicle documents need attention` : undefined,
    metadata: { car_id: items.length === 1 ? first.carId : null, car_ids: items.map((i) => i.carId) },
  })

  const { error } = await supabase.from('car_document_alerts').upsert(
    due.map((a) => ({ tenant_id: tenantId, car_id: a.carId, kind: a.kind, expiry_date: a.expiry, threshold: a.threshold })),
    { onConflict: 'car_id,kind,expiry_date,threshold', ignoreDuplicates: true },
  )
  if (error) throw new Error(`record alerts: ${error.message}`)
  return emailsSent
}
