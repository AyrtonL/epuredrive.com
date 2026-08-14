import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { isValidRating } from '@/lib/feedback/validate-rating'

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'reviews-submit', { windowMs: 60_000, max: 5 })
  if (limited) return limited

  try {
    const { token, rating, comment } = await req.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }
    if (!isValidRating(rating)) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: reservation } = await supabase
      .from('reservations')
      .select('id, tenant_id, car_id')
      .eq('review_token', token)
      .maybeSingle()

    if (!reservation) {
      return NextResponse.json({ error: 'This link is no longer valid.' }, { status: 404 })
    }

    const trimmedComment = typeof comment === 'string' ? comment.trim() : ''

    const { error } = await supabase.from('reservation_reviews').insert({
      reservation_id: reservation.id,
      tenant_id: reservation.tenant_id,
      car_id: reservation.car_id,
      rating,
      comment: trimmedComment.length > 0 ? trimmedComment : null,
    })

    if (error) {
      if ((error as { code?: string }).code === '23505') {
        return NextResponse.json({ error: "You've already left a review." }, { status: 409 })
      }
      return NextResponse.json({ error: 'Could not save your review.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
