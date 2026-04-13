import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const pdf = formData.get('pdf') as File | null
    const token = formData.get('token') as string | null

    if (!pdf || !token) {
      return NextResponse.json({ error: 'Missing pdf or token' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify token and get reservation
    const { data: reservation } = await supabase
      .from('reservations')
      .select('id, tenant_id, agreement_signed_at')
      .eq('agreement_token', token)
      .single()

    if (!reservation || !reservation.agreement_signed_at) {
      return NextResponse.json({ error: 'Invalid token or unsigned agreement' }, { status: 403 })
    }

    const buffer = Buffer.from(await pdf.arrayBuffer())
    const fileName = `pdfs/${reservation.tenant_id}/${reservation.id}-${Date.now()}.pdf`

    const { error: uploadError } = await supabase.storage
      .from('agreements')
      .upload(fileName, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('agreements').getPublicUrl(fileName)
    const pdfUrl = urlData.publicUrl

    await supabase
      .from('reservations')
      .update({ agreement_pdf_url: pdfUrl })
      .eq('id', reservation.id)

    return NextResponse.json({ success: true, pdf_url: pdfUrl })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
