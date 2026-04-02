/**
 * GET /api/superadmin/stats
 * Returns all tenants with aggregated metrics for the super admin panel.
 * Caller must provide a valid Supabase JWT + is_super_admin = true.
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const CORS = { 'Access-Control-Allow-Origin': '*' }
const TRIAL_DAYS = 14

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401, headers: CORS })
  }

  const supabase = createAdminClient()

  // Verify JWT and get user id
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: CORS })
  }

  // Check is_super_admin
  const { data: profiles } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', userData.user.id)
    .limit(1)

  if (!profiles?.[0]?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden — super admin only' }, { status: 403, headers: CORS })
  }

  // Fetch all data in parallel
  const [
    { data: tenants },
    { data: cars },
    { data: reservations },
    { data: allProfiles },
  ] = await Promise.all([
    supabase.from('tenants').select('*').order('created_at', { ascending: false }),
    supabase.from('cars').select('id, tenant_id'),
    supabase.from('reservations').select('tenant_id, total_amount, pickup_date, status, created_at'),
    supabase.from('profiles').select('id, tenant_id, full_name, role, created_at').order('created_at', { ascending: false }),
  ])

  // Aggregate cars per tenant
  const carsByTenant: Record<string, number> = {}
  for (const c of cars ?? []) {
    if (c.tenant_id) carsByTenant[c.tenant_id] = (carsByTenant[c.tenant_id] || 0) + 1
  }

  // Aggregate reservation stats per tenant
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = today.slice(0, 7) + '-01'
  const stats: Record<string, { bookings: number; totalRevenue: number; monthlyRevenue: number; lastBooking: string | null }> = {}

  for (const r of reservations ?? []) {
    if (!r.tenant_id || r.status === 'cancelled') continue
    if (!stats[r.tenant_id]) {
      stats[r.tenant_id] = { bookings: 0, totalRevenue: 0, monthlyRevenue: 0, lastBooking: null }
    }
    stats[r.tenant_id].bookings++
    stats[r.tenant_id].totalRevenue += parseFloat(r.total_amount) || 0
    if (r.pickup_date >= monthStart) stats[r.tenant_id].monthlyRevenue += parseFloat(r.total_amount) || 0
    if (!stats[r.tenant_id].lastBooking || r.created_at > stats[r.tenant_id].lastBooking!) {
      stats[r.tenant_id].lastBooking = r.created_at
    }
  }

  // Get first admin per tenant for owner info
  const ownerByTenant: Record<string, { name: string | null }> = {}
  for (const p of allProfiles ?? []) {
    if (p.tenant_id && p.role === 'admin' && !ownerByTenant[p.tenant_id]) {
      ownerByTenant[p.tenant_id] = { name: p.full_name }
    }
  }

  // Enrich tenants
  const enriched = (tenants ?? []).map(t => {
    const trialMs = t.trial_started_at ? Date.now() - new Date(t.trial_started_at).getTime() : 0
    const trialDaysLeft =
      t.plan === 'trial' ? Math.max(0, TRIAL_DAYS - Math.floor(trialMs / 86400000)) : null
    return {
      ...t,
      cars: carsByTenant[t.id] || 0,
      bookings: stats[t.id]?.bookings || 0,
      totalRevenue: stats[t.id]?.totalRevenue || 0,
      monthlyRevenue: stats[t.id]?.monthlyRevenue || 0,
      lastBooking: stats[t.id]?.lastBooking || null,
      trialDaysLeft,
      ownerName: ownerByTenant[t.id]?.name || t.owner_name || null,
    }
  })

  return NextResponse.json({ tenants: enriched }, { headers: CORS })
}
