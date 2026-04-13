import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type React from 'react'
import FleetBackLink from '@/components/sites/FleetBackLink'
import FleetBrowseLink from '@/components/sites/FleetBrowseLink'

interface Props {
  params: { slug: string }
  searchParams: { id?: string; car?: string }
}

export const metadata: Metadata = {
  title: 'Reservation Confirmed',
  robots: { index: false },
}

export default async function BookingConfirmationPage({ params, searchParams }: Props) {
  const supabase = createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, brand_name, slug, whatsapp_phone')
    .eq('slug', params.slug)
    .single()

  if (!tenant) notFound()

  const tenantName = (tenant.brand_name || tenant.name) as string
  const reservationId = searchParams.id ? Number(searchParams.id) : null
  const carName = searchParams.car ? decodeURIComponent(searchParams.car) : 'your vehicle'

  // Fetch reservation details if we have an ID
  let reservation: {
    id: number
    customer_name: string | null
    pickup_date: string | null
    return_date: string | null
    pickup_time: string | null
    return_time: string | null
    pickup_location: string | null
    total_amount: number | null
    status: string | null
  } | null = null

  if (reservationId) {
    const { data } = await supabase
      .from('reservations')
      .select('id, customer_name, pickup_date, return_date, pickup_time, return_time, pickup_location, total_amount, status')
      .eq('id', reservationId)
      .eq('tenant_id', tenant.id)
      .single()
    reservation = data
  }

  const cleanPhone = tenant.whatsapp_phone?.replace(/\D/g, '') ?? null
  const waMsg = cleanPhone
    ? encodeURIComponent(`Hi! I just submitted a reservation request${reservationId ? ` (Ref #${reservationId})` : ''} for the ${carName}. Can you confirm?`)
    : null

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-lg">
        <div className="mb-10">
          <FleetBackLink slug={params.slug} />
        </div>

        <div className="glass border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Check icon */}
          <div className="w-20 h-20 rounded-[1.5rem] bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-8 mx-auto relative z-10">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div className="text-center mb-8 relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[.4em] text-green-400/60 mb-3">Request Received</p>
            <h1 className="text-3xl font-outfit font-black text-white tracking-tight italic mb-3">
              You&apos;re all set!
            </h1>
            <p className="text-white/40 text-sm leading-relaxed">
              Your reservation request for the{' '}
              <span className="text-white font-bold">{carName}</span> has been submitted to{' '}
              <span className="text-white font-bold">{tenantName}</span>.
              {' '}A confirmation email is on its way.
            </p>
          </div>

          {/* Reservation details */}
          {reservation && (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-6 mb-8 space-y-3 relative z-10">
              <DetailRow label="Ref #" value={`#${reservation.id}`} />
              {reservation.pickup_date && (
                <DetailRow
                  label="Pickup"
                  value={`${reservation.pickup_date}${reservation.pickup_time ? ' · ' + reservation.pickup_time : ''}`}
                />
              )}
              {reservation.return_date && (
                <DetailRow
                  label="Return"
                  value={`${reservation.return_date}${reservation.return_time ? ' · ' + reservation.return_time : ''}`}
                />
              )}
              {reservation.pickup_location && (
                <DetailRow label="Location" value={reservation.pickup_location} />
              )}
              {reservation.total_amount != null && (
                <DetailRow label="Est. Total" value={`$${Number(reservation.total_amount).toLocaleString()}`} />
              )}
              <div className="pt-2 border-t border-white/5">
                <DetailRow
                  label="Status"
                  value={
                    <span className="text-yellow-400 font-black uppercase tracking-widest text-[10px]">
                      {reservation.status ?? 'Pending'}
                    </span>
                  }
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 relative z-10">
            <a
              href={`/sites/${params.slug}/my-booking`}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-white/5 border border-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View My Booking Status
            </a>
            {cleanPhone && waMsg && (
              <a
                href={`https://wa.me/${cleanPhone}?text=${waMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl border border-[#25D366]/20 bg-[#25D366]/5 text-[#25D366] text-[10px] font-black uppercase tracking-widest hover:bg-[#25D366]/10 transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                Follow up on WhatsApp
              </a>
            )}
            <FleetBrowseLink slug={params.slug} />
          </div>

          <p className="text-center text-[9px] font-bold uppercase tracking-[0.3em] text-white/15 mt-8 relative z-10">
            Powered by éPure Drive
          </p>
        </div>
      </div>
    </main>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[10px] font-black uppercase tracking-widest text-white/30 shrink-0">{label}</span>
      <span className="text-[12px] font-semibold text-white text-right">{value}</span>
    </div>
  )
}
