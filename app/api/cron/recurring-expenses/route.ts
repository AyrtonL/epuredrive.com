/**
 * POST /api/cron/recurring-expenses
 * Daily via Supabase pg_cron (net.http_post). For every tenant with an active
 * recurring expense or a financed car, creates the expense rows that came
 * due (idempotent — see lib/expenses/sync.ts).
 *
 * Protected by Authorization: Bearer {CRON_SECRET}
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayISO } from '@/lib/finance/revenue'
import { syncTenantRecurring } from '@/lib/expenses/sync'

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const today = todayISO()

  const [{ data: rules, error: rulesErr }, { data: loans, error: loansErr }] = await Promise.all([
    supabase.from('recurring_expenses').select('tenant_id').eq('active', true),
    supabase.from('car_financing').select('tenant_id').not('loan_amount', 'is', null),
  ])
  if (rulesErr || loansErr) {
    console.error('[cron/recurring-expenses] load tenants', (rulesErr ?? loansErr)!.message)
    return NextResponse.json({ error: 'Could not load tenants' }, { status: 500 })
  }

  const tenantIds = Array.from(new Set([...(rules ?? []), ...(loans ?? [])].map((r) => r.tenant_id as string)))
  let created = 0
  let failed = 0
  for (const tenantId of tenantIds) {
    try {
      created += await syncTenantRecurring(supabase, tenantId, today)
    } catch (err) {
      failed += 1
      console.error(`[cron/recurring-expenses] tenant ${tenantId}`, err instanceof Error ? err.message : err)
    }
  }

  return NextResponse.json({ tenants: tenantIds.length, created, failed }, { status: failed > 0 ? 500 : 200 })
}
