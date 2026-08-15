'use client'

import { useState, useTransition } from 'react'
import StarRating from '@/components/ui/StarRating'
import { submitTenantFeedback } from './actions'

export default function FeedbackForm() {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating < 1) {
      setError('Please select a rating.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await submitTenantFeedback({ rating, comment })
      if (result.error) {
        setError(result.error)
      } else {
        setSubmitted(true)
      }
    })
  }

  if (submitted) {
    return (
      <div className="glass border border-white/10 rounded-3xl p-8 text-center">
        <p className="text-white font-semibold">Thanks — we got it.</p>
        <p className="text-white/40 text-sm mt-2">Your feedback was sent to the team.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="glass border border-white/10 rounded-3xl p-8 space-y-6">
      <div>
        <label className="text-white text-sm font-medium block mb-3">How&apos;s it going overall?</label>
        <StarRating value={rating} onChange={setRating} disabled={isPending} />
      </div>
      <div>
        <label htmlFor="feedback-comment" className="text-white text-sm font-medium block mb-3">
          Anything specific? (optional)
        </label>
        <textarea
          id="feedback-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={isPending}
          rows={5}
          maxLength={2000}
          className="w-full rounded-xl bg-white/[0.03] border border-white/10 p-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30"
          placeholder="What's working, what's confusing, what's missing..."
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 rounded-xl bg-white text-black font-semibold text-sm disabled:opacity-50"
      >
        {isPending ? 'Sending...' : 'Send Feedback'}
      </button>
    </form>
  )
}
