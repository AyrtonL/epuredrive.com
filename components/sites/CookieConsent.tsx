'use client'

import { useState, useEffect } from 'react'
import { getStoredConsent, storeConsent } from '@/components/CookieConsentBanner'

// Older visitors decided under this key before consent was unified with the
// platform banner (whose key CookieConsentManager reads to load analytics).
const LEGACY_KEY = 'epure_cookie_consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (getStoredConsent() === null && !localStorage.getItem(LEGACY_KEY)) setVisible(true)
    } catch {
      // localStorage blocked (private browsing etc.) — show the banner
      setVisible(true)
    }
  }, [])

  function accept() {
    try { storeConsent('granted') } catch { /* ignore */ }
    setVisible(false)
    window.dispatchEvent(new CustomEvent('cookie-consent-update', { detail: 'granted' }))
  }

  function decline() {
    try { storeConsent('denied') } catch { /* ignore */ }
    setVisible(false)
  }

  // Lets other fixed bars (the phone booking bar) sit above this strip.
  useEffect(() => {
    const root = document.documentElement
    if (visible) root.dataset.cookieBanner = 'open'
    else delete root.dataset.cookieBanner
    return () => { delete root.dataset.cookieBanner }
  }, [visible])

  if (!visible) return null

  // Phones: a slim strip flush with the bottom edge (it used to float 80px up,
  // right over the "Reserve" button and the email field). Desktop: small card.
  return (
    <div className="fixed bottom-0 inset-x-0 sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-md z-[200] animate-fade-in-up">
      <div className="h-14 sm:h-auto bg-[#0b0b0b]/95 sm:glass border-t sm:border border-white/10 sm:rounded-2xl px-4 py-2 sm:py-2.5 shadow-2xl backdrop-blur-2xl flex items-center gap-3 pb-[env(safe-area-inset-bottom)]">
        <p className="flex-1 text-[11px] text-white/60 leading-snug">
          We use cookies.{' '}
          <a href="/cookies" className="text-white/80 underline underline-offset-2 hover:text-white transition-colors">
            Policy
          </a>
        </p>
        <button
          onClick={decline}
          className="text-white/50 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg hover:bg-white/10 hover:text-white/80 transition-all"
        >
          Decline
        </button>
        <button
          onClick={accept}
          className="bg-white text-black text-[11px] font-bold px-3.5 py-1.5 rounded-lg hover:bg-white/90 transition-all active:scale-95"
        >
          Accept
        </button>
      </div>
    </div>
  )
}
