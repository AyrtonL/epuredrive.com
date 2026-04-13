type GtagArgs =
  | ['js', Date]
  | ['config', string, Record<string, unknown>?]
  | ['event', string, Record<string, unknown>?]

declare global {
  interface Window {
    gtag?: (...args: GtagArgs) => void
  }
}

const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID

const LABELS = {
  lead: process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL,
  signup: process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL,
  subscribe: process.env.NEXT_PUBLIC_GOOGLE_ADS_SUBSCRIBE_LABEL,
} as const

type ConversionName = keyof typeof LABELS

interface ConversionParams {
  value?: number
  currency?: string
  transaction_id?: string
}

export function trackAdsConversion(name: ConversionName, params?: ConversionParams): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  if (!ADS_ID) return

  const label = LABELS[name]
  if (!label) return

  window.gtag('event', 'conversion', {
    send_to: `${ADS_ID}/${label}`,
    value: params?.value,
    currency: params?.currency ?? 'USD',
    transaction_id: params?.transaction_id,
  })
}
