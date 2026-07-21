'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'

const PATH = '/dashboard/clients/consignments'

export interface OwnerInput {
  name: string
  email: string | null
  phone: string | null
  default_percentage: number | null
  notes: string | null
}

export interface ConsignmentInput {
  owner_id: string
  car_id: number
  owner_percentage: number
  contract_start: string | null
  contract_end: string | null
  notes: string | null
}

async function tenant(): Promise<string> {
  const { tenantId } = await requireTenantId()
  return tenantId
}

export async function createOwner(data: OwnerInput): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await tenant()
  const { error } = await supabase.from('consignment_owners').insert({ ...data, tenant_id: tenantId })
  revalidatePath(PATH)
  return { error: error?.message ?? null }
}

export async function updateOwner(id: string, data: Partial<OwnerInput>): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await tenant()
  const { error } = await supabase.from('consignment_owners').update(data).eq('id', id).eq('tenant_id', tenantId)
  revalidatePath(PATH)
  return { error: error?.message ?? null }
}

export async function deleteOwner(id: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await tenant()
  const { count, error: countError } = await supabase
    .from('consignments')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', id)
    .eq('tenant_id', tenantId)
  // Fail closed: if we cannot verify the car count, do not risk deleting.
  if (countError) {
    return { error: 'Could not verify this owner has no cars. Please try again.' }
  }
  if ((count ?? 0) > 0) {
    return { error: "Remove or reassign this owner's cars first." }
  }
  const { error } = await supabase.from('consignment_owners').delete().eq('id', id).eq('tenant_id', tenantId)
  revalidatePath(PATH)
  return { error: error?.message ?? null }
}

export async function createConsignment(data: ConsignmentInput): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await tenant()
  const { error } = await supabase.from('consignments').insert({ ...data, tenant_id: tenantId })
  revalidatePath(PATH)
  return { error: error?.message ?? null }
}

export async function updateConsignment(id: string, data: Partial<ConsignmentInput>): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await tenant()
  const { error } = await supabase.from('consignments').update(data).eq('id', id).eq('tenant_id', tenantId)
  revalidatePath(PATH)
  return { error: error?.message ?? null }
}

export async function deleteConsignment(id: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await tenant()
  const { error } = await supabase.from('consignments').delete().eq('id', id).eq('tenant_id', tenantId)
  revalidatePath(PATH)
  return { error: error?.message ?? null }
}
