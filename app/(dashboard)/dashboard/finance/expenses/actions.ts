'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import type { Transaction } from '@/lib/supabase/types'

async function getTenantId(): Promise<string> {
  const { tenantId } = await requireTenantId()
  return tenantId
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
  id: string,
  data: Partial<Omit<Transaction, 'id' | 'tenant_id'>>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  const { error } = await supabase.from('transactions').update(data).eq('id', id).eq('tenant_id', tenantId)
  revalidatePath('/dashboard/finance/expenses')
  return { error: error?.message ?? null }
}

export async function deleteTransaction(id: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()

  // Generated rows would be recreated by the next sync — point to the source instead.
  const { data: row } = await supabase.from('transactions').select('source_key').eq('id', id).eq('tenant_id', tenantId).maybeSingle()
  if (row?.source_key?.startsWith('loan:')) {
    return { error: 'This loan payment comes from the car’s financing. Edit the loan on the vehicle page instead.' }
  }
  if (row?.source_key?.startsWith('rec:')) {
    return { error: 'This was created by a recurring expense. Edit or stop it under Expenses → Recurring.' }
  }

  const { error } = await supabase.from('transactions').delete().eq('id', id).eq('tenant_id', tenantId)
  revalidatePath('/dashboard/finance/expenses')
  return { error: error?.message ?? null }
}

export async function bulkCreateTransactions(
  data: Omit<Transaction, 'id' | 'tenant_id'>[]
): Promise<{ count: number; error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  
  const payload = data.map(item => ({ ...item, tenant_id: tenantId }))
  const { data: inserted, error } = await supabase.from('transactions').insert(payload).select('id')
  
  revalidatePath('/dashboard/finance/expenses')
  return { count: inserted?.length || 0, error: error?.message ?? null }
}

