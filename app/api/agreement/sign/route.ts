import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { agreementSignedCustomerEmail, agreementSignedOperatorEmail } from '@/lib/email/templates'
import { rateLimit } from '@/lib/rate-limit'

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

/**
 * Canonical hash of the signed agreement. Stored as tamper-evidence: any
 * change to reservation fields after signing produces a different hash.
 * Order of keys is fixed (alphabetical) to make the digest deterministic.
 */
function computeAgreementHash(input: {
  reservationId: string
  tenantId: string | null
  customerName: string | null
  customerEmail: string | null
  customerDob: string | null
  licenseNumber: string | null
  pickupDate: string | null
  returnDate: string | null
  pickupLocation: string | null
  totalAmount: number | string | null
  securityDeposit: number | string | null
  carId: number | null
  agreementClauses: string | null
  signatureUrl: string | null
  signedAt: string
  signedIp: string
}): string {
  const canonical = {
    agreement_clauses_hash: input.agreementClauses
      ? sha256Hex(input.agreementClauses)
      : null,
    car_id: input.carId,
    customer_dob: input.customerDob,
    customer_email: input.customerEmail,
    customer_name: input.customerName,
    license_number: input.licenseNumber,
    pickup_date: input.pickupDate,
    pickup_location: input.pickupLocation,
    reservation_id: input.reservationId,
    return_date: input.returnDate,
    security_deposit:
      input.securityDeposit != null ? Number(input.securityDeposit) : null,
    signature_url: input.signatureUrl,
    signed_at: input.signedAt,
    signed_ip: input.signedIp,
    tenant_id: input.tenantId,
    total_amount: input.totalAmount != null ? Number(input.totalAmount) : null,
  }
  return sha256Hex(JSON.stringify(canonical))
}

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
      .select('*, tenants(name, brand_name, slug, logo_url, company_address, company_phone, owner_email, owner_phone, whatsapp_phone, agreement_clauses)')
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

    const signedAt = new Date().toISOString()

    // Compute tamper-evidence hash of the canonical agreement payload.
    const tenantClauses = (reservation as { tenants?: { agreement_clauses?: string | null } | null })?.tenants?.agreement_clauses ?? null
    const documentHash = computeAgreementHash({
      reservationId: reservation.id,
      tenantId: reservation.tenant_id,
      customerName: reservation.customer_name,
      customerEmail: reservation.customer_email,
      customerDob: reservation.customer_dob ?? null,
      licenseNumber: reservation.license_number ?? null,
      pickupDate: reservation.pickup_date,
      returnDate: reservation.return_date,
      pickupLocation: reservation.pickup_location ?? null,
      totalAmount: reservation.total_amount,
      securityDeposit: reservation.security_deposit ?? null,
      carId: reservation.car_id,
      agreementClauses: tenantClauses,
      signatureUrl,
      signedAt,
      signedIp: ip,
    })

    // Update reservation with signature info
    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        agreement_signed_at: signedAt,
        agreement_signed_ip: ip,
        agreement_signature_url: signatureUrl,
        agreement_document_hash: documentHash,
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
