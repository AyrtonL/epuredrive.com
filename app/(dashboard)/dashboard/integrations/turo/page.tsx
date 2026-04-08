import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import FeedManager from './FeedManager'

export default async function TuroSyncPage() {
  const { supabase, tenantId } = await requireTenantId()

  const { data: syncs } = await supabase.from('turo_email_syncs').select('*').eq('tenant_id', tenantId).single()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader title="Turo" description="Connect your email to automatically sync Turo bookings, modifications, and cancellations." />
      <FeedManager sync={syncs} tenantId={tenantId} />
    </div>
  )
}
