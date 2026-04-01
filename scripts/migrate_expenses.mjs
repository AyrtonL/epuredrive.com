import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../.env.local')

// Minimal .env.local parser
function getEnv() {
  const env = {}
  if (!fs.existsSync(envPath)) return env
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) {
      env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '')
    }
  }
  return env
}

const env = getEnv()
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local")
  process.exit(1)
}

const sb = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log("Fetching legacy expenses from consignment_expenses...")
  const { data: legacy, error } = await sb.from('consignment_expenses').select('*')
  if (error) { 
    console.error("Error fetching legacy expenses:", error); 
    return 
  }
  
  if (!legacy || legacy.length === 0) {
    console.log("No legacy expenses found.")
    return
  }
  
  console.log(`Found ${legacy.length} legacy expenses. Checking for existing matches in transactions...`)
  let count = 0;
  let skipped = 0;

  for (const exp of legacy) {
    // Deduplication check: amount, date, and description should match
    // Note: description can be null, so we handle it.
    const { data: matching, error: matchErr } = await sb.from('transactions')
      .select('id')
      .eq('amount', exp.amount)
      .eq('transaction_date', exp.expense_date)
      .eq('description', exp.description || null)
      .eq('tenant_id', exp.tenant_id)

    if (matchErr) {
        console.error("Match error:", matchErr);
        continue;
    }
      
    if (matching && matching.length > 0) {
      skipped++;
      continue
    }
    
    // Legacy categories mapped horizontally
    const category = (exp.category || 'Maintenance').toLowerCase();

    const payload = {
      tenant_id: exp.tenant_id,
      car_id: exp.car_id,
      transaction_date: exp.expense_date,
      amount: exp.amount,
      category: category,
      description: exp.description || null
    }
    
    const { error: insErr } = await sb.from('transactions').insert(payload)
    if (insErr) { 
      console.error(`Failed to insert record: Date=${exp.expense_date}, Amount=${exp.amount}`, insErr); 
    } else { 
      count++; 
    }
  }
  console.log(`Migration Complete!`)
  console.log(`- Total legacy records reviewed: ${legacy.length}`)
  console.log(`- Migrated to transactions: ${count}`)
  console.log(`- Skipped (already exists): ${skipped}`)
}

run().catch(console.error)
