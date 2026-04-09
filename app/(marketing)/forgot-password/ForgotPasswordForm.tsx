'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const email = form.get('email') as string

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="text-white text-sm font-semibold">Check your email</p>
          <p className="text-white/40 text-xs mt-1">
            If an account exists with that email, you&apos;ll receive a password reset link.
          </p>
        </div>
        <a
          href="/login"
          className="inline-block text-xs text-white/40 hover:text-white transition-colors mt-4"
        >
          Back to sign in
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="email" className="block text-sm text-white/60 mb-1">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-white/30"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-white text-black font-semibold py-3 rounded-lg text-sm hover:bg-white/90 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Sending...' : 'Send reset link'}
      </button>
      <p className="text-center text-xs text-white/30">
        Remember your password?{' '}
        <a href="/login" className="text-white/60 hover:text-white transition-colors">Sign in</a>
      </p>
    </form>
  )
}
