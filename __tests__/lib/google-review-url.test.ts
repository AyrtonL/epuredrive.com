import { normalizeGoogleReviewUrl, shouldAskForGoogleReview } from '@/lib/marketing/googleReview'

describe('normalizeGoogleReviewUrl', () => {
  it.each([
    'https://g.page/r/CabcDEF123/review',
    'https://search.google.com/local/writereview?placeid=ChIJabc',
    'https://www.google.com/maps/place/x',
    'https://maps.app.goo.gl/AbC123',
  ])('accepts %s', (url) => {
    expect(normalizeGoogleReviewUrl(url)).toEqual({ url, error: null })
  })

  it('treats empty as cleared', () => {
    expect(normalizeGoogleReviewUrl('  ')).toEqual({ url: null, error: null })
  })

  it('rejects non-Google hosts (no open redirect from the review page)', () => {
    expect(normalizeGoogleReviewUrl('https://evil.com/g.page').error).toBeTruthy()
    expect(normalizeGoogleReviewUrl('https://google.com.evil.io/x').error).toBeTruthy()
  })

  it('rejects http and garbage', () => {
    expect(normalizeGoogleReviewUrl('http://g.page/r/x').error).toBeTruthy()
    expect(normalizeGoogleReviewUrl('javascript:alert(1)').error).toBeTruthy()
    expect(normalizeGoogleReviewUrl('not a url').error).toBeTruthy()
  })
})

describe('shouldAskForGoogleReview', () => {
  it('asks happy direct customers when a link is set', () => {
    expect(shouldAskForGoogleReview({ rating: 5, source: 'admin', googleReviewUrl: 'https://g.page/r/x' })).toBe(true)
    expect(shouldAskForGoogleReview({ rating: 4, source: 'website', googleReviewUrl: 'https://g.page/r/x' })).toBe(true)
  })

  it('does not ask for low ratings, Turo guests, or without a link', () => {
    expect(shouldAskForGoogleReview({ rating: 3, source: 'admin', googleReviewUrl: 'https://g.page/r/x' })).toBe(false)
    expect(shouldAskForGoogleReview({ rating: 5, source: 'turo', googleReviewUrl: 'https://g.page/r/x' })).toBe(false)
    expect(shouldAskForGoogleReview({ rating: 5, source: 'admin', googleReviewUrl: null })).toBe(false)
  })
})
