'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * Connect iCloud — calls the server-side API route which validates
 * IMAP credentials before saving (unlike the old direct-to-DB approach).
 */
export async function connectIcloud(formData: {
  email: string
  appSpecificPassword: string
  tenantId: string
}): Promise<{ success: boolean }> {
  const res = await fetch('/api/integrations/turo/icloud/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: formData.email, password: formData.appSpecificPassword }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to connect iCloud')
  }

  return { success: true }
}

export async function disconnectEmailSync(tenantId: string): Promise<{ success: boolean }> {
  const supabase = createClient()
  const { error } = await supabase.from('turo_email_syncs').delete().eq('tenant_id', tenantId)
  if (error) throw new Error(error.message)
  return { success: true }
}
