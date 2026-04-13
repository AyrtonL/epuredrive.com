'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'

export async function saveAgreementSettings(data: {
  company_address: string | null
  company_phone: string | null
  agreement_clauses: string | null
}): Promise<{ error: string | null }> {
  const { tenantId } = await requireTenantId()
  const supabase = createClient()

  const { error } = await supabase
    .from('tenants')
    .update(data)
    .eq('id', tenantId)

  revalidatePath('/dashboard/settings/agreement')
  return { error: error?.message ?? null }
}

export async function uploadAgreementTemplate(
  formData: FormData
): Promise<{ url: string | null; error: string | null }> {
  const { tenantId } = await requireTenantId()
  const supabase = createClient()

  // Check plan
  const { data: tenant } = await supabase
    .from('tenants')
    .select('plan')
    .eq('id', tenantId)
    .single()

  if (!['max', 'enterprise'].includes(tenant?.plan ?? '')) {
    return { url: null, error: 'Custom templates require the Max plan' }
  }

  const file = formData.get('file') as File | null
  if (!file) return { url: null, error: 'No file provided' }
  if (file.size > 512_000) return { url: null, error: 'File must be under 500KB' }
  if (!file.name.match(/\.(html|htm)$/i)) return { url: null, error: 'Only .html files are allowed' }

  const buffer = Buffer.from(await file.arrayBuffer())
  const fileName = `templates/${tenantId}/agreement-template.html`

  const { error: uploadError } = await supabase.storage
    .from('agreements')
    .upload(fileName, buffer, {
      contentType: 'text/html',
      upsert: true,
    })

  if (uploadError) return { url: null, error: uploadError.message }

  const { data: urlData } = supabase.storage.from('agreements').getPublicUrl(fileName)

  await supabase
    .from('tenants')
    .update({ agreement_template_url: urlData.publicUrl })
    .eq('id', tenantId)

  revalidatePath('/dashboard/settings/agreement')
  return { url: urlData.publicUrl, error: null }
}
