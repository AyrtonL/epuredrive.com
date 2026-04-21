// lib/analytics.ts
// Google Analytics 4 event tracking utility
// Window.gtag type is declared in lib/google-ads.ts

function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params ?? {})
  }
}

// ── Sign-up events ──

export function trackSignUpStart(method: 'email' | 'google') {
  trackEvent('sign_up_start', { method })
}

export function trackSignUpComplete(method: 'email' | 'google') {
  trackEvent('sign_up', { method })
}

// ── Login events ──

export function trackLogin(method: 'email' | 'google') {
  trackEvent('login', { method })
}

// ── Booking events ──

export function trackBookingStart(params: {
  car_make: string
  car_model: string
  daily_rate: number
  days: number
  total: number
}) {
  trackEvent('begin_checkout', {
    currency: 'USD',
    value: params.total,
    items_car: `${params.car_make} ${params.car_model}`,
    daily_rate: params.daily_rate,
    rental_days: params.days,
  })
}

export function trackBookingSubmit(params: {
  car_make: string
  car_model: string
  total: number
  payment_method: 'online' | 'request'
}) {
  trackEvent('purchase', {
    currency: 'USD',
    value: params.total,
    items_car: `${params.car_make} ${params.car_model}`,
    payment_method: params.payment_method,
  })
}

export function trackWhatsAppInquiry(params: {
  car_make: string
  car_model: string
}) {
  trackEvent('whatsapp_inquiry', {
    items_car: `${params.car_make} ${params.car_model}`,
  })
}

// ── CTA clicks ──

export function trackCTAClick(location: string, destination: string) {
  trackEvent('cta_click', { location, destination })
}

// ── Page view (for SPA navigation) ──

export function trackPageView(path: string) {
  trackEvent('page_view', { page_path: path })
}
