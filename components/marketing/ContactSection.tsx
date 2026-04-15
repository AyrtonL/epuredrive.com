'use client'

import { useState } from 'react'

const INQUIRY_TYPES = ['Enterprise', 'General Inquiry', 'Partnership', 'Press']

export default function ContactSection() {
  const [form, setForm] = useState({
    name: '', email: '', company: '', inquiryType: 'General Inquiry', message: '',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setStatus(res.ok ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section id="contact" className="py-24 px-6 border-t border-white/[0.06]">
      <div className="max-w-2xl mx-auto">
        <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/30 mb-4">
          Contact
        </p>
        <h2 className="text-3xl font-black text-white mb-4 tracking-tight">
          Let's talk.
        </h2>
        <p className="text-white/50 text-sm mb-10 leading-relaxed">
          Interested in Enterprise, a partnership, or just want to learn more?
          Send us a message and we'll be in touch within 1–2 business days.
        </p>

        {status === 'success' ? (
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-white font-bold text-lg mb-2">Message received.</p>
            <p className="text-white/40 text-sm">We'll be in touch shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3
                             text-white text-sm placeholder-white/20 focus:outline-none
                             focus:border-white/20 transition-colors"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3
                             text-white text-sm placeholder-white/20 focus:outline-none
                             focus:border-white/20 transition-colors"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-2">
                  Company
                </label>
                <input
                  type="text"
                  value={form.company}
                  onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3
                             text-white text-sm placeholder-white/20 focus:outline-none
                             focus:border-white/20 transition-colors"
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-2">
                  Inquiry Type
                </label>
                <select
                  value={form.inquiryType}
                  onChange={e => setForm(f => ({ ...f, inquiryType: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3
                             text-white text-sm focus:outline-none focus:border-white/20
                             transition-colors appearance-none"
                >
                  {INQUIRY_TYPES.map(t => (
                    <option key={t} value={t} className="bg-[#111] text-white">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-2">
                Message *
              </label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3
                           text-white text-sm placeholder-white/20 focus:outline-none
                           focus:border-white/20 transition-colors resize-none"
                placeholder="Tell us about your fleet or inquiry..."
              />
            </div>

            {status === 'error' && (
              <p className="text-red-400 text-xs">
                Something went wrong. Please try again or email us at info@epuredrive.com.
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="bg-white text-black px-10 py-4 rounded-2xl text-xs font-black
                         uppercase tracking-[0.2em] hover:bg-white/90 transition-all
                         hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {status === 'loading' ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
