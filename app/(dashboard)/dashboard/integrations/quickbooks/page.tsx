import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import QuickBooksClient from './QuickBooksClient'

export default async function QuickBooksPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const tenantId = profile?.tenant_id
  if (!tenantId) return null

  const { data: connection } = await supabase
    .from('qb_connections')
    .select('realm_id, company_name, connected_at, last_synced_at, sync_enabled')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader title="QuickBooks" description="Connect your QuickBooks Online account to sync income and expenses automatically." />
      <QuickBooksClient connection={connection} tenantId={tenantId} />
    </div>
  )
}
