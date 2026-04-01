'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getTenantId(): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: p } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()
  return p!.tenant_id
}

export async function syncCustomersFromReservations(): Promise<{ created: number; error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()

  const [{ data: reservations }, { data: existingCustomers }] = await Promise.all([
    supabase.from('reservations').select('customer_name, customer_email, customer_phone').eq('tenant_id', tenantId),
    supabase.from('customers').select('name, email, phone').eq('tenant_id', tenantId),
  ])

  const localList = [...(existingCustomers ?? [])]
  let created = 0

  for (const r of reservations ?? []) {
    const name = r.customer_name?.trim()
    const email = r.customer_email?.trim()
    const phone = r.customer_phone?.trim()
    if (!name) continue

    let exists = false
    if (email) exists = localList.some(c => c.email?.toLowerCase() === email.toLowerCase())
    if (!exists && phone) exists = localList.some(c => c.phone === phone)
    if (!exists) exists = localList.some(c => c.name?.toLowerCase() === name.toLowerCase())
    if (exists) continue

    const { data: inserted } = await supabase.from('customers').insert({
      name,
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      tenant_id: tenantId,
    }).select().single()

    if (inserted) {
      localList.push(inserted)
      created++
    }
  }

  revalidatePath('/dashboard/clients/customers')
  return { created, error: null }
}

export async function deleteCustomer(id: number): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('customers').delete().eq('id', id)
  revalidatePath('/dashboard/clients/customers')
  return { error: error?.message ?? null }
}
