'use client'

import { useState } from 'react'

type Lang = 'en' | 'es'

const COPY: Record<Lang, {
  pill: string
  title: string
  subtitle: string
  successTitle: string
  successBody: string
  inquiryTypes: string[]
  labels: { name: string; email: string; company: string; inquiry: string; message: string }
  placeholders: { name: string; email: string; company: string; message: string }
  errorMsg: string
  submit: string
  submitting: string
}> = {
  en: {
    pill: 'Contact',
    title: "Let's talk.",
    subtitle:
      "Interested in Enterprise, a partnership, or just want to learn more? Send us a message and we'll be in touch within 1–2 business days.",
    successTitle: 'Message received.',
    successBody: "We'll be in touch shortly.",
    inquiryTypes: ['Enterprise', 'General Inquiry', 'Partnership', 'Press'],
    labels: { name: 'Name *', email: 'Email *', company: 'Company', inquiry: 'Inquiry Type', message: 'Message *' },
    placeholders: {
      name: 'Your name',
      email: 'your@email.com',
      company: 'Company name',
      message: 'Tell us about your fleet or inquiry...',
    },
    errorMsg: 'Something went wrong. Please try again or email us at info@epuredrive.com.',
    submit: 'Send Message',
    submitting: 'Sending…',
  },
  es: {
    pill: 'Contacto',
    title: 'Hablemos.',
    subtitle:
      '¿Te interesa un plan Enterprise, una alianza o simplemente querés saber más? Escribinos y te respondemos en 1–2 días hábiles.',
    successTitle: 'Mensaje recibido.',
    successBody: 'Te escribimos a la brevedad.',
    inquiryTypes: ['Enterprise', 'Consulta general', 'Alianzas', 'Prensa'],
    labels: { name: 'Nombre *', email: 'Email *', company: 'Empresa', inquiry: 'Tipo de consulta', message: 'Mensaje *' },
    placeholders: {
      name: 'Tu nombre',
      email: 'tu@email.com',
      company: 'Nombre de la empresa',
      message: 'Contanos sobre tu flota o consulta...',
    },
    errorMsg: 'Algo salió mal. Probá de nuevo o escribinos a info@epuredrive.com.',
    submit: 'Enviar mensaje',
    submitting: 'Enviando…',
  },
}

export default function ContactSection({ lang = 'en' }: { lang?: Lang }) {
  const t = COPY[lang]
  const [form, setForm] = useState({
    name: '', email: '', company: '', inquiryType: t.inquiryTypes[1], message: '',
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
        <p className="text-[10px] font-black tracking-[0.3em] uppercase text-charcoal mb-4">
          {t.pill}
        </p>
        <h2 className="text-3xl font-black text-white mb-4 tracking-tight">
          {t.title}
        </h2>
        <p className="text-grey text-sm mb-10 leading-relaxed">
          {t.subtitle}
        </p>

        {status === 'success' ? (
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-white font-bold text-lg mb-2">{t.successTitle}</p>
            <p className="text-charcoal text-sm">{t.successBody}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-charcoal mb-2">
                  {t.labels.name}
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3
                             text-white text-sm placeholder-white/20 focus:outline-none
                             focus:border-white/20 transition-colors"
                  placeholder={t.placeholders.name}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-charcoal mb-2">
                  {t.labels.email}
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3
                             text-white text-sm placeholder-white/20 focus:outline-none
                             focus:border-white/20 transition-colors"
                  placeholder={t.placeholders.email}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-charcoal mb-2">
                  {t.labels.company}
                </label>
                <input
                  type="text"
                  value={form.company}
                  onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3
                             text-white text-sm placeholder-white/20 focus:outline-none
                             focus:border-white/20 transition-colors"
                  placeholder={t.placeholders.company}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-charcoal mb-2">
                  {t.labels.inquiry}
                </label>
                <select
                  value={form.inquiryType}
                  onChange={e => setForm(f => ({ ...f, inquiryType: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3
                             text-white text-sm focus:outline-none focus:border-white/20
                             transition-colors appearance-none"
                >
                  {t.inquiryTypes.map(opt => (
                    <option key={opt} value={opt} className="bg-[#111] text-white">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-charcoal mb-2">
                {t.labels.message}
              </label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3
                           text-white text-sm placeholder-white/20 focus:outline-none
                           focus:border-white/20 transition-colors resize-none"
                placeholder={t.placeholders.message}
              />
            </div>

            {status === 'error' && (
              <p className="text-red-400 text-xs">
                {t.errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="bg-white text-black px-10 py-4 rounded-2xl text-xs font-black
                         uppercase tracking-[0.2em] hover:bg-white/90 transition-all
                         hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {status === 'loading' ? t.submitting : t.submit}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
