'use server'

// Server actions backing the Telematics notification opt-in checkbox on the
// notifications settings page. Kept separate from the generic
// /api/notifications/preferences route because telematics prefs live in
// their own RLS-gated table (tenant_notification_prefs) so we can extend
// them later without bending the notification_preferences schema.

import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getTelematicsPrefs(): Promise<{ warningEmail: boolean }> {
  const { tenantId } = await requireTenantId()
  const supabase = createClient()
  const { data } = await supabase
    .from('tenant_notification_prefs')
    .select('telematics_warning_email')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  return { warningEmail: Boolean(data?.telematics_warning_email) }
}

export async function setTelematicsWarningEmail(
  warningEmail: boolean,
): Promise<{ error: string | null }> {
  const { tenantId } = await requireTenantId()
  const supabase = createClient()
  const { error } = await supabase
    .from('tenant_notification_prefs')
    .upsert(
      {
        tenant_id: tenantId,
        telematics_warning_email: warningEmail,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id' },
    )
  if (error) return { error: 'Could not update preference.' }
  revalidatePath('/dashboard/settings/notifications')
  return { error: null }
}
