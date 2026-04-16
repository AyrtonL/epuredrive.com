import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { qboRequest, qboQuery } from '@/lib/quickbooks/api-client'
import type { Transaction } from '@/lib/supabase/types'

/**
 * POST /api/integrations/quickbooks/sync
 * Syncs un-synced transactions from éPure Drive to QuickBooks Online.
 * Creates Purchase (expense) or SalesReceipt (income) objects in QBO.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
  }

  const tenantId = profile.tenant_id

  // Check QBO connection exists and is enabled
  const { data: conn } = await supabase
    .from('qb_connections')
    .select('realm_id, sync_enabled')
    .eq('tenant_id', tenantId)
    .single()

  if (!conn || !conn.sync_enabled) {
    return NextResponse.json({ error: 'QuickBooks not connected or sync disabled' }, { status: 400 })
  }

  // Fetch un-synced transactions (those without a qb_id marker in description)
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('description', null)
    .not('description', 'like', '%[QBO:%')
    .order('transaction_date', { ascending: true })
    .limit(50)

  // Also get ALL transactions to find the ones not yet synced
  // We mark synced transactions by appending [QBO:<id>] to description
  const { data: allTxns } = await supabase
    .from('transactions')
    .select('id, type, category, amount, description, transaction_date')
    .eq('tenant_id', tenantId)
    .order('transaction_date', { ascending: true })

  const unsynced = (allTxns as Transaction[] ?? []).filter(t => {
    const desc = t.description || ''
    return !desc.includes('[QBO:')
  })

  if (unsynced.length === 0) {
    return NextResponse.json({ synced: 0, message: 'All transactions are already synced.' })
  }

  // Get or create a default income account and expense account in QBO
  let incomeAccountId: string | null = null
  let expenseAccountId: string | null = null
  let bankAccountId: string | null = null

  try {
    // Find existing accounts
    const accountsRes = await qboQuery<{ QueryResponse: { Account: Array<{ Id: string; AccountType: string; Name: string }> } }>(
      tenantId,
      "SELECT * FROM Account WHERE AccountType IN ('Income', 'Expense', 'Bank') MAXRESULTS 100"
    )
    const accounts = accountsRes?.QueryResponse?.Account || []

    incomeAccountId = accounts.find(a => a.AccountType === 'Income')?.Id || null
    expenseAccountId = accounts.find(a => a.AccountType === 'Expense')?.Id || null
    bankAccountId = accounts.find(a => a.AccountType === 'Bank')?.Id || null
  } catch (err) {
    console.error('[qb-sync] Failed to fetch QBO accounts:', err)
    return NextResponse.json({ error: 'Failed to fetch QuickBooks accounts' }, { status: 500 })
  }

  if (!bankAccountId) {
    return NextResponse.json({ error: 'No bank account found in QuickBooks. Please set up a bank account first.' }, { status: 400 })
  }

  let syncedCount = 0
  const errors: string[] = []

  // Sync up to 25 transactions per request to avoid timeouts
  const batch = unsynced.slice(0, 25)

  for (const txn of batch) {
    try {
      const amount = Math.abs(Number(txn.amount) || 0)
      const txnDate = txn.transaction_date || new Date().toISOString().split('T')[0]

      if (txn.type === 'expense') {
        // Create a Purchase in QBO
        await qboRequest(tenantId, 'POST', 'purchase', {
          PaymentType: 'Cash',
          AccountRef: { value: bankAccountId },
          TotalAmt: amount,
          TxnDate: txnDate,
          Line: [{
            Amount: amount,
            DetailType: 'AccountBasedExpenseLineDetail',
            Description: txn.category || 'Expense',
            AccountBasedExpenseLineDetail: {
              AccountRef: { value: expenseAccountId || bankAccountId },
            },
          }],
          PrivateNote: `éPure Drive: ${txn.category || 'Expense'} - ${txn.description || ''}`.trim(),
        })
      } else {
        // Create a SalesReceipt for income
        await qboRequest(tenantId, 'POST', 'salesreceipt', {
          TotalAmt: amount,
          TxnDate: txnDate,
          Line: [{
            Amount: amount,
            DetailType: 'SalesItemLineDetail',
            Description: txn.category || 'Rental Income',
            SalesItemLineDetail: {
              ItemRef: { value: '1', name: 'Services' },
              Qty: 1,
              UnitPrice: amount,
            },
          }],
          PrivateNote: `éPure Drive: ${txn.category || 'Income'} - ${txn.description || ''}`.trim(),
          DepositToAccountRef: { value: bankAccountId },
        })
      }

      // Mark as synced by appending QBO marker to description
      const existingDesc = txn.description || ''
      await supabase
        .from('transactions')
        .update({ description: `${existingDesc} [QBO:synced]`.trim() })
        .eq('id', txn.id)

      syncedCount++
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      errors.push(`Transaction #${txn.id}: ${msg}`)
    }
  }

  // Update last_synced_at on the connection
  const adminClient = (await import('@/lib/supabase/admin')).createAdminClient()
  await adminClient
    .from('qb_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)

  return NextResponse.json({
    synced: syncedCount,
    remaining: unsynced.length - syncedCount,
    errors: errors.length > 0 ? errors : undefined,
  })
}
