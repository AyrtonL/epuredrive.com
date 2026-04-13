'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import type { Car } from '@/lib/supabase/types'

async function getTenantId(): Promise<string> {
  const { tenantId } = await requireTenantId()
  return tenantId
}

const PLAN_VEHICLE_LIMITS: Record<string, number> = {
  free: 5,
  pro: 20,
  max: 50,
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
  revalidatePath('/dashboard/fleet')
  return { error: error?.message ?? null }
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

export async function deleteCar(id: number): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  const { error } = await supabase.from('cars').delete().eq('id', id).eq('tenant_id', tenantId)
  revalidatePath('/dashboard/fleet')
  return { error: error?.message ?? null }
}
