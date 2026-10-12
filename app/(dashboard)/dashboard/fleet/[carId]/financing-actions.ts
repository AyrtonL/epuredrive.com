'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { todayISO } from '@/lib/finance/revenue'
import { clearLoanTransactions, syncTenantRecurring } from '@/lib/expenses/sync'

const MAX_MONEY = 10_000_000
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const money = z.number().finite().min(0).max(MAX_MONEY).nullable()
const date = z.string().regex(ISO_DATE).nullable()

const financingSchema = z
  .object({
    purchasePrice: money,
    purchaseDate: date,
    downPayment: money,
    loan: z
      .object({
        amount: z.number().finite().gt(0).max(MAX_MONEY),
        aprPct: z.number().finite().min(0).max(100),
        termMonths: z.number().int().min(1).max(600),
        firstPaymentDate: z.string().regex(ISO_DATE),
      })
      .nullable(),
    currentValue: money,
    currentValueAsOf: date,
  })
  .refine((v) => v.downPayment == null || v.purchasePrice == null || v.downPayment <= v.purchasePrice, {
    message: 'Down payment cannot be more than the purchase price',
  })

export type FinancingInput = z.infer<typeof financingSchema>

export async function saveCarFinancing(carId: number, input: FinancingInput): Promise<{ error: string | null }> {
  if (!Number.isInteger(carId)) return { error: 'Invalid vehicle' }
  const parsed = financingSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid financing details' }
  const v = parsed.data

  const { supabase, tenantId } = await requireTenantId()

  // The car must belong to this tenant — RLS only checks the tenant_id we write.
  const { data: car } = await supabase.from('cars').select('id').eq('id', carId).eq('tenant_id', tenantId).maybeSingle()
  if (!car) return { error: 'Vehicle not found' }

  const { error } = await supabase.from('car_financing').upsert(
    {
      car_id: carId,
      tenant_id: tenantId,
      purchase_price: v.purchasePrice,
      purchase_date: v.purchaseDate,
      down_payment: v.downPayment,
      loan_amount: v.loan?.amount ?? null,
      loan_apr: v.loan?.aprPct ?? null,
      loan_term_months: v.loan?.termMonths ?? null,
      loan_first_payment_date: v.loan?.firstPaymentDate ?? null,
      current_value: v.currentValue,
      current_value_as_of: v.currentValue != null ? v.currentValueAsOf : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'car_id' },
  )
  if (error) {
    console.error('[saveCarFinancing]', error.message)
    return { error: 'Could not save financing details' }
  }

  // Loan installments are generated expenses — rebuild them from the new terms.
  try {
    await clearLoanTransactions(supabase, tenantId, carId)
    await syncTenantRecurring(supabase, tenantId, todayISO())
  } catch (err) {
    console.error('[saveCarFinancing] loan expenses', err instanceof Error ? err.message : err)
    return { error: 'Financing saved, but loan payments could not be added to Expenses. Try saving again.' }
  }

  revalidatePath(`/dashboard/fleet/${carId}`)
  revalidatePath('/dashboard/finance/roi')
  revalidatePath('/dashboard/finance/expenses')
  return { error: null }
}
