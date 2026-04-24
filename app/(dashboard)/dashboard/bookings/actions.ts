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
import {
  newBookingEmail,
  bookingCancelledEmail,
  agreementRequestEmail,
  bookingConfirmedCustomerEmail,
  bookingCancelledCustomerEmail,
  bookingRejectedCustomerEmail,
} from '@/lib/email/templates'
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

export async function createReservation(
  data: Omit<Reservation, 'id' | 'tenant_id' | 'created_at' | 'booking_code'>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  const { data: inserted, error } = await supabase
    .from('reservations')
    .insert({ ...data, tenant_id: tenantId, booking_code: generateBookingCode() })
    .select('id')
    .single()
  revalidatePath('/dashboard/bookings')

  if (!error) {
    const reservationId = inserted?.id ?? null
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
  }

  return { error: error?.message ?? null }
}

export async function updateReservation(
  id: number,
  data: Partial<Omit<Reservation, 'id' | 'tenant_id'>>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()

  // Fetch current reservation before update (for status change notifications)
  let prevReservation: Reservation | null = null
  if (data.status === 'cancelled' || data.status === 'confirmed' || data.status === 'rejected') {
    const { data: prev } = await supabase.from('reservations').select('*').eq('id', id).eq('tenant_id', tenantId).single()
    prevReservation = prev
  }

  const { error } = await supabase
    .from('reservations')
    .update(data)
    .eq('id', id)
    .eq('tenant_id', tenantId)
  revalidatePath('/dashboard/bookings')

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

    createInAppNotification({
      tenantId,
      event: 'booking_cancelled',
      title: 'Booking Cancelled',
      body: `${prevReservation.customer_name || 'A customer'} cancelled their reservation for ${prevReservation.pickup_date || 'N/A'}`,
      metadata: { reservation_id: id, car_id: prevReservation.car_id },
    }).catch(() => {})
  }

  // Confirmed → notify customer
  if (!error && data.status === 'confirmed' && prevReservation?.customer_email) {
    dispatchWebhookEvent(tenantId, 'booking.updated', {
      reservation_id: id,
      status: 'confirmed',
      car_id: prevReservation?.car_id ?? null,
      customer_name: prevReservation?.customer_name ?? null,
      customer_email: prevReservation?.customer_email ?? null,
    }).catch((err) => console.error('[bookings] webhook dispatch failed:', err))

    Promise.resolve().then(async () => {
      try {
        const [carName, brand] = await Promise.all([
          getCarName(supabase, prevReservation!.car_id ?? null),
          getTenantBrand(supabase, tenantId),
        ])

        await sendEmail({
          to: prevReservation!.customer_email!,
          fromName: brand.name,
          replyTo: brand.email ?? undefined,
          ...bookingConfirmedCustomerEmail({
            customerName: prevReservation!.customer_name || 'Customer',
            brand,
            carName,
            pickupDate: prevReservation!.pickup_date || 'TBD',
            returnDate: prevReservation!.return_date || 'TBD',
            pickupLocation: prevReservation!.pickup_location || 'To be confirmed',
            reservationId: prevReservation!.id,
            bookingCode: prevReservation!.booking_code,
          }),
        })
      } catch (e) {
        console.error('[notify] Confirmed customer email failed:', e)
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

export async function sendAgreement(reservationId: number): Promise<{ error: string | null }> {
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

  // Refresh token and set sent_at
  const newToken = crypto.randomUUID()
  const { error: updateError } = await supabase
    .from('reservations')
    .update({
      agreement_token: newToken,
      agreement_sent_at: new Date().toISOString(),
    })
    .eq('id', reservationId)

  if (updateError) return { error: updateError.message }

  const { data: tenantRow } = await supabase
    .from('tenants')
    .select(TENANT_BRAND_COLUMNS)
    .eq('id', tenantId)
    .single()

  const brand = rowToBrand(tenantRow as TenantBrandRow | null)
  const tenantSlug = (tenantRow as TenantBrandRow | null)?.slug || ''
  const carName = await getCarName(supabase, reservation.car_id ?? null)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${tenantSlug}.epuredrive.com`
  const agreementUrl = `${baseUrl}/sites/${tenantSlug}/agreement/${newToken}`

  try {
    await sendEmail({
      to: reservation.customer_email,
      fromName: brand.name,
      replyTo: brand.email ?? undefined,
      ...agreementRequestEmail({
        customerName: reservation.customer_name || 'Renter',
        brand,
        carName,
        pickupDate: reservation.pickup_date || '',
        returnDate: reservation.return_date || '',
        agreementUrl,
      }),
    })
  } catch (e) {
    console.error('[sendAgreement] Email failed:', e)
    return { error: 'Failed to send agreement email' }
  }

  revalidatePath('/dashboard/bookings')
  return { error: null }
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
