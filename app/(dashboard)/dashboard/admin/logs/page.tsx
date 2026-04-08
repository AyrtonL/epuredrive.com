import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'

async function requireSuperuser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'superuser') redirect('/dashboard')
  return supabase
}

export default async function SystemLogsPage() {
  await requireSuperuser()

  // Placeholder log entries demonstrating the UI
  const demoLogs = [
    { timestamp: '2026-04-08 09:12:33', level: 'info', actor: 'system', message: 'Platform deployment completed successfully', tenant: null },
    { timestamp: '2026-04-08 08:45:12', level: 'warning', actor: 'cron', message: 'Turo sync skipped for tenant: missing email credentials', tenant: 'ePure Miami' },
    { timestamp: '2026-04-08 07:30:00', level: 'info', actor: 'system', message: 'Daily maintenance check completed — 3 overdue services flagged', tenant: null },
    { timestamp: '2026-04-07 22:15:44', level: 'error', actor: 'stripe', message: 'Webhook signature verification failed (stale timestamp)', tenant: 'ePure Miami' },
    { timestamp: '2026-04-07 18:00:01', level: 'info', actor: 'auth', message: 'New user registered and assigned to tenant', tenant: 'ePure LA' },
    { timestamp: '2026-04-07 14:33:21', level: 'info', actor: 'billing', message: 'Plan upgrade: free → pro', tenant: 'ePure Miami' },
  ]

  const LEVEL_STYLES: Record<string, string> = {
    info: 'text-blue-400 bg-blue-500/10',
    warning: 'text-amber-400 bg-amber-500/10',
    error: 'text-red-400 bg-red-500/10',
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-32">
      <PageHeader title="System Logs" description="Audit trail and system events across the platform." />

      {/* Filters */}
      <div className="flex items-center gap-3">
        {['All', 'Info', 'Warning', 'Error'].map((level) => (
          <button
            key={level}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              level === 'All'
                ? 'bg-white/10 text-white border border-white/10'
                : 'bg-white/[0.03] text-white/30 border border-white/[0.04] hover:text-white/60 hover:bg-white/[0.06]'
            }`}
          >
            {level}
          </button>
        ))}
      </div>

      {/* Log Entries */}
      <div className="glass border border-white/10 rounded-3xl overflow-hidden">
        <div className="divide-y divide-white/5">
          {demoLogs.map((log, i) => (
            <div key={i} className="flex items-start gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
              <div className="shrink-0 mt-0.5">
                <span className={`inline-block w-[52px] text-center px-2 py-1 text-[9px] font-bold tracking-wider rounded uppercase ${LEVEL_STYLES[log.level] ?? LEVEL_STYLES.info}`}>
                  {log.level}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm">{log.message}</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-white/20 text-[10px] font-mono">{log.timestamp}</span>
                  <span className="text-white/20 text-[10px]">via <span className="text-white/30 font-medium">{log.actor}</span></span>
                  {log.tenant && (
                    <span className="text-white/20 text-[10px]">tenant: <span className="text-white/40 font-medium">{log.tenant}</span></span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info about persistence */}
      <div className="glass border border-amber-500/10 rounded-3xl p-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-400/60 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <div>
            <h4 className="text-amber-400/80 font-bold text-sm mb-1">Log Persistence</h4>
            <p className="text-amber-400/40 text-xs leading-relaxed">
              These are demo entries. To enable real logs, create an <code className="text-amber-400/60">audit_logs</code> table with columns: <code className="text-amber-400/60">timestamp</code>, <code className="text-amber-400/60">level</code>, <code className="text-amber-400/60">actor</code>, <code className="text-amber-400/60">message</code>, <code className="text-amber-400/60">tenant_id</code>. Emit events from server actions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
