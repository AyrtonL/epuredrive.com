// lib/stripe/mrr.ts
//
// Real Monthly Recurring Revenue from live Stripe subscriptions — the source
// of truth. Replaces the previous estimate (tenant `plan` column × hardcoded
// price), which counted tenants whose plan was set manually but who never paid.

import { getStripe } from '@/lib/stripe'

export interface StripeMrr {
  /** Normalised monthly recurring revenue in whole dollars. */
  mrr: number
  /** Number of active/trialing paying subscriptions. */
  activeSubscriptions: number
}

/** Normalise a recurring price to a monthly amount (in the price's currency unit). */
function toMonthly(unitAmount: number, interval: string, intervalCount: number): number {
  const perInterval = unitAmount * (intervalCount || 1)
  switch (interval) {
    case 'year': return perInterval / 12
    case 'week': return perInterval * 4.345
    case 'day': return perInterval * 30.4
    case 'month':
    default: return perInterval
  }
}

/**
 * Compute real MRR by summing every active/trialing subscription item.
 * Returns null if Stripe can't be reached, so callers can fall back and label
 * the number as an estimate rather than showing a wrong $0.
 */
export async function computeStripeMrr(): Promise<StripeMrr | null> {
  try {
    const stripe = getStripe()
    if (!stripe) return null
    let totalCents = 0
    let activeSubscriptions = 0
    // Async iteration auto-paginates across all pages.
    for await (const sub of stripe.subscriptions.list({
      status: 'active',
      limit: 100,
      expand: ['data.items.data.price'],
    })) {
      let subMonthly = 0
      for (const item of sub.items.data) {
        const price = item.price
        if (!price?.recurring || price.unit_amount == null) continue
        subMonthly += toMonthly(
          price.unit_amount * (item.quantity ?? 1),
          price.recurring.interval,
          price.recurring.interval_count ?? 1
        )
      }
      if (subMonthly > 0) {
        totalCents += subMonthly
        activeSubscriptions += 1
      }
    }
    return { mrr: Math.round(totalCents / 100), activeSubscriptions }
  } catch {
    return null
  }
}
