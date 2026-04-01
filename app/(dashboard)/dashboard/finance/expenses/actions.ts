'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Transaction } from '@/lib/supabase/types'

async function getTenantId(): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('tenant_id').eq('id', user!.id).single()
  return profile!.tenant_id
}

export async function createTransaction(
  data: Omit<Transaction, 'id' | 'tenant_id'>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  const { error } = await supabase.from('transactions').insert({ ...data, tenant_id: tenantId })
  revalidatePath('/dashboard/finance/expenses')
  return { error: error?.message ?? null }
}

export async function updateTransaction(
  id: number,
  data: Partial<Omit<Transaction, 'id' | 'tenant_id'>>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('transactions').update(data).eq('id', id)
  revalidatePath('/dashboard/finance/expenses')
  return { error: error?.message ?? null }
}

export async function deleteTransaction(id: number): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  revalidatePath('/dashboard/finance/expenses')
  return { error: error?.message ?? null }
}
