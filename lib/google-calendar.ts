// lib/google-calendar.ts
// Syncs confirmed reservations to the tenant's connected Google Calendar.
// Mirrors the Gmail OAuth + refresh-on-401 pattern from
// app/api/cron/poll-turo-emails/route.ts, pointed at the Calendar API instead.
import { createAdminClient } from '@/lib/supabase/admin'
import { APP_TZ } from '@/lib/finance/revenue'

const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

interface CalendarConnection {
  id: string
  tenant_id: string
  access_token: string
  refresh_token: string
  calendar_id: string
}

export interface ReservationCalendarDetails {
  customerName: string
  customerPhone: string | null
  carName: string
  pickupDate: string | null
  pickupTime: string | null
  pickupLocation: string | null
  returnDate: string | null
  returnTime: string | null
  returnLocation: string | null
  bookingCode: string
  notes: string | null
}

async function getConnection(tenantId: string): Promise<CalendarConnection | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('google_calendar_connections')
    .select('id, tenant_id, access_token, refresh_token, calendar_id')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .maybeSingle()
  return data
}

async function refreshAccessToken(conn: CalendarConnection): Promise<string> {
  const supabase = createAdminClient()
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: conn.refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }).toString(),
  })
  const data = await res.json()
  if (!res.ok || !data.access_token) {
    // Never include the full response — a refresh_token could theoretically be echoed back.
    throw new Error(`Calendar token refresh failed: ${res.status} ${data.error || 'unknown_error'}`)
  }
  conn.access_token = data.access_token
  await supabase.from('google_calendar_connections').update({ access_token: data.access_token }).eq('id', conn.id)
  return data.access_token
}

async function calendarFetch(
  path: string,
  conn: CalendarConnection,
  init: { method?: string; body?: unknown } = {},
  attempt = 0
): Promise<Response> {
  const res = await fetch(`${CALENDAR_BASE}${path}`, {
    method: init.method || 'GET',
    headers: {
      Authorization: `Bearer ${conn.access_token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  if (res.status === 401 && attempt < 1) {
    await refreshAccessToken(conn)
    return calendarFetch(path, conn, init, attempt + 1)
  }
  return res
}

function toDateTime(date: string | null, time: string | null): { dateTime: string; timeZone: string } {
  const safeDate = date || new Date().toISOString().slice(0, 10)
  const safeTime = time || '10:00'
  return { dateTime: `${safeDate}T${safeTime}:00`, timeZone: APP_TZ }
}

/**
 * Creates a single calendar event spanning pickup → return for a confirmed reservation.
 * Returns the created event id, or null if the tenant has no active Calendar connection.
 * Never throws for "not connected" — only for real API failures once connected.
 */
export async function createReservationCalendarEvent(
  tenantId: string,
  reservation: ReservationCalendarDetails
): Promise<string | null> {
  const conn = await getConnection(tenantId)
  if (!conn) return null

  const description = [
    `Booking ${reservation.bookingCode}`,
    reservation.customerPhone ? `Phone: ${reservation.customerPhone}` : null,
    reservation.returnLocation && reservation.returnLocation !== reservation.pickupLocation
      ? `Return location: ${reservation.returnLocation}`
      : null,
    reservation.notes || null,
  ].filter(Boolean).join('\n')

  const res = await calendarFetch(`/calendars/${encodeURIComponent(conn.calendar_id)}/events`, conn, {
    method: 'POST',
    body: {
      summary: `${reservation.carName} — ${reservation.customerName}`,
      location: reservation.pickupLocation || undefined,
      description,
      start: toDateTime(reservation.pickupDate, reservation.pickupTime),
      end: toDateTime(reservation.returnDate, reservation.returnTime),
    },
  })

  if (!res.ok) {
    throw new Error(`Calendar event creation failed: ${res.status}`)
  }

  const event = await res.json()
  return event.id as string
}

/**
 * Patches an existing event's fields (e.g. after pickup/return date changes).
 * Treats "already gone" (404/410) as a no-op rather than throwing, matching delete's behavior —
 * the reservation row's google_calendar_event_id would otherwise point at a dead event forever.
 */
export async function updateReservationCalendarEvent(
  tenantId: string,
  eventId: string,
  reservation: ReservationCalendarDetails
): Promise<void> {
  const conn = await getConnection(tenantId)
  if (!conn) return

  const description = [
    `Booking ${reservation.bookingCode}`,
    reservation.customerPhone ? `Phone: ${reservation.customerPhone}` : null,
    reservation.returnLocation && reservation.returnLocation !== reservation.pickupLocation
      ? `Return location: ${reservation.returnLocation}`
      : null,
    reservation.notes || null,
  ].filter(Boolean).join('\n')

  const res = await calendarFetch(
    `/calendars/${encodeURIComponent(conn.calendar_id)}/events/${encodeURIComponent(eventId)}`,
    conn,
    {
      method: 'PATCH',
      body: {
        summary: `${reservation.carName} — ${reservation.customerName}`,
        location: reservation.pickupLocation || undefined,
        description,
        start: toDateTime(reservation.pickupDate, reservation.pickupTime),
        end: toDateTime(reservation.returnDate, reservation.returnTime),
      },
    }
  )

  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Calendar event update failed: ${res.status}`)
  }
}

/** Deletes a previously created event. Treats "already gone" (404/410) as success. */
export async function deleteReservationCalendarEvent(tenantId: string, eventId: string): Promise<void> {
  const conn = await getConnection(tenantId)
  if (!conn) return

  const res = await calendarFetch(
    `/calendars/${encodeURIComponent(conn.calendar_id)}/events/${encodeURIComponent(eventId)}`,
    conn,
    { method: 'DELETE' }
  )

  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Calendar event deletion failed: ${res.status}`)
  }
}
