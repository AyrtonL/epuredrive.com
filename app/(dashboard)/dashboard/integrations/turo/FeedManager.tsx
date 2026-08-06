'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { connectIcloud, disconnectEmailSync } from './email-actions'

interface TuroEmailSync {
  provider: string | null
  gmail_address: string | null
  last_checked: string | null
  active: boolean | null
}

interface Props {
  sync?: TuroEmailSync | null
  tenantId: string
}

export default function FeedManager({ sync, tenantId }: Props) {
  const [syncMsg, setSyncMsg] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()

  // Show feedback from Gmail OAuth redirect and clean the URL
  useEffect(() => {
    const gmail = searchParams.get('gmail')
    if (gmail === 'connected') {
      setSyncMsg('Gmail connected successfully! Bookings will sync automatically.')
      router.replace('/dashboard/integrations/turo', { scroll: false })
    } else if (gmail === 'error') {
      setSyncMsg('Gmail connection failed. Please try again or check your Google OAuth settings.')
      router.replace('/dashboard/integrations/turo', { scroll: false })
    }
  }, [searchParams, router])

  // iCloud connect form
  const [showIcloud, setShowIcloud] = useState(false)
  const [icloudEmail, setIcloudEmail] = useState('')
  const [icloudPwd, setIcloudPwd] = useState('')

  function handleGmailConnect() {
    window.location.href = `/api/integrations/turo/gmail/start?tenant_id=${tenantId}`
  }

  async function handleIcloudConnect(e: React.FormEvent) {
    e.preventDefault()
    setSyncMsg('Connecting iCloud...')
    try {
      await connectIcloud({ email: icloudEmail, appSpecificPassword: icloudPwd, tenantId })
      setShowIcloud(false)
      setSyncMsg('iCloud connected successfully!')
    } catch (err: any) {
      setSyncMsg('Error: ' + err.message)
    }
  }

  async function handleSyncNow() {
    setSyncMsg('Syncing emails…')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/cron/poll-turo-emails', {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Sync failed')
      if (result.noActiveSync) {
        throw new Error('No active email connection — reconnect your inbox.')
      }
      if (result.errors > 0 || result.errorDetails?.length) {
        throw new Error(result.errorDetails?.[0] ?? `${result.errors} sync error(s).`)
      }
      if (result.lockSkipped && !result.totalSynced) {
        setSyncMsg('A sync is already running in the background — check back in a moment.')
        return
      }
      setSyncMsg(`Sync complete — ${result.totalSynced ?? 0} booking(s) processed.`)
    } catch (err: any) {
      setSyncMsg('Sync failed: ' + err.message)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Turo email automation?')) return
    try {
      await disconnectEmailSync(tenantId)
      setSyncMsg('Automation disconnected.')
    } catch (err: any) {
      setSyncMsg('Error: ' + err.message)
    }
  }

  return (
    <div className="space-y-12">

      {/* ── Email Automation ── */}
      <div className="glass border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="max-w-md">
            <h3 className="text-white text-xl font-black italic tracking-tight mb-2">Turo Email Reader</h3>
            <p className="text-white/40 text-sm leading-relaxed">
              Automatically sync new bookings, modifications, and cancellations directly from your Turo emails.
            </p>
          </div>

          {!sync ? (
            <div className="flex flex-wrap gap-4">
              <button onClick={handleGmailConnect}
                className="bg-[#EA4335] text-white px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-red-500/20">
                Connect Gmail
              </button>
              <button onClick={() => setShowIcloud(!showIcloud)}
                className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all">
                {showIcloud ? 'Cancel' : 'Connect iCloud'}
              </button>
            </div>
          ) : sync.active === false ? (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 flex items-center gap-4 max-w-md">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 font-black text-lg shrink-0">!</div>
              <div className="flex-1 pr-2">
                <div className="text-white font-bold text-sm">{sync.gmail_address}</div>
                <div className="text-[10px] text-amber-400 font-black uppercase tracking-widest mt-0.5">
                  Automation paused — reconnect required
                </div>
                {sync.last_checked && (
                  <div className="text-[9px] text-white/30 uppercase font-bold tracking-widest mt-1">
                    Last Polled: {new Date(sync.last_checked).toLocaleString()}
                  </div>
                )}
              </div>
              <button
                onClick={sync.provider === 'icloud' ? () => setShowIcloud(true) : handleGmailConnect}
                className="text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-amber-500 text-black hover:brightness-110 transition-all whitespace-nowrap shrink-0">
                Reconnect
              </button>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-black italic text-lg">
                {sync.provider === 'gmail' ? 'G' : 'i'}
              </div>
              <div className="flex-1 pr-8">
                <div className="text-white font-bold text-sm">{sync.gmail_address}</div>
                <div className="text-[10px] text-primary font-black uppercase tracking-widest mt-0.5">
                  Connected via {sync.provider || 'Gmail'}
                </div>
                {sync.last_checked && (
                  <div className="text-[9px] text-white/30 uppercase font-bold tracking-widest mt-1">
                    Last Polled: {new Date(sync.last_checked).toLocaleString()}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleSyncNow}
                  className="text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all">
                  Sync Now
                </button>
                <button onClick={handleDisconnect} className="text-white/30 hover:text-red-400 p-2 transition-colors">
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {showIcloud && (
          <form onSubmit={handleIcloudConnect} className="mt-8 pt-8 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">iCloud Email</label>
              <input type="email" required value={icloudEmail} onChange={e => setIcloudEmail(e.target.value)} placeholder="your@icloud.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">App-Specific Password</label>
              <input type="password" required value={icloudPwd} onChange={e => setIcloudPwd(e.target.value)} placeholder="xxxx-xxxx-xxxx-xxxx"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="w-full bg-white text-black py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white/90 transition-all shadow-xl shadow-white/5">
                Confirm iCloud Connection
              </button>
              <p className="text-[9px] text-white/30 text-center mt-3 italic">
                *We only read emails from noreply@mail.turo.com. You must use an App-Specific Password.
              </p>
            </div>
          </form>
        )}

        {syncMsg && (
          <div className={`mt-6 p-3 border rounded-xl text-sm relative z-10 ${
            syncMsg.toLowerCase().includes('fail') || syncMsg.toLowerCase().includes('error')
              ? 'bg-red-500/10 border-red-500/20 text-red-300'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
          }`}>
            {syncMsg}
          </div>
        )}
      </div>

    </div>
  )
}
