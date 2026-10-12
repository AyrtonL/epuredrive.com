'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { todayISO } from '@/lib/finance/revenue'
import { LOAN_CATEGORIES } from '@/lib/expenses/recurring'
import { clearRuleTransactions, syncTenantRecurring } from '@/lib/expenses/sync'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const ruleSchema = z
  .object({
    carId: z.number().int().nullable(),
    category: z.string().trim().min(1).max(40).refine((c) => !LOAN_CATEGORIES.has(c), {
      message: 'Loan payments are added automatically from each car’s financing',
    }),
    description: z.string().trim().max(200).nullable(),
    amount: z.number().finite().gt(0).max(1_000_000),
    frequency: z.enum(['monthly', 'quarterly', 'yearly']),
    startDate: z.string().regex(ISO_DATE),
    endDate: z.string().regex(ISO_DATE).nullable(),
  })
  .refine((v) => v.endDate == null || v.endDate >= v.startDate, { message: 'End date must be after the start date' })

export type RecurringRuleInput = z.infer<typeof ruleSchema>

function revalidateFinance() {
  for (const p of ['/dashboard/finance/expenses', '/dashboard/finance/taxes', '/dashboard/finance/reports', '/dashboard/finance/roi', '/dashboard/clients/consignments']) {
    revalidatePath(p)
  }
}

async function carBelongsToTenant(
  supabase: Awaited<ReturnType<typeof requireTenantId>>['supabase'],
  tenantId: string,
  carId: number | null,
): Promise<boolean> {
  if (carId == null) return true
  const { data } = await supabase.from('cars').select('id').eq('id', carId).eq('tenant_id', tenantId).maybeSingle()
  return !!data
}

export async function saveRecurringExpense(
  id: string | null,
  input: RecurringRuleInput,
): Promise<{ error: string | null; created?: number }> {
  const parsed = ruleSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid recurring expense' }
  const v = parsed.data

  const { supabase, tenantId } = await requireTenantId()
  if (!(await carBelongsToTenant(supabase, tenantId, v.carId))) return { error: 'Vehicle not found' }

  const row = {
    tenant_id: tenantId,
    car_id: v.carId,
    category: v.category,
    description: v.description || null,
    amount: v.amount,
    frequency: v.frequency,
    start_date: v.startDate,
    end_date: v.endDate,
    updated_at: new Date().toISOString(),
  }

  let ruleId = id
  if (id) {
    const { data, error } = await supabase.from('recurring_expenses').update(row).eq('id', id).eq('tenant_id', tenantId).select('id').maybeSingle()
    if (error || !data) return { error: 'Could not update recurring expense' }
  } else {
    const { data, error } = await supabase.from('recurring_expenses').insert(row).select('id').single()
    if (error || !data) {
      console.error('[saveRecurringExpense]', error?.message)
      return { error: 'Could not create recurring expense' }
    }
    ruleId = data.id
  }

  try {
    // An edit can change amount/dates — rebuild this rule's generated rows.
    if (id) await clearRuleTransactions(supabase, tenantId, id)
    const created = await syncTenantRecurring(supabase, tenantId, todayISO())
    revalidateFinance()
    return { error: null, created }
  } catch (err) {
    console.error('[saveRecurringExpense] sync', ruleId, err instanceof Error ? err.message : err)
    return { error: 'Saved, but past expenses could not be generated. Try saving again.' }
  }
}

/** Stop a rule. `removePast` also deletes the expenses it already generated. */
export async function deleteRecurringExpense(id: string, removePast: boolean): Promise<{ error: string | null }> {
  const { supabase, tenantId } = await requireTenantId()
  try {
    if (removePast) await clearRuleTransactions(supabase, tenantId, id)
  } catch (err) {
    console.error('[deleteRecurringExpense]', err instanceof Error ? err.message : err)
    return { error: 'Could not remove past expenses' }
  }
  const { error } = await supabase.from('recurring_expenses').delete().eq('id', id).eq('tenant_id', tenantId)
  if (error) return { error: 'Could not delete recurring expense' }
  revalidateFinance()
  return { error: null }
}
