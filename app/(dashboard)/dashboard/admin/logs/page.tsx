import { requireSuperuser } from '@/lib/supabase/admin-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import LogsViewer from './LogsViewer'

export default async function SystemLogsPage() {
  const { supabase } = await requireSuperuser()

  const [{ data: logs }, { data: tenants }] = await Promise.all([
    supabase
      .from('audit_logs')
      .select('id, timestamp, level, actor, message, tenant_id, user_id, metadata')
      .order('timestamp', { ascending: false })
      .limit(100),
    supabase.from('tenants').select('id, name, brand_name'),
  ])

  const tenantMap: Record<string, string> = {}
  for (const t of tenants ?? []) {
    tenantMap[t.id] = t.brand_name || t.name
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-32">
      <PageHeader title="System Logs" description="Audit trail and system events across the platform." />
      <LogsViewer logs={logs ?? []} tenantMap={tenantMap} />
    </div>
  )
}
