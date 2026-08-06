// app/api/cron/return-reminders/route.ts
/**
 * POST /api/cron/return-reminders
 * Sends two kinds of notifications, once per day:
 *  - Customer-facing D-1 reminder ("your return is tomorrow") for active rentals
 *    whose return_date == tomorrow.
 *  - Operator-facing summary listing rentals that are still active past their
 *    return_date (overdue), grouped per tenant.
 *
 * Schedule once per day. Requires: Authorization: Bearer <CRON_SECRET>.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import {
  returnReminderCustomerEmail,
  returnOverdueOperatorEmail,
  type TenantBrand,
} from '@/lib/email/templates/rentals'
import { createInAppNotification } from '@/lib/notifications/create'

interface TenantRow {
  id: string
  name: string | null
  brand_name: string | null
  slug: string | null
  logo_url: string | null
  company_address: string | null
  company_phone: string | null
  whatsapp_phone: string | null
  owner_email: string | null
  owner_phone: string | null
}

interface ReservationRow {
  id: string
  car_id: number | null
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  pickup_date: string | null
  return_date: string | null
  return_time: string | null
  return_location: string | null
  status: string | null
  tenant_id: string | null
  booking_code: string | null
  return_reminder_sent_at: string | null
}

interface CarRow {
  id: number
  make: string | null
  model: string | null
  model_full: string | null
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]!
}

function buildBrand(tenant: TenantRow): TenantBrand {
  const name = tenant.brand_name || tenant.name || 'Your Rental'
  return {
    name,
    logoUrl: tenant.logo_url,
    email: tenant.owner_email,
    phone: tenant.company_phone || tenant.whatsapp_phone || tenant.owner_phone,
    address: tenant.company_address,
  }
}

function carName(car: CarRow | null): string {
  if (!car) return 'Vehicle'
  return `${car.make ?? ''} ${car.model_full || car.model || ''}`.trim() || 'Vehicle'
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const today = new Date()
  const todayStr = isoDate(today)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const tomorrowStr = isoDate(tomorrow)

  // ── Pull active rentals due tomorrow OR already overdue ──────────────
  const { data: reservations, error: reservationsError } = await supabase
    .from('reservations')
    .select('id, car_id, customer_name, customer_email, customer_phone, pickup_date, return_date, return_time, return_location, status, tenant_id, booking_code, return_reminder_sent_at')
    .eq('status', 'active')
    .or(`return_date.eq.${tomorrowStr},return_date.lt.${todayStr}`)

  if (reservationsError) {
    console.error('[cron/return-reminders] reservations query failed', reservationsError.message)
    return NextResponse.json({ error: reservationsError.message }, { status: 500 })
  }

  const rows = (reservations as ReservationRow[]) ?? []
  if (!rows.length) {
    return NextResponse.json({ remindersSent: 0, overdueDigestsSent: 0 })
  }

  // ── Resolve cars + tenants ────────────────────────────────────────────
  const carIds = Array.from(new Set(rows.map((r) => r.car_id).filter((id): id is number => id != null)))
  const tenantIds = Array.from(new Set(rows.map((r) => r.tenant_id).filter((id): id is string => !!id)))

  const [{ data: cars }, { data: tenants }] = await Promise.all([
    carIds.length
      ? supabase.from('cars').select('id, make, model, model_full').in('id', carIds)
      : Promise.resolve({ data: [] as CarRow[] }),
    tenantIds.length
      ? supabase
          .from('tenants')
          .select('id, name, brand_name, slug, logo_url, company_address, company_phone, whatsapp_phone, owner_email, owner_phone')
          .in('id', tenantIds)
      : Promise.resolve({ data: [] as TenantRow[] }),
  ])

  const carMap = new Map<number, CarRow>()
  for (const c of (cars ?? []) as CarRow[]) carMap.set(c.id, c)

  const tenantMap = new Map<string, TenantRow>()
  for (const t of (tenants ?? []) as TenantRow[]) tenantMap.set(t.id, t)

  // ── Bucket rows: customer reminders (due tomorrow) + overdue per tenant ─
  const remindersToSend: Array<{ row: ReservationRow; tenant: TenantRow; car: CarRow | null }> = []
  const overdueByTenant = new Map<string, Array<{ row: ReservationRow; daysLate: number; car: CarRow | null }>>()

  for (const row of rows) {
    if (!row.tenant_id || !row.return_date) continue
    const tenant = tenantMap.get(row.tenant_id)
    if (!tenant) continue
    const car = row.car_id != null ? carMap.get(row.car_id) ?? null : null

    if (row.return_date === tomorrowStr) {
      if (row.return_reminder_sent_at) continue // already sent — avoids duplicate if this route re-runs same day
      remindersToSend.push({ row, tenant, car })
      continue
    }

    if (row.return_date < todayStr) {
      const returnAt = new Date(row.return_date + 'T00:00:00')
      const diffMs = today.getTime() - returnAt.getTime()
      const daysLate = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
      const list = overdueByTenant.get(row.tenant_id) ?? []
      list.push({ row, daysLate, car })
      overdueByTenant.set(row.tenant_id, list)
    }
  }

  // ── Send customer reminders (D-1) ─────────────────────────────────────
  let remindersSent = 0
  await Promise.allSettled(
    remindersToSend.map(async ({ row, tenant, car }) => {
      if (!row.customer_email || !row.return_date) return
      const brand = buildBrand(tenant)
      const result = await sendEmail({
        to: row.customer_email,
        fromName: brand.name,
        replyTo: brand.email ?? undefined,
        ...returnReminderCustomerEmail({
          customerName: row.customer_name || 'Renter',
          brand,
          carName: carName(car),
          returnDate: row.return_date,
          returnTime: row.return_time,
          returnLocation: row.return_location,
          bookingCode: row.booking_code,
        }),
      })
      if (!result.error) {
        remindersSent += 1
        await supabase
          .from('reservations')
          .update({ return_reminder_sent_at: new Date().toISOString() })
          .eq('id', row.id)
      }
    }),
  )

  // ── Send overdue digest per tenant + create in-app notification ───────
  let overdueDigestsSent = 0
  for (const [tenantId, items] of Array.from(overdueByTenant.entries())) {
    const tenant = tenantMap.get(tenantId)
    if (!tenant) continue

    const tenantName = tenant.brand_name || tenant.name || 'Your Fleet'

    // Operator emails — same lookup pattern as maintenance-alerts cron
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('tenant_id', tenantId)

    const operatorEmails: string[] = []
    if (profiles?.length) {
      const lookups = await Promise.allSettled(
        profiles.map((p) => supabase.auth.admin.getUserById(p.id)),
      )
      for (const r of lookups) {
        if (r.status === 'fulfilled' && (r.value as { data?: { user?: { email?: string } } })?.data?.user?.email) {
          const email = (r.value as { data: { user: { email: string } } }).data.user.email
          operatorEmails.push(email)
        }
      }
    }

    if (operatorEmails.length) {
      const result = await sendEmail({
        to: operatorEmails,
        ...returnOverdueOperatorEmail({
          tenantName,
          rentals: items.map(({ row, daysLate, car }) => ({
            customerName: row.customer_name || 'Renter',
            carName: carName(car),
            returnDate: row.return_date ?? '',
            daysLate,
            bookingCode: row.booking_code,
            customerPhone: row.customer_phone,
            customerEmail: row.customer_email,
          })),
        }),
      })
      if (!result.error) overdueDigestsSent += 1
    }

    // Best-effort in-app notification, respects tenant preferences
    try {
      await createInAppNotification({
        tenantId,
        event: 'rental.return.overdue',
        title: `${items.length} overdue rental${items.length === 1 ? '' : 's'}`,
        body: items
          .map(({ row, daysLate, car }) => `${row.customer_name} · ${carName(car)} · ${daysLate}d late`)
          .join('\n'),
        metadata: { count: items.length, reservation_ids: items.map((i) => i.row.id) },
      })
    } catch {
      // Non-critical — preferences may not be configured for this tenant.
    }
  }

  return NextResponse.json({
    remindersSent,
    overdueDigestsSent,
    overdueRentalCount: Array.from(overdueByTenant.values()).reduce((s, list) => s + list.length, 0),
  })
}
