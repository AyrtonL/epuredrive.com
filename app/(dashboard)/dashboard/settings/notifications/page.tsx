import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { isFeatureEnabled } from '@/lib/supabase/feature-flags'
import PageHeader from '@/components/dashboard/PageHeader'

interface NotificationChannel {
  label: string
  description: string
  icon: 'email' | 'sms' | 'app'
}

interface NotificationEvent {
  label: string
  description: string
  channels: NotificationChannel['icon'][]
}

const NOTIFICATION_EVENTS: NotificationEvent[] = [
  { label: 'New Booking', description: 'When a new reservation is created.', channels: ['email', 'app'] },
  { label: 'Booking Modified', description: 'When pickup/return dates or details change.', channels: ['email', 'app'] },
  { label: 'Booking Cancelled', description: 'When a reservation is cancelled.', channels: ['email', 'app'] },
  { label: 'Maintenance Due', description: 'When a vehicle service date is approaching or overdue.', channels: ['email', 'app'] },
  { label: 'Payment Received', description: 'When a payment is processed via Stripe.', channels: ['email'] },
  { label: 'Team Invite Accepted', description: 'When a new member joins the team.', channels: ['email', 'app'] },
  { label: 'Turo Sync Complete', description: 'When new Turo bookings are imported.', channels: ['email', 'app'] },
  { label: 'Vehicle Status Change', description: 'When a car moves to maintenance or is retired.', channels: ['email', 'app'] },
]

function ChannelIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'email':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M22 7l-10 6L2 7" />
        </svg>
      )
    case 'sms':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      )
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
      )
  }
}

export default async function NotificationsPage() {
  const { tenantId } = await requireTenantId()

  const smsEnabled = await isFeatureEnabled(tenantId, 'sms_notifications')

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-32">
      <PageHeader title="Notifications" description="Configure alerts and notification preferences for your team." />

      {/* Channels Overview */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { type: 'email', label: 'Email', status: 'Active', statusColor: 'text-emerald-400 bg-emerald-500/10' },
          { type: 'sms', label: 'SMS', status: smsEnabled ? 'Active' : 'Not Enabled', statusColor: smsEnabled ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/30 bg-white/5' },
          { type: 'app', label: 'In-App', status: 'Active', statusColor: 'text-emerald-400 bg-emerald-500/10' },
        ].map((ch) => (
          <div key={ch.type} className="glass border border-white/[0.06] rounded-2xl p-5 text-center">
            <ChannelIcon type={ch.type} className="w-6 h-6 text-white/40 mx-auto mb-3" />
            <div className="text-white font-bold text-sm mb-2">{ch.label}</div>
            <span className={`inline-block px-2.5 py-1 text-[10px] font-bold tracking-widest rounded-full uppercase ${ch.statusColor}`}>
              {ch.status}
            </span>
          </div>
        ))}
      </div>

      {/* Event Configuration */}
      <div className="glass border border-white/10 rounded-3xl p-8">
        <h3 className="text-white font-bold mb-6">Event Notifications</h3>
        <div className="space-y-1">
          {NOTIFICATION_EVENTS.map((event) => (
            <div
              key={event.label}
              className="flex items-center justify-between p-4 rounded-xl hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/[0.04]"
            >
              <div className="flex-1">
                <div className="text-white text-sm font-medium">{event.label}</div>
                <div className="text-white/30 text-xs mt-0.5">{event.description}</div>
              </div>
              <div className="flex items-center gap-3">
                {event.channels.map((ch) => (
                  <label key={ch} className="flex items-center gap-1.5 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="peer sr-only"
                      />
                      <div className="w-8 h-[18px] rounded-full bg-white/10 peer-checked:bg-emerald-500/30 transition-colors" />
                      <div className="absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white/30 peer-checked:bg-emerald-400 peer-checked:translate-x-[14px] transition-all" />
                    </div>
                    <ChannelIcon type={ch} className="w-3.5 h-3.5 text-white/30 group-hover:text-white/50 transition-colors" />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button className="bg-white text-black px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98]">
          Save Preferences
        </button>
      </div>
    </div>
  )
}
