'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'epure_cookie_consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      // localStorage blocked (private browsing etc.) — show the banner
      setVisible(true)
    }
  }, [])

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, 'accepted') } catch { /* ignore */ }
    setVisible(false)
  }

  function decline() {
    try { localStorage.setItem(STORAGE_KEY, 'declined') } catch { /* ignore */ }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[200] animate-fade-in-up">
      <div className="glass border border-white/10 rounded-[1.5rem] p-5 shadow-2xl backdrop-blur-2xl">
        <p className="text-[11px] text-white/50 leading-relaxed mb-4">
          We use cookies to improve your browsing experience and analyze site traffic.
          By continuing, you agree to our use of cookies.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={accept}
            className="flex-1 bg-white text-black text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl hover:bg-white/90 transition-all active:scale-95"
          >
            Accept All
          </button>
          <button
            onClick={decline}
            className="flex-1 bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl hover:bg-white/10 hover:text-white/60 transition-all active:scale-95"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}
