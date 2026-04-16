'use client'

import { useState, useCallback } from 'react'
import type { WebhookEndpoint } from '@/lib/supabase/types'
import { updateWebhookEndpoint, deleteWebhookEndpoint, rotateWebhookSecret } from './actions'
import WebhookEndpointModal from './WebhookEndpointModal'

const WEBHOOK_EVENT_OPTIONS = [
  'booking.created', 'booking.updated', 'booking.cancelled',
  'payment.received', 'vehicle.status_changed', 'maintenance.due',
  'team.member_added', 'customer.created',
] as const

interface WebhookEndpointsListProps {
  initialEndpoints: WebhookEndpoint[]
  webhooksEnabled: boolean
}

function truncateUrl(url: string, max = 40): string {
  if (url.length <= max) return url
  return url.slice(0, max) + '...'
}

export default function WebhookEndpointsList({ initialEndpoints, webhooksEnabled }: WebhookEndpointsListProps) {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>(initialEndpoints)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEndpoint, setEditingEndpoint] = useState<WebhookEndpoint | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [revealedSecret, setRevealedSecret] = useState<{ id: number; secret: string } | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const openCreate = useCallback(() => {
    setEditingEndpoint(null)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((ep: WebhookEndpoint) => {
    setEditingEndpoint(ep)
    setModalOpen(true)
  }, [])

  const handleSaved = useCallback(() => {
    setModalOpen(false)
    setEditingEndpoint(null)
    // Revalidation happens server-side; trigger a client refresh
    window.location.reload()
  }, [])

  async function handleToggleActive(ep: WebhookEndpoint) {
    setTogglingId(ep.id)
    const result = await updateWebhookEndpoint(ep.id, { active: !ep.active })
    if (!result.error) {
      setEndpoints((prev) =>
        prev.map((e) => (e.id === ep.id ? { ...e, active: !e.active } : e))
      )
    }
    setTogglingId(null)
  }

  async function handleDelete(id: number) {
    const result = await deleteWebhookEndpoint(id)
    if (!result.error) {
      setEndpoints((prev) => prev.filter((e) => e.id !== id))
    }
    setConfirmDeleteId(null)
  }

  async function handleRotateSecret(id: number) {
    const result = await rotateWebhookSecret(id)
    if (result.secret) {
      setRevealedSecret({ id, secret: result.secret })
      setTimeout(() => setRevealedSecret(null), 15000)
    }
  }

  return (
    <>
      <div className={`glass border rounded-3xl p-8 relative overflow-hidden ${webhooksEnabled ? 'border-white/10' : 'border-white/[0.04]'}`}>
        {!webhooksEnabled && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <div className="text-center">
              <div className="px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest inline-block mb-3">
                Feature Not Enabled
              </div>
              <p className="text-white/40 text-sm max-w-xs">Webhooks are not enabled for your organization. Contact your administrator.</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-bold">Webhooks</h3>
              <p className="text-white/30 text-xs">Receive real-time notifications for fleet events</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="bg-white text-black px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-white/90 transition-all"
          >
            Add Endpoint
          </button>
        </div>

        {/* Endpoints List */}
        {endpoints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              </svg>
            </div>
            <p className="text-white/30 text-sm">No webhook endpoints configured.</p>
            <p className="text-white/20 text-xs mt-1">Add an endpoint to receive booking, payment, and fleet events.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {endpoints.map((ep) => (
              <div key={ep.id} className="bg-white/[0.03] border border-white/[0.04] rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-white/30 text-xs truncate" title={ep.url}>
                        {truncateUrl(ep.url)}
                      </span>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        ep.active
                          ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                          : 'text-white/30 bg-white/5 border border-white/5'
                      }`}>
                        {ep.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {ep.description && (
                      <p className="text-white/20 text-xs mb-2">{ep.description}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 text-white/30 border border-white/5">
                        {ep.events.length} event{ep.events.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Revealed secret */}
                    {revealedSecret?.id === ep.id && (
                      <div className="mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">New Secret</p>
                        <p className="font-mono text-amber-400 text-xs break-all">{revealedSecret.secret}</p>
                        <p className="text-white/20 text-[10px] mt-1">Copy this now. It will not be shown again.</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleActive(ep)}
                      disabled={togglingId === ep.id}
                      className="bg-white/5 border border-white/10 text-white/60 px-4 py-2 rounded-xl text-xs hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                    >
                      {ep.active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => openEdit(ep)}
                      className="bg-white/5 border border-white/10 text-white/60 px-4 py-2 rounded-xl text-xs hover:bg-white/10 hover:text-white transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRotateSecret(ep.id)}
                      className="bg-white/5 border border-white/10 text-white/60 px-4 py-2 rounded-xl text-xs hover:bg-white/10 hover:text-white transition-all"
                    >
                      Rotate Secret
                    </button>
                    {confirmDeleteId === ep.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(ep.id)}
                          className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-2 rounded-xl hover:bg-red-500/20"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="bg-white/5 border border-white/10 text-white/60 px-4 py-2 rounded-xl text-xs hover:bg-white/10 hover:text-white transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(ep.id)}
                        className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-2 rounded-xl hover:bg-red-500/20"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Available Events */}
        <div className="mt-6">
          <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-3">Available Events</div>
          <div className="flex flex-wrap gap-2">
            {WEBHOOK_EVENT_OPTIONS.map((evt) => (
              <span key={evt} className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 text-white/30 border border-white/5 font-mono">
                {evt}
              </span>
            ))}
          </div>
        </div>
      </div>

      <WebhookEndpointModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEndpoint(null) }}
        onSaved={handleSaved}
        endpoint={editingEndpoint}
      />
    </>
  )
}
