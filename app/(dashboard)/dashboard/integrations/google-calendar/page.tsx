import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import GoogleCalendarActions from './GoogleCalendarActions'

interface GoogleCalendarConnection {
  google_email: string | null
  active: boolean
  created_at: string
}

interface Props {
  searchParams: { connected?: string; error?: string }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default async function GoogleCalendarPage({ searchParams }: Props) {
  const { supabase, tenantId } = await requireTenantId()

  const { data: connection } = await supabase
    .from('google_calendar_connections')
    .select('google_email, active, created_at')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const conn = connection as GoogleCalendarConnection | null
  const isConnected = !!conn && conn.active

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Google Calendar"
        description="Every confirmed reservation is automatically added to your Google Calendar — pickup location, delivery/return time, and booking details included."
      />

      {searchParams?.error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          Connection failed. Please try again.
        </div>
      )}
      {searchParams?.connected && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
          Google Calendar connected.
        </div>
      )}

      {!isConnected ? (
        <div className="glass border border-white/[0.06] rounded-3xl p-8">
          <div className="flex items-start justify-between gap-6 flex-col md:flex-row">
            <div className="max-w-xl">
              <h3 className="text-white font-bold text-lg mb-2">Google Calendar</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Connect your Google account so confirmed bookings show up automatically as
                calendar events. You&apos;ll be redirected to Google to authorize access.
              </p>
            </div>
            <a
              href="/api/integrations/google-calendar/start"
              className="shrink-0 bg-white text-black hover:bg-white/90 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-white/10"
            >
              Connect Google Calendar
            </a>
          </div>
        </div>
      ) : (
        <div className="glass border border-white/[0.06] rounded-3xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-lg">Google Calendar</h3>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white/70">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Connected
            </span>
          </div>

          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-widest text-white/40">Account</dt>
              <dd className="mt-1 text-white/80">{conn?.google_email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-widest text-white/40">Connected</dt>
              <dd className="mt-1 text-white/80">{formatDate(conn?.created_at ?? null)}</dd>
            </div>
          </dl>

          <GoogleCalendarActions />
        </div>
      )}
    </div>
  )
}
