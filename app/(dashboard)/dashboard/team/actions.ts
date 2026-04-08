'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'

async function getTenantId(): Promise<string> {
  const { tenantId } = await requireTenantId()
  return tenantId
}

export async function updateMemberRole(
  profileId: string,
  role: 'admin' | 'staff' | 'finance'
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('profiles').update({ role }).eq('id', profileId)
  revalidatePath('/dashboard/team')
  return { error: error?.message ?? null }
}

export async function removeMember(profileId: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  // Remove from tenant by nullifying tenant_id
  const { error } = await supabase.from('profiles').update({ tenant_id: null }).eq('id', profileId)
  revalidatePath('/dashboard/team')
  return { error: error?.message ?? null }
}
