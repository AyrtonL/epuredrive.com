import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { agreementSignedCustomerEmail, agreementSignedOperatorEmail } from '@/lib/email/templates'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'agreement-sign', { windowMs: 60_000, max: 5 })
  if (limited) return limited

  try {
    const { token, signature } = await req.json()

    if (!token || !signature) {
      return NextResponse.json({ error: 'Missing token or signature' }, { status: 400 })
    }

    // Cap signature size at 500KB to prevent abuse
    const MAX_SIGNATURE_BYTES = 500 * 1024
    if (typeof signature !== 'string' || signature.length > MAX_SIGNATURE_BYTES) {
      return NextResponse.json({ error: 'Signature too large' }, { status: 413 })
    }

    const supabase = createAdminClient()

    // Find the reservation by token
    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select('*, tenants(name, brand_name, slug, logo_url, company_address, company_phone, owner_email, owner_phone, whatsapp_phone)')
      .eq('agreement_token', token)
      .single()

    if (fetchError || !reservation) {
      return NextResponse.json({ error: 'Invalid agreement token' }, { status: 404 })
    }

    if (reservation.agreement_signed_at) {
      return NextResponse.json({ error: 'Agreement already signed' }, { status: 409 })
    }

    // Convert base64 signature to buffer for storage
    const base64Data = signature.replace(/^data:image\/png;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // Upload signature image to Supabase Storage
    const signatureFileName = `signatures/${reservation.tenant_id}/${reservation.id}-${Date.now()}.png`
    const { error: uploadError } = await supabase.storage
      .from('agreements')
      .upload(signatureFileName, buffer, {
        contentType: 'image/png',
        upsert: true,
      })

    let signatureUrl: string | null = null
    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('agreements')
        .getPublicUrl(signatureFileName)
      signatureUrl = urlData.publicUrl
    }

    // Get client IP
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'

    // Update reservation with signature info
    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        agreement_signed_at: new Date().toISOString(),
        agreement_signed_ip: ip,
        agreement_signature_url: signatureUrl,
      })
      .eq('id', reservation.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to save signature' }, { status: 500 })
    }

    // Get car info
    const { data: car } = await supabase
      .from('cars')
      .select('make, model, model_full')
      .eq('id', reservation.car_id)
      .maybeSingle()

    const tenant = (reservation as any).tenants as {
      name?: string | null
      brand_name?: string | null
      slug?: string | null
      logo_url?: string | null
      company_address?: string | null
      company_phone?: string | null
      owner_email?: string | null
      owner_phone?: string | null
      whatsapp_phone?: string | null
    } | null
    const tenantName = tenant?.brand_name || tenant?.name || 'Your rental company'
    const brand = {
      name: tenantName,
      logoUrl: tenant?.logo_url ?? null,
      email: tenant?.owner_email ?? null,
      phone: tenant?.company_phone || tenant?.whatsapp_phone || tenant?.owner_phone || null,
      address: tenant?.company_address ?? null,
    }
    const carName = car ? `${car.make} ${car.model_full || car.model}` : 'Vehicle'

    // Send emails (fire and forget — don't block response)
    Promise.resolve().then(async () => {
      try {
        const promises: Promise<unknown>[] = []

        // Email to customer
        if (reservation.customer_email) {
          promises.push(
            sendEmail({
              to: reservation.customer_email,
              fromName: brand.name,
              replyTo: brand.email ?? undefined,
              ...agreementSignedCustomerEmail({
                customerName: reservation.customer_name || 'Renter',
                brand,
                carName,
                pickupDate: reservation.pickup_date || '',
                returnDate: reservation.return_date || '',
              }),
            })
          )
        }

        // Emails to operator profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('tenant_id', reservation.tenant_id)

        if (profiles?.length) {
          for (const profile of profiles) {
            const { data } = await supabase.auth.admin
              .getUserById(profile.id)
              .catch(() => ({ data: null }))
            const email = (data as any)?.user?.email
            if (email) {
              promises.push(
                sendEmail({
                  to: email,
                  ...agreementSignedOperatorEmail({
                    customerName: reservation.customer_name || 'Renter',
                    tenantName,
                    carName,
                    pickupDate: reservation.pickup_date || '',
                    returnDate: reservation.return_date || '',
                    reservationId: reservation.id,
                    bookingCode: reservation.booking_code ?? undefined,
                  }),
                })
              )
            }
          }
        }

        await Promise.allSettled(promises)
      } catch {
        // Non-critical
      }
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
