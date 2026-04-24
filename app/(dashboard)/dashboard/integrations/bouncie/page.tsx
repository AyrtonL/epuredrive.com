import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { isFeatureEnabled } from '@/lib/supabase/feature-flags'
import PageHeader from '@/components/dashboard/PageHeader'
import BouncieActions from './BouncieActions'
import type { TelematicsConnection } from '@/lib/supabase/types'

// Keep the set of renderable ?error= values tightly allowlisted so we never
// reflect arbitrary strings from the URL (audit finding #12).
const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: 'Connection failed. Please try again.',
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'Never'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'Never'
  const diff = Math.max(0, Date.now() - then)
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hr${h === 1 ? '' : 's'} ago`
  const d = Math.floor(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

interface Props {
  searchParams: { error?: string }
}

export default async function BounciePage({ searchParams }: Props) {
  const { supabase, tenantId } = await requireTenantId()
  const enabled = await isFeatureEnabled(tenantId, 'bouncie_telematics')

  const errorKey = searchParams?.error
  const errorMessage = errorKey && errorKey in ERROR_MESSAGES ? ERROR_MESSAGES[errorKey] : null

  if (!enabled) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="Bouncie"
          description="Telematics for automatic mileage, live fleet map, geofences, and diagnostic alerts."
        />
        <div className="glass border border-white/[0.06] rounded-3xl p-12 text-center">
          <h3 className="text-white font-bold text-lg mb-2">Bouncie Telematics Not Enabled</h3>
          <p className="text-white/40 text-sm max-w-md mx-auto">
            This feature is not enabled for your organization. Upgrade your plan to unlock live
            tracking, auto mileage, and diagnostic alerts.
          </p>
        </div>
      </div>
    )
  }

  const { data: connectionRow } = await supabase
    .from('telematics_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('provider', 'bouncie')
    .maybeSingle()

  const connection = connectionRow as TelematicsConnection | null

  // Device counts (two tiny HEAD queries — no row payload transferred).
  const [{ count: totalDevices }, { count: linkedDevices }] = await Promise.all([
    supabase
      .from('telematics_devices')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    supabase
      .from('telematics_devices')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('car_id', 'is', null),
  ])

  const isConnected = !!connection && connection.status !== 'disconnected'
  const isExpired = connection?.status === 'expired'
  const isError = connection?.status === 'error'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Bouncie"
        description="Telematics for automatic mileage, live fleet map, geofences, and diagnostic alerts."
      />

      {errorMessage && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          {errorMessage}
        </div>
      )}

      {isExpired && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 flex items-center justify-between gap-4">
          <div className="text-sm text-amber-200">
            Your Bouncie connection expired. Re-authenticate to resume syncing.
          </div>
          <a
            href="/api/telematics/oauth/start"
            className="shrink-0 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 text-xs font-bold px-4 py-2 transition-colors"
          >
            Re-authenticate
          </a>
        </div>
      )}

      {isError && connection?.error_message && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          Last sync error: {connection.error_message}
        </div>
      )}

      {!isConnected ? (
        <NotConnectedCard />
      ) : (
        <ConnectedCard
          connection={connection!}
          totalDevices={totalDevices ?? 0}
          linkedDevices={linkedDevices ?? 0}
          formatRelative={formatRelative}
          formatDate={formatDate}
        />
      )}
    </div>
  )
}

function NotConnectedCard() {
  return (
    <div className="glass border border-white/[0.06] rounded-3xl p-8">
      <div className="flex items-start justify-between gap-6 flex-col md:flex-row">
        <div className="max-w-xl">
          <h3 className="text-white font-bold text-lg mb-2">Bouncie</h3>
          <p className="text-white/60 text-sm leading-relaxed">
            Connect your Bouncie account to enable auto mileage, live fleet map, geofences, and
            diagnostic alerts. You&apos;ll be redirected to Bouncie to authorize access.
          </p>
        </div>
        <a
          href="/api/telematics/oauth/start"
          className="shrink-0 bg-white text-black hover:bg-white/90 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-white/10"
        >
          Connect Bouncie
        </a>
      </div>
    </div>
  )
}

function ConnectedCard({
  connection,
  totalDevices,
  linkedDevices,
  formatRelative,
  formatDate,
}: {
  connection: TelematicsConnection
  totalDevices: number
  linkedDevices: number
  formatRelative: (iso: string | null) => string
  formatDate: (iso: string | null) => string
}) {
  const statusColor = {
    active: 'bg-emerald-400',
    expired: 'bg-amber-400',
    error: 'bg-red-400',
    disconnected: 'bg-white/30',
  }[connection.status]

  return (
    <div className="glass border border-white/[0.06] rounded-3xl p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold text-lg">Bouncie</h3>
        <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white/70">
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
          {connection.status}
        </span>
      </div>

      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
        <InfoRow label="Account" value={connection.account_email ?? '—'} />
        <InfoRow label="Connected" value={formatDate(connection.connected_at)} />
        <InfoRow label="Last sync" value={formatRelative(connection.last_sync_at)} />
        <InfoRow
          label="Devices"
          value={
            totalDevices === 0
              ? 'None yet'
              : `${totalDevices} total · ${linkedDevices} linked to cars`
          }
        />
      </dl>

      <BouncieActions />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-widest text-white/40">{label}</dt>
      <dd className="mt-1 text-white/80">{value}</dd>
    </div>
  )
}
