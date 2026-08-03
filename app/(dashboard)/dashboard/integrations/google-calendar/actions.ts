'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'

export async function disconnectGoogleCalendar(): Promise<{ error: string | null }> {
  const { tenantId } = await requireTenantId()
  const supabase = createClient()

  const { error } = await supabase
    .from('google_calendar_connections')
    .delete()
    .eq('tenant_id', tenantId)

  revalidatePath('/dashboard/integrations/google-calendar')
  return { error: error?.message ?? null }
}
