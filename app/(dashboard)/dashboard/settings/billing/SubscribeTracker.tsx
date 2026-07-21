'use client'

import { useEffect } from 'react'
import { trackPixelEvent } from '@/lib/meta-pixel'
import { trackAdsConversion } from '@/lib/google-ads'

interface Props {
  plan: string
}

// Must match the real monthly prices (see billing/page.tsx and UpgradeButton).
// Previously 49/99, which reported inflated revenue to Meta Pixel / Google Ads
// and corrupted ROAS + predicted LTV.
const PLAN_VALUES: Record<string, number> = {
  starter: 0,
  pro: 19,
  max: 39,
}

export default function SubscribeTracker({ plan }: Props) {
  useEffect(() => {
    const value = PLAN_VALUES[plan.toLowerCase()] ?? 0
    trackPixelEvent('Subscribe', {
      value,
      currency: 'USD',
      content_name: plan,
      predicted_ltv: value * 12,
    })
    trackAdsConversion('subscribe', { value, currency: 'USD' })
  }, [plan])

  return null
}
