'use client'

import { useState, useEffect } from 'react'
import type { WebhookEndpoint } from '@/lib/supabase/types'
import { createWebhookEndpoint, updateWebhookEndpoint } from './actions'

const WEBHOOK_EVENT_OPTIONS = [
  'booking.created', 'booking.updated', 'booking.cancelled',
  'payment.received', 'vehicle.status_changed', 'maintenance.due',
  'team.member_added', 'customer.created',
] as const

interface WebhookEndpointModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  endpoint?: WebhookEndpoint | null
}

export default function WebhookEndpointModal({ open, onClose, onSaved, endpoint }: WebhookEndpointModalProps) {
  const isEdit = Boolean(endpoint)

  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [events, setEvents] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setUrl(endpoint?.url ?? '')
      setDescription(endpoint?.description ?? '')
      setEvents(endpoint?.events ?? [])
      setError(null)
      setSaving(false)
    }
  }, [open, endpoint])

  if (!open) return null

  function toggleEvent(evt: string) {
    setEvents((prev) =>
      prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]
    )
  }

  function toggleAll() {
    if (events.length === WEBHOOK_EVENT_OPTIONS.length) {
      setEvents([])
    } else {
      setEvents([...WEBHOOK_EVENT_OPTIONS])
    }
  }

  async function handleSave() {
    setError(null)

    if (!url.trim()) {
      setError('URL is required')
      return
    }

    try {
      const parsed = new URL(url.trim())
      if (parsed.protocol !== 'https:') {
        setError('Webhook URL must use HTTPS')
        return
      }
    } catch {
      setError('Invalid URL format')
      return
    }

    if (events.length === 0) {
      setError('Select at least one event')
      return
    }

    setSaving(true)

    const result = isEdit && endpoint
      ? await updateWebhookEndpoint(endpoint.id, {
          url: url.trim(),
          description: description.trim() || undefined,
          events,
        })
      : await createWebhookEndpoint({
          url: url.trim(),
          description: description.trim() || undefined,
          events,
        })

    if (result.error) {
      setError(result.error)
      setSaving(false)
      return
    }

    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#111] border border-white/10 rounded-3xl p-8 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-white font-bold text-lg mb-1">
          {isEdit ? 'Edit Endpoint' : 'Add Webhook Endpoint'}
        </h3>
        <p className="text-white/30 text-xs mb-6">
          {isEdit ? 'Update your endpoint configuration.' : 'Configure a URL to receive real-time event notifications.'}
        </p>

        <div className="space-y-5">
          {/* URL */}
          <div>
            <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-2">
              Endpoint URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhooks"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:border-white/30 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-2">
              Description <span className="text-white/10">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Production booking notifications"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:border-white/30 focus:outline-none"
            />
          </div>

          {/* Events */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                Events
              </label>
              <button
                type="button"
                onClick={toggleAll}
                className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
              >
                {events.length === WEBHOOK_EVENT_OPTIONS.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {WEBHOOK_EVENT_OPTIONS.map((evt) => (
                <label
                  key={evt}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04] cursor-pointer hover:bg-white/[0.06] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={events.includes(evt)}
                    onChange={() => toggleEvent(evt)}
                    className="accent-white w-3.5 h-3.5 rounded"
                  />
                  <span className="text-[10px] font-mono text-white/40">{evt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="bg-white/5 border border-white/10 text-white/60 px-4 py-2 rounded-xl text-xs hover:bg-white/10 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-white text-black px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-white/90 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Endpoint'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
