'use client'

import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/components/ui/Toast'

interface EventConfig {
  key: string
  label: string
  description: string
}

const NOTIFICATION_EVENTS: EventConfig[] = [
  { key: 'new_booking', label: 'New Booking', description: 'When a new reservation is created.' },
  { key: 'booking_modified', label: 'Booking Modified', description: 'When pickup/return dates or details change.' },
  { key: 'booking_cancelled', label: 'Booking Cancelled', description: 'When a reservation is cancelled.' },
  { key: 'maintenance_due', label: 'Maintenance Due', description: 'When a vehicle service date is approaching or overdue.' },
  { key: 'payment_received', label: 'Payment Received', description: 'When a payment is processed via Stripe.' },
  { key: 'team_invite_accepted', label: 'Team Invite Accepted', description: 'When a new member joins the team.' },
  { key: 'turo_sync_complete', label: 'Turo Sync Complete', description: 'When new Turo bookings are imported.' },
  { key: 'vehicle_status_change', label: 'Vehicle Status Change', description: 'When a car moves to maintenance or is retired.' },
]

type Prefs = Record<string, { email_enabled: boolean; app_enabled: boolean }>

function ChannelIcon({ type, className }: { type: string; className?: string }) {
  if (type === 'email') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M22 7l-10 6L2 7" />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}

export default function NotificationSettings() {
  const toast = useToast()
  const [prefs, setPrefs] = useState<Prefs>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/notifications/preferences')
      .then(r => r.json())
      .then(data => setPrefs(data.preferences ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggle = useCallback((event: string, channel: 'email_enabled' | 'app_enabled') => {
    setPrefs(prev => ({
      ...prev,
      [event]: {
        ...prev[event],
        [channel]: !prev[event]?.[channel],
      },
    }))
    setSaved(false)
  }, [])

  const save = useCallback(async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: prefs }),
      })
      if (res.ok) {
        setSaved(true)
        toast.success('Notification preferences saved.')
      } else {
        toast.error('Could not save notification preferences. Please try again.')
      }
    } catch {
      toast.error('Could not save notification preferences. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }, [prefs, toast])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      {/* Channels Overview */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { type: 'email', label: 'Email', status: 'Active', statusColor: 'text-emerald-400 bg-emerald-500/10' },
          { type: 'app', label: 'In-App', status: 'Beta', statusColor: 'text-blue-400 bg-blue-500/10' },
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
        <h3 className="text-white font-bold mb-2">Event Notifications</h3>
        <p className="text-white/30 text-xs mb-6">Toggle which channels receive alerts for each event.</p>
        <div className="space-y-1">
          {NOTIFICATION_EVENTS.map((event) => {
            const pref = prefs[event.key] ?? { email_enabled: true, app_enabled: false }
            return (
              <div
                key={event.key}
                className="flex items-center justify-between p-4 rounded-xl hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/[0.04]"
              >
                <div className="flex-1">
                  <div className="text-white text-sm font-medium">{event.label}</div>
                  <div className="text-white/30 text-xs mt-0.5">{event.description}</div>
                </div>
                <div className="flex items-center gap-4">
                  {/* Email toggle */}
                  <label className="flex items-center gap-1.5 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={pref.email_enabled}
                        onChange={() => toggle(event.key, 'email_enabled')}
                        className="peer sr-only"
                      />
                      <div className="w-8 h-[18px] rounded-full bg-white/10 peer-checked:bg-emerald-500/30 transition-colors" />
                      <div className="absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white/30 peer-checked:bg-emerald-400 peer-checked:translate-x-[14px] transition-all" />
                    </div>
                    <ChannelIcon type="email" className="w-3.5 h-3.5 text-white/30 group-hover:text-white/50 transition-colors" />
                  </label>
                  {/* In-App toggle */}
                  <label className="flex items-center gap-1.5 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={pref.app_enabled}
                        onChange={() => toggle(event.key, 'app_enabled')}
                        className="peer sr-only"
                      />
                      <div className="w-8 h-[18px] rounded-full bg-white/10 peer-checked:bg-blue-500/30 transition-colors" />
                      <div className="absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white/30 peer-checked:bg-blue-400 peer-checked:translate-x-[14px] transition-all" />
                    </div>
                    <ChannelIcon type="app" className="w-3.5 h-3.5 text-white/30 group-hover:text-white/50 transition-colors" />
                  </label>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-4">
        {saved && (
          <span className="text-emerald-400 text-xs font-medium animate-fade-in">Preferences saved</span>
        )}
        <button
          onClick={save}
          disabled={saving}
          className="bg-white text-black px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </>
  )
}
