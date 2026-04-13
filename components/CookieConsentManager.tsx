'use client'

import { useState, useEffect } from 'react'
import GoogleAnalytics from './GoogleAnalytics'
import GoogleAds from './GoogleAds'
import MetaPixel from './MetaPixel'
import { getStoredConsent } from './CookieConsentBanner'

export default function CookieConsentManager() {
  const [consented, setConsented] = useState(false)

  useEffect(() => {
    setConsented(getStoredConsent() === 'granted')

    function handleConsentUpdate(e: CustomEvent<string>) {
      if (e.detail === 'granted') setConsented(true)
    }

    window.addEventListener('cookie-consent-update', handleConsentUpdate as EventListener)
    return () => {
      window.removeEventListener('cookie-consent-update', handleConsentUpdate as EventListener)
    }
  }, [])

  if (!consented) return null

  return (
    <>
      <GoogleAnalytics />
      <GoogleAds />
      <MetaPixel />
    </>
  )
}
