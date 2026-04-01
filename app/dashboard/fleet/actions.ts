'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Car } from '@/lib/supabase/types'

async function getTenantId(): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()
  return profile!.tenant_id
}

export async function createCar(
  data: Omit<Car, 'id' | 'tenant_id'>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()
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
  const { error } = await supabase.from('cars').update(data).eq('id', id)
  revalidatePath('/dashboard/fleet')
  revalidatePath(`/dashboard/fleet/${id}`)
  return { error: error?.message ?? null }
}

export async function deleteCar(id: number): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('cars').delete().eq('id', id)
  revalidatePath('/dashboard/fleet')
  return { error: error?.message ?? null }
}
