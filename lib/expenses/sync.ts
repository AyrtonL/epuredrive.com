// lib/expenses/sync.ts
//
// Turns recurring rules and loan schedules into real `transactions` rows.
// Idempotent: rows are upserted on (tenant_id, source_key) with
// ignoreDuplicates, so the on-save sync and the daily cron can both run.

import type { SupabaseClient } from '@supabase/supabase-js'
import { carDisplayName } from '@/lib/utils/car-display-name'
import {
  loanTransactions,
  recurringTransactions,
  type GeneratedTransaction,
  type RecurringFrequency,
  type RecurringRule,
} from './recurring'

const UPSERT_CHUNK = 500

interface RuleRow {
  id: string
  tenant_id: string
  car_id: number | null
  category: string
  description: string | null
  amount: number | string
  frequency: RecurringFrequency
  start_date: string
  end_date: string | null
  active: boolean
}

interface FinancingRow {
  car_id: number
  loan_amount: number | string | null
  loan_apr: number | string | null
  loan_term_months: number | null
  loan_first_payment_date: string | null
}

export function toRule(r: RuleRow): RecurringRule {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    carId: r.car_id,
    category: r.category,
    description: r.description,
    amount: Number(r.amount),
    frequency: r.frequency,
    startDate: r.start_date,
    endDate: r.end_date,
    active: r.active,
  }
}

/** Create every due occurrence up to `today` that doesn't exist yet. Returns rows inserted. */
export async function syncTenantRecurring(supabase: SupabaseClient, tenantId: string, today: string): Promise<number> {
  const [{ data: rules, error: rulesErr }, { data: financing, error: finErr }, { data: cars, error: carsErr }] = await Promise.all([
    supabase.from('recurring_expenses').select('*').eq('tenant_id', tenantId).eq('active', true),
    supabase
      .from('car_financing')
      .select('car_id, loan_amount, loan_apr, loan_term_months, loan_first_payment_date')
      .eq('tenant_id', tenantId)
      .not('loan_amount', 'is', null),
    supabase.from('cars').select('id, make, model, model_full').eq('tenant_id', tenantId),
  ])
  if (rulesErr || finErr || carsErr) {
    throw new Error(`load recurring sources: ${(rulesErr ?? finErr ?? carsErr)!.message}`)
  }

  const carNames = new Map(((cars ?? []) as { id: number; make: string; model: string; model_full: string | null }[]).map((c) => [c.id, carDisplayName(c)]))

  const rows: GeneratedTransaction[] = [
    ...((rules ?? []) as RuleRow[]).flatMap((r) => recurringTransactions(toRule(r), today)),
    ...((financing ?? []) as FinancingRow[]).flatMap((f) =>
      loanTransactions(
        tenantId,
        f.car_id,
        carNames.get(f.car_id) ?? `Car #${f.car_id}`,
        {
          amount: Number(f.loan_amount),
          aprPct: Number(f.loan_apr),
          termMonths: Number(f.loan_term_months),
          firstPaymentDate: f.loan_first_payment_date!,
        },
        today,
      ),
    ),
  ]

  let inserted = 0
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const { data, error } = await supabase
      .from('transactions')
      .upsert(rows.slice(i, i + UPSERT_CHUNK), { onConflict: 'tenant_id,source_key', ignoreDuplicates: true })
      .select('id')
    if (error) throw new Error(`insert recurring transactions: ${error.message}`)
    inserted += data?.length ?? 0
  }
  return inserted
}

/** Drop the generated rows of one rule (before regenerating after an edit, or on delete). */
export async function clearRuleTransactions(supabase: SupabaseClient, tenantId: string, ruleId: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('tenant_id', tenantId)
    .like('source_key', `rec:${ruleId}:%`)
  if (error) throw new Error(`clear rule transactions: ${error.message}`)
}

/** Drop a car's generated loan rows (loan terms changed or were removed). */
export async function clearLoanTransactions(supabase: SupabaseClient, tenantId: string, carId: number): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('tenant_id', tenantId)
    .like('source_key', `loan:${carId}:%`)
  if (error) throw new Error(`clear loan transactions: ${error.message}`)
}
