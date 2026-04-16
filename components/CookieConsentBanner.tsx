'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'cookie_consent'

export type ConsentState = 'granted' | 'denied' | null

export function getStoredConsent(): ConsentState {
  if (typeof window === 'undefined') return null
  return (localStorage.getItem(STORAGE_KEY) as ConsentState) ?? null
}

export function storeConsent(state: 'granted' | 'denied'): void {
  localStorage.setItem(STORAGE_KEY, state)
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (getStoredConsent() === null) {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  function accept() {
    storeConsent('granted')
    setVisible(false)
    window.dispatchEvent(new CustomEvent('cookie-consent-update', { detail: 'granted' }))
  }

  function decline() {
    storeConsent('denied')
    setVisible(false)
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-[200] p-4 sm:p-6 pointer-events-none">
      <div className="max-w-2xl mx-auto bg-[#111] border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-2xl pointer-events-auto">
        <p className="text-white/60 text-sm leading-relaxed flex-1">
          We use cookies to analyze traffic and improve your experience. See our{' '}
          <a
            href="/cookies"
            className="text-white/80 underline underline-offset-2 hover:text-white transition-colors"
          >
            Cookie Policy
          </a>{' '}
          and{' '}
          <a
            href="/privacy"
            className="text-white/80 underline underline-offset-2 hover:text-white transition-colors"
          >
            Privacy Policy
          </a>
          .
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={decline}
            className="text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors px-4 py-2 cursor-pointer"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="bg-white text-black font-black uppercase tracking-widest text-[11px] px-6 py-2.5 rounded-full hover:bg-primary hover:text-white transition-all cursor-pointer"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
