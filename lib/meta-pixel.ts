type FbqEventName =
  | 'Lead'
  | 'CompleteRegistration'
  | 'InitiateCheckout'
  | 'Subscribe'
  | 'Purchase'

interface FbqEventParams {
  value?: number
  currency?: string
  content_name?: string
  content_category?: string
  predicted_ltv?: number
  [key: string]: unknown
}

declare global {
  interface Window {
    fbq?: (action: 'track' | 'trackCustom', event: string, params?: FbqEventParams) => void
  }
}

export function trackPixelEvent(event: FbqEventName, params?: FbqEventParams): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  window.fbq('track', event, params)
}
