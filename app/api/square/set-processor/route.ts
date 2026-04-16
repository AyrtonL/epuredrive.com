import { NextRequest, NextResponse } from 'next/server'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { tenantId } = await requireTenantId()
  const { processor } = await request.json()

  if (!['stripe', 'square'].includes(processor)) {
    return NextResponse.json({ error: 'Invalid processor' }, { status: 400 })
  }

  await supabase.from('tenants').update({ payment_processor: processor }).eq('id', tenantId)
  return NextResponse.json({ success: true })
}
