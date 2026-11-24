'use client'

import { useState } from 'react'
import StarRating from '@/components/ui/StarRating'
import { shouldAskForGoogleReview } from '@/lib/marketing/googleReview'

interface ReviewFormProps {
  token: string
  tenantName: string
  tenantLogoUrl: string | null
  carName: string
  customerName: string
  accentColor: string
  source: string | null
  googleReviewUrl: string | null
}

export default function ReviewForm({
  token,
  tenantName,
  tenantLogoUrl,
  carName,
  customerName,
  accentColor,
  source,
  googleReviewUrl,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating < 1) {
      setError('Please select a rating.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, rating, comment }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong. Please try again.')
      }
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    const askGoogle = shouldAskForGoogleReview({ rating, source, googleReviewUrl })
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
          <p className="text-gray-900 font-semibold">Thanks for the feedback!</p>
          <p className="text-gray-500 text-sm mt-2">{tenantName} appreciates it.</p>
          {askGoogle && googleReviewUrl && (
            <div className="mt-6 space-y-3">
              <p className="text-gray-700 text-sm">
                Glad you enjoyed it! Would you share it on Google? It takes 30 seconds and helps a small
                business a lot.
              </p>
              <a
                href={googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 rounded-xl text-white font-semibold text-sm"
                style={{ backgroundColor: accentColor }}
              >
                Post my review on Google
              </a>
              {comment.trim() && (
                <p className="text-gray-400 text-xs">Tip: you can paste what you just wrote.</p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-12">
      <div
        className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full border-t-4"
        style={{ borderColor: accentColor }}
      >
        {tenantLogoUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={tenantLogoUrl} alt={tenantName} className="h-10 object-contain mb-6" />
        )}
        <h1 className="text-xl font-bold text-gray-900 mb-1">How was your trip?</h1>
        <p className="text-gray-500 text-sm mb-6">
          Hi {customerName}, tell {tenantName} what you thought of your {carName} rental.
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <StarRating value={rating} onChange={setRating} disabled={submitting} />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={submitting}
            rows={4}
            maxLength={2000}
            placeholder="Anything you'd like to share? (optional)"
            className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-gray-900 text-white font-semibold text-sm disabled:opacity-50"
          >
            {submitting ? 'Sending...' : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  )
}
