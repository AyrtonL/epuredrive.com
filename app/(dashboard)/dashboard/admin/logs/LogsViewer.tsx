'use client'

import { useState } from 'react'

interface LogEntry {
  id: number
  timestamp: string
  level: string
  actor: string
  message: string
  tenant_id: string | null
  user_id: string | null
  metadata: Record<string, unknown> | null
}

interface Props {
  logs: LogEntry[]
  tenantMap: Record<string, string>
}

const LEVEL_STYLES: Record<string, string> = {
  info: 'text-blue-400 bg-blue-500/10',
  warning: 'text-amber-400 bg-amber-500/10',
  error: 'text-red-400 bg-red-500/10',
}

type FilterLevel = 'all' | 'info' | 'warning' | 'error'

export default function LogsViewer({ logs, tenantMap }: Props) {
  const [filter, setFilter] = useState<FilterLevel>('all')

  const filtered = filter === 'all' ? logs : logs.filter((l) => l.level === filter)

  const counts = {
    all: logs.length,
    info: logs.filter(l => l.level === 'info').length,
    warning: logs.filter(l => l.level === 'warning').length,
    error: logs.filter(l => l.level === 'error').length,
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-3">
        {(['all', 'info', 'warning', 'error'] as const).map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
              filter === level
                ? 'bg-white/10 text-white border border-white/10'
                : 'bg-white/[0.03] text-white/30 border border-white/[0.04] hover:text-white/60 hover:bg-white/[0.06]'
            }`}
          >
            <span className="capitalize">{level}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${filter === level ? 'bg-white/20 text-white' : 'bg-white/5 text-white/20'}`}>
              {counts[level]}
            </span>
          </button>
        ))}
      </div>

      {/* Log Entries */}
      <div className="glass border border-white/10 rounded-3xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="text-white/30 text-sm">
              {filter === 'all'
                ? 'No audit logs yet. Logs will appear as you perform admin actions.'
                : `No ${filter} logs found.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((entry) => (
              <div key={entry.id} className="flex items-start gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="shrink-0 mt-0.5">
                  <span className={`inline-block w-[52px] text-center px-2 py-1 text-[9px] font-bold tracking-wider rounded uppercase ${LEVEL_STYLES[entry.level] ?? LEVEL_STYLES.info}`}>
                    {entry.level}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm">{entry.message}</div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-white/20 text-[10px] font-mono">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                    <span className="text-white/20 text-[10px]">
                      via <span className="text-white/30 font-medium">{entry.actor}</span>
                    </span>
                    {entry.tenant_id && tenantMap[entry.tenant_id] && (
                      <span className="text-white/20 text-[10px]">
                        tenant: <span className="text-white/40 font-medium">{tenantMap[entry.tenant_id]}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
