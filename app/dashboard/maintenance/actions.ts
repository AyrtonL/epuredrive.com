'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CarService } from '@/lib/supabase/types'

async function getTenantId(): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('tenant_id').eq('id', user!.id).single()
  return profile!.tenant_id
}

export async function createService(
  data: Omit<CarService, 'id' | 'tenant_id'>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  const { error } = await supabase.from('car_services').insert({ ...data, tenant_id: tenantId })
  revalidatePath('/dashboard/maintenance')
  return { error: error?.message ?? null }
}

export async function deleteService(id: number): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('car_services').delete().eq('id', id)
  revalidatePath('/dashboard/maintenance')
  return { error: error?.message ?? null }
}
