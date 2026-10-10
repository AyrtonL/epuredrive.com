'use client'

import { useEffect } from 'react'

// Registers /sw.js so the dashboard can be installed as an app
// ("Add to Home Screen" on iOS, install prompt on Android/desktop Chrome).
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])
  return null
}
