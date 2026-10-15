'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'

const rateSchema = z.number().finite().gt(0).max(100_000)

/** Set a vehicle's list daily rate (used by the public site and checkout). */
export async function applySuggestedRate(carId: number, rate: number): Promise<{ error: string | null }> {
  if (!Number.isInteger(carId)) return { error: 'Invalid vehicle' }
  const parsed = rateSchema.safeParse(rate)
  if (!parsed.success) return { error: 'Invalid daily rate' }

  const { supabase, tenantId } = await requireTenantId()
  const { data, error } = await supabase
    .from('cars')
    .update({ daily_rate: parsed.data })
    .eq('id', carId)
    .eq('tenant_id', tenantId)
    .select('id')

  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: 'Vehicle not found' }

  revalidatePath('/dashboard/finance/pricing')
  revalidatePath('/dashboard/fleet')
  revalidatePath(`/dashboard/fleet/${carId}`)
  return { error: null }
}
