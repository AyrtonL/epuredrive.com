'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import type { Consignment } from '@/lib/supabase/types'

async function getTenantId(): Promise<string> {
  const { tenantId } = await requireTenantId()
  return tenantId
}

export async function createConsignment(data: Omit<Consignment, 'id' | 'tenant_id'>): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  const { error } = await supabase.from('consignments').insert({ ...data, tenant_id: tenantId })
  revalidatePath('/dashboard/clients/consignments')
  return { error: error?.message ?? null }
}

export async function updateConsignment(id: number, data: Partial<Omit<Consignment, 'id' | 'tenant_id'>>): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('consignments').update(data).eq('id', id)
  revalidatePath('/dashboard/clients/consignments')
  return { error: error?.message ?? null }
}

export async function deleteConsignment(id: number): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('consignments').delete().eq('id', id)
  revalidatePath('/dashboard/clients/consignments')
  return { error: error?.message ?? null }
}
