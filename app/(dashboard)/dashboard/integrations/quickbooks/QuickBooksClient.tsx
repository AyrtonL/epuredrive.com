'use client'

import { useState } from 'react'

interface QBConnection {
  realm_id: string
  company_name: string | null
  connected_at: string
  last_synced_at: string | null
  sync_enabled: boolean
}

interface Props {
  connection: QBConnection | null
  tenantId: string
}

export default function QuickBooksClient({ connection, tenantId }: Props) {
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncResult, setSyncResult] = useState<{ synced: number; remaining?: number; errors?: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isConnected = !!connection
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const justConnected = searchParams?.get('qb') === 'connected'
  const connectError = searchParams?.get('qb') === 'error'
  const justDisconnected = searchParams?.get('qb') === 'disconnected'

  async function handleSync() {
    setSyncing(true)
    setError(null)
    setSyncResult(null)
    try {
      const res = await fetch('/api/integrations/quickbooks/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Sync failed')
        return
      }
      setSyncResult(data)
    } catch {
      setError('An unexpected error occurred during sync.')
    } finally {
      setSyncing(false)
    }
  }

  async function handleDisconnect() {
    if (!window.confirm('Disconnect QuickBooks? éPure Drive will stop syncing new transactions until you reconnect.')) return
    setDisconnecting(true)
    setError(null)
    try {
      const res = await fetch('/api/integrations/quickbooks/disconnect', { method: 'POST' })
      if (!res.ok) {
        setError('Could not disconnect QuickBooks. Please try again.')
        return
      }
      window.location.href = '/dashboard/integrations/quickbooks?qb=disconnected'
    } catch {
      setError('An unexpected error occurred while disconnecting.')
      setDisconnecting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Status Banners */}
      {justConnected && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-emerald-400 text-sm font-medium">QuickBooks connected successfully! You can now sync your transactions.</p>
        </div>
      )}
      {connectError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-sm font-medium">Failed to connect QuickBooks. Please try again or check your Intuit account permissions.</p>
        </div>
      )}
      {justDisconnected && (
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-white/60 text-sm font-medium">QuickBooks has been disconnected. Your synced transactions remain in QuickBooks, but éPure Drive will no longer sync new ones until you reconnect.</p>
        </div>
      )}
      {error && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-400 text-xs font-bold ml-4">Dismiss</button>
        </div>
      )}

      {/* Connection Card */}
      <div className="glass border border-white/10 rounded-3xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-xl bg-emerald-500/10">
            <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">QuickBooks Online</h3>
            <p className="text-white/30 text-xs">Sync your rental income and expenses to QuickBooks automatically</p>
          </div>
        </div>

        {isConnected ? (
          <div className="space-y-6">
            {/* Connected Status */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div className="flex-1">
                <div className="text-white text-sm font-bold">{connection.company_name || 'Connected'}</div>
                <div className="text-white/30 text-xs mt-0.5">
                  Connected {new Date(connection.connected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {connection.last_synced_at && (
                    <> · Last synced {new Date(connection.last_synced_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</>
                  )}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                connection.sync_enabled
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {connection.sync_enabled ? 'Active' : 'Disabled'}
              </span>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSync}
                disabled={syncing || !connection.sync_enabled}
                className="bg-white text-black px-6 py-3 rounded-xl text-xs font-bold hover:bg-white/90 disabled:opacity-30 transition-all flex items-center gap-2"
              >
                {syncing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4m0 12v4m-7-10H2m20 0h-3M5.64 5.64l2.12 2.12m8.48 8.48l2.12 2.12M5.64 18.36l2.12-2.12m8.48-8.48l2.12-2.12" />
                    </svg>
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="23 4 23 10 17 10" />
                      <polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                    </svg>
                    Sync Now
                  </>
                )}
              </button>
              <a
                href={`/api/integrations/quickbooks/auth?tenant_id=${tenantId}`}
                className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-white/10 transition-all"
              >
                Reconnect
              </a>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-white/30 px-6 py-3 rounded-xl text-xs font-bold hover:text-red-400 disabled:opacity-30 transition-all"
              >
                {disconnecting ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </div>

            {/* Sync Result */}
            {syncResult && (
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="text-white text-sm font-bold mb-1">Sync Complete</div>
                <div className="text-white/40 text-xs space-y-1">
                  <p>{syncResult.synced} transaction{syncResult.synced !== 1 ? 's' : ''} synced to QuickBooks.</p>
                  {syncResult.remaining !== undefined && syncResult.remaining > 0 && (
                    <p>{syncResult.remaining} remaining — click &quot;Sync Now&quot; again to continue.</p>
                  )}
                  {syncResult.errors && syncResult.errors.length > 0 && (
                    <div className="mt-2 text-red-400/80">
                      <p className="font-bold text-xs">Errors:</p>
                      {syncResult.errors.map((err, i) => (
                        <p key={i} className="text-[11px]">• {err}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Not Connected */}
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <h4 className="text-white font-bold mb-2">Not Connected</h4>
              <p className="text-white/30 text-sm max-w-md mb-6">
                Connect your QuickBooks Online account to automatically sync rental income and expenses. Your data stays private — we only create transactions in your QBO company.
              </p>
              <a
                href={`/api/integrations/quickbooks/auth?tenant_id=${tenantId}`}
                className="bg-emerald-500 text-white px-8 py-3.5 rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </svg>
                Connect QuickBooks
              </a>
            </div>
          </div>
        )}
      </div>

      {/* How it Works */}
      <div className="glass border border-white/[0.06] rounded-3xl p-8">
        <h3 className="text-white font-bold mb-4">How Sync Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '1', title: 'Connect', desc: 'Authorize éPure Drive to access your QuickBooks Online company via OAuth.' },
            { step: '2', title: 'Sync', desc: 'Click "Sync Now" to push income and expense transactions to QuickBooks.' },
            { step: '3', title: 'Review', desc: 'Transactions appear in QuickBooks as Sales Receipts (income) and Purchases (expenses).' },
          ].map(s => (
            <div key={s.step} className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 text-xs font-black shrink-0">
                {s.step}
              </div>
              <div>
                <div className="text-white text-sm font-bold mb-1">{s.title}</div>
                <p className="text-white/30 text-xs leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Note */}
      <div className="glass border border-amber-500/10 rounded-3xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-1">Secure Connection</h4>
            <p className="text-white/40 text-sm leading-relaxed">
              We use Intuit&apos;s official OAuth 2.0 flow. Your QuickBooks credentials are never stored — only encrypted access tokens that can be revoked at any time from your Intuit account settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
