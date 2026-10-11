'use server'

import { revalidatePath } from 'next/cache'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'

const STATUSES = ['open', 'resolved', 'not_applicable'] as const
type RecallStatus = (typeof STATUSES)[number]

export async function setRecallStatus(
  recallId: number,
  status: RecallStatus,
): Promise<{ error: string | null }> {
  if (!Number.isInteger(recallId) || !STATUSES.includes(status)) {
    return { error: 'Invalid recall update' }
  }

  const { supabase, tenantId } = await requireTenantId()
  const { data, error } = await supabase
    .from('car_recalls')
    .update({ status, resolved_at: status === 'open' ? null : new Date().toISOString() })
    .eq('id', recallId)
    .eq('tenant_id', tenantId)
    .select('car_id')
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Recall not found' }

  revalidatePath(`/dashboard/fleet/${data.car_id}`)
  revalidatePath('/dashboard/fleet')
  return { error: null }
}
