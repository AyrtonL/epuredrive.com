import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { isFeatureEnabled } from '@/lib/supabase/feature-flags'
import PageHeader from '@/components/dashboard/PageHeader'
import FeedManager from './FeedManager'

export default async function TuroSyncPage() {
  const { supabase, tenantId } = await requireTenantId()

  const turoEnabled = await isFeatureEnabled(tenantId, 'turo_sync')

  if (!turoEnabled) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader title="Turo" description="Connect your email to automatically sync Turo bookings, modifications, and cancellations." />
        <div className="glass border border-white/[0.06] rounded-3xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <h3 className="text-white font-bold text-lg mb-2">Turo Sync Not Enabled</h3>
          <p className="text-white/40 text-sm max-w-md mx-auto">This feature is not enabled for your organization. Contact your administrator to enable Turo integration.</p>
        </div>
      </div>
    )
  }

  const { data: syncs } = await supabase.from('turo_email_syncs').select('*').eq('tenant_id', tenantId).single()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader title="Turo" description="Connect your email to automatically sync Turo bookings, modifications, and cancellations." />
      <FeedManager sync={syncs} tenantId={tenantId} />
    </div>
  )
}
