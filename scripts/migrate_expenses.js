import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config({ path: path.resolve(fileURLToPath(import.meta.url), '../../.env.local') })
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase credentials")

const sb = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log("Fetching legacy expenses...")
  const { data: legacy, error } = await sb.from('consignment_expenses').select('*')
  if (error) { console.error("Error fetching", error); return }
  
  if (!legacy || legacy.length === 0) {
    console.log("No legacy expenses found.")
    return
  }
  
  console.log(`Found ${legacy.length} legacy expenses. Migrating to transactions...`)
  let count = 0;
  for (const exp of legacy) {
    // Check if it already exists in transactions by fuzzy matching amount and date and car_id
    const { data: matching } = await sb.from('transactions')
      .select('id')
      .eq('amount', exp.amount)
      .eq('transaction_date', exp.expense_date)
      .eq('car_id', exp.car_id || null)
      
    if (matching && matching.length > 0) {
      console.log(`Skipping duplicate amount ${exp.amount} on ${exp.expense_date}`)
      continue
    }
    
    const payload = {
      tenant_id: exp.tenant_id,
      car_id: exp.car_id,
      transaction_date: exp.expense_date,
      amount: exp.amount,
      category: exp.category,
      description: exp.description || null
    }
    const { error: insErr } = await sb.from('transactions').insert(payload)
    if (insErr) { console.error("Failed to insert", insErr); }
    else { count++; }
  }
  console.log(`Done! Migrated ${count} new records.`)
}
run()
