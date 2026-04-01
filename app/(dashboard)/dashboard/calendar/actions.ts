'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getTenantId(): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('tenant_id').eq('id', user!.id).single()
  return profile!.tenant_id
}

export async function createBlockedDate(data: {
  car_id: number | null
  start_date: string
  end_date: string
  reason?: string
}): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  const { error } = await supabase.from('blocked_dates').insert({ ...data, tenant_id: tenantId })
  revalidatePath('/dashboard/calendar')
  return { error: error?.message ?? null }
}

export async function createBlockedDateForAllCars(data: {
  start_date: string
  end_date: string
  reason?: string
}): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  const { data: cars } = await supabase.from('cars').select('id').eq('tenant_id', tenantId)
  if (!cars?.length) return { error: 'No cars found' }
  const rows = cars.map(c => ({ car_id: c.id, ...data, tenant_id: tenantId }))
  const { error } = await supabase.from('blocked_dates').insert(rows)
  revalidatePath('/dashboard/calendar')
  return { error: error?.message ?? null }
}

export async function deleteBlockedDate(id: number): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('blocked_dates').delete().eq('id', id)
  revalidatePath('/dashboard/calendar')
  return { error: error?.message ?? null }
}
