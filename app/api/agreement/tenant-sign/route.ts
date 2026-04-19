import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { agreementClosedOutCustomerEmail } from '@/lib/email/templates'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tenant_id from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, full_name')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
    }

    const { reservationId, signature } = await req.json()

    if (!reservationId || !signature) {
      return NextResponse.json({ error: 'Missing reservationId or signature' }, { status: 400 })
    }

    const MAX_SIGNATURE_BYTES = 500 * 1024
    if (typeof signature !== 'string' || signature.length > MAX_SIGNATURE_BYTES) {
      return NextResponse.json({ error: 'Signature too large' }, { status: 413 })
    }

    const admin = createAdminClient()

    // Fetch the reservation — must belong to this tenant
    const { data: reservation, error: fetchError } = await admin
      .from('reservations')
      .select('*, tenants(name, brand_name, slug, logo_url, company_address, company_phone, owner_email, owner_phone, whatsapp_phone)')
      .eq('id', reservationId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (fetchError || !reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    if (!reservation.agreement_signed_at) {
      return NextResponse.json({ error: 'Customer has not signed the agreement yet' }, { status: 400 })
    }

    if (reservation.tenant_signed_at) {
      return NextResponse.json({ error: 'Agreement already closed out' }, { status: 409 })
    }

    // Upload tenant signature image
    const base64Data = signature.replace(/^data:image\/png;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    const signatureFileName = `signatures/${profile.tenant_id}/${reservationId}-tenant-${Date.now()}.png`
    const { error: uploadError } = await admin.storage
      .from('agreements')
      .upload(signatureFileName, buffer, {
        contentType: 'image/png',
        upsert: true,
      })

    let signatureUrl: string | null = null
    if (!uploadError) {
      const { data: urlData } = admin.storage
        .from('agreements')
        .getPublicUrl(signatureFileName)
      signatureUrl = urlData.publicUrl
    }

    // Update reservation with tenant signature
    const { error: updateError } = await admin
      .from('reservations')
      .update({
        tenant_signed_at: new Date().toISOString(),
        tenant_signature_url: signatureUrl,
        tenant_signed_by: profile.full_name || user.email || user.id,
      })
      .eq('id', reservationId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to save tenant signature' }, { status: 500 })
    }

    // Send updated agreement email to customer (fire and forget)
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

    if (reservation.customer_email) {
      const { data: car } = await admin
        .from('cars')
        .select('make, model, model_full')
        .eq('id', reservation.car_id)
        .maybeSingle()

      const carName = car ? `${car.make} ${car.model_full || car.model}` : 'Vehicle'

      Promise.resolve().then(async () => {
        try {
          await sendEmail({
            to: reservation.customer_email!,
            fromName: brand.name,
            replyTo: brand.email ?? undefined,
            ...agreementClosedOutCustomerEmail({
              customerName: reservation.customer_name || 'Renter',
              brand,
              carName,
              totalAmount: reservation.total_amount,
              signedBy: profile.full_name || 'the rental operator',
            }),
          })
        } catch {
          // Non-critical
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
