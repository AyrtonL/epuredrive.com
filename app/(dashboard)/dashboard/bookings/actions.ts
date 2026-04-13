// app/dashboard/bookings/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import type { Reservation } from '@/lib/supabase/types'
import { sendEmail } from '@/lib/email/resend'
import { newBookingEmail, bookingCancelledEmail, agreementRequestEmail } from '@/lib/email/templates'

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

  const userIds = profiles.map(p => p.id)
  const emails: string[] = []
  for (const uid of userIds) {
    const { data } = await supabase.auth.admin.getUserById(uid).catch(() => ({ data: null }))
    if ((data as any)?.user?.email) emails.push((data as any).user.email)
  }

  return emails
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

export async function createReservation(
  data: Omit<Reservation, 'id' | 'tenant_id' | 'created_at'>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  const { error } = await supabase
    .from('reservations')
    .insert({ ...data, tenant_id: tenantId })
  revalidatePath('/dashboard/bookings')

  if (!error) {
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
  }

  return { error: error?.message ?? null }
}

export async function updateReservation(
  id: number,
  data: Partial<Omit<Reservation, 'id' | 'tenant_id'>>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()

  // Fetch current reservation before update (for cancellation notification)
  let prevReservation: Reservation | null = null
  if (data.status === 'cancelled') {
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
    Promise.resolve().then(async () => {
      try {
        const tenantId = prevReservation!.tenant_id
        if (!tenantId) return
        const [emails, carName, tenantName] = await Promise.all([
          getOperatorEmails(supabase, tenantId),
          getCarName(supabase, prevReservation!.car_id ?? null),
          getTenantName(supabase, tenantId),
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
      } catch (e) {
        console.error('[notify] Cancellation email failed:', e)
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

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, brand_name, slug')
    .eq('id', tenantId)
    .single()

  const tenantName = tenant?.brand_name || tenant?.name || 'Your Rental Company'
  const tenantSlug = tenant?.slug || ''
  const carName = await getCarName(supabase, reservation.car_id ?? null)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${tenantSlug}.epuredrive.com`
  const agreementUrl = `${baseUrl}/sites/${tenantSlug}/agreement/${newToken}`

  try {
    await sendEmail({
      to: reservation.customer_email,
      ...agreementRequestEmail({
        customerName: reservation.customer_name || 'Renter',
        tenantName,
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
