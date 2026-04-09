'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase handles the token exchange automatically via the URL hash
    // when the client is initialized. We just need to wait for the session.
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    // Also check if we already have a session (user clicked link and session is active)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const password = form.get('password') as string
    const confirm = form.get('confirm') as string

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  if (success) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-white text-sm font-semibold">Password updated!</p>
        <p className="text-white/40 text-xs">Redirecting to your dashboard...</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="text-center space-y-4 py-4">
        <p className="text-white/40 text-sm">Verifying your reset link...</p>
        <p className="text-white/20 text-xs">
          If this takes too long, your link may have expired.{' '}
          <a href="/forgot-password" className="text-white/60 hover:text-white transition-colors">Request a new one</a>
        </p>
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
        <label htmlFor="password" className="block text-sm text-white/60 mb-1">New password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-white/30"
        />
      </div>
      <div>
        <label htmlFor="confirm" className="block text-sm text-white/60 mb-1">Confirm password</label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-white/30"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-white text-black font-semibold py-3 rounded-lg text-sm hover:bg-white/90 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Updating...' : 'Update password'}
      </button>
    </form>
  )
}
