'use client'

import { useState } from 'react'
import type { Car, ReservationExtra } from '@/lib/supabase/types'
import type { CustomerInput } from '@/lib/booking/customer'
import { trackBookingSubmit } from '@/lib/analytics'

export interface BookingPayload {
  tenantId: string
  car: Car
  customer: CustomerInput
  pickDate: string
  retDate: string
  pickTime: string
  retTime: string
  locationLabel: string
  total: number
  extras: ReservationExtra[]
  payByCard: boolean
  paymentProcessor?: string
}

async function readError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  return body.error || fallback
}

function confirmationUrl(reservationId: number | undefined, car: Car): string {
  const parts = window.location.pathname.split('/')
  const siteIdx = parts.indexOf('sites')
  const basePath = window.location.pathname.startsWith('/sites/') && siteIdx >= 0 ? `/sites/${parts[siteIdx + 1]}` : ''
  const carName = encodeURIComponent(`${car.make} ${car.model_full || car.model}`)
  return `${basePath}/booking-confirmation?id=${reservationId ?? ''}&car=${carName}`
}

/** Card → hosted checkout (Stripe/Square); otherwise a reservation request. Prices are recomputed server-side. */
export function useBookingSubmit() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async (p: BookingPayload): Promise<void> => {
    setSubmitting(true)
    setError('')
    const analytics = { car_make: p.car.make, car_model: p.car.model_full || p.car.model, total: p.total }
    try {
      if (p.payByCard) {
        const endpoint = p.paymentProcessor === 'square' ? '/api/square/checkout' : '/api/checkout'
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant_id: p.tenantId,
            car_id: p.car.id,
            start_date: p.pickDate,
            end_date: p.retDate,
            customer_name: p.customer.name.trim(),
            customer_email: p.customer.email.trim(),
            customer_phone: p.customer.phone.trim() || undefined,
            pickup_time: p.pickTime || undefined,
            return_time: p.retTime || undefined,
            pickup_location: p.locationLabel || undefined,
            total_amount: p.total,
            extras: p.extras.length > 0 ? p.extras : undefined,
          }),
        })
        if (!res.ok) { setError(await readError(res, 'Could not start payment. Please try again.')); return }
        const { url } = (await res.json()) as { url?: string }
        if (!url) { setError('Could not create the payment page. Please try again.'); return }
        trackBookingSubmit({ ...analytics, payment_method: 'online' })
        window.location.href = url
        return
      }

      const res = await fetch('/api/booking/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: p.tenantId,
          car_id: p.car.id,
          customer_name: p.customer.name.trim(),
          customer_email: p.customer.email.trim(),
          customer_phone: p.customer.phone.trim() || null,
          pickup_date: p.pickDate,
          pickup_time: p.pickTime,
          return_date: p.retDate,
          return_time: p.retTime,
          pickup_location: p.locationLabel,
          total_amount: p.total,
          notes: p.extras.map((e) => `${e.name} ($${e.subtotal})`).join(', ') || null,
          extras: p.extras.length > 0 ? p.extras : undefined,
        }),
      })
      if (!res.ok) { setError(await readError(res, 'Something went wrong. Please try again.')); return }
      const result = (await res.json().catch(() => ({}))) as { reservationId?: number }
      trackBookingSubmit({ ...analytics, payment_method: 'request' })
      window.location.href = confirmationUrl(result.reservationId, p.car)
    } catch {
      setError('Network error. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return { submit, submitting, error, clearError: () => setError('') }
}
