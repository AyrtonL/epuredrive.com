import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { isFeatureEnabled } from '@/lib/supabase/feature-flags'
import PageHeader from '@/components/dashboard/PageHeader'
import QuickBooksClient from './QuickBooksClient'

interface QBConnection {
  realm_id: string
  company_name: string | null
  connected_at: string
  last_synced_at: string | null
  sync_enabled: boolean
}

export default async function QuickBooksPage() {
  const { supabase, tenantId } = await requireTenantId()

  const qbEnabled = await isFeatureEnabled(tenantId, 'quickbooks_sync')

  if (!qbEnabled) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader title="QuickBooks" description="Connect your QuickBooks Online account to sync income and expenses automatically." />
        <div className="glass border border-white/[0.06] rounded-3xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <h3 className="text-white font-bold text-lg mb-2">QuickBooks Sync Not Enabled</h3>
          <p className="text-white/40 text-sm max-w-md mx-auto">This feature is not enabled for your organization. Contact your administrator to enable QuickBooks integration.</p>
        </div>
      </div>
    )
  }

  const { data: connection } = await supabase
    .from('qb_connections')
    .select('realm_id, company_name, connected_at, last_synced_at, sync_enabled')
    .eq('tenant_id', tenantId)
    .single()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader title="QuickBooks" description="Connect your QuickBooks Online account to sync income and expenses automatically." />
      <QuickBooksClient
        connection={connection as QBConnection | null}
        tenantId={tenantId}
      />
    </div>
  )
}
