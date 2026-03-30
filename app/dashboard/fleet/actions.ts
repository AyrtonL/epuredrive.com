'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Car } from '@/lib/supabase/types'

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
