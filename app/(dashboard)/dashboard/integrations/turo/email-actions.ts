'use client'

import { createClient } from '@/lib/supabase/client'
import { revalidatePath } from 'next/cache'

export async function connectIcloud(formData: { email: string; appSpecificPassword: string; tenantId: string }) {
  const supabase = createClient()
  
  // 1. Basic validation (IMAP check could be done via a dedicated API if needed, 
  // but for now we trust the credentials and let the poller fail/deactivate if wrong)
  
  const { error } = await supabase.from('turo_email_syncs').upsert({
    tenant_id: formData.tenantId,
    gmail_address: formData.email,
    app_specific_password: formData.appSpecificPassword,
    active: true,
    provider: 'icloud',
    last_checked: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  }, { onConflict: 'tenant_id' })

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function disconnectEmailSync(tenantId: string) {
  const supabase = createClient()
  const { error } = await supabase.from('turo_email_syncs').delete().eq('tenant_id', tenantId)
  if (error) throw new Error(error.message)
  return { success: true }
}
