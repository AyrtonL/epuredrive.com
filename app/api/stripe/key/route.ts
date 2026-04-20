/**
 * GET /api/stripe/key
 * Returns the Stripe publishable key for client-side initialization.
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, 'stripe-key', { windowMs: 60_000, max: 20 })
  if (limited) return limited
  return NextResponse.json(
    { publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '' },
    { headers: {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://epuredrive.com',
      'Cache-Control': 'public, max-age=3600',
    } }
  )
}
