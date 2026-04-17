import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import NotificationSettings from './NotificationSettings'

export default async function NotificationsPage() {
  await requireTenantId()

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-32">
      <PageHeader title="Notifications" description="Configure alerts and notification preferences for your team." />
      <NotificationSettings />
    </div>
  )
}
