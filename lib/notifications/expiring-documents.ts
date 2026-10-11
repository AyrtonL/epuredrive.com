import type { createAdminClient } from '@/lib/supabase/admin'
import { createInAppNotification } from '@/lib/notifications/create'

/**
 * One alert per tenant listing bookings where the customer's license or
 * insurance runs out mid-rental:
 *   - rentals starting tomorrow whose license/insurance expires before return
 *   - active rentals whose license/insurance expires tomorrow
 */
export async function notifyExpiringDocuments(
  supabase: ReturnType<typeof createAdminClient>,
  todayStr: string,
  tomorrowStr: string,
): Promise<number> {
  const cols = 'id, tenant_id, customer_name, booking_code, pickup_date, return_date, status, license_expiration_date, insurance_expiration_date'
  const [{ data: startingTomorrow }, { data: active }] = await Promise.all([
    supabase.from('reservations').select(cols)
      .in('status', ['pending', 'confirmed'])
      .eq('pickup_date', tomorrowStr),
    supabase.from('reservations').select(cols)
      .eq('status', 'active')
      .or(`license_expiration_date.eq.${tomorrowStr},insurance_expiration_date.eq.${tomorrowStr}`),
  ])

  type Row = {
    id: number; tenant_id: string | null; customer_name: string | null; booking_code: string | null
    pickup_date: string | null; return_date: string | null; status: string | null
    license_expiration_date: string | null; insurance_expiration_date: string | null
  }
  const lines = new Map<string, string[]>()
  const add = (r: Row, what: string[], when: string) => {
    if (!r.tenant_id || !what.length) return
    const list = lines.get(r.tenant_id) ?? []
    list.push(`${r.customer_name || 'Customer'}${r.booking_code ? ` (${r.booking_code})` : ''}: ${what.join(' & ')} ${when}`)
    lines.set(r.tenant_id, list)
  }

  for (const r of (startingTomorrow ?? []) as Row[]) {
    if (!r.return_date) continue
    const what: string[] = []
    if (r.license_expiration_date && r.license_expiration_date < r.return_date) what.push('license')
    if (r.insurance_expiration_date && r.insurance_expiration_date < r.return_date) what.push('insurance')
    add(r, what, 'expires before return')
  }
  for (const r of (active ?? []) as Row[]) {
    const what: string[] = []
    if (r.license_expiration_date === tomorrowStr) what.push('license')
    if (r.insurance_expiration_date === tomorrowStr) what.push('insurance')
    add(r, what, 'expires tomorrow')
  }

  let sent = 0
  for (const [tenantId, list] of Array.from(lines)) {
    await createInAppNotification({
      tenantId,
      event: 'document_expiring',
      title: `Customer document${list.length === 1 ? '' : 's'} expiring during a rental`,
      body: list.join('\n'),
      metadata: { count: list.length, date: todayStr },
    }).catch((err) => console.error('[cron/return-reminders] document alert failed:', err))
    sent++
  }
  return sent
}
