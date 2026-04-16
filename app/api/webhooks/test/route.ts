import { NextRequest, NextResponse } from 'next/server'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatch'

export async function POST(request: NextRequest) {
  const { tenantId } = await requireTenantId()

  await dispatchWebhookEvent(tenantId, 'test.ping', {
    message: 'This is a test webhook event from ePure Drive',
    timestamp: new Date().toISOString(),
  })

  return NextResponse.json({ success: true })
}
