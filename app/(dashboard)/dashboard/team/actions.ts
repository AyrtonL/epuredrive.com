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
  const tenantId = await getTenantId()
  const { error } = await supabase.from('profiles').update({ role }).eq('id', profileId).eq('tenant_id', tenantId)
  revalidatePath('/dashboard/team')
  return { error: error?.message ?? null }
}

export async function removeMember(profileId: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  // Remove from tenant by nullifying tenant_id — only if the profile belongs to caller's tenant
  const { error } = await supabase.from('profiles').update({ tenant_id: null }).eq('id', profileId).eq('tenant_id', tenantId)
  revalidatePath('/dashboard/team')
  return { error: error?.message ?? null }
}
