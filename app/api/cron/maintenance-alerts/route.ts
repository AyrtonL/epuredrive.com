// app/api/cron/maintenance-alerts/route.ts
/**
 * POST /api/cron/maintenance-alerts
 * Sends maintenance due alerts to operators.
 * Call daily via Netlify scheduled functions or external cron.
 * Requires: Authorization: Bearer <CRON_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { maintenanceDueEmail } from '@/lib/email/templates/rentals'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const today = new Date()
  const alertWindowDays = 7
  const alertDate = new Date(today)
  alertDate.setDate(today.getDate() + alertWindowDays)
  const alertDateStr = alertDate.toISOString().split('T')[0]

  // Find all car_services with next_service_date <= alertDate
  const { data: services, error } = await supabase
    .from('car_services')
    .select('id, car_id, service_type, next_service_date, tenant_id')
    .not('next_service_date', 'is', null)
    .lte('next_service_date', alertDateStr)

  if (error) {
    console.error('[cron/maintenance-alerts]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!services?.length) {
    return NextResponse.json({ sent: 0 })
  }

  // Group by tenant_id
  const byTenant = new Map<string, typeof services>()
  for (const s of services) {
    if (!s.tenant_id) continue
    const existing = byTenant.get(s.tenant_id) ?? []
    byTenant.set(s.tenant_id, [...existing, s])
  }

  let sent = 0

  for (const [tenantId, tenantServices] of Array.from(byTenant.entries())) {
    // Get car names
    const carIds = Array.from(new Set(tenantServices.map((s: { car_id: unknown }) => s.car_id).filter(Boolean)))
    const { data: cars } = await supabase
      .from('cars')
      .select('id, make, model, model_full')
      .in('id', carIds as number[])

    const carMap = new Map(
      (cars ?? []).map(c => [c.id, `${c.make} ${c.model_full || c.model}`])
    )

    // Get tenant name
    const { data: tenant } = await supabase
      .from('tenants')
      .select('brand_name, name')
      .eq('id', tenantId)
      .single()

    const tenantName = tenant?.brand_name || tenant?.name || 'Your Fleet'

    // Get operator emails
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('tenant_id', tenantId)

    if (!profiles?.length) continue

    const emailResults = await Promise.allSettled(
      profiles.map(p => supabase.auth.admin.getUserById(p.id))
    )
    const emails: string[] = []
    for (const r of emailResults) {
      if (r.status === 'fulfilled' && r.value.data?.user?.email) {
        emails.push(r.value.data.user.email)
      }
    }

    if (!emails.length) continue

    type ServiceRow = { id: unknown; car_id: number | null; service_type: string | null; next_service_date: string | null; tenant_id: string | null }
    const todayStr = today.toISOString().split('T')[0]
    const vehicles = tenantServices.map((s: ServiceRow) => ({
      name: carMap.get(s.car_id ?? -1) ?? `Vehicle #${s.car_id}`,
      serviceType: s.service_type ?? 'Service',
      dueDate: s.next_service_date ?? '',
      isOverdue: (s.next_service_date ?? '') < todayStr,
    }))

    await Promise.allSettled(
      emails.map(email =>
        sendEmail({
          to: email,
          ...maintenanceDueEmail({ tenantName, vehicles }),
        })
      )
    )
    sent += emails.length
  }

  return NextResponse.json({ sent, tenantsAlerted: byTenant.size })
}
