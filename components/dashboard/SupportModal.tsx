'use client'

import { useState } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function SupportModal({ isOpen, onClose }: Props) {
  const [form, setForm] = useState({ subject: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setStatus('success')
        setTimeout(() => {
          setStatus('idle')
          setForm({ subject: '', message: '' })
          onClose()
        }, 2000)
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md bg-[#111] border border-white/[0.08]
                      rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-black tracking-[0.25em] uppercase text-white/30 mb-1">
              Support
            </p>
            <h3 className="text-white font-bold text-lg">How can we help?</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {status === 'success' ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white font-bold">Request sent!</p>
            <p className="text-white/40 text-sm mt-1">We&apos;ll reply within 24 hours.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-2">
                Subject
              </label>
              <input
                type="text"
                required
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3
                           text-white text-sm placeholder-white/20 focus:outline-none
                           focus:border-white/20 transition-colors"
                placeholder="Brief description of your issue"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-2">
                Message
              </label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3
                           text-white text-sm placeholder-white/20 focus:outline-none
                           focus:border-white/20 transition-colors resize-none"
                placeholder="Describe what's happening in detail…"
              />
            </div>
            {status === 'error' && (
              <p className="text-red-400 text-xs">
                Something went wrong. Please email info@epuredrive.com directly.
              </p>
            )}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-white text-black py-3.5 rounded-2xl text-xs font-black
                         uppercase tracking-[0.2em] hover:bg-white/90 transition-all disabled:opacity-50"
            >
              {status === 'loading' ? 'Sending…' : 'Send Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
