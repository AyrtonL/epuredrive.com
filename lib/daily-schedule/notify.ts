/**
 * 7am digest of today's pickups and returns, one per tenant that has any:
 * email to each team member (unless the tenant turned the email channel off)
 * plus in-app bell + push via createInAppNotification. Tenants with nothing
 * scheduled today get nothing.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { APP_TZ, todayISO } from '@/lib/finance/revenue'
import { carDisplayName } from '@/lib/utils/car-display-name'
import { createInAppNotification } from '@/lib/notifications/create'
import { emailTeam } from '@/lib/notifications/email-team'
import { dailyScheduleEmail } from '@/lib/email/templates/daily-schedule'
import {
  buildTenantSchedules,
  OPEN_STATUSES,
  scheduleSummary,
  type ScheduleReservation,
  type TenantSchedule,
} from './build'

export const DAILY_SCHEDULE_EVENT = 'daily_schedule'

interface CarRow {
  id: number
  make: string | null
  model: string | null
  model_full: string | null
}

export async function sendDailySchedules(
  supabase: SupabaseClient,
  today: string = todayISO(),
): Promise<{ tenantsNotified: number; emailsSent: number; failed: number }> {
  const { data, error } = await supabase
    .from('reservations')
    .select('id, tenant_id, car_id, booking_code, customer_name, customer_phone, pickup_date, pickup_time, return_date, return_time, status')
    .in('status', [...OPEN_STATUSES])
    .or(`pickup_date.eq.${today},return_date.eq.${today}`)
  if (error) throw new Error(`load today's reservations: ${error.message}`)

  const rows = (data ?? []) as ScheduleReservation[]
  const carIds = Array.from(new Set(rows.flatMap((r) => (r.car_id != null ? [r.car_id] : []))))
  const { data: cars, error: carsError } = carIds.length
    ? await supabase.from('cars').select('id, make, model, model_full').in('id', carIds)
    : { data: [] as CarRow[], error: null }
  if (carsError) throw new Error(`load cars: ${carsError.message}`)

  const carMap = new Map(((cars ?? []) as CarRow[]).map((c) => [c.id, carDisplayName(c)]))
  const carName = (id: number | null): string => (id == null ? 'Vehicle not assigned' : carMap.get(id) ?? `Vehicle #${id}`)
  const schedules = buildTenantSchedules(rows, today, carName)

  let tenantsNotified = 0
  let emailsSent = 0
  let failed = 0
  for (const [tenantId, schedule] of Array.from(schedules.entries())) {
    try {
      emailsSent += await notifyTenant(supabase, tenantId, schedule, today)
      tenantsNotified += 1
    } catch (err) {
      failed += 1
      console.error(`[daily-schedule] tenant ${tenantId} failed:`, err instanceof Error ? err.message : err)
    }
  }
  return { tenantsNotified, emailsSent, failed }
}

async function notifyTenant(
  supabase: SupabaseClient,
  tenantId: string,
  schedule: TenantSchedule,
  today: string,
): Promise<number> {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('brand_name, name, status')
    .eq('id', tenantId)
    .single()
  if (tenant?.status === 'suspended') return 0

  const tenantName = tenant?.brand_name || tenant?.name || 'Your Fleet'
  const dateLabel = new Date(`${today}T12:00:00Z`).toLocaleDateString('en-US', {
    timeZone: APP_TZ,
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  const emailsSent = await emailTeam(
    supabase,
    tenantId,
    DAILY_SCHEDULE_EVENT,
    dailyScheduleEmail({ tenantName, dateLabel, ...schedule }),
  )

  await createInAppNotification({
    tenantId,
    event: DAILY_SCHEDULE_EVENT,
    title: `Today: ${scheduleSummary(schedule)}`,
    body: [...schedule.pickups.map((i) => `↑ ${i.customer} · ${i.vehicle}`), ...schedule.returns.map((i) => `↓ ${i.customer} · ${i.vehicle}`)]
      .slice(0, 4)
      .join('\n'),
    metadata: { date: today, pickups: schedule.pickups.length, returns: schedule.returns.length },
  })

  return emailsSent
}
