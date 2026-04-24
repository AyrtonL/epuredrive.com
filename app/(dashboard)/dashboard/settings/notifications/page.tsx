import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { isFeatureEnabled } from '@/lib/supabase/feature-flags'
import PageHeader from '@/components/dashboard/PageHeader'
import NotificationSettings from './NotificationSettings'
import TelematicsPrefs from './TelematicsPrefs'

export default async function NotificationsPage() {
  const { tenantId } = await requireTenantId()
  const telematicsEnabled = await isFeatureEnabled(tenantId, 'bouncie_telematics')

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-32">
      <PageHeader title="Notifications" description="Configure alerts and notification preferences for your team." />
      <NotificationSettings />
      {telematicsEnabled && <TelematicsPrefs />}
    </div>
  )
}
