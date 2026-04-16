'use client'

import { useState } from 'react'
import type { WebhookDelivery } from '@/lib/supabase/types'

interface DeliveryLogProps {
  initialDeliveries: WebhookDelivery[]
}

function relativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = now - then

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return `${seconds}s ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function statusDot(code: number | null): { color: string; label: string } {
  if (code === null) {
    return { color: 'bg-amber-400', label: 'Timeout / Error' }
  }
  if (code >= 200 && code < 300) {
    return { color: 'bg-emerald-400', label: `${code} OK` }
  }
  return { color: 'bg-red-400', label: `${code}` }
}

function truncateUrl(url: string, max = 30): string {
  if (url.length <= max) return url
  return url.slice(0, max) + '...'
}

export default function DeliveryLog({ initialDeliveries }: DeliveryLogProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  if (initialDeliveries.length === 0) {
    return (
      <div className="glass border border-white/10 rounded-3xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-bold">Recent Deliveries</h3>
            <p className="text-white/30 text-xs">Webhook delivery history</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-white/30 text-sm">No deliveries yet.</p>
          <p className="text-white/20 text-xs mt-1">Events will appear here once your endpoints receive data.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass border border-white/10 rounded-3xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8v4l3 3" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>
        <div>
          <h3 className="text-white font-bold">Recent Deliveries</h3>
          <p className="text-white/30 text-xs">Webhook delivery history</p>
        </div>
      </div>

      <div className="space-y-2">
        {initialDeliveries.map((d) => {
          const dot = statusDot(d.status_code)
          const isExpanded = expandedId === d.id

          return (
            <div key={d.id} className="bg-white/[0.03] border border-white/[0.04] rounded-xl">
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors rounded-xl"
                onClick={() => setExpandedId(isExpanded ? null : d.id)}
              >
                {/* Status dot */}
                <div className="shrink-0" title={dot.label}>
                  <div className={`w-2.5 h-2.5 rounded-full ${dot.color}`} />
                </div>

                {/* Timestamp */}
                <span className="text-white/20 text-xs w-20 shrink-0">
                  {relativeTime(d.delivered_at)}
                </span>

                {/* Event type */}
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 text-white/30 border border-white/5 font-mono shrink-0">
                  {d.event_type}
                </span>

                {/* Status code */}
                <span className={`text-xs font-mono shrink-0 ${
                  d.status_code === null
                    ? 'text-amber-400/60'
                    : d.status_code >= 200 && d.status_code < 300
                      ? 'text-emerald-400/60'
                      : 'text-red-400/60'
                }`}>
                  {d.status_code ?? 'ERR'}
                </span>

                {/* Error indicator */}
                {d.error_message && (
                  <span className="text-red-400/40 text-[10px] truncate flex-1 min-w-0">
                    {d.error_message}
                  </span>
                )}

                {/* Expand arrow */}
                <svg
                  className={`w-4 h-4 text-white/20 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-white/[0.04] space-y-2">
                  <div className="grid grid-cols-2 gap-4 pt-3">
                    <div>
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-1">Event</span>
                      <span className="font-mono text-white/40 text-xs">{d.event_type}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-1">Status</span>
                      <span className="font-mono text-white/40 text-xs">{d.status_code ?? 'No response'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-1">Attempt</span>
                      <span className="font-mono text-white/40 text-xs">{d.attempt}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-1">Delivered At</span>
                      <span className="font-mono text-white/40 text-xs">{new Date(d.delivered_at).toLocaleString()}</span>
                    </div>
                  </div>
                  {d.error_message && (
                    <div>
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-1">Error</span>
                      <p className="text-red-400/60 text-xs font-mono bg-red-500/5 border border-red-500/10 rounded-lg p-3">{d.error_message}</p>
                    </div>
                  )}
                  {d.response_body && (
                    <div>
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-1">Response Body</span>
                      <pre className="text-white/20 text-xs font-mono bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 overflow-x-auto max-h-32">
                        {d.response_body}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
