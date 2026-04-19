'use server'

import { revalidatePath } from 'next/cache'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'

export async function createExtra(data: {
  name: string
  description?: string
  pricing_type: string
  price: number
}): Promise<{ error: string | null }> {
  const { supabase, tenantId } = await requireTenantId()

  const name = data.name?.trim()
  if (!name || name.length > 100) {
    return { error: 'Name is required (max 100 characters).' }
  }
  if (data.description && data.description.length > 500) {
    return { error: 'Description must be under 500 characters.' }
  }
  if (!['per_day', 'flat'].includes(data.pricing_type)) {
    return { error: 'Invalid pricing type.' }
  }
  if (typeof data.price !== 'number' || data.price <= 0) {
    return { error: 'Price must be greater than 0.' }
  }

  const { error } = await supabase.from('rental_extras').insert({
    tenant_id: tenantId,
    name,
    description: data.description?.trim() || null,
    pricing_type: data.pricing_type,
    price: data.price,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings/extras')
  return { error: null }
}

export async function updateExtra(
  id: string,
  data: {
    name?: string
    description?: string | null
    pricing_type?: string
    price?: number
    is_active?: boolean
    sort_order?: number
  }
): Promise<{ error: string | null }> {
  const { supabase, tenantId } = await requireTenantId()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (data.name !== undefined) {
    const name = data.name.trim()
    if (!name || name.length > 100) return { error: 'Name is required (max 100 characters).' }
    updates.name = name
  }
  if (data.description !== undefined) {
    if (data.description && data.description.length > 500) {
      return { error: 'Description must be under 500 characters.' }
    }
    updates.description = data.description?.trim() || null
  }
  if (data.pricing_type !== undefined) {
    if (!['per_day', 'flat'].includes(data.pricing_type)) return { error: 'Invalid pricing type.' }
    updates.pricing_type = data.pricing_type
  }
  if (data.price !== undefined) {
    if (typeof data.price !== 'number' || data.price <= 0) return { error: 'Price must be greater than 0.' }
    updates.price = data.price
  }
  if (data.is_active !== undefined) updates.is_active = data.is_active
  if (data.sort_order !== undefined) updates.sort_order = data.sort_order

  const { error } = await supabase
    .from('rental_extras')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings/extras')
  return { error: null }
}

export async function deleteExtra(id: string): Promise<{ error: string | null }> {
  const { supabase, tenantId } = await requireTenantId()

  const { error } = await supabase
    .from('rental_extras')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings/extras')
  return { error: null }
}
