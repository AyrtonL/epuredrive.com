'use client'

import { useEffect } from 'react'
import { trackPixelEvent } from '@/lib/meta-pixel'
import { trackAdsConversion } from '@/lib/google-ads'

interface Props {
  plan: string
}

const PLAN_VALUES: Record<string, number> = {
  pro: 49,
  max: 99,
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
