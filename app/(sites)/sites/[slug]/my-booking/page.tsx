import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import BookingLookup from './BookingLookup'
import FleetBackLink from '@/components/sites/FleetBackLink'

interface Props {
  params: { slug: string }
}

export const metadata: Metadata = {
  title: 'My Booking',
  robots: { index: false },
}

export default async function MyBookingPage({ params }: Props) {
  const supabase = createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, brand_name, slug')
    .eq('slug', params.slug)
    .single()

  if (!tenant) notFound()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-lg">
        <div className="mb-10">
          <FleetBackLink slug={params.slug} />
        </div>

        <div className="glass border border-white/10 rounded-[2.5rem] p-10 shadow-2xl">
          <div className="mb-8">
            <p className="text-[10px] font-black uppercase tracking-[.4em] text-primary/60 mb-3">Booking Lookup</p>
            <h1 className="text-3xl font-outfit font-black text-white tracking-tight italic">
              Check Your Reservation
            </h1>
            <p className="text-white/40 text-sm mt-3 leading-relaxed">
              Enter your reservation reference number and the email address you used to book.
            </p>
          </div>

          <BookingLookup tenantId={tenant.id} slug={params.slug} />
        </div>
      </div>
    </main>
  )
}
