'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getTenantId(): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: p } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()
  return p!.tenant_id
}

export async function updateTenantBranding(data: {
  brand_name?: string | null
  primary_color?: string | null
  accent_color?: string | null
}): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  const { error } = await supabase.from('tenants').update(data).eq('id', tenantId)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')
  return { error: error?.message ?? null }
}

export async function getTenantBranding(): Promise<{
  brand_name: string | null
  primary_color: string | null
  accent_color: string | null
  name: string | null
  plan: string | null
  slug: string | null
} | null> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  const { data } = await supabase.from('tenants')
    .select('name, plan, slug, brand_name, primary_color, accent_color')
    .eq('id', tenantId).single()
  return data ?? null
}
