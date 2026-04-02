/**
 * GET /api/stripe/key
 * Returns the Stripe publishable key for client-side initialization.
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '' },
    { headers: { 'Access-Control-Allow-Origin': '*' } }
  )
}
