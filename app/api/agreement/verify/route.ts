// app/api/agreement/verify/route.ts
/**
 * GET /api/agreement/verify?hash=<sha256_hex>
 *
 * Public, read-only tamper-evidence lookup for in-house e-signed rental
 * agreements. Returns minimal metadata to confirm a hash matches a real
 * signed agreement — never returns license numbers, DOB, addresses, or
 * payment data, even though the hash is effectively unguessable.
 *
 * Rate-limited per IP to discourage scraping.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

const HASH_REGEX = /^[a-f0-9]{64}$/

interface ReservationRow {
  id: string
  car_id: number | null
  customer_name: string | null
  agreement_signed_at: string | null
  tenant_signed_at: string | null
  agreement_document_hash: string | null
  tenants: {
    name: string | null
    brand_name: string | null
    slug: string | null
  } | null
}

interface CarRow {
  id: number
  make: string | null
  model: string | null
  model_full: string | null
}

function maskCustomerName(full: string | null): string {
  if (!full) return 'Renter'
  const parts = full.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]!
  const first = parts[0]!
  const lastInitial = parts[parts.length - 1]![0]!
  return `${first} ${lastInitial.toUpperCase()}.`
}

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, 'agreement-verify', {
    windowMs: 60_000,
    max: 20,
  })
  if (limited) return limited

  const hash = request.nextUrl.searchParams.get('hash')?.trim().toLowerCase()
  if (!hash) {
    return NextResponse.json(
      { valid: false, error: 'Missing hash parameter' },
      { status: 400 },
    )
  }
  if (!HASH_REGEX.test(hash)) {
    return NextResponse.json(
      { valid: false, error: 'Invalid hash format — expected 64 hex characters (SHA-256)' },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('reservations')
    .select(
      'id, car_id, customer_name, agreement_signed_at, tenant_signed_at, agreement_document_hash, tenants(name, brand_name, slug)',
    )
    .eq('agreement_document_hash', hash)
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { valid: false, error: 'Lookup failed' },
      { status: 500 },
    )
  }

  if (!data) {
    return NextResponse.json({ valid: false }, { status: 200 })
  }

  const row = data as unknown as ReservationRow

  let carName: string | null = null
  if (row.car_id != null) {
    const { data: car } = await supabase
      .from('cars')
      .select('id, make, model, model_full')
      .eq('id', row.car_id)
      .maybeSingle()
    if (car) {
      const c = car as CarRow
      const label = `${c.make ?? ''} ${c.model_full || c.model || ''}`.trim()
      carName = label || null
    }
  }

  const tenantName =
    row.tenants?.brand_name || row.tenants?.name || 'Unknown operator'

  return NextResponse.json(
    {
      valid: true,
      hash,
      tenant: tenantName,
      vehicle: carName,
      customer: maskCustomerName(row.customer_name),
      signedAt: row.agreement_signed_at,
      countersignedAt: row.tenant_signed_at,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    },
  )
}
