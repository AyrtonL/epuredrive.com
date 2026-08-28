// app/dashboard/bookings/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import type { Reservation } from '@/lib/supabase/types'
import { sendEmail } from '@/lib/email/resend'
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatch'
import { createInAppNotification } from '@/lib/notifications/create'
import { generateBookingCode } from '@/lib/booking-code'
import { findOverlappingReservations, describeConflicts, type OverlapCandidate } from '@/lib/reservations/overlap'
import {
  newBookingEmail,
  bookingCancelledEmail,
  bookingConfirmedEmail,
  agreementRequestEmail,
  bookingConfirmedCustomerEmail,
  bookingCancelledCustomerEmail,
  bookingRejectedCustomerEmail,
} from '@/lib/email/templates'
import { createReservationCalendarEvent, deleteReservationCalendarEvent, updateReservationCalendarEvent } from '@/lib/google-calendar'
import type { TenantBrand } from '@/lib/email/templates/_layout'

const TENANT_BRAND_COLUMNS =
  'name, brand_name, slug, logo_url, owner_email, owner_phone, company_phone, whatsapp_phone, company_address'

interface TenantBrandRow {
  name: string | null
  brand_name: string | null
  slug: string | null
  logo_url: string | null
  owner_email: string | null
  owner_phone: string | null
  company_phone: string | null
  whatsapp_phone: string | null
  company_address: string | null
}

function rowToBrand(row: TenantBrandRow | null): TenantBrand {
  return {
    name: row?.brand_name || row?.name || 'Your Rental Company',
    logoUrl: row?.logo_url ?? null,
    email: row?.owner_email ?? null,
    phone: row?.company_phone || row?.whatsapp_phone || row?.owner_phone || null,
    address: row?.company_address ?? null,
  }
}

export async function buildAgreementUrl(tenantSlug: string, token: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${tenantSlug}.epuredrive.com`
  return `${baseUrl}/sites/${tenantSlug}/agreement/${token}`
}

async function getTenantId(): Promise<string> {
  const { tenantId } = await requireTenantId()
  return tenantId
}

async function getOperatorEmails(supabase: ReturnType<typeof createClient>, tenantId: string): Promise<string[]> {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('tenant_id', tenantId)

  if (!profiles?.length) return []

  const adminClient = createAdminClient()
  const results = await Promise.all(
    profiles.map(p => adminClient.auth.admin.getUserById(p.id).catch(() => ({ data: null, error: null })))
  )

  return results
    .map(r => r.data?.user?.email)
    .filter((email): email is string => !!email)
}

export interface CustomerLookup {
  name: string | null
  email: string | null
  phone: string | null
  dob: string | null
  address: string | null
  zip_code: string | null
  license_number: string | null
  license_state: string | null
  license_expiration_date: string | null
  insurance_provider: string | null
  insurance_policy_number: string | null
  insurance_expiration_date: string | null
}

/**
 * Search the tenant's customers roster (name / email / phone). Used by
 * BookingModal to let staff reuse existing customer data without retyping.
 * The roster is the canonical current profile — it's kept in sync by
 * upsertCustomerFromBooking on every create/update, so it always reflects
 * the latest known DOB / address / license / insurance, regardless of how
 * old the customer's most recent reservation is.
 */
export async function searchCustomersForBooking(
  query: string
): Promise<{ results: CustomerLookup[]; error: string | null }> {
  const trimmed = query?.trim() ?? ''
  if (trimmed.length < 2) return { results: [], error: null }

  // Strip PostgREST .or() specials (comma + parens) that would break the filter
  const safe = trimmed.replace(/[,()]/g, '')
  if (!safe) return { results: [], error: null }

  const supabase = createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from('customers')
    .select(
      'name, email, phone, dob, address, zip_code, license_number, license_state, license_expiration_date, insurance_provider, insurance_policy_number, insurance_expiration_date'
    )
    .eq('tenant_id', tenantId)
    .or(`name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`)
    .order('name')
    .limit(8)

  if (error) return { results: [], error: error.message }

  return { results: data ?? [], error: null }
}

interface CustomerProfileInput {
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  customer_dob?: string | null
  customer_address?: string | null
  customer_zip?: string | null
  license_number?: string | null
  license_state?: string | null
  license_country?: string | null
  license_expiration_date?: string | null
  insurance_provider?: string | null
  insurance_policy_number?: string | null
  insurance_expiration_date?: string | null
}

/**
 * Sync the booking's customer info into the tenant's customers roster.
 * Inserts a new customer if none match, otherwise updates the existing
 * customer with any newly provided (non-blank) fields — a blank field on
 * the booking form never clears a value the roster already has, so the
 * roster always reflects the most complete known profile.
 * Match priority: email → phone → name (case-insensitive).
 */
async function upsertCustomerFromBooking(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  data: CustomerProfileInput
): Promise<void> {
  const name = data.customer_name?.trim()
  if (!name) return

  const email = data.customer_email?.trim() || null
  const phone = data.customer_phone?.trim() || null

  let lookup = supabase.from('customers').select('id').eq('tenant_id', tenantId).limit(1)
  if (email) lookup = lookup.ilike('email', email)
  else if (phone) lookup = lookup.eq('phone', phone)
  else lookup = lookup.ilike('name', name)

  const { data: existing } = await lookup.maybeSingle()

  const profileFields: Record<string, string> = {}
  if (data.customer_dob) profileFields.dob = data.customer_dob
  if (data.customer_address) profileFields.address = data.customer_address
  if (data.customer_zip) profileFields.zip_code = data.customer_zip
  if (data.license_number) profileFields.license_number = data.license_number
  if (data.license_state) profileFields.license_state = data.license_state
  if (data.license_country) profileFields.license_country = data.license_country
  if (data.license_expiration_date) profileFields.license_expiration_date = data.license_expiration_date
  if (data.insurance_provider) profileFields.insurance_provider = data.insurance_provider
  if (data.insurance_policy_number) profileFields.insurance_policy_number = data.insurance_policy_number
  if (data.insurance_expiration_date) profileFields.insurance_expiration_date = data.insurance_expiration_date

  if (existing) {
    const updates: Record<string, string> = { name, ...profileFields }
    if (email) updates.email = email
    if (phone) updates.phone = phone
    await supabase.from('customers').update(updates).eq('id', existing.id)
    return
  }

  await supabase.from('customers').insert({
    name,
    email,
    phone,
    tenant_id: tenantId,
    ...profileFields,
  })
}

async function getCarName(supabase: ReturnType<typeof createClient>, carId: number | null): Promise<string> {
  if (!carId) return 'Unknown Vehicle'
  const { data } = await supabase.from('cars').select('make, model, model_full').eq('id', carId).single()
  if (!data) return `Car #${carId}`
  return `${data.make} ${data.model_full || data.model}`
}

async function getTenantName(supabase: ReturnType<typeof createClient>, tenantId: string): Promise<string> {
  const { data } = await supabase.from('tenants').select('brand_name, name').eq('id', tenantId).single()
  return data?.brand_name || data?.name || 'Your Fleet'
}

async function getTenantBrand(supabase: ReturnType<typeof createClient>, tenantId: string): Promise<TenantBrand> {
  const { data } = await supabase.from('tenants').select(TENANT_BRAND_COLUMNS).eq('id', tenantId).single()
  return rowToBrand(data as TenantBrandRow | null)
}

interface ReservationForNotify {
  id: number
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  car_id: number | null
  pickup_date: string | null
  pickup_time: string | null
  pickup_location: string | null
  return_date: string | null
  return_time: string | null
  return_location: string | null
  booking_code: string
  notes: string | null
  source: string | null
}

/**
 * Fires the customer + operator "booking confirmed" emails and creates the
 * Google Calendar event. Called the first time a reservation reaches
 * confirmed/active from any entry point (manual dashboard confirm, creating a
 * booking that's already confirmed/active, etc). NOT called from the Turo
 * email sync — Turo already sends its own calendar invite, and duplicating
 * that would just clutter the operator's calendar with two events per trip.
 */
function notifyAndSyncConfirmedReservation(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  reservation: ReservationForNotify
): void {
  Promise.resolve().then(async () => {
    try {
      const [carName, brand, emails] = await Promise.all([
        getCarName(supabase, reservation.car_id),
        getTenantBrand(supabase, tenantId),
        getOperatorEmails(supabase, tenantId),
      ])

      if (reservation.customer_email) {
        await sendEmail({
          to: reservation.customer_email,
          fromName: brand.name,
          replyTo: brand.email ?? undefined,
          ...bookingConfirmedCustomerEmail({
            customerName: reservation.customer_name || 'Customer',
            brand,
            carName,
            pickupDate: reservation.pickup_date || 'TBD',
            returnDate: reservation.return_date || 'TBD',
            pickupLocation: reservation.pickup_location || 'To be confirmed',
            pickupTime: reservation.pickup_time ?? undefined,
            returnTime: reservation.return_time ?? undefined,
            reservationId: reservation.id,
            bookingCode: reservation.booking_code,
          }),
        })
      }

      if (emails.length > 0) {
        const tenantName = await getTenantName(supabase, tenantId)
        await sendEmail({
          to: emails,
          ...bookingConfirmedEmail({
            customerName: reservation.customer_name || 'Unknown',
            carName,
            pickupDate: reservation.pickup_date || 'TBD',
            returnDate: reservation.return_date || 'TBD',
            pickupLocation: reservation.pickup_location || 'To be confirmed',
            pickupTime: reservation.pickup_time ?? undefined,
            returnTime: reservation.return_time ?? undefined,
            bookingCode: reservation.booking_code,
            tenantName,
          }),
        })
      }
    } catch (e) {
      console.error('[notify] Confirmed notification failed:', e)
    }
  })

  Promise.resolve().then(async () => {
    try {
      // Turo bookings already get their own calendar invite from Turo's own
      // confirmation email — syncing a second event just clutters the calendar.
      if (reservation.source === 'turo') return

      // Re-read the row right before creating: a concurrent confirm (double-click)
      // or the "sync existing bookings" backfill may have already created the
      // event since prevReservation was snapshotted. The deterministic event id
      // in createReservationCalendarEvent is the real backstop (Google returns
      // 409), but skipping the call entirely avoids a pointless API round-trip.
      const { data: fresh } = await supabase
        .from('reservations')
        .select('google_calendar_event_id')
        .eq('id', reservation.id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (fresh?.google_calendar_event_id) return

      const carName = await getCarName(supabase, reservation.car_id)
      const eventId = await createReservationCalendarEvent(tenantId, reservation.id, {
        customerName: reservation.customer_name || 'Customer',
        customerPhone: reservation.customer_phone,
        carName,
        pickupDate: reservation.pickup_date,
        pickupTime: reservation.pickup_time,
        pickupLocation: reservation.pickup_location,
        returnDate: reservation.return_date,
        returnTime: reservation.return_time,
        returnLocation: reservation.return_location,
        bookingCode: reservation.booking_code,
        notes: reservation.notes,
      })
      if (eventId) {
        await supabase.from('reservations').update({ google_calendar_event_id: eventId }).eq('id', reservation.id).eq('tenant_id', tenantId)
      }
    } catch (e) {
      console.error('[calendar] Event creation failed:', e)
    }
  })
}

/**
 * Overbooking guard. Returns a conflict message if the candidate overlaps an
 * existing pending/confirmed/active reservation on the same car, unless the
 * caller explicitly allows overlap. Returns null when there is no conflict.
 */
async function overbookingConflict(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  candidate: OverlapCandidate
): Promise<string | null> {
  if (candidate.car_id == null || !candidate.pickup_date) return null
  const { data: existing } = await supabase
    .from('reservations')
    .select('id, booking_code, car_id, customer_name, pickup_date, pickup_time, return_date, return_time, status')
    .eq('tenant_id', tenantId)
    .eq('car_id', candidate.car_id)
    .in('status', ['pending', 'confirmed', 'active'])
  const conflicts = findOverlappingReservations(candidate, (existing as Reservation[]) ?? [])
  return conflicts.length > 0 ? describeConflicts(conflicts) : null
}

export async function createReservation(
  data: Omit<Reservation, 'id' | 'tenant_id' | 'created_at' | 'booking_code'>,
  options?: { allowOverlap?: boolean }
): Promise<{ error: string | null; conflict?: string }> {
  const supabase = createClient()
  const tenantId = await getTenantId()

  if (!options?.allowOverlap) {
    const conflict = await overbookingConflict(supabase, tenantId, {
      car_id: data.car_id ?? null,
      pickup_date: data.pickup_date ?? null,
      pickup_time: data.pickup_time ?? null,
      return_date: data.return_date ?? null,
      return_time: data.return_time ?? null,
    })
    if (conflict) return { error: conflict, conflict }
  }

  const bookingCode = generateBookingCode()
  const { data: inserted, error } = await supabase
    .from('reservations')
    .insert({ ...data, tenant_id: tenantId, booking_code: bookingCode })
    .select('id')
    .single()
  revalidatePath('/dashboard/bookings')

  if (!error) {
    const reservationId = inserted?.id ?? null

    // Sync customer roster with this booking's profile data
    upsertCustomerFromBooking(supabase, tenantId, {
      customer_name: data.customer_name ?? null,
      customer_email: data.customer_email ?? null,
      customer_phone: data.customer_phone ?? null,
      customer_dob: data.customer_dob ?? null,
      customer_address: data.customer_address ?? null,
      customer_zip: data.customer_zip ?? null,
      license_number: data.license_number ?? null,
      license_state: data.license_state ?? null,
      license_country: data.license_country ?? null,
      license_expiration_date: data.license_expiration_date ?? null,
      insurance_provider: data.insurance_provider ?? null,
      insurance_policy_number: data.insurance_policy_number ?? null,
      insurance_expiration_date: data.insurance_expiration_date ?? null,
    }).catch((err) => console.error('[bookings] customer upsert failed:', err))

    dispatchWebhookEvent(tenantId, 'booking.created', {
      reservation_id: reservationId,
      car_id: data.car_id ?? null,
      customer_name: data.customer_name ?? null,
      customer_email: data.customer_email ?? null,
      pickup_date: data.pickup_date ?? null,
      return_date: data.return_date ?? null,
      source: 'dashboard',
    }).catch((err) => console.error('[bookings] webhook dispatch failed:', err))

    // Send notification email (fire-and-forget)
    Promise.resolve().then(async () => {
      try {
        const [emails, carName, tenantName] = await Promise.all([
          getOperatorEmails(supabase, tenantId),
          getCarName(supabase, data.car_id ?? null),
          getTenantName(supabase, tenantId),
        ])
        if (emails.length > 0) {
          const { subject, html } = newBookingEmail({
            customerName: data.customer_name || 'Unknown',
            carName,
            pickupDate: data.pickup_date || 'TBD',
            returnDate: data.return_date || 'TBD',
            totalAmount: data.total_amount ?? null,
            tenantName,
          })
          await sendEmail({ to: emails, subject, html })
        }
      } catch (e) {
        console.error('[notify] New booking email failed:', e)
      }
    })

    // In-app notification (fire-and-forget)
    createInAppNotification({
      tenantId,
      event: 'new_booking',
      title: 'New Booking',
      body: `${data.customer_name || 'A customer'} booked ${data.pickup_date || ''} → ${data.return_date || ''}`,
      metadata: { reservation_id: reservationId, car_id: data.car_id, customer_name: data.customer_name },
    }).catch(() => {})

    // If staff created it already confirmed/active (skipping the pending step),
    // fire the same confirmation email + Google Calendar sync as the status-change path.
    if (reservationId && (data.status === 'confirmed' || data.status === 'active')) {
      notifyAndSyncConfirmedReservation(supabase, tenantId, { ...data, id: reservationId, booking_code: bookingCode })
    }
  }

  return { error: error?.message ?? null }
}

export async function updateReservation(
  id: number,
  data: Partial<Omit<Reservation, 'id' | 'tenant_id'>>,
  options?: { allowOverlap?: boolean }
): Promise<{ error: string | null; conflict?: string }> {
  const supabase = createClient()
  const tenantId = await getTenantId()

  // Overbooking guard — only when the car or dates are changing, and only if
  // the new state isn't a cancellation. Merges the change onto the current row
  // to get the effective car/date window, then checks for overlap (excluding
  // this reservation itself).
  const changesSchedule = 'car_id' in data || 'pickup_date' in data || 'return_date' in data
  const becomingCancelled = data.status === 'cancelled' || data.status === 'rejected'
  // Fields that appear on the synced Google Calendar event — if any of these change on a
  // reservation that already has an event, the event needs to be patched, not just the row.
  const changesCalendarDetails = [
    'car_id', 'customer_name', 'customer_phone',
    'pickup_date', 'pickup_time', 'pickup_location',
    'return_date', 'return_time', 'return_location', 'notes',
  ].some((field) => field in data)
  if (!options?.allowOverlap && changesSchedule && !becomingCancelled) {
    const { data: current } = await supabase
      .from('reservations')
      .select('car_id, pickup_date, pickup_time, return_date, return_time')
      .eq('id', id).eq('tenant_id', tenantId).single()
    const conflict = await overbookingConflict(supabase, tenantId, {
      id,
      car_id: data.car_id ?? current?.car_id ?? null,
      pickup_date: data.pickup_date ?? current?.pickup_date ?? null,
      pickup_time: data.pickup_time ?? current?.pickup_time ?? null,
      return_date: data.return_date ?? current?.return_date ?? null,
      return_time: data.return_time ?? current?.return_time ?? null,
    })
    if (conflict) return { error: conflict, conflict }
  }

  // Fetch current reservation before update (for status change notifications, and to know
  // whether a synced calendar event already exists that needs patching)
  let prevReservation: Reservation | null = null
  if (
    data.status === 'cancelled' || data.status === 'confirmed' || data.status === 'rejected' ||
    changesCalendarDetails
  ) {
    const { data: prev } = await supabase.from('reservations').select('*').eq('id', id).eq('tenant_id', tenantId).single()
    prevReservation = prev
  }

  const { error } = await supabase
    .from('reservations')
    .update(data)
    .eq('id', id)
    .eq('tenant_id', tenantId)
  revalidatePath('/dashboard/bookings')

  if (!error) {
    // Sync customer roster with this booking's profile data
    upsertCustomerFromBooking(supabase, tenantId, {
      customer_name: data.customer_name ?? null,
      customer_email: data.customer_email ?? null,
      customer_phone: data.customer_phone ?? null,
      customer_dob: data.customer_dob ?? null,
      customer_address: data.customer_address ?? null,
      customer_zip: data.customer_zip ?? null,
      license_number: data.license_number ?? null,
      license_state: data.license_state ?? null,
      license_country: data.license_country ?? null,
      license_expiration_date: data.license_expiration_date ?? null,
      insurance_provider: data.insurance_provider ?? null,
      insurance_policy_number: data.insurance_policy_number ?? null,
      insurance_expiration_date: data.insurance_expiration_date ?? null,
    }).catch((err) => console.error('[bookings] customer upsert failed:', err))
  }

  if (!error && data.status === 'cancelled' && prevReservation) {
    dispatchWebhookEvent(tenantId, 'booking.cancelled', {
      reservation_id: id,
      car_id: prevReservation?.car_id ?? null,
      customer_name: prevReservation?.customer_name ?? null,
      customer_email: prevReservation?.customer_email ?? null,
    }).catch((err) => console.error('[bookings] webhook dispatch failed:', err))

    Promise.resolve().then(async () => {
      try {
        const reservationTenantId = prevReservation!.tenant_id
        if (!reservationTenantId) return
        const [emails, carName, tenantName] = await Promise.all([
          getOperatorEmails(supabase, reservationTenantId),
          getCarName(supabase, prevReservation!.car_id ?? null),
          getTenantName(supabase, reservationTenantId),
        ])
        if (emails.length > 0) {
          const { subject, html } = bookingCancelledEmail({
            customerName: prevReservation!.customer_name || 'Unknown',
            carName,
            pickupDate: prevReservation!.pickup_date || 'N/A',
            tenantName,
          })
          await sendEmail({ to: emails, subject, html })
        }
        // Also notify the customer
        if (prevReservation!.customer_email) {
          const brand = await getTenantBrand(supabase, reservationTenantId)

          await sendEmail({
            to: prevReservation!.customer_email,
            fromName: brand.name,
            replyTo: brand.email ?? undefined,
            ...bookingCancelledCustomerEmail({
              customerName: prevReservation!.customer_name || 'Customer',
              brand,
              carName,
              pickupDate: prevReservation!.pickup_date || 'N/A',
            }),
          })
        }
      } catch (e) {
        console.error('[notify] Cancellation email failed:', e)
      }
    })

    if (prevReservation.google_calendar_event_id) {
      const reservationTenantId = prevReservation.tenant_id
      const eventId = prevReservation.google_calendar_event_id
      Promise.resolve().then(async () => {
        try {
          if (!reservationTenantId) return
          await deleteReservationCalendarEvent(reservationTenantId, eventId)
          await supabase.from('reservations').update({ google_calendar_event_id: null }).eq('id', id).eq('tenant_id', tenantId)
        } catch (e) {
          console.error('[calendar] Event deletion failed:', e)
        }
      })
    }

    createInAppNotification({
      tenantId,
      event: 'booking_cancelled',
      title: 'Booking Cancelled',
      body: `${prevReservation.customer_name || 'A customer'} cancelled their reservation for ${prevReservation.pickup_date || 'N/A'}`,
      metadata: { reservation_id: id, car_id: prevReservation.car_id },
    }).catch(() => {})
  }

  // Confirmed/Active for the first time → notify customer, notify operator, sync to
  // Google Calendar. Guarded on !google_calendar_event_id so this only fires once per
  // reservation — e.g. confirmed → active later doesn't re-send everything.
  if (
    !error &&
    (data.status === 'confirmed' || data.status === 'active') &&
    prevReservation &&
    !prevReservation.google_calendar_event_id
  ) {
    dispatchWebhookEvent(tenantId, 'booking.updated', {
      reservation_id: id,
      status: data.status,
      car_id: prevReservation?.car_id ?? null,
      customer_name: prevReservation?.customer_name ?? null,
      customer_email: prevReservation?.customer_email ?? null,
    }).catch((err) => console.error('[bookings] webhook dispatch failed:', err))

    // Merge in this update's changes — data.status is 'confirmed'/'active' by the guard
    // above, but other fields (pickup time/location, etc.) may also be changing in this
    // same call, and prevReservation only holds pre-update values.
    notifyAndSyncConfirmedReservation(supabase, tenantId, { ...prevReservation, ...data, id })
  }

  // Reservation already has a synced Google Calendar event and one of its calendar-visible
  // fields (dates, times, locations, car, customer info) just changed — patch the event in
  // place instead of leaving it stale. Skipped when the same call is cancelling/rejecting
  // (the delete branches below own that transition) or first-confirming (the create branch
  // above owns that transition).
  if (
    !error &&
    changesCalendarDetails &&
    prevReservation?.google_calendar_event_id &&
    data.status !== 'cancelled' &&
    data.status !== 'rejected'
  ) {
    const reservationTenantId = prevReservation.tenant_id
    const eventId = prevReservation.google_calendar_event_id
    const merged = { ...prevReservation, ...data }
    Promise.resolve().then(async () => {
      try {
        if (!reservationTenantId) return
        const carName = await getCarName(supabase, merged.car_id ?? null)
        await updateReservationCalendarEvent(reservationTenantId, eventId, {
          customerName: merged.customer_name || 'Customer',
          customerPhone: merged.customer_phone,
          carName,
          pickupDate: merged.pickup_date,
          pickupTime: merged.pickup_time,
          pickupLocation: merged.pickup_location,
          returnDate: merged.return_date,
          returnTime: merged.return_time,
          returnLocation: merged.return_location,
          bookingCode: merged.booking_code,
          notes: merged.notes,
        })
      } catch (e) {
        console.error('[calendar] Event update failed:', e)
      }
    })
  }

  // Rejected → clean up any Google Calendar event (unusual transition, but a reservation
  // could have been confirmed and then reversed to rejected)
  if (!error && data.status === 'rejected' && prevReservation?.google_calendar_event_id) {
    const reservationTenantId = prevReservation.tenant_id
    const eventId = prevReservation.google_calendar_event_id
    Promise.resolve().then(async () => {
      try {
        if (!reservationTenantId) return
        await deleteReservationCalendarEvent(reservationTenantId, eventId)
        await supabase.from('reservations').update({ google_calendar_event_id: null }).eq('id', id).eq('tenant_id', tenantId)
      } catch (e) {
        console.error('[calendar] Event deletion failed:', e)
      }
    })
  }

  // Rejected → notify customer
  if (!error && data.status === 'rejected' && prevReservation?.customer_email) {
    dispatchWebhookEvent(tenantId, 'booking.updated', {
      reservation_id: id,
      status: 'rejected',
      car_id: prevReservation?.car_id ?? null,
      customer_name: prevReservation?.customer_name ?? null,
    }).catch((err) => console.error('[bookings] webhook dispatch failed:', err))

    Promise.resolve().then(async () => {
      try {
        const carName = await getCarName(supabase, prevReservation!.car_id ?? null)
        const { data: tenantRow } = await supabase
          .from('tenants')
          .select(TENANT_BRAND_COLUMNS)
          .eq('id', tenantId)
          .single()
        const brand = rowToBrand(tenantRow as TenantBrandRow | null)
        const tenantSlug = (tenantRow as TenantBrandRow | null)?.slug || ''

        await sendEmail({
          to: prevReservation!.customer_email!,
          fromName: brand.name,
          replyTo: brand.email ?? undefined,
          ...bookingRejectedCustomerEmail({
            customerName: prevReservation!.customer_name || 'Customer',
            brand,
            carName,
            tenantSlug,
          }),
        })
      } catch (e) {
        console.error('[notify] Rejected customer email failed:', e)
      }
    })
  }

  return { error: error?.message ?? null }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function sendAgreement(
  reservationId: number,
  extraCc?: string
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()

  const { data: reservation } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', reservationId)
    .eq('tenant_id', tenantId)
    .single()

  if (!reservation) return { error: 'Reservation not found' }
  if (!reservation.customer_email) return { error: 'Customer email is required to send agreement' }

  const trimmedCc = extraCc?.trim()
  if (trimmedCc && !EMAIL_RE.test(trimmedCc)) {
    return { error: 'CC address is not a valid email' }
  }

  const { data: tenantRow } = await supabase
    .from('tenants')
    .select(TENANT_BRAND_COLUMNS)
    .eq('id', tenantId)
    .single()

  const brand = rowToBrand(tenantRow as TenantBrandRow | null)
  const tenantSlug = (tenantRow as TenantBrandRow | null)?.slug || ''
  const carName = await getCarName(supabase, reservation.car_id ?? null)

  // Generate a fresh token but don't persist it (or agreement_sent_at) until the send confirms.
  const newToken = crypto.randomUUID()
  const agreementUrl = await buildAgreementUrl(tenantSlug, newToken)

  const ccList = Array.from(
    new Set(
      [brand.email, trimmedCc]
        .filter((addr): addr is string => !!addr)
        .filter((addr) => addr.toLowerCase() !== reservation.customer_email!.toLowerCase())
    )
  )

  const { error: sendError } = await sendEmail({
    to: reservation.customer_email,
    cc: ccList.length ? ccList : undefined,
    fromName: brand.name,
    replyTo: brand.email ?? undefined,
    tags: [
      { name: 'reservation_id', value: String(reservationId) },
      { name: 'tenant_id', value: tenantId },
      { name: 'email_type', value: 'agreement_request' },
    ],
    ...agreementRequestEmail({
      customerName: reservation.customer_name || 'Renter',
      brand,
      carName,
      pickupDate: reservation.pickup_date || '',
      returnDate: reservation.return_date || '',
      agreementUrl,
    }),
  })

  if (sendError) {
    console.error('[sendAgreement] Email failed:', sendError)
    return { error: sendError }
  }

  const { error: updateError } = await supabase
    .from('reservations')
    .update({
      agreement_token: newToken,
      agreement_sent_at: new Date().toISOString(),
    })
    .eq('id', reservationId)

  if (updateError) return { error: updateError.message }

  revalidatePath('/dashboard/bookings')
  return { error: null }
}

export async function getAgreementViewUrl(
  reservationId: number
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()

  const { data: reservation } = await supabase
    .from('reservations')
    .select('agreement_token')
    .eq('id', reservationId)
    .eq('tenant_id', tenantId)
    .single()

  if (!reservation || !reservation.agreement_token) {
    return { url: null, error: 'No agreement has been sent for this reservation yet' }
  }

  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('slug')
    .eq('id', tenantId)
    .single()

  const tenantSlug = tenantRow?.slug || ''
  if (!tenantSlug) {
    return { url: null, error: 'Tenant configuration is missing a slug' }
  }

  return { url: await buildAgreementUrl(tenantSlug, reservation.agreement_token), error: null }
}

const EMAIL_ISSUE_LABELS: Record<string, string> = {
  'email.bounced': 'bounced',
  'email.complained': 'marked as spam',
  'email.delivery_delayed': 'delayed',
  'email.failed': 'failed to send',
}

/**
 * Returns the most recent delivery problem (bounce/complaint/delay) reported
 * by Resend for this reservation's agreement email, if any. Lets the
 * dashboard show "this may not have reached the customer" instead of a
 * blind "sent" status once staff clicks Send/Resend.
 */
export async function getAgreementEmailIssue(
  reservationId: number
): Promise<{ label: string | null; occurredAt: string | null }> {
  const supabase = createClient()

  const { data } = await supabase
    .from('email_events')
    .select('event_type, created_at')
    .eq('reservation_id', reservationId)
    .eq('email_type', 'agreement_request')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return { label: null, occurredAt: null }

  return {
    label: EMAIL_ISSUE_LABELS[data.event_type] ?? data.event_type,
    occurredAt: data.created_at,
  }
}

/**
 * Return the latest auto-synced mileage for a car if it's linked to a
 * telematics device, otherwise null. Used by BookingModal to pre-fill the
 * odometer input on pickup/return close-out. Staff can still override the
 * value freely — this is just a hint sourced from cars.mileage (bumped by
 * telematics ingest). Uses RLS (regular client) so a tenant only sees
 * their own cars.
 */
export async function getLatestOdometer(carId: number): Promise<number | null> {
  if (!carId || Number.isNaN(carId)) return null
  const supabase = createClient()
  const tenantId = await getTenantId()
  const { data } = await supabase
    .from('cars')
    .select('mileage, telematics_device_id')
    .eq('id', carId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!data || !data.telematics_device_id) return null
  return typeof data.mileage === 'number' ? data.mileage : null
}

export async function deleteReservation(id: number): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  const { error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)
  revalidatePath('/dashboard/bookings')
  return { error: error?.message ?? null }
}

export async function bulkUpdateReservations(
  ids: number[],
  data: Partial<Omit<Reservation, 'id' | 'tenant_id'>>
): Promise<{ error: string | null }> {
  if (!ids.length) return { error: null }
  const supabase = createClient()
  const tenantId = await getTenantId()
  const { error } = await supabase
    .from('reservations')
    .update(data)
    .in('id', ids)
    .eq('tenant_id', tenantId)
  revalidatePath('/dashboard/bookings')
  return { error: error?.message ?? null }
}
