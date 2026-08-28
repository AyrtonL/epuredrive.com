'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { createReservationCalendarEvent } from '@/lib/google-calendar'
import { todayISO } from '@/lib/finance/revenue'

export async function disconnectGoogleCalendar(): Promise<{ error: string | null }> {
  const { tenantId } = await requireTenantId()
  const supabase = createClient()

  const { error } = await supabase
    .from('google_calendar_connections')
    .delete()
    .eq('tenant_id', tenantId)

  revalidatePath('/dashboard/integrations/google-calendar')
  return { error: error?.message ?? null }
}

async function getCarName(supabase: ReturnType<typeof createClient>, carId: number | null): Promise<string> {
  if (!carId) return 'Unknown Vehicle'
  const { data } = await supabase.from('cars').select('make, model, model_full').eq('id', carId).single()
  if (!data) return `Car #${carId}`
  return `${data.make} ${data.model_full || data.model}`
}

/**
 * One-time backfill for bookings that were already confirmed/active before the
 * tenant connected Google Calendar (the sync trigger only fires on the status
 * transition, so it never sees pre-existing rows). Only touches upcoming/current
 * bookings (return date today or later) — no point cluttering the calendar with
 * events for trips that already ended, and skips anything already synced.
 * Turo bookings are excluded — Turo sends its own calendar invite, so syncing a
 * second event would double up every Turo trip on the operator's calendar.
 */
export async function syncExistingBookings(): Promise<{ synced: number; errors: number; message: string }> {
  const { tenantId } = await requireTenantId()
  const supabase = createClient()

  const { data: reservations } = await supabase
    .from('reservations')
    .select('id, car_id, customer_name, customer_phone, pickup_date, pickup_time, pickup_location, return_date, return_time, return_location, booking_code, notes')
    .eq('tenant_id', tenantId)
    .in('status', ['confirmed', 'active'])
    .is('google_calendar_event_id', null)
    .neq('source', 'turo')
    .gte('return_date', todayISO())

  if (!reservations?.length) {
    return { synced: 0, errors: 0, message: 'No upcoming confirmed or active bookings to sync.' }
  }

  let synced = 0
  let errors = 0

  for (const r of reservations) {
    try {
      const carName = await getCarName(supabase, r.car_id)
      const eventId = await createReservationCalendarEvent(tenantId, r.id, {
        customerName: r.customer_name || 'Customer',
        customerPhone: r.customer_phone,
        carName,
        pickupDate: r.pickup_date,
        pickupTime: r.pickup_time,
        pickupLocation: r.pickup_location,
        returnDate: r.return_date,
        returnTime: r.return_time,
        returnLocation: r.return_location,
        bookingCode: r.booking_code,
        notes: r.notes,
      })
      if (eventId) {
        await supabase.from('reservations').update({ google_calendar_event_id: eventId }).eq('id', r.id).eq('tenant_id', tenantId)
        synced++
      }
    } catch (e) {
      errors++
      console.error('[calendar] Backfill sync failed for reservation', r.id, e)
    }
  }

  revalidatePath('/dashboard/integrations/google-calendar')
  return {
    synced,
    errors,
    message: `✓ ${synced} booking(s) synced${errors ? ` — ${errors} failed` : ''}`,
  }
}
