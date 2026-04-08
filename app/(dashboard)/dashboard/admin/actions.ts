'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ── Auth guard ─────────────────────────────────────────────────────────────────

async function requireSuperuserAction() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'superuser') throw new Error('Forbidden: superuser only')

  return { supabase, userId: user.id }
}

// ── Audit log helper ───────────────────────────────────────────────────────────

async function log(
  supabase: ReturnType<typeof createClient>,
  level: 'info' | 'warning' | 'error',
  actor: string,
  message: string,
  tenantId?: string | null,
  userId?: string | null,
  metadata?: Record<string, unknown>
) {
  await supabase.from('audit_logs').insert({
    level,
    actor,
    message,
    tenant_id: tenantId ?? null,
    user_id: userId ?? null,
    metadata: metadata ?? null,
  })
}

// ── Tenant Actions ─────────────────────────────────────────────────────────────

export async function createTenant(data: {
  name: string
  slug: string
  plan?: string
}): Promise<{ error: string | null }> {
  const { supabase, userId } = await requireSuperuserAction()

  const slug = data.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
  if (!data.name.trim() || !slug) {
    return { error: 'Name and slug are required.' }
  }

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    return { error: `Slug "${slug}" is already taken.` }
  }

  const { error } = await supabase.from('tenants').insert({
    name: data.name.trim(),
    slug,
    plan: data.plan || 'free',
  })

  if (error) return { error: error.message }

  await log(supabase, 'info', 'admin', `Tenant created: ${data.name} (${slug})`, null, userId)
  revalidatePath('/dashboard/admin/tenants')
  revalidatePath('/dashboard/admin/stats')
  return { error: null }
}

export async function updateTenantPlan(
  tenantId: string,
  plan: string
): Promise<{ error: string | null }> {
  const { supabase, userId } = await requireSuperuserAction()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, plan')
    .eq('id', tenantId)
    .single()

  const { error } = await supabase
    .from('tenants')
    .update({ plan })
    .eq('id', tenantId)

  if (error) return { error: error.message }

  await log(
    supabase, 'info', 'admin',
    `Plan changed: ${tenant?.plan ?? 'free'} → ${plan} for "${tenant?.name}"`,
    tenantId, userId
  )
  revalidatePath('/dashboard/admin/tenants')
  revalidatePath('/dashboard/admin/plans')
  revalidatePath('/dashboard/admin/stats')
  return { error: null }
}

export async function deleteTenant(
  tenantId: string
): Promise<{ error: string | null }> {
  const { supabase, userId } = await requireSuperuserAction()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', tenantId)
    .single()

  // Unlink profiles first (don't delete users, just orphan them)
  await supabase
    .from('profiles')
    .update({ tenant_id: null })
    .eq('tenant_id', tenantId)

  const { error } = await supabase
    .from('tenants')
    .delete()
    .eq('id', tenantId)

  if (error) return { error: error.message }

  await log(supabase, 'warning', 'admin', `Tenant deleted: "${tenant?.name}"`, null, userId)
  revalidatePath('/dashboard/admin/tenants')
  revalidatePath('/dashboard/admin/stats')
  return { error: null }
}

// ── User Actions ───────────────────────────────────────────────────────────────

export async function updateUserRole(
  profileId: string,
  role: string
): Promise<{ error: string | null }> {
  const { supabase, userId } = await requireSuperuserAction()

  const validRoles = ['superuser', 'admin', 'manager', 'staff', 'finance', 'owner']
  if (!validRoles.includes(role)) {
    return { error: `Invalid role: ${role}` }
  }

  const { data: target } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', profileId)
    .single()

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', profileId)

  if (error) return { error: error.message }

  await log(
    supabase, 'info', 'admin',
    `Role changed: ${target?.role ?? 'none'} → ${role} for "${target?.full_name ?? profileId}"`,
    null, userId
  )
  revalidatePath('/dashboard/admin/users')
  return { error: null }
}

export async function assignUserTenant(
  profileId: string,
  tenantId: string | null
): Promise<{ error: string | null }> {
  const { supabase, userId } = await requireSuperuserAction()

  const { error } = await supabase
    .from('profiles')
    .update({ tenant_id: tenantId })
    .eq('id', profileId)

  if (error) return { error: error.message }

  await log(
    supabase, 'info', 'admin',
    `User ${profileId} ${tenantId ? `assigned to tenant ${tenantId}` : 'unassigned from tenant'}`,
    tenantId, userId
  )
  revalidatePath('/dashboard/admin/users')
  revalidatePath('/dashboard/admin/tenants')
  return { error: null }
}

// ── Feature Flag Actions ───────────────────────────────────────────────────────

export async function toggleFeatureFlag(
  key: string,
  enabled: boolean
): Promise<{ error: string | null }> {
  const { supabase, userId } = await requireSuperuserAction()

  const { error } = await supabase
    .from('feature_flags')
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq('key', key)

  if (error) return { error: error.message }

  await log(
    supabase, 'info', 'admin',
    `Feature flag "${key}" ${enabled ? 'enabled' : 'disabled'}`,
    null, userId
  )
  revalidatePath('/dashboard/admin/flags')
  return { error: null }
}
