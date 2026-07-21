'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { sendEmail } from '@/lib/email/resend'
import { planLimitWarningEmail } from '@/lib/email/templates/platform'
import type { Car } from '@/lib/supabase/types'

async function getTenantId(): Promise<string> {
  const { tenantId } = await requireTenantId()
  return tenantId
}

const PLAN_VEHICLE_LIMITS: Record<string, number> = {
  free: 5,
  pro: 25,
  max: 60,
  enterprise: Infinity,
}

export async function createCar(
  data: Omit<Car, 'id' | 'tenant_id'>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()

  // Enforce vehicle limit based on plan
  const [{ data: tenant }, { count }] = await Promise.all([
    supabase.from('tenants').select('plan').eq('id', tenantId).single(),
    supabase.from('cars').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
  ])

  const plan = tenant?.plan || 'free'
  const limit = PLAN_VEHICLE_LIMITS[plan] ?? PLAN_VEHICLE_LIMITS.free
  const currentCount = count ?? 0

  if (currentCount >= limit) {
    return { error: `Your ${plan} plan allows up to ${limit} vehicles. Upgrade your plan to add more.` }
  }

  const { error } = await supabase
    .from('cars')
    .insert({ ...data, tenant_id: tenantId })

  if (!error && plan !== 'enterprise' && Number.isFinite(limit)) {
    const newCount = currentCount + 1
    const crossedThreshold = newCount >= Math.ceil(limit * 0.8)
    if (crossedThreshold) {
      notifyPlanLimit({ tenantId, plan, currentCount: newCount, limit }).catch(() => {})
    }
  }

  revalidatePath('/dashboard/fleet')
  return { error: error?.message ?? null }
}

async function notifyPlanLimit(params: {
  tenantId: string
  plan: string
  currentCount: number
  limit: number
}): Promise<void> {
  const admin = createAdminClient()

  const { data: tenant } = await admin
    .from('tenants')
    .select('brand_name, name, plan_limit_warning_last_count')
    .eq('id', params.tenantId)
    .single()

  const lastNotified = (tenant as { plan_limit_warning_last_count?: number } | null)
    ?.plan_limit_warning_last_count ?? 0
  if (params.currentCount <= lastNotified) return

  const operatorName = tenant?.brand_name || tenant?.name || ''

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, role')
    .eq('tenant_id', params.tenantId)
    .in('role', ['owner', 'admin'])

  if (!profiles?.length) return

  const emailResults = await Promise.allSettled(
    profiles.map(p => admin.auth.admin.getUserById(p.id))
  )
  const recipients: string[] = []
  for (const r of emailResults) {
    if (r.status === 'fulfilled' && r.value.data?.user?.email) {
      recipients.push(r.value.data.user.email)
    }
  }
  if (!recipients.length) return

  await Promise.allSettled(
    recipients.map(to =>
      sendEmail({
        to,
        ...planLimitWarningEmail({
          operatorName,
          plan: params.plan,
          currentCount: params.currentCount,
          limit: params.limit,
        }),
      })
    )
  )

  await admin
    .from('tenants')
    .update({ plan_limit_warning_last_count: params.currentCount })
    .eq('id', params.tenantId)
}

export async function updateCar(
  id: number,
  data: Partial<Omit<Car, 'id' | 'tenant_id'>>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  const { error } = await supabase.from('cars').update(data).eq('id', id).eq('tenant_id', tenantId)
  revalidatePath('/dashboard/fleet')
  revalidatePath(`/dashboard/fleet/${id}`)
  return { error: error?.message ?? null }
}

/**
 * Retire a car. This is a SOFT delete — it sets status to 'retired' and keeps
 * all reservations, revenue, and service history intact. Previously this
 * hard-deleted reservations/turo_feeds/blocked_dates, permanently destroying
 * the data needed for lifetime P&L and financial reports.
 */
export async function deleteCar(id: number): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()

  const { data: car } = await supabase
    .from('cars')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!car) {
    return { error: 'Car not found or access denied' }
  }

  const { error } = await supabase
    .from('cars')
    .update({ status: 'retired' })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  revalidatePath('/dashboard/fleet')
  revalidatePath(`/dashboard/fleet/${id}`)
  return { error: error?.message ?? null }
}
