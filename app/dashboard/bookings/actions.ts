// app/dashboard/bookings/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Reservation } from '@/lib/supabase/types'

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

export async function createReservation(
  data: Omit<Reservation, 'id' | 'tenant_id' | 'created_at'>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  const { error } = await supabase
    .from('reservations')
    .insert({ ...data, tenant_id: tenantId })
  revalidatePath('/dashboard/bookings')
  return { error: error?.message ?? null }
}

export async function updateReservation(
  id: number,
  data: Partial<Omit<Reservation, 'id' | 'tenant_id'>>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('reservations')
    .update(data)
    .eq('id', id)
  revalidatePath('/dashboard/bookings')
  return { error: error?.message ?? null }
}

export async function deleteReservation(id: number): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', id)
  revalidatePath('/dashboard/bookings')
  return { error: error?.message ?? null }
}
