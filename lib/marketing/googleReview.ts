// lib/marketing/googleReview.ts
//
// After a happy (4–5★) direct customer leaves an internal review, we nudge
// them to post it on Google too. The link is operator-supplied and shown on a
// public page, so only Google hosts are accepted (no open redirect).

import { channelOf } from '@/lib/marketing/channels'

const GOOGLE_HOSTS = ['g.page', 'google.com', 'maps.app.goo.gl', 'goo.gl']
const MIN_RATING_FOR_GOOGLE = 4

function isGoogleHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return GOOGLE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))
}

export function normalizeGoogleReviewUrl(raw: string | null | undefined): {
  url: string | null
  error: string | null
} {
  const value = (raw ?? '').trim()
  if (!value) return { url: null, error: null }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return { url: null, error: 'Google review link must be a full https:// URL.' }
  }
  if (parsed.protocol !== 'https:' || !isGoogleHost(parsed.hostname)) {
    return { url: null, error: 'Use the review link from your Google Business Profile (g.page or google.com).' }
  }
  return { url: value, error: null }
}

export function shouldAskForGoogleReview(input: {
  rating: number
  source: string | null | undefined
  googleReviewUrl: string | null | undefined
}): boolean {
  if (!input.googleReviewUrl) return false
  // Turo guests belong to Turo — never pull them to another platform.
  if (channelOf(input.source) !== 'direct') return false
  return input.rating >= MIN_RATING_FOR_GOOGLE
}
